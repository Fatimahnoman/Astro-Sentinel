<<<<<<< HEAD
/**
 * ============================================================================
 *  ASTRO-SENTINEL — SERVICE ADAPTER  ⚡ THE SINGLE SWAP POINT ⚡
 * ============================================================================
 *
 *  Flip the flag below to `false` to replace the entire deterministic
 *  simulation with the real backend / Edge AI engine.
 *
 *      export const USE_MOCK_DATA = false;
 *
 *  UI components only ever import from this module. No screen, panel, 3D
 *  scene, or hook imports `mockTelemetry.ts` directly, so no UI code changes
 *  are required when the real services come online.
 *
 *  Expected real endpoints (configurable through NEXT_PUBLIC_SENTINEL_API_URL):
 *    GET  /api/crew
 *    GET  /api/telemetry?crewId=…&missionDay=…&solarStormActive=…
 *    POST /api/flight-surgeon/triage
 *    POST /api/blackbox/sync
 * ============================================================================
 */

import {
  getMockCrewProfiles,
  getMockSyncResult,
  getMockTelemetrySnapshot,
  getMockTriageProtocol,
} from '@/lib/mockTelemetry';
import type {
  AstronautVitals,
  ConnectivityMode,
  SyncResult,
  TelemetrySnapshot,
  TriageProtocol,
} from '@/types/telemetry';

/** ⬇️⬇️⬇️  CHANGE THIS ONE FLAG TO GO LIVE  ⬇️⬇️⬇️ */
export const USE_MOCK_DATA = true;

const API_BASE_URL = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? '/api';

const latency = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

async function parseResponse<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    throw new Error(
      `${label} failed (${response.status} ${response.statusText}). ` +
        'Check NEXT_PUBLIC_SENTINEL_API_URL and the backend adapter.',
    );
  }
  return (await response.json()) as T;
}

/**
 * Crew roster used to populate the header selector and baseline profiles.
 */
export async function fetchCrewProfiles(): Promise<AstronautVitals[]> {
  if (USE_MOCK_DATA) {
    return getMockCrewProfiles();
  }

  const response = await fetch(`${API_BASE_URL}/crew`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  return parseResponse<AstronautVitals[]>(response, 'fetchCrewProfiles');
}

/**
 * One complete telemetry frame: biomarkers + HRP hazard scores + space weather.
 */
export async function fetchTelemetrySnapshot(
  crewId: string,
  missionDay: number,
  solarStormActive: boolean,
): Promise<TelemetrySnapshot> {
  if (USE_MOCK_DATA) {
    return getMockTelemetrySnapshot(crewId, missionDay, solarStormActive);
  }

  const params = new URLSearchParams({
    crewId,
    missionDay: String(missionDay),
    solarStormActive: String(solarStormActive),
  });
  const response = await fetch(`${API_BASE_URL}/telemetry?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  return parseResponse<TelemetrySnapshot>(response, 'fetchTelemetrySnapshot');
}

/**
 * Edge AI Flight Surgeon. In mock mode this is the local deterministic rule
 * engine; in live mode it is the on-board inference endpoint.
 */
export async function executeFlightSurgeonTriage(
  query: string,
  vitals: AstronautVitals,
  solarStormActive: boolean,
  mode: ConnectivityMode,
): Promise<TriageProtocol> {
  if (USE_MOCK_DATA) {
    await latency(320);
    return getMockTriageProtocol(query, vitals, solarStormActive);
  }

  const response = await fetch(`${API_BASE_URL}/flight-surgeon/triage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, vitals, solarStormActive, mode }),
    cache: 'no-store',
  });
  return parseResponse<TriageProtocol>(response, 'executeFlightSurgeonTriage');
}

/**
 * Black-box uplink. Offline edge mode keeps logs local; Earth DSN mode drains
 * the queue and returns the acknowledged record count.
 */
export async function syncBlackBoxLogs(
  logs: TriageProtocol[],
  mode: ConnectivityMode,
): Promise<SyncResult> {
  if (USE_MOCK_DATA) {
    await latency(420);
    return getMockSyncResult(logs, mode);
  }

  const response = await fetch(`${API_BASE_URL}/blackbox/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ logs, mode }),
    cache: 'no-store',
  });
  return parseResponse<SyncResult>(response, 'syncBlackBoxLogs');
=======
import type {
  AstronautVitals,
  BlackBoxLog,
  ConnectivityMode,
  DsnSyncResult,
  SpaceWeatherAlert,
  SpaceWeatherResponse,
  TelemetrySnapshot,
  TriageProtocol,
} from '../types/telemetry';
import {
  calculateLiveHazardsAndVitals,
  evaluateEdgeTriage,
} from '../lib/edgeMedicalAI';
import {
  saveLogToBlackBox,
  syncLogsWithEarthDSN,
} from '../lib/storageSync';

export const USE_MOCK_DATA = false;

const TELEMETRY_TIMEOUT_MS = 6000;

type BlackBoxEntry = Omit<BlackBoxLog, 'id' | 'timestamp' | 'synced'>;

const BASE_VITALS: AstronautVitals = {
  heartRate: 72,
  systolicBP: 120,
  diastolicBP: 80,
  oxygenSaturation: 98,
  bodyTemperature: 36.8,
  respiratoryRate: 16,
  radiationExposure: 5,
  boneDensity: 100,
  cognitivePerformance: 95,
  updatedAt: new Date(0).toISOString(),
};

function safeSave(entry: BlackBoxEntry): void {
  try {
    saveLogToBlackBox(entry);
  } catch {
    return;
  }
}

function detectSolarStorm(alerts: SpaceWeatherAlert[]): boolean {
  return alerts.some(
    (alert) =>
      (alert.eventType === 'GEOMAGNETIC_STORM' &&
        (alert.kpIndex ?? 0) >= 5) ||
      alert.severity === 'HIGH' ||
      alert.severity === 'SEVERE' ||
      alert.severity === 'EXTREME'
  );
}

function buildSnapshot(
  missionDay: number,
  alerts: SpaceWeatherAlert[],
  connectivity: ConnectivityMode
): TelemetrySnapshot {
  const solarStormActive = detectSolarStorm(alerts);
  const { vitals, hazards } = calculateLiveHazardsAndVitals(
    BASE_VITALS,
    missionDay,
    solarStormActive
  );

  return {
    missionDay,
    vitals,
    hazards,
    alerts,
    connectivity,
    solarStormActive,
    timestamp: new Date().toISOString(),
  };
}

export async function fetchTelemetrySnapshot(
  missionDay = 1
): Promise<TelemetrySnapshot> {
  const safeMissionDay = Number.isFinite(missionDay)
    ? Math.max(0, missionDay)
    : 1;

  if (USE_MOCK_DATA) {
    return buildSnapshot(safeMissionDay, [], 'ONLINE');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT_MS);

  try {
    const response = await fetch('/api/nasa', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Telemetry route returned ${response.status}`);
    }

    const data = (await response.json()) as SpaceWeatherResponse;
    const alerts = Array.isArray(data.alerts) ? data.alerts : [];
    const connectivity: ConnectivityMode =
      data.connectivity ?? (data.cached ? 'OFFLINE_CACHED' : 'ONLINE');

    const snapshot = buildSnapshot(safeMissionDay, alerts, connectivity);

    safeSave({
      type: 'TELEMETRY',
      payload: {
        missionDay: safeMissionDay,
        connectivity,
        alertCount: alerts.length,
        solarStormActive: snapshot.solarStormActive,
      },
    });

    return snapshot;
  } catch {
    const snapshot = buildSnapshot(
      safeMissionDay,
      [],
      'OFFLINE_CACHED'
    );

    safeSave({
      type: 'SYSTEM',
      payload: {
        event: 'TELEMETRY_OFFLINE',
        missionDay: safeMissionDay,
      },
    });

    return snapshot;
  } finally {
    clearTimeout(timer);
  }
}

export async function executeFlightSurgeonTriage(
  query: string,
  vitals: AstronautVitals,
  solarStormActive: boolean
): Promise<TriageProtocol> {
  const protocol = evaluateEdgeTriage(query, vitals, solarStormActive);

  safeSave({
    type: 'TRIAGE',
    payload: {
      query,
      zone: protocol.zone,
      severity: protocol.severity,
      protocolId: protocol.id,
    },
  });

  return protocol;
}

export async function syncBlackBoxLogs(
  mode: ConnectivityMode
): Promise<DsnSyncResult> {
  try {
    const result = await syncLogsWithEarthDSN(mode);

    safeSave({
      type: 'SYNC',
      payload: {
        mode,
        status: result.status,
        syncedCount: result.syncedCount,
        pendingCount: result.pendingCount,
      },
    });

    return result;
  } catch {
    return {
      status: 'ERROR',
      mode,
      syncedCount: 0,
      pendingCount: 0,
      timestamp: new Date().toISOString(),
      message: 'Black box sync failed; logs retained locally.',
    };
  }
>>>>>>> origin/backend
}
