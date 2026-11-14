/**
 * ASTRO-SENTINEL — Shared Telemetry Contract
 * -------------------------------------------
 * This file is the contract between the frontend and the future backend
 * (Edge AI engine, DSN sync worker, NASA SPACE RADIATION API, etc.).
 *
 * Both the mock simulation layer and the real API adapters MUST return
 * data conforming to these types.
 */

/** Focal organ zones rendered as interactive nodes on the holographic twin. */
export type OrganZone = 'brain' | 'heart' | 'spine' | null;

/**
 * OFFLINE_EDGE  — autonomous on-board inference, black-box logs stay local.
 * EARTH_DSN_SYNC — link is open to the Deep Space Network, logs can be uplinked.
 */
export type ConnectivityMode = 'OFFLINE_EDGE' | 'EARTH_DSN_SYNC';

/** Severity ladder used by the Edge AI Flight Surgeon. */
export type TriageSeverity = 'NOMINAL' | 'WARNING' | 'CRITICAL';

export interface HeartRateSample {
  /** 24-hour mission clock label, e.g. "14:00". */
  time: string;
  /** Beats per minute. */
  bpm: number;
}

export interface AstronautVitals {
  crewId: string;
  name: string;
  role: string;
  heartRate: number;
  spo2: number;
  coreTemp: number;
  /** 0–100 composite sleep quality score. */
  sleepScore: number;
  /** Percentage relative to pre-flight baseline (100 = baseline). */
  boneDensity: number;
  /** Cumulative effective dose in millisieverts (mSv). */
  cumulativeRadiation: number;
  heartRateHistory: HeartRateSample[];
}

/** NASA Human Research Program "5 Hazards of Spaceflight" — 0–100 risk scores. */
export interface NasaHazardStatus {
  radiation: number;
  isolation: number;
  distanceFromEarth: number;
  gravityFields: number;
  hostileEnvironment: number;
}

export interface TriageProtocol {
  severity: TriageSeverity;
  affectedOrgan: OrganZone;
  diagnosis: string;
  /** Exactly three ordered emergency-response steps. */
  steps: [string, string, string];
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** True after the protocol has been acknowledged by Earth DSN. */
  synced: boolean;
}

export interface SpaceWeatherAlert {
  id: string;
  eventType: string;
  /** NOAA flare classification, e.g. "X1.7", "M5.2", "C1.1". */
  flareClass: string;
  kpIndex: number;
  /** Additional effective dose contributed by this event, in mSv. */
  radiationImpactmSv: number;
  /** ISO-8601 timestamp. */
  timestamp: string;
}

export interface SyncResult {
  syncedCount: number;
  lastSyncTime: string;
}

export interface TelemetrySnapshot {
  vitals: AstronautVitals;
  hazards: NasaHazardStatus;
  weather: SpaceWeatherAlert;
}

export interface TriageRequest {
  query: string;
  vitals: AstronautVitals;
  solarStormActive: boolean;
  mode: ConnectivityMode;
}

export interface BlackBoxSyncRequest {
  logs: TriageProtocol[];
  mode: ConnectivityMode;
}
