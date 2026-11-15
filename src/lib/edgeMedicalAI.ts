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

/**
 * Live one-line vitals snapshot embedded in step text so every protocol is
 * visibly grounded in the crew member's current readings.
 */
function vitalsLine(v: AstronautVitals): string {
  return `HR ${v.heartRate} BPM · SpO2 ${v.spo2.toFixed(1)}% · CORE ${v.coreTemp.toFixed(1)}°C · DOSE ${v.cumulativeRadiation.toFixed(1)} mSv`;
}

/* ------------------------------------------------------------------ */
/*  Offline clinical knowledge base — explicit symptom → 3-step care    */
/* ------------------------------------------------------------------ */

const BRAIN_TERMS = [
  'dizzy', 'dizziness', 'vertigo', 'lightheaded', 'light-headed', 'giddy', 'unsteady',
  'motion sickness', 'space motion sickness', 'sms', 'sickness', 'nausea', 'nauseous',
  'queasy', 'vomit', 'headache', 'head pain', 'head-ache', 'migraine', 'skull',
  'blurry', 'blurred', 'vision', 'eye pressure', 'eye pain', 'ocular', 'sans',
  'disorient', 'confusion', 'confused', 'disorientation', 'lost', 'fatigue',
  'fatigued', 'tired', 'exhaustion', 'exhausted', 'burnout', 'insomnia', 'sleepless',
  'sleep', 'sleepy', 'drowsy', 'yawn', 'restlessness',
];

const HEART_TERMS = [
  'tachycardia', 'tachy', 'palpitation', 'racing heart', 'racing pulse',
  'heart pounding', 'pounding heart', 'chest pain', 'chest pressure', 'chest tightness',
  'shortness of breath', 'short of breath', 'breathless', "can't breathe", 'cant breathe',
  'sob', 'hypoxia', 'hypoxic', 'low oxygen', 'low spo2', 'low sat', 'oxygen saturation',
  'orthostatic', 'presyncope', 'faint', 'syncope', 'lightheadedness on standing',
  'heart rate', 'irregular', 'skipped beat', 'arrhythmia', 'arrhythmia', 'missed beat',
  'rapid pulse', 'fast heart',
];

const SPINE_TERMS = [
  'back pain', 'backache', 'back ache', 'spine', 'spinal', 'vertebr', 'elongation',
  'bone pain', 'bone ache', 'sore bone', 'bone soreness', 'muscle sore', 'sore muscle',
  'muscle ache', 'joint pain', 'joint ache', 'knee pain', 'hip pain', 'shoulder pain',
  'suit strain', 'eva strain', 'eva suit', 'hard suit', 'radiation', 'solar flare',
  'solar storm', 'flare', 'geomagnetic', 'skin burn', 'sunburn', 'burn', 'blister',
  'dehydration', 'dehydrated', 'thirsty', 'heat', 'heat stroke', 'heat exhaustion',
];

function matchTerm(q: string, terms: string[]): string | null {
  for (const term of terms) if (q.includes(term)) return term;
  return null;
}

export function evaluateEdgeTriage(
  query: string,
  vitals: AstronautVitals,
  solarStormActive: boolean
): TriageProtocol {
  const q = normalizeQuery(query);
  const hasQuery = q.length > 0;
  const candidates: TriageCandidate[] = [];
  const dose = vitals.cumulativeRadiation;

  /* ------------------------------------------------ BRAIN — neuro-ocular
   * dizziness · vertigo · SMS · nausea · headache · blurry vision ·
   * SANS · disorientation · fatigue · insomnia                            */
  const brainHit = hasQuery ? matchTerm(q, BRAIN_TERMS) : null;
  if (brainHit) {
    const critical = vitals.spo2 < 92 || vitals.coreTemp > 38.5 || vitals.heartRate > 125;
    candidates.push({
      zone: 'brain',
      diagnosis: `Neuro-vestibular strain — reported "${brainHit}"${vitals.coreTemp > 38.5 ? ' with fever' : vitals.spo2 < 92 ? ' with low SpO2' : ''} (${vitalsLine(vitals)})`,
      severity: critical ? 'CRITICAL' : 'WARNING',
      steps: [
        `Stabilise now — sit, secure tethers, head supported; recheck HR/SpO2: ${vitalsLine(vitals)}.`,
        'Onboard check — orthostatic BP, SpO2, CO2 scrubber, hydration; antiemetic from med kit if nausea persists.',
        'Escalate — if symptoms worsen, vision changes, or fever > 38.5°C, notify flight surgeon + log to black box immediately.',
      ],
      confidence: 0.9,
    });
  }

  /* --------------------------------------------- HEART — cardio / resp
   * tachycardia · palpitations · chest pain · SOB · hypoxia · orthostatic */
  const heartHit = hasQuery ? matchTerm(q, HEART_TERMS) : null;
  if (heartHit) {
    const critical =
      vitals.heartRate > 140 ||
      (vitals.heartRate > 125 && vitals.spo2 < 93) ||
      vitals.spo2 < 92;
    candidates.push({
      zone: 'heart',
      diagnosis: `Cardiopulmonary strain — reported "${heartHit}" at ${vitals.heartRate} BPM · SpO2 ${vitals.spo2.toFixed(1)}%`,
      severity: critical ? 'CRITICAL' : 'WARNING',
      steps: [
        `Stop exertion, sit/brace, breathe slowly; recheck HR and SpO2 in 5 min (${vitalsLine(vitals)}).`,
        'Onboard check — 12-lead snapshot, BP, SpO2, resp rate, 10-min seated rest; ECG if available.',
        critical
          ? 'CRITICAL — notify flight surgeon now; prepare emergency evacuation protocol; log ECG + vitals to black box.'
          : 'Escalate — HR staying > 125 or SpO2 < 94 for 10 min → treat as CRITICAL; log to black box + notify surgeon.',
      ],
      confidence: 0.92,
    });
  }

  /* --------------------------------------- SPINE — musculoskeletal / rad
   * back pain · elongation · bone/joint soreness · EVA suit strain ·
   * solar flare · skin burn · dehydration                                 */
  const spineHit = hasQuery ? matchTerm(q, SPINE_TERMS) : null;
  if (spineHit) {
    const critical =
      dose > 250 || vitals.boneDensity < 80 || vitals.coreTemp > 39.2;
    candidates.push({
      zone: 'spine',
      diagnosis: `Musculoskeletal/radiation strain — reported "${spineHit}" (${vitalsLine(vitals)})`,
      severity: critical ? 'CRITICAL' : 'WARNING',
      steps: [
        solarStormActive || dose > RADIATION_MSV || spineHit.includes('radiation') || spineHit.includes('flare') || spineHit.includes('storm')
          ? `Move to radiation shelter NOW; dosimeter + water shielding; confirm dose log (${dose.toFixed(1)} mSv).`
          : `Stop the offending activity — unload the suit/joints; ice + rest 15 min; re-check mobility.`,
        `Hydrate 500 ml + calcium/vitamin D; assess spine loading & posture; analgesic if pain > 6/10.`,
        'Escalate — fracture suspicion, neuro deficit, or dose-rate jump → CRITICAL; notify flight surgeon; log to black box.',
      ],
      confidence: 0.88,
    });
  }

  /* ------------------------------------- GENERAL — any other symptom
   * Astronaut typed/spoke something we don't pattern-match. We still
   * issue a full protocol grounded in the exact query + live vitals so
   * no two unknown queries ever look identical.                           */
  if (candidates.length === 0 && hasQuery) {
    const vitalsHot =
      vitals.heartRate > 125 ||
      vitals.spo2 < 92 ||
      vitals.coreTemp > 38.5 ||
      vitals.sleepScore < 55;
    candidates.push({
      zone: 'brain',
      diagnosis: `Reported symptom: "${q}" — unmapped onboard presentation; grounded in live vitals (${vitalsLine(vitals)})`,
      severity: vitalsHot ? 'WARNING' : 'NOMINAL',
      steps: [
        `Stabilise immediately — stop EVA/exertion, secure tethers, sit supported; monitor: ${vitalsLine(vitals)}.`,
        `Onboard countermeasure — 500 ml fluid bolus, 10-min seated rest, review med kit (analgesants, antiemetic), re-check HR/SpO2/CORE in 15 min; keep CO2 scrubber green.`,
        `Escalation criteria — "${q}" persists > 2 h, any vital crosses threshold, or new symptom appears → treat as CRITICAL; notify flight surgeon + record outcome in black box.`,
      ],
      confidence: 0.55,
    });
  }

  /* ---------------- BACKGROUND VITAL ALERTS — only when no explicit query
   * Fires for solar storm auto-triage, vital breach, or empty query.     */
  if (candidates.length === 0) {
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
            ? `Elevated radiation dose (${dose.toFixed(1)} mSv) during solar activity — EVA exposure limit`
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

    if (vitals.spo2 < 92) {
      candidates.push({
        zone: 'heart',
        diagnosis: `Hypoxia — SpO2 ${vitals.spo2.toFixed(1)}% sustained below threshold`,
        severity: 'CRITICAL',
        steps: [
          'Immediate — stop exertion, secure, switch suit O2 to 100% / check scrubber.',
          'Re-measure SpO2 in 3 min; if < 90% continue 100% O2 and call surgeon.',
          'Log event to black box; flag EVA hold until SpO2 recovers > 94%.',
        ],
        confidence: 0.9,
      });
    }

    if (vitals.coreTemp > 38.5) {
      candidates.push({
        zone: 'brain',
        diagnosis: `Febrile syndrome — core temp ${vitals.coreTemp.toFixed(1)}°C`,
        severity: vitals.coreTemp > 39.5 ? 'CRITICAL' : 'WARNING',
        steps: [
          'Isolate, rest, measure temp every 15 min; fluids 500 ml per hour.',
          'Antipyretic from med kit (acetaminophen per protocol); cooling pack if temp > 39°C.',
          'Escalate if temp does not fall or fever locates (meningitis signs) → call surgeon + log to black box.',
        ],
        confidence: 0.85,
      });
    }
  }

  if (candidates.length === 0) {
    return buildProtocol(
      {
        zone: 'brain',
        diagnosis: `All systems nominal — continuous mesh surveillance (${vitalsLine(vitals)})`,
        severity: 'NOMINAL',
        steps: [
          `Routine check-ins every 15 min; keep HR < 125 and SpO2 > 94% (${vitalsLine(vitals)}).`,
          'Report any new symptom immediately and log it in the black box.',
          'Return to habitat at end of shift for full work-up; sleep window protected.',
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
