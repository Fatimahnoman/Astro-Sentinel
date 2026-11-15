import type {
  AstronautVitals,
  NasaHazardStatus,
  OrganZone,
  TriageProtocol,
  TriageSeverity,
} from '../types/telemetry';

const TACHYCARDIA_BPM = 115;
const RADIATION_MSV = 150;
const BONE_DENSITY_PCT = 92;

const DIZZINESS_TERMS = [
  'dizzy',
  'dizziness',
  'vertigo',
  'lightheaded',
  'light-headed',
  'unsteady',
  'eva dizziness',
];

const BASE_DOSE_RATE_MSV_PER_DAY = 1.8;
const STORM_DOSE_RATE_MSV_PER_DAY = 6.0;
const BONE_LOSS_PCT_PER_DAY = 0.05;
const STORM_BONE_PENALTY_PCT = 0.5;
const CAREER_RADIATION_LIMIT_MSV = 250;

/**
 * Per-crew risk multipliers — commander, flight engineer and specialist do not
 * absorb the same deep-space dose or stress identically. Mirrors the crew seed
 * data in mockTelemetry (CDR 0.90 / FE 1.18 / MS 0.78 response curves).
 */
const CREW_RISK_PROFILE: Record<
  string,
  { radiation: number; isolation: number; gravity: number; bone: number }
> = {
  CDR: { radiation: 0.9, isolation: 0.8, gravity: 0.85, bone: 0.9 },
  FE: { radiation: 1.2, isolation: 1.05, gravity: 1.2, bone: 1.15 },
  MS: { radiation: 0.78, isolation: 1.4, gravity: 0.72, bone: 0.72 },
};

function crewKey(crewId: string): string {
  const prefix = crewId.split('-')[0]?.toUpperCase();
  return prefix && prefix in CREW_RISK_PROFILE ? prefix : 'CDR';
}

const SEVERITY_RANK: Record<TriageSeverity, number> = {
  NOMINAL: 0,
  WARNING: 1,
  CRITICAL: 2,
};

const ZONE_PRIORITY: Record<NonNullable<OrganZone>, number> = {
  heart: 0,
  brain: 1,
  spine: 2,
};

interface TriageCandidate {
  zone: NonNullable<OrganZone>;
  diagnosis: string;
  severity: TriageSeverity;
  steps: [string, string, string];
  confidence: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildProtocol(
  candidate: TriageCandidate,
  solarStormActive: boolean
): TriageProtocol {
  return {
    severity: candidate.severity,
    affectedOrgan: candidate.zone,
    diagnosis: candidate.diagnosis,
    steps: candidate.steps,
    timestamp: new Date().toISOString(),
    synced: false,
  };
}

export function evaluateEdgeTriage(
  query: string,
  vitals: AstronautVitals,
  solarStormActive: boolean
): TriageProtocol {
  const normalizedQuery = normalizeQuery(query);
  const candidates: TriageCandidate[] = [];

  const dose = vitals.cumulativeRadiation;
  const radiationTriggered =
    dose > RADIATION_MSV || (solarStormActive && dose > 100);
  const boneTriggered = vitals.boneDensity < BONE_DENSITY_PCT;

  if (radiationTriggered || boneTriggered || solarStormActive) {
    const severity: TriageSeverity =
      dose > 250 || vitals.boneDensity < 80 ? 'CRITICAL' : 'WARNING';

    candidates.push({
      zone: 'spine',
      diagnosis:
        radiationTriggered || solarStormActive
          ? 'Elevated radiation dose during solar activity — limiting EVA exposure'
          : 'Bone-density loss below flight-monitoring threshold',
      severity,
      steps: [
        solarStormActive
          ? 'Move to the nearest radiation shelter or storm cellar now.'
          : 'Limit EVA exposure and stay shielded when outside.',
        'Start the hydration and calcium intake protocol.',
        'Notify the flight surgeon and log the cumulative dose.',
      ],
      confidence: 0.88,
    });
  }

  if (vitals.heartRate > TACHYCARDIA_BPM) {
    const severity: TriageSeverity =
      vitals.heartRate > 140 ? 'CRITICAL' : 'WARNING';

    candidates.push({
      zone: 'heart',
      diagnosis: `Tachycardia detected — ${vitals.heartRate} BPM sustained`,
      severity,
      steps: [
        'Stop all activity and sit or brace securely.',
        'Rest for five minutes and re-measure heart rate.',
        'Run a 12-lead snapshot check; notify the flight surgeon.',
      ],
      confidence: 0.92,
    });
  }

  const dizzinessTriggered = DIZZINESS_TERMS.some((term) =>
    normalizedQuery.includes(term)
  );

  if (dizzinessTriggered) {
    const severity: TriageSeverity =
      vitals.spo2 < 92 ? 'CRITICAL' : 'WARNING';

    candidates.push({
      zone: 'brain',
      diagnosis:
        'EVA-associated dizziness / vestibular disturbance — possible SANS or orthostatic strain',
      severity,
      steps: [
        'Halt EVA movement and secure all tethers.',
        'Perform an orthostatic check and verify SpO2 and CO2 scrubber status.',
        'Guide the astronaut back via the shortest safe route and notify the flight surgeon.',
      ],
      confidence: 0.86,
    });
  }

  if (candidates.length === 0) {
    return buildProtocol(
      {
        zone: 'brain',
        diagnosis:
          'No acute organ-specific distress detected — continue with routine EVA monitoring',
        severity: 'NOMINAL',
        steps: [
          'Maintain standard EVA check-ins every 15 minutes.',
          'Log any change in symptoms immediately.',
          'Return to the habitat at the end of the shift for a full work-up.',
        ],
        confidence: 0.4,
      },
      solarStormActive
    );
  }

  const selected = candidates.sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      ZONE_PRIORITY[a.zone] - ZONE_PRIORITY[b.zone]
  )[0];

  return buildProtocol(selected, solarStormActive);
}

export function calculateLiveHazardsAndVitals(
  baseVitals: AstronautVitals,
  missionDay: number,
  solarStormActive: boolean
): { vitals: AstronautVitals; hazards: NasaHazardStatus } {
  const safeMissionDay = Number.isFinite(missionDay)
    ? Math.max(0, Math.round(missionDay))
    : 0;

  const profile = CREW_RISK_PROFILE[crewKey(baseVitals.crewId)] ?? {
    radiation: 1,
    isolation: 1,
    gravity: 1,
    bone: 1,
  };

  const doseRate = solarStormActive
    ? STORM_DOSE_RATE_MSV_PER_DAY
    : BASE_DOSE_RATE_MSV_PER_DAY;
  const cumulativeRadiation = round1(
    baseVitals.cumulativeRadiation + doseRate * safeMissionDay * profile.radiation
  );

  const vitals: AstronautVitals = {
    crewId: baseVitals.crewId,
    name: baseVitals.name,
    role: baseVitals.role,
    heartRate: clamp(
      Math.round(
        baseVitals.heartRate + 0.15 * safeMissionDay + (solarStormActive ? 12 : 0)
      ),
      40,
      200
    ),
    spo2: round1(
      clamp(
        baseVitals.spo2 - 0.01 * safeMissionDay - (solarStormActive ? 0.5 : 0),
        80,
        100
      )
    ),
    coreTemp: round1(
      clamp(
        baseVitals.coreTemp + 0.005 * safeMissionDay + (solarStormActive ? 0.2 : 0),
        34,
        42
      )
    ),
    sleepScore: clamp(
      Math.round(
        baseVitals.sleepScore -
          0.05 * safeMissionDay -
          (solarStormActive ? 6 * profile.isolation : 0)
      ),
      20,
      100
    ),
    boneDensity: round1(
      clamp(
        baseVitals.boneDensity -
          BONE_LOSS_PCT_PER_DAY * safeMissionDay * profile.bone -
          (solarStormActive ? STORM_BONE_PENALTY_PCT * profile.bone : 0),
        60,
        120
      )
    ),
    cumulativeRadiation,
    heartRateHistory: baseVitals.heartRateHistory,
  };

  const radiation = clamp(
    Math.round((cumulativeRadiation / CAREER_RADIATION_LIMIT_MSV) * 100),
    0,
    100
  );

  const hazards: NasaHazardStatus = {
    radiation,
    isolation: clamp(
      Math.round(safeMissionDay * 0.35 * profile.isolation),
      0,
      100
    ),
    distanceFromEarth: clamp(
      Math.round((safeMissionDay / 365) * 100 * (0.75 + profile.radiation * 0.25)),
      0,
      100
    ),
    gravityFields: clamp(
      Math.round(safeMissionDay * 0.45 * profile.gravity),
      0,
      100
    ),
    hostileEnvironment: clamp(
      Math.round(
        20 +
          safeMissionDay * 0.15 * profile.radiation +
          (solarStormActive ? 40 * profile.radiation : 0)
      ),
      0,
      100
    ),
  };

  return { vitals, hazards };
}
