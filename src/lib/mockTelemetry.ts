/**
 * ASTRO-SENTINEL — Deterministic Deep-Space Simulation Layer
 * -----------------------------------------------------------
 * ⚠️  UI COMPONENTS MUST NEVER IMPORT THIS FILE DIRECTLY.
 *     All access goes through `src/services/sentinelService.ts`.
 *
 * The math below models a 180-day Earth→Mars transit using simplified,
 * transparent rules inspired by NASA HRP research:
 *   • cumulative GCR/SPE dose grows roughly linearly with mission day,
 *   • bone mineral density declines ~0.03 %/day without effective ARED load,
 *   • cardiovascular deconditioning, circadian drift, and fluid shifts
 *     accumulate with time-in-flight,
 *   • the 5 HRP hazards are expressed as normalized 0–100 risk scores.
 */

import type {
  AstronautVitals,
  ConnectivityMode,
  HeartRateSample,
  NasaHazardStatus,
  OrganZone,
  SpaceWeatherAlert,
  SyncResult,
  TelemetrySnapshot,
  TriageProtocol,
  TriageSeverity,
} from '@/types/telemetry';

interface CrewSeed {
  crewId: string;
  name: string;
  role: string;
  baselineHeartRate: number;
  baselineSpo2: number;
  baselineCoreTemp: number;
  baselineSleepScore: number;
  radiationRate: number;
  boneLossRate: number;
  stressSensitivity: number;
  isolationSensitivity: number;
  phase: number;
}

const CREW_SEEDS: readonly CrewSeed[] = [
  {
    crewId: 'CDR-001',
    name: 'Elena Vance',
    role: 'Mission Commander',
    baselineHeartRate: 58,
    baselineSpo2: 98,
    baselineCoreTemp: 36.5,
    baselineSleepScore: 87,
    radiationRate: 1.62,
    boneLossRate: 0.031,
    stressSensitivity: 0.92,
    isolationSensitivity: 0.88,
    phase: 0.4,
  },
  {
    crewId: 'FE-002',
    name: 'Tariq Mahmood',
    role: 'Flight Engineer',
    baselineHeartRate: 66,
    baselineSpo2: 97,
    baselineCoreTemp: 36.7,
    baselineSleepScore: 79,
    radiationRate: 1.74,
    boneLossRate: 0.035,
    stressSensitivity: 1.12,
    isolationSensitivity: 1.04,
    phase: 2.1,
  },
  {
    crewId: 'MS-003',
    name: 'Kenji Sato',
    role: 'Mission Specialist',
    baselineHeartRate: 61,
    baselineSpo2: 98,
    baselineCoreTemp: 36.6,
    baselineSleepScore: 83,
    radiationRate: 1.55,
    boneLossRate: 0.028,
    stressSensitivity: 1.0,
    isolationSensitivity: 1.18,
    phase: 4.3,
  },
] as const;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round = (value: number, decimals = 0): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const findSeed = (crewId: string): CrewSeed =>
  CREW_SEEDS.find((seed) => seed.crewId === crewId) ?? CREW_SEEDS[0];

/** Deterministic pseudo-noise in the range [-1, 1]. */
const waveNoise = (index: number, phase: number): number =>
  Math.sin(index * 12.9898 + phase * 78.233) * 0.55 +
  Math.sin(index * 4.1414 + phase * 19.19) * 0.45;

function simulateHeartRateHistory(
  seed: CrewSeed,
  missionDay: number,
  heartRate: number,
  solarStormActive: boolean,
): HeartRateSample[] {
  return Array.from({ length: 24 }, (_, index) => {
    // Circadian dip around 03:00–05:00, mild post-prandial rise around 13:00.
    const circadian = -4.2 * Math.cos(((index - 3) / 24) * Math.PI * 2);
    const drift = Math.sin(index * 0.62 + seed.phase + missionDay * 0.021) * 3.3;
    const noise = waveNoise(index, seed.phase) * 1.4;
    const stormSpike = solarStormActive
      ? Math.max(0, Math.sin(index * 0.9 + seed.phase)) * 8.5
      : 0;

    return {
      time: `${String(index).padStart(2, '0')}:00`,
      bpm: Math.round(clamp(heartRate + circadian + drift + noise + stormSpike, 42, 185)),
    };
  });
}

function buildVitals(
  seed: CrewSeed,
  missionDay: number,
  solarStormActive: boolean,
): AstronautVitals {
  const day = clamp(Math.round(missionDay), 1, 180);
  const elapsed = day - 1;
  const storm = solarStormActive ? 1 : 0;

  const heartRate = clamp(
    seed.baselineHeartRate +
      elapsed * 0.019 +
      Math.sin(elapsed * 0.21 + seed.phase) * 2.8 +
      storm * (15.5 + seed.stressSensitivity * 3.1),
    45,
    168,
  );

  const spo2 = clamp(
    seed.baselineSpo2 -
      elapsed * 0.006 -
      storm * 1.9 -
      (seed.stressSensitivity - 1) * 0.8,
    86,
    100,
  );

  const coreTemp = clamp(
    seed.baselineCoreTemp +
      elapsed * 0.0011 +
      storm * 0.38 +
      Math.sin(elapsed * 0.17 + seed.phase) * 0.09,
    35.8,
    39.6,
  );

  const sleepScore = clamp(
    seed.baselineSleepScore -
      elapsed * 0.048 +
      Math.sin(elapsed * 0.14 + seed.phase) * 2.4 -
      storm * 9.5,
    28,
    99,
  );

  const boneDensity = clamp(
    100 -
      elapsed * seed.boneLossRate * (1 + 0.08 * Math.sin(elapsed * 0.11 + seed.phase)),
    88,
    100,
  );

  const cumulativeRadiation =
    4.2 +
    elapsed * seed.radiationRate * (1 + 0.06 * Math.sin(elapsed * 0.08 + seed.phase)) +
    storm * (12.6 + seed.stressSensitivity * 1.8);

  return {
    crewId: seed.crewId,
    name: seed.name,
    role: seed.role,
    heartRate: Math.round(heartRate),
    spo2: Math.round(spo2),
    coreTemp: round(coreTemp, 1),
    sleepScore: Math.round(sleepScore),
    boneDensity: round(boneDensity, 2),
    cumulativeRadiation: round(cumulativeRadiation, 1),
    heartRateHistory: simulateHeartRateHistory(seed, day, heartRate, solarStormActive),
  };
}

function buildHazards(
  seed: CrewSeed,
  missionDay: number,
  solarStormActive: boolean,
  vitals: AstronautVitals,
): NasaHazardStatus {
  const elapsed = clamp(Math.round(missionDay), 1, 180) - 1;
  const storm = solarStormActive ? 1 : 0;

  return {
    radiation: Math.round(
      clamp(
        18 +
          elapsed * 0.205 +
          seed.radiationRate * 8 +
          storm * 32 +
          (vitals.cumulativeRadiation > 250 ? 8 : 0),
        0,
        100,
      ),
    ),
    isolation: Math.round(
      clamp(
        12 + elapsed * 0.19 + seed.isolationSensitivity * 9 + storm * 6,
        0,
        100,
      ),
    ),
    distanceFromEarth: Math.round(clamp(6 + elapsed * 0.49, 0, 100)),
    gravityFields: Math.round(
      clamp(20 + elapsed * 0.17 + (100 - vitals.boneDensity) * 2.1, 0, 100),
    ),
    hostileEnvironment: Math.round(
      clamp(16 + elapsed * 0.12 + storm * 38 + seed.stressSensitivity * 4, 0, 100),
    ),
  };
}

function buildWeather(missionDay: number, solarStormActive: boolean): SpaceWeatherAlert {
  const day = clamp(Math.round(missionDay), 1, 180);
  const timestamp = new Date().toISOString();

  if (solarStormActive) {
    return {
      id: `SPE-${day}-${Date.now().toString(36).toUpperCase()}`,
      eventType: 'SOLAR PARTICLE EVENT — CME ARRIVAL',
      flareClass: day > 120 ? 'X2.4' : 'M6.1',
      kpIndex: round(7.2 + Math.sin(day * 0.4) * 0.8, 1),
      radiationImpactmSv: 13.8,
      timestamp,
    };
  }

  const elevated = day > 135;
  return {
    id: `SOL-${day}-NOM`,
    eventType: elevated ? 'ELEVATED SOLAR WIND — WATCH' : 'SOLAR ACTIVITY NOMINAL',
    flareClass: elevated ? 'C4.8' : 'C1.2',
    kpIndex: round(elevated ? 4.1 : 2.1 + Math.sin(day * 0.23) * 0.4, 1),
    radiationImpactmSv: elevated ? 0.8 : 0.2,
    timestamp,
  };
}

/** Crew roster returned to the selector — values represent Day 1 baseline. */
export function getMockCrewProfiles(): AstronautVitals[] {
  return CREW_SEEDS.map((seed) => buildVitals(seed, 1, false));
}

export function getMockTelemetrySnapshot(
  crewId: string,
  missionDay: number,
  solarStormActive: boolean,
): TelemetrySnapshot {
  const seed = findSeed(crewId);
  const vitals = buildVitals(seed, missionDay, solarStormActive);
  return {
    vitals,
    hazards: buildHazards(seed, missionDay, solarStormActive, vitals),
    weather: buildWeather(missionDay, solarStormActive),
  };
}

const hasAny = (query: string, terms: readonly string[]): boolean =>
  terms.some((term) => query.includes(term));

function protocol(
  severity: TriageSeverity,
  affectedOrgan: OrganZone,
  diagnosis: string,
  steps: [string, string, string],
): TriageProtocol {
  return {
    severity,
    affectedOrgan,
    diagnosis,
    steps,
    timestamp: new Date().toISOString(),
    synced: false,
  };
}

/**
 * Local, rule-based flight-surgeon triage. This is the deterministic mock
 * that the real Edge AI engine will replace behind the service adapter.
 */
export function getMockTriageProtocol(
  rawQuery: string,
  vitals: AstronautVitals,
  solarStormActive: boolean,
): TriageProtocol {
  const query = rawQuery.trim().toLowerCase();
  const hr = vitals.heartRate;
  const spo2 = vitals.spo2;
  const temp = vitals.coreTemp;
  const dose = vitals.cumulativeRadiation;
  const bone = vitals.boneDensity;

  if (
    solarStormActive ||
    hasAny(query, [
      'solar',
      'flare',
      'radiation',
      'exposure',
      'cme',
      'cosmic',
      'spe',
      'particle',
    ])
  ) {
    const critical = solarStormActive || dose >= 250 || hr >= 125;
    return protocol(
      critical ? 'CRITICAL' : 'WARNING',
      'brain',
      solarStormActive
        ? `Acute solar particle event exposure — CNS and hematopoietic risk. Cumulative dose ${dose.toFixed(
            1,
          )} mSv; HR ${hr} bpm, SpO₂ ${spo2}%.`
        : `Cumulative deep-space radiation load at ${dose.toFixed(
            1,
          )} mSv. Neurovascular surveillance required despite quiescent solar weather.`,
      [
        'Seal suit and enter the storm shelter behind polyethylene/water shielding; assume SPE brace posture.',
        'Administer antiemetic, run CBC with lymphocyte differential, and monitor for the ARS triad (nausea, erythema, cognitive fog).',
        'Stow active dosimeters, timestamp the black-box snapshot, and prep a compressed DSN burst uplink.',
      ],
    );
  }

  if (hasAny(query, ['tachycardia', 'heart', 'chest', 'palpitation', 'arrhythmia', 'cardiac', 'bpm'])) {
    const critical = hr >= 128 || solarStormActive;
    return protocol(
      critical ? 'CRITICAL' : 'WARNING',
      'heart',
      `Myocardial demand mismatch — HR ${hr} bpm with SpO₂ ${spo2}%. Possible microgravity-induced rhythm instability.`,
      [
        'Sit and brace; acquire a 12-lead ECG through the bio-harness and confirm sinus origin versus ectopy.',
        critical
          ? 'Follow CMO standing order: vagal maneuver, then 6 mg adenosine IV push if HR remains above 130 bpm.'
          : 'Apply vagal maneuver and begin continuous telemetry; hold strenuous EVA tasking.',
        'Start a 500 mL isotonic bolus, restrict stimulants, and keep the AED/telemedicine channel hot.',
      ],
    );
  }

  if (
    hasAny(query, [
      'dizzy',
      'dizziness',
      'faint',
      'syncope',
      'vision',
      'nausea',
      'spacewalk',
      'eva',
      'balance',
      'head',
      'confusion',
      'brain',
    ])
  ) {
    const critical = spo2 < 90 || hr >= 132 || temp >= 38.5;
    return protocol(
      critical ? 'CRITICAL' : 'WARNING',
      'brain',
      `Vestibular-ocular disorientation (SANS profile) — SpO₂ ${spo2}%, HR ${hr} bpm, core ${temp.toFixed(
        1,
      )} °C.`,
      [
        'Abort EVA and return to the airlock; begin 100% O₂ pre-breathe and secure the helmet seal.',
        'Run a neuro-ocular exam (visual acuity, pupils, balance, orthostatic vitals) and log every deficit.',
        'Hydrate, apply lower-body negative pressure if presyncopal, and hold EVA tasking for 24 hours.',
      ],
    );
  }

  if (hasAny(query, ['spine', 'back', 'sciatica', 'vertebra', 'disc', 'musculoskeletal', 'bone'])) {
    return protocol(
      'WARNING',
      'spine',
      `Axial unloading syndrome — bone density at ${bone.toFixed(
        2,
      )}% of pre-flight baseline with asymmetric disc load.`,
      [
        'Immobilize the thoracolumbar spine and fit the rigid lumbar orthosis; log a pain score every 15 minutes.',
        'Start the ARED eccentric-loading protocol once pain is below 4/10; avoid axial compression until cleared.',
        'Schedule spinal ultrasound and DXA trend review with the Earth musculoskeletal specialist.',
      ],
    );
  }

  if (hasAny(query, ['sleep', 'insomnia', 'fatigue', 'tired', 'exhausted', 'circadian', 'nightmare'])) {
    return protocol(
      'WARNING',
      'brain',
      `Circadian desynchrony and fatigue debt — composite sleep score ${vitals.sleepScore}/100.`,
      [
        'Enforce a 90-minute dark period and shift to a protected 8-hour sleep window; stop all blue-spectrum displays.',
        'Run a 10-minute paced-breathing session, then reassess HRV and subjective fatigue before returning to tasking.',
        'Review light-cycle scheduling with the crew behavioral health officer; log sleep debt in the black box.',
      ],
    );
  }

  // No keyword match — derive a safety verdict from the live biomarker envelope.
  if (spo2 < 90) {
    return protocol(
      'CRITICAL',
      'brain',
      `Hypoxemic episode — SpO₂ ${spo2}% is below the autonomous flight-surgeon floor.`,
      [
        'Don the pressure garment and initiate 100% O₂; verify cabin ppO₂ and suit integrity.',
        'Run a full neuro-cardiopulmonary exam and draw arterial blood gas if the habitat analyzer is available.',
        'Declare medical contingency, restrict EVA, and request an emergency DSN telemedicine window.',
      ],
    );
  }

  if (temp >= 38.2) {
    return protocol(
      'CRITICAL',
      'brain',
      `Febrile inflammatory response — core temperature ${temp.toFixed(
        1,
      )} °C with HR ${hr} bpm.`,
      [
        'Initiate passive cooling, remove excess layers, and verify the temperature with a second calibrated probe.',
        'Draw blood cultures if available, start broad-spectrum coverage per CMO order, and monitor mental status.',
        'Isolate the crew member, log contact tracing, and uplink the full vitals archive at the next DSN pass.',
      ],
    );
  }

  if (hr >= 120) {
    return protocol(
      'CRITICAL',
      'heart',
      `Sustained tachycardia — HR ${hr} bpm exceeds the autonomous red-line threshold.`,
      [
        'Stop all activity, acquire a rhythm strip, and assess for chest pain, dyspnea, or syncope.',
        'Apply vagal maneuver and prepare adenosine per CMO standing order if the rate does not settle.',
        'Move to the medical bay, keep the AED attached, and open continuous DSN telemetry.',
      ],
    );
  }

  if (bone < 94) {
    return protocol(
      'WARNING',
      'spine',
      `Accelerated skeletal demineralization — bone density at ${bone.toFixed(
        2,
      )}% of baseline late in transit.`,
      [
        'Increase ARED resistance load to the high-load prescription and prioritize heel-strike impact loading.',
        'Escalate vitamin D, calcium, and omega-3 intake; review bisphosphonate criteria with the Earth flight surgeon.',
        'Repeat DXA calibration at the next milestone and log the trend in the black box.',
      ],
    );
  }

  return protocol(
    'NOMINAL',
    null,
    `No acute pathology detected. HR ${hr} bpm, SpO₂ ${spo2}%, core ${temp.toFixed(
      1,
    )} °C, cumulative dose ${dose.toFixed(1)} mSv — all within the autonomous envelope.`,
    [
      'Continue autonomous biomarker surveillance at a 5-minute cadence; no intervention required.',
      'Maintain the ARED exercise prescription, 2.5 L daily fluid intake, and an 8-hour sleep window.',
      'Commit the assessment to the black box and defer uplink to the next DSN comms window.',
    ],
  );
}

export function getMockSyncResult(
  logs: TriageProtocol[],
  mode: ConnectivityMode,
): SyncResult {
  if (mode === 'OFFLINE_EDGE') {
    return {
      syncedCount: 0,
      lastSyncTime: 'AWAITING DSN WINDOW',
    };
  }

  const pending = logs.filter((log) => !log.synced).length;
  return {
    syncedCount: pending,
    lastSyncTime: new Date().toISOString(),
  };
}
