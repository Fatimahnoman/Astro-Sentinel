import type {
  SpaceWeatherAlert,
  SpaceWeatherResponse,
  SpaceWeatherSeverity,
} from '../../../types/telemetry';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_BASE_URL = 'https://api.nasa.gov/DONKI';
const REQUEST_TIMEOUT_MS = 5000;
const LOOKBACK_DAYS = 30;

let cachedAlerts: SpaceWeatherAlert[] = [];

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

function flareSeverity(classType?: string): SpaceWeatherSeverity {
  const letter = classType?.trim().charAt(0).toUpperCase();

  switch (letter) {
    case 'X':
      return 'EXTREME';
    case 'M':
      return 'SEVERE';
    case 'C':
      return 'HIGH';
    case 'B':
      return 'MODERATE';
    default:
      return 'LOW';
  }
}

function stormSeverity(kpIndex: number): SpaceWeatherSeverity {
  if (kpIndex >= 8) {
    return 'EXTREME';
  }
  if (kpIndex >= 7) {
    return 'SEVERE';
  }
  if (kpIndex >= 6) {
    return 'HIGH';
  }
  if (kpIndex >= 5) {
    return 'MODERATE';
  }
  return 'LOW';
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
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DONKI request failed with status ${response.status}`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

function mapFlare(record: DonkiRecord): SpaceWeatherAlert | null {
  const flareId = asString(record.flrID);
  const startTime = asString(record.beginTime);

  if (!flareId || !startTime) {
    return null;
  }

  const classType = asString(record.classType);
  const sourceLocation = asString(record.sourceLocation);
  const peakTime = asString(record.peakTime);
  const endTime = asString(record.endTime);

  const alert: SpaceWeatherAlert = {
    id: `flr-${flareId}`,
    eventType: 'SOLAR_FLARE',
    severity: flareSeverity(classType),
    startTime,
    summary: classType
      ? `${classType} solar flare${sourceLocation ? ` from ${sourceLocation}` : ''}`
      : 'Solar flare detected',
    source: 'NASA_DONKI',
  };

  if (classType) {
    alert.classType = classType;
  }
  if (peakTime) {
    alert.peakTime = peakTime;
  }
  if (endTime) {
    alert.endTime = endTime;
  }
  if (sourceLocation) {
    alert.sourceLocation = sourceLocation;
  }

  return alert;
}

function mapStorm(record: DonkiRecord): SpaceWeatherAlert | null {
  const stormId = asString(record.gstID);
  const startTime = asString(record.beginTime);

  if (!stormId || !startTime) {
    return null;
  }

  const endTime = asString(record.endTime);
  const kpEntries = Array.isArray(record.allKpIndex)
    ? record.allKpIndex
    : [];

  const kpIndex = kpEntries.reduce((max, entry) => {
    if (!isRecord(entry)) {
      return max;
    }

    const value = asNumber(entry.kpIndex);
    return value === undefined ? max : Math.max(max, value);
  }, 0);

  const alert: SpaceWeatherAlert = {
    id: `gst-${stormId}`,
    eventType: 'GEOMAGNETIC_STORM',
    severity: stormSeverity(kpIndex),
    kpIndex,
    startTime,
    summary: `Geomagnetic storm peaking at Kp ${kpIndex}`,
    source: 'NASA_DONKI',
  };

  if (endTime) {
    alert.endTime = endTime;
  }

  return alert;
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
    (a, b) => Date.parse(b.startTime) - Date.parse(a.startTime)
  );
}

function offlineResponse(): Response {
  const body: SpaceWeatherResponse = {
    alerts: cachedAlerts,
    source: 'OFFLINE_CACHED',
    connectivity: 'OFFLINE_CACHED',
    fetchedAt: new Date().toISOString(),
    cached: true,
  };

  return Response.json(body, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
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
    }

    const body: SpaceWeatherResponse = {
      alerts: deduped,
      source: 'NASA_DONKI',
      connectivity: 'ONLINE',
      fetchedAt: new Date().toISOString(),
      cached: false,
    };

    return Response.json(body, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return offlineResponse();
  }
}
