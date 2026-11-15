/**
 * ASTRO-SENTINEL — Shared Telemetry Contract
 * -------------------------------------------
 * The single source of truth for the frontend, the service adapter, the
 * NASA DONKI edge route and the black-box syncer. Frontend and backend
 * both code against these types — no conflicting duplicates anywhere.
 */

/** Focal organ zones rendered as interactive nodes on the holographic twin. */
export type OrganZone = 'brain' | 'heart' | 'spine' | null;

/**
 * OFFLINE_EDGE   — autonomous on-board inference, black-box logs stay local.
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
  /** 'online' = Multi-LLM chain (OpenRouter → Gemini → Grok); 'offline' = on-device edge engine. */
  engine?: 'online' | 'offline';
  /** Provider label when engine === 'online' (e.g. OPENROUTER, GEMINI, GROK). */
  provider?: string;
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

/* ------------------------------------------------------------------ */
/*  NASA DONKI + Black Box — live backend utilities (unified above)   */
/* ------------------------------------------------------------------ */

export type SpaceWeatherSeverity =
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'SEVERE'
  | 'EXTREME';

export interface SpaceWeatherResponse {
  alerts: SpaceWeatherAlert[];
  /** Where the alerts came from. */
  source: 'NASA_DONKI' | 'OFFLINE_CACHED';
  connectivity: ConnectivityMode;
  fetchedAt: string;
  cached: boolean;
}

export type BlackBoxLogType =
  | 'TELEMETRY'
  | 'TRIAGE'
  | 'ALERT'
  | 'SYSTEM'
  | 'SYNC';

export interface BlackBoxLog {
  id: string;
  type: BlackBoxLogType;
  timestamp: string;
  payload: unknown;
  synced: boolean;
}

export type DsnSyncStatus = 'SYNCED' | 'QUEUED' | 'OFFLINE' | 'ERROR';

export interface DsnSyncResult {
  status: DsnSyncStatus;
  mode: ConnectivityMode;
  syncedCount: number;
  pendingCount: number;
  timestamp: string;
  message: string;
}
