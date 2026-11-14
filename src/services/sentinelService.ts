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
}
