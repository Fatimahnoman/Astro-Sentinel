export type OrganZone = 'brain' | 'heart' | 'spine';

export type ConnectivityMode = 'ONLINE' | 'OFFLINE_CACHED' | 'DSN_SYNC';

export interface AstronautVitals {
  heartRate: number;
  systolicBP: number;
  diastolicBP: number;
  oxygenSaturation: number;
  bodyTemperature: number;
  respiratoryRate: number;
  radiationExposure: number;
  boneDensity: number;
  cognitivePerformance: number;
  updatedAt: string;
}

export type HazardLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface NasaHazardStatus {
  radiation: number;
  isolationConfinement: number;
  distanceFromEarth: number;
  gravityFields: number;
  hostileEnvironment: number;
  overall: HazardLevel;
  updatedAt: string;
}

export type TriageSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface TriageProtocol {
  id: string;
  zone: OrganZone;
  condition: string;
  severity: TriageSeverity;
  recommendation: string;
  steps: string[];
  confidence: number;
  solarStormActive: boolean;
  createdAt: string;
}

export type SpaceWeatherEventType = 'SOLAR_FLARE' | 'GEOMAGNETIC_STORM';

export type SpaceWeatherSeverity =
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'SEVERE'
  | 'EXTREME';

export type AlertSource = 'NASA_DONKI' | 'OFFLINE_CACHED';

export interface SpaceWeatherAlert {
  id: string;
  eventType: SpaceWeatherEventType;
  severity: SpaceWeatherSeverity;
  classType?: string;
  kpIndex?: number;
  startTime: string;
  peakTime?: string;
  endTime?: string;
  sourceLocation?: string;
  summary: string;
  source: AlertSource;
}

export interface SpaceWeatherResponse {
  alerts: SpaceWeatherAlert[];
  source: AlertSource;
  connectivity: ConnectivityMode;
  fetchedAt: string;
  cached: boolean;
}

export interface TelemetrySnapshot {
  missionDay: number;
  vitals: AstronautVitals;
  hazards: NasaHazardStatus;
  alerts: SpaceWeatherAlert[];
  connectivity: ConnectivityMode;
  solarStormActive: boolean;
  timestamp: string;
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
