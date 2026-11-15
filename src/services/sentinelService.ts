/**
 * ============================================================================
 *  ASTRO-SENTINEL — SERVICE ADAPTER  ⚡ THE SINGLE SWAP POINT ⚡
 * ============================================================================
 *
 *  UI components only ever import from this module. Swap the implementation
 *  here and every screen (telemetry, 3D twin, flight surgeon, black box)
 *  picks up the change — no UI code changes required.
 *
 *  USE_MOCK_DATA = false → live path:
 *    fetchCrewProfiles()          → deterministic crew roster (no network)
 *    fetchTelemetrySnapshot()     → /api/nasa (live NASA DONKI) + local edge
 *                                   math (calculateLiveHazardsAndVitals)
 *    executeFlightSurgeonTriage() → Multi-LLM chain (/api/triage → OpenRouter →
 *                                   Gemini → Grok, 4s each) with on-device offline
 *                                   edge fallback (evaluateEdgeTriage, 0ms)
 *    syncBlackBoxLogs()           → localStorage black box + DSN sync
 *
 *  Offline fallback: any network failure degrades to deterministic local
 *  computation (mockTelemetry) instead of throwing, so the cockpit keeps
 *  working without a signal — autonomy locked, as advertised.
 * ============================================================================
 */

import { getMockCrewProfiles, getMockTelemetrySnapshot } from '@/lib/mockTelemetry';
import {
  calculateLiveHazardsAndVitals,
  evaluateEdgeTriage,
} from '@/lib/edgeMedicalAI';
import {
  saveLogToBlackBox,
  syncLogsWithEarthDSN,
} from '@/lib/storageSync';
import type {
  AstronautVitals,
  ConnectivityMode,
  SyncResult,
  TelemetrySnapshot,
  TriageProtocol,
} from '@/types/telemetry';

export const USE_MOCK_DATA = false;

const TELEMETRY_TIMEOUT_MS = 6000;

type BlackBoxEntry = {
  type: 'TELEMETRY' | 'TRIAGE' | 'ALERT' | 'SYSTEM' | 'SYNC';
  payload: unknown;
};

function safeSave(entry: BlackBoxEntry): void {
  try {
    saveLogToBlackBox(entry);
  } catch {
    return;
  }
}

/** True when the alert carries a meaningful solar-particle signal. */
function detectSolarStorm(alerts: TelemetrySnapshot['weather'][]): boolean {
  return alerts.some(
    (alert) =>
      alert.kpIndex >= 5 ||
      /^[XMK]/i.test(alert.flareClass) ||
      /SOLAR PARTICLE|GEOMAGNETIC/i.test(alert.eventType),
  );
}

function firstActiveAlert(
  alerts: TelemetrySnapshot['weather'][],
): TelemetrySnapshot['weather'] | null {
  return alerts.find((alert) => detectSolarStorm([alert])) ?? alerts[0] ?? null;
}

const KP_FALLBACK = 7.2;
const FLARE_FALLBACK = 'M6.1';

/**
 * Synthesize a storm event for the user-triggered "Solar Storm" scenario even
 * when NASA reports nothing right now — keeps the demo deterministic and
 * exercises the same autonomous path as a real DONKI event.
 */
function syntheticStormAlert(day: number): TelemetrySnapshot['weather'] {
  return {
    id: `SPE-SIM-${day}-${Date.now().toString(36).toUpperCase()}`,
    eventType: 'SOLAR PARTICLE EVENT — CME ARRIVAL (SIMULATED)',
    flareClass: day > 120 ? 'X2.4' : FLARE_FALLBACK,
    kpIndex: KP_FALLBACK + Math.sin(day * 0.4) * 0.8,
    radiationImpactmSv: 13.8,
    timestamp: new Date().toISOString(),
  };
}

function nominalWeather(): TelemetrySnapshot['weather'] {
  return {
    id: 'SOL-NOMINAL',
    eventType: 'SOLAR ACTIVITY NOMINAL',
    flareClass: 'C1.2',
    kpIndex: 2.1,
    radiationImpactmSv: 0.2,
    timestamp: new Date().toISOString(),
  };
}

function baseProfileFor(crewId: string): AstronautVitals {
  const profiles = getMockCrewProfiles();
  const match = profiles.find((profile) => profile.crewId === crewId);
  return match ?? profiles[0];
}

function buildSnapshotFromLocal(
  crewId: string,
  missionDay: number,
  solarStormActive: boolean,
): TelemetrySnapshot {
  const base = baseProfileFor(crewId);
  const { vitals, hazards } = calculateLiveHazardsAndVitals(
    base,
    missionDay,
    solarStormActive,
  );

  return {
    vitals,
    hazards,
    weather: solarStormActive
      ? syntheticStormAlert(missionDay)
      : nominalWeather(),
  };
}

/**
 * Crew roster for the header selector. The roster itself is static mission
 * data, so it is resolved locally and never goes over the wire.
 */
export async function fetchCrewProfiles(): Promise<AstronautVitals[]> {
  return getMockCrewProfiles();
}

/**
 * One complete telemetry frame: biomarkers + HRP hazard scores + space weather,
 * computed from the live NASA DONKI feed when reachable, or from the local
 * deterministic model when offline.
 */
export async function fetchTelemetrySnapshot(
  crewId: string,
  missionDay: number,
  solarStormActive: boolean,
): Promise<TelemetrySnapshot> {
  if (USE_MOCK_DATA) {
    return getMockTelemetrySnapshot(crewId, missionDay, solarStormActive);
  }

  const safeDay = Number.isFinite(missionDay)
    ? Math.max(1, Math.round(missionDay))
    : 1;

  const base = baseProfileFor(crewId);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEMETRY_TIMEOUT_MS);

  try {
    const response = await fetch('/api/nasa', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`NASA route returned ${response.status}`);
    }

    const data = (await response.json()) as {
      alerts?: TelemetrySnapshot['weather'][];
    };
    const alerts = Array.isArray(data.alerts) ? data.alerts : [];

    // Explicit user simulation wins; otherwise detect from live alerts.
    const stormActive = solarStormActive || detectSolarStorm(alerts);

    const { vitals, hazards } = calculateLiveHazardsAndVitals(
      base,
      safeDay,
      stormActive,
    );

    // If the user explicitly simulated the storm but NASA is quiet, surface a
    // synthetic SPE so the cockpit stays visually coherent.
    const weather =
      stormActive && solarStormActive && alerts.length === 0
        ? syntheticStormAlert(safeDay)
        : firstActiveAlert(alerts) ?? nominalWeather();

    safeSave({
      type: 'TELEMETRY',
      payload: {
        crewId,
        missionDay: safeDay,
        solarStormActive: stormActive,
        alertCount: alerts.length,
      },
    });

    return { vitals, hazards, weather };
  } catch {
    // Clean offline fallback — local deterministic model, never throws.
    const snapshot = buildSnapshotFromLocal(crewId, safeDay, solarStormActive);

    safeSave({
      type: 'SYSTEM',
      payload: {
        event: 'TELEMETRY_OFFLINE',
        crewId,
        missionDay: safeDay,
        solarStormActive,
      },
    });

    return snapshot;
  } finally {
    clearTimeout(timer);
  }
}

const HEALTH_TIMEOUT_MS = 4500; // slightly above the 4s provider timeout
const ORGAN_LOWER: Record<string, 'brain' | 'heart' | 'spine'> = {
  BRAIN: 'brain',
  HEART: 'heart',
  SPINE: 'spine',
};

/** Online Multi-LLM result shape returned by /api/triage (or fallback:true). */
interface OnlineTriageResult {
  severity: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  organ: 'BRAIN' | 'HEART' | 'SPINE';
  headline: string;
  steps: string[];
  provider: string;
}

function toOnlineProtocol(raw: OnlineTriageResult): TriageProtocol {
  const steps = [raw.steps[0], raw.steps[1], raw.steps[2]] as [string, string, string];
  return {
    severity: raw.severity,
    affectedOrgan: ORGAN_LOWER[raw.organ] ?? 'brain',
    diagnosis: raw.headline,
    steps,
    timestamp: new Date().toISOString(),
    synced: false,
    engine: 'online',
    provider: raw.provider,
  };
}

function offlineProtocol(
  query: string,
  vitals: AstronautVitals,
  solarStormActive: boolean,
): TriageProtocol {
  return {
    ...evaluateEdgeTriage(query, vitals, solarStormActive),
    engine: 'offline',
  };
}

/**
 * AI Flight Surgeon. Online path (when the device reports connectivity):
 * POSTs to /api/triage which runs OpenRouter → Gemini → Grok with a 4s
 * timeout each. Any failure, `{fallback:true}`, or `navigator.onLine === false`
 * drops straight to the on-device offline edge engine — zero user errors.
 * Every triage is saved to the black box either way.
 */
export async function executeFlightSurgeonTriage(
  query: string,
  vitals: AstronautVitals,
  solarStormActive: boolean,
  mode: ConnectivityMode,
): Promise<TriageProtocol> {
  let protocol: TriageProtocol | null = null;

  const online =
    typeof navigator === 'undefined' || navigator.onLine !== false;

  if (online && query.trim().length > 0) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          symptom: query,
          vitals,
          hazards: {
            radiation: Math.round(
              Math.min(100, (vitals.cumulativeRadiation / 250) * 100),
            ),
            isolation: 40,
            distanceFromEarth: 30,
            gravityFields: 40,
            hostileEnvironment: solarStormActive ? 70 : 30,
          },
          missionDay: 90,
          crewMember: `${vitals.name} · ${vitals.role}`,
        }),
        signal: controller.signal,
        cache: 'no-store',
      });

      if (response.ok) {
        const data = (await response.json()) as OnlineTriageResult & {
          fallback?: boolean;
        };
        if (
          data &&
          data.fallback !== true &&
          (data.severity === 'NOMINAL' ||
            data.severity === 'WARNING' ||
            data.severity === 'CRITICAL') &&
          (data.organ === 'BRAIN' || data.organ === 'HEART' || data.organ === 'SPINE') &&
          Array.isArray(data.steps) &&
          data.steps.length >= 3 &&
          typeof data.headline === 'string'
        ) {
          protocol = toOnlineProtocol(data);
        }
      }
    } catch {
      protocol = null;
    } finally {
      clearTimeout(timer);
    }
  }

  if (!protocol) {
    protocol = offlineProtocol(query, vitals, solarStormActive);
  }

  safeSave({
    type: 'TRIAGE',
    payload: {
      query,
      mode,
      engine: protocol.engine,
      provider: protocol.provider ?? null,
      severity: protocol.severity,
      affectedOrgan: protocol.affectedOrgan,
      diagnosis: protocol.diagnosis,
    },
  });

  return protocol;
}

/**
 * Drains the on-board black box to Earth DSN when the link is open, or holds
 * everything locally when autonomous offline edge mode is active.
 */
export async function syncBlackBoxLogs(
  logs: TriageProtocol[],
  mode: ConnectivityMode,
): Promise<SyncResult> {
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

    if (mode === 'OFFLINE_EDGE') {
      return { syncedCount: 0, lastSyncTime: result.timestamp };
    }

    return {
      syncedCount: result.syncedCount > 0 ? result.syncedCount : logs.length,
      lastSyncTime: result.timestamp,
    };
  } catch {
    return { syncedCount: 0, lastSyncTime: new Date().toISOString() };
  }
}
