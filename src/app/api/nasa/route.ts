import type {
  ConnectivityMode,
  SpaceWeatherAlert,
  SpaceWeatherResponse,
} from '../../../types/telemetry';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_BASE_URL = 'https://api.nasa.gov/DONKI';
const REQUEST_TIMEOUT_MS = 5000;
const LOOKBACK_DAYS = 30;

let cachedAlerts: SpaceWeatherAlert[] = [];
let cachedConnectivity: ConnectivityMode = 'OFFLINE_EDGE';

type DonkiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is DonkiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWindow(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function buildUrl(
  path: string,
  apiKey: string,
  startDate: string,
  endDate: string
): string {
  const baseUrl = (
    process.env.NASA_DONKI_BASE_URL?.trim() || DEFAULT_BASE_URL
  ).replace(/\/+$/, '');
  const params = new URLSearchParams({
    startDate,
    endDate,
    api_key: apiKey,
  });

  return `${baseUrl}/${path}?${params.toString()}`;
}

async function fetchWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`DONKI request failed with status ${response.status}`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/** Rough effective-dose contribution (mSv) for a single short-duration event. */
function flareDoseMSv(classType?: string): number {
  const letter = classType?.trim().charAt(0).toUpperCase();
  switch (letter) {
    case 'X':
      return 13.8;
    case 'M':
      return 4.2;
    case 'C':
      return 0.8;
    case 'B':
      return 0.2;
    default:
      return 0.1;
  }
}

function stormDoseMSv(kpIndex: number): number {
  return Math.round(Math.max(0.2, kpIndex * 1.9) * 10) / 10;
}

function mapFlare(record: DonkiRecord): SpaceWeatherAlert | null {
  const flareId = asString(record.flrID);
  const startTime = asString(record.beginTime) ?? new Date().toISOString();

  if (!flareId) {
    return null;
  }

  const classType = asString(record.classType) ?? 'C1.0';

  return {
    id: `flr-${flareId}`,
    eventType: `SOLAR PARTICLE EVENT — CLASS ${classType}`,
    flareClass: classType,
    kpIndex: 0,
    radiationImpactmSv: flareDoseMSv(classType),
    timestamp: startTime,
  };
}

function mapStorm(record: DonkiRecord): SpaceWeatherAlert | null {
  const stormId = asString(record.gstID);
  const startTime = asString(record.beginTime) ?? new Date().toISOString();

  if (!stormId) {
    return null;
  }

  const kpEntries = Array.isArray(record.allKpIndex) ? record.allKpIndex : [];
  const kpIndex = kpEntries.reduce((max, entry) => {
    if (!isRecord(entry)) {
      return max;
    }
    const value = asNumber(entry.kpIndex);
    return value === undefined ? max : Math.max(max, value);
  }, 0);

  return {
    id: `gst-${stormId}`,
    eventType: 'SOLAR PARTICLE EVENT — GEOMAGNETIC STORM',
    flareClass: `G${kpIndex >= 8 ? 5 : kpIndex >= 7 ? 4 : kpIndex >= 6 ? 3 : kpIndex >= 5 ? 2 : 1}`,
    kpIndex,
    radiationImpactmSv: stormDoseMSv(kpIndex),
    timestamp: startTime,
  };
}

async function fetchFlares(
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<SpaceWeatherAlert[]> {
  const payload = await fetchWithTimeout(
    buildUrl('FLR', apiKey, startDate, endDate)
  );

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter(isRecord)
    .map(mapFlare)
    .filter((alert): alert is SpaceWeatherAlert => alert !== null);
}

async function fetchStorms(
  apiKey: string,
  startDate: string,
  endDate: string
): Promise<SpaceWeatherAlert[]> {
  const payload = await fetchWithTimeout(
    buildUrl('GST', apiKey, startDate, endDate)
  );

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter(isRecord)
    .map(mapStorm)
    .filter((alert): alert is SpaceWeatherAlert => alert !== null);
}

function dedupeAndSort(alerts: SpaceWeatherAlert[]): SpaceWeatherAlert[] {
  const unique = new Map<string, SpaceWeatherAlert>();

  for (const alert of alerts) {
    unique.set(alert.id, alert);
  }

  return Array.from(unique.values()).sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
  );
}

function offlineResponse(): Response {
  const body: SpaceWeatherResponse = {
    alerts: cachedAlerts,
    source: 'OFFLINE_CACHED',
    connectivity: cachedConnectivity === 'EARTH_DSN_SYNC' ? 'EARTH_DSN_SYNC' : 'OFFLINE_EDGE',
    fetchedAt: new Date().toISOString(),
    cached: true,
  };

  return Response.json(body, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function GET(): Promise<Response> {
  try {
    const apiKey = process.env.NASA_API_KEY?.trim() || 'DEMO_KEY';
    const { startDate, endDate } = getWindow();

    const results = await Promise.allSettled([
      fetchFlares(apiKey, startDate, endDate),
      fetchStorms(apiKey, startDate, endDate),
    ]);

    const alerts: SpaceWeatherAlert[] = [];
    let fulfilled = 0;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        fulfilled += 1;
        alerts.push(...result.value);
      }
    }

    if (fulfilled === 0) {
      return offlineResponse();
    }

    const deduped = dedupeAndSort(alerts);

    if (deduped.length > 0) {
      cachedAlerts = deduped;
      cachedConnectivity = 'EARTH_DSN_SYNC';
    }

    const body: SpaceWeatherResponse = {
      alerts: deduped,
      source: 'NASA_DONKI',
      connectivity: 'EARTH_DSN_SYNC',
      fetchedAt: new Date().toISOString(),
      cached: false,
    };

    return Response.json(body, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return offlineResponse();
  }
}
