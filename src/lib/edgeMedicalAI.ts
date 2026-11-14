import type {
  AstronautVitals,
  HazardLevel,
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

const BASE_DOSE_RATE_MSV_PER_DAY = 0.3;
const STORM_DOSE_RATE_MSV_PER_DAY = 1.2;
const BONE_LOSS_PCT_PER_DAY = 0.05;
const STORM_BONE_PENALTY_PCT = 0.5;
const CAREER_RADIATION_LIMIT_MSV = 600;

const SEVERITY_RANK: Record<TriageSeverity, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  CRITICAL: 3,
};

const ZONE_PRIORITY: Record<OrganZone, number> = {
  heart: 0,
  brain: 1,
  spine: 2,
};

interface TriageCandidate {
  zone: OrganZone;
  condition: string;
  severity: TriageSeverity;
  recommendation: string;
  steps: string[];
  confidence: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/\s+/g, ' ').trim();
}

function buildProtocol(
  candidate: TriageCandidate,
  solarStormActive: boolean
): TriageProtocol {
  return {
    id: makeId('triage'),
    zone: candidate.zone,
    condition: candidate.condition,
    severity: candidate.severity,
    recommendation: candidate.recommendation,
    steps: candidate.steps,
    confidence: candidate.confidence,
    solarStormActive,
    createdAt: new Date().toISOString(),
  };
}

export function evaluateEdgeTriage(
  query: string,
  vitals: AstronautVitals,
  solarStormActive: boolean
): TriageProtocol {
  const normalizedQuery = normalizeQuery(query);
  const candidates: TriageCandidate[] = [];

  const radiationTriggered =
    vitals.radiationExposure > RADIATION_MSV ||
    (solarStormActive && vitals.radiationExposure > 100);
  const boneTriggered = vitals.boneDensity < BONE_DENSITY_PCT;

  if (radiationTriggered || boneTriggered || solarStormActive) {
    const severity: TriageSeverity =
      vitals.radiationExposure > 250 || vitals.boneDensity < 80
        ? 'CRITICAL'
        : vitals.radiationExposure > RADIATION_MSV ||
            vitals.boneDensity < BONE_DENSITY_PCT
          ? 'HIGH'
          : 'MODERATE';

    candidates.push({
      zone: 'spine',
      condition:
        radiationTriggered || solarStormActive
          ? 'Radiation / skeletal risk during solar activity'
          : 'Bone density loss',
      severity,
      recommendation:
        severity === 'CRITICAL'
          ? 'Shelter immediately and initiate flight-surgeon radiation protocol.'
          : 'Limit EVA exposure and begin skeletal countermeasure protocol.',
      steps: [
        'Move to the nearest radiation shelter or storm cellar.',
        'Limit EVA exposure and secure the suit life-support loop.',
        'Start hydration and calcium intake protocol.',
        'Notify the flight surgeon and log cumulative dose.',
        'Schedule a DXA bone-density scan at the next opportunity.',
      ],
      confidence: 0.88,
    });
  }

  if (vitals.heartRate > TACHYCARDIA_BPM) {
    const severity: TriageSeverity =
      vitals.heartRate > 140
        ? 'CRITICAL'
        : vitals.heartRate > 125
          ? 'HIGH'
          : 'MODERATE';

    candidates.push({
      zone: 'heart',
      condition: 'Tachycardia detected',
      severity,
      recommendation:
        severity === 'CRITICAL'
          ? 'Abort EVA and initiate cardiac monitoring immediately.'
          : 'Stop exertion and reassess cardiac status before continuing.',
      steps: [
        'Stop all activity and sit or brace securely.',
        'Rest for five minutes and re-measure heart rate.',
        'Check blood pressure, SpO2, and respiratory rate.',
        'Run an ECG if the suit or habitat monitor supports it.',
        'Notify the flight surgeon with the trend data.',
      ],
      confidence: 0.92,
    });
  }

  const dizzinessTriggered = DIZZINESS_TERMS.some((term) =>
    normalizedQuery.includes(term)
  );

  if (dizzinessTriggered) {
    const severity: TriageSeverity =
      vitals.oxygenSaturation < 92 || vitals.systolicBP < 90
        ? 'HIGH'
        : 'MODERATE';

    candidates.push({
      zone: 'brain',
      condition: 'EVA-associated dizziness / vestibular disturbance',
      severity,
      recommendation:
        'Halt EVA movement, secure tethers, and run a neurological and orthostatic check.',
      steps: [
        'Halt EVA movement and secure all tethers.',
        'Perform an orthostatic blood-pressure check.',
        'Verify CO2 scrubber status and SpO2.',
        'Run a simple cognitive orientation check.',
        'Guide the astronaut back using the shortest safe route.',
      ],
      confidence: 0.86,
    });
  }

  if (candidates.length === 0) {
    return buildProtocol(
      {
        zone: 'brain',
        condition: 'No acute organ-specific distress detected',
        severity: 'LOW',
        recommendation: 'Continue EVA with standard monitoring.',
        steps: [
          'Maintain standard EVA check-ins.',
          'Reassess vitals every 15 minutes.',
          'Escalate immediately if symptoms change.',
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

function overallHazardLevel(score: number): HazardLevel {
  if (score >= 80) {
    return 'CRITICAL';
  }
  if (score >= 60) {
    return 'HIGH';
  }
  if (score >= 40) {
    return 'ELEVATED';
  }
  return 'LOW';
}

export function calculateLiveHazardsAndVitals(
  baseVitals: AstronautVitals,
  missionDay: number,
  solarStormActive: boolean
): { vitals: AstronautVitals; hazards: NasaHazardStatus } {
  const safeMissionDay = Number.isFinite(missionDay)
    ? Math.max(0, missionDay)
    : 0;
  const updatedAt = new Date().toISOString();

  const doseRate = solarStormActive
    ? STORM_DOSE_RATE_MSV_PER_DAY
    : BASE_DOSE_RATE_MSV_PER_DAY;
  const radiationExposure = round1(
    baseVitals.radiationExposure + doseRate * safeMissionDay
  );

  const vitals: AstronautVitals = {
    heartRate: clamp(
      Math.round(
        baseVitals.heartRate +
          0.15 * safeMissionDay +
          (solarStormActive ? 12 : 0)
      ),
      40,
      200
    ),
    systolicBP: clamp(
      Math.round(
        baseVitals.systolicBP -
          0.03 * safeMissionDay +
          (solarStormActive ? 6 : 0)
      ),
      70,
      200
    ),
    diastolicBP: clamp(
      Math.round(
        baseVitals.diastolicBP -
          0.02 * safeMissionDay +
          (solarStormActive ? 4 : 0)
      ),
      40,
      130
    ),
    oxygenSaturation: round1(
      clamp(
        baseVitals.oxygenSaturation -
          0.01 * safeMissionDay -
          (solarStormActive ? 0.5 : 0),
        80,
        100
      )
    ),
    bodyTemperature: round1(
      clamp(
        baseVitals.bodyTemperature +
          0.005 * safeMissionDay +
          (solarStormActive ? 0.2 : 0),
        34,
        42
      )
    ),
    respiratoryRate: clamp(
      Math.round(
        baseVitals.respiratoryRate +
          0.05 * safeMissionDay +
          (solarStormActive ? 2 : 0)
      ),
      8,
      40
    ),
    radiationExposure,
    boneDensity: round1(
      clamp(
        baseVitals.boneDensity -
          BONE_LOSS_PCT_PER_DAY * safeMissionDay -
          (solarStormActive ? STORM_BONE_PENALTY_PCT : 0),
        60,
        120
      )
    ),
    cognitivePerformance: round1(
      clamp(
        baseVitals.cognitivePerformance -
          0.15 * safeMissionDay -
          (solarStormActive ? 8 : 0),
        0,
        100
      )
    ),
    updatedAt,
  };

  const radiation = clamp(
    Math.round((vitals.radiationExposure / CAREER_RADIATION_LIMIT_MSV) * 100),
    0,
    100
  );
  const isolationConfinement = clamp(
    Math.round(safeMissionDay * 0.35),
    0,
    100
  );
  const distanceFromEarth = clamp(
    Math.round((safeMissionDay / 365) * 100),
    0,
    100
  );
  const gravityFields = clamp(
    Math.round(safeMissionDay * 0.45),
    0,
    100
  );
  const hostileEnvironment = clamp(
    Math.round(
      20 + safeMissionDay * 0.15 + (solarStormActive ? 40 : 0)
    ),
    0,
    100
  );

  const overallScore = Math.max(
    radiation,
    isolationConfinement,
    distanceFromEarth,
    gravityFields,
    hostileEnvironment
  );

  const hazards: NasaHazardStatus = {
    radiation,
    isolationConfinement,
    distanceFromEarth,
    gravityFields,
    hostileEnvironment,
    overall: overallHazardLevel(overallScore),
    updatedAt,
  };

  return { vitals, hazards };
}
