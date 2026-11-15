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
/*  12 Condition-Specific Offline Clinical Protocols — NASA HRP grounded */
/*  Every protocol: exact query + live vitals embedded in diagnosis +    */
/*  steps so two different symptoms never produce identical boilerplate.  */
/* ------------------------------------------------------------------ */

function matches(q: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(q));
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
  const vitalsSummary = vitalsLine(vitals);
  const quote = hasQuery ? `“${q}”` : '';

  // 1 — SANS: blurry vision / eye pressure (neuro-ocular)
  if (hasQuery && matches(q, [/blurry/, /blurred/, /vision/, /eye\s*(pressure|pain)/, /sans/, /ocular/, /sight/, /visual/])) {
    const critical = vitals.spo2 < 92 || vitals.coreTemp > 38.5;
    candidates.push({
      zone: 'brain',
      diagnosis: `SANS / neuro-ocular strain — reported ${quote} · near + distance visual blur (${vitalsSummary})`,
      severity: critical ? 'CRITICAL' : 'WARNING',
      steps: [
        `Sit erect, head supported, remove headset; read near (33 cm) + distance (400 cm) acuity card now (${vitalsSummary}).`,
        'Check optic disc via habitat fundoscope; oral acetazolamide 250 mg per SANS protocol; restrict EVA 48 h.',
        'Escalate — no acuity improvement in 2 h or rising disc edema → CRITICAL; notify flight surgeon; log acuity + photos to black box.',
      ],
      confidence: 0.9,
    });
  }

  // 2 — Post-EVA orthostatic dizziness / vertigo
  if (hasQuery && matches(q, [/dizz/, /dizziness/, /vertigo/, /lighthead/, /light-headed/, /head\s*rush/, /unsteady/, /head\s*spin/, /spinning/])) {
    const critical = vitals.spo2 < 92 || vitals.heartRate > 125;
    candidates.push({
      zone: 'brain',
      diagnosis: `Post-EVA orthostatic intolerance / vertigo — reported ${quote} (${vitalsSummary})`,
      severity: critical ? 'CRITICAL' : 'WARNING',
      steps: [
        `Lie flat, legs elevated above heart 10 min; loosen suit waist if applicable (${vitalsSummary}).`,
        'Orthostatic series — BP + HR supine, 1-min standing, 3-min standing; 500 ml oral fluids + electrolytes.',
        'Escalate — persistent vertigo > 30 min, HR > 130 or syncope → CRITICAL; return to habitat; log ECG + vitals to black box.',
      ],
      confidence: 0.9,
    });
  }

  // 3 — CO2 toxicity headache / fatigue / stuffy head
  if (hasQuery && matches(q, [/headache/, /head\s*ache/, /migraine/, /co2/, /stuffy/, /stuffed/, /co2 toxicity/, /brain fog/, /foggy head/, /pressure head/])) {
    const critical = vitals.spo2 < 92 || vitals.coreTemp > 38.5;
    candidates.push({
      zone: 'brain',
      diagnosis: `CO2 toxicity headache / CNS fatigue — reported ${quote} · likely > 2,500 ppm cabin accum. (${vitalsSummary})`,
      severity: critical ? 'CRITICAL' : 'WARNING',
      steps: [
        `Move to fresh-air mode / open CO2 scrubber loop; check cabin ppm display (${vitalsSummary}).`,
        'Rest flat in dark, fluids 500 ml, breathe deep + slow; check if others in same zone report symptoms.',
        'Escalate — headache persists > 60 min, confusion, or drowsiness → CRITICAL; notify flight surgeon; log to black box.',
      ],
      confidence: 0.88,
    });
  }

  // 4 — Insomnia / circadian / sleep disruption
  if (hasQuery && matches(q, [/insomnia/, /sleep/, /sleepless/, /drowsy/, /sleepy/, /tired/, /fatigue/, /circadian/, /can't sleep/, /wired/])) {
    candidates.push({
      zone: 'brain',
      diagnosis: `Circadian / sleep-wake disruption — reported ${quote} · sleep ${vitals.sleepScore}/100 (${vitalsSummary})`,
      severity: vitals.sleepScore < 55 ? 'WARNING' : 'NOMINAL',
      steps: [
        `Enforce 8 h protected sleep window — blue-light lockout 22:00, cabin dim, actigraphy on (${vitalsSummary}).`,
        'Caffeine NOW only if > 09:00; 20-min nap next cycle; CBT-I wind-down sequence before bed.',
        'Escalate — 2 consecutive nights < 5 h or performance degradation → CRITICAL; notify surgeon; log actigraphy to black box.',
      ],
      confidence: 0.85,
    });
  }

  // 5 — Nausea / motion sickness / SMS
  if (hasQuery && matches(q, [/nausea/, /nauseous/, /queasy/, /sick/, /vomit/, /puke/, /motion\s*sick/, /sms/, /space\s*sick/, /stomach/, /queas/])) {
    const critical = vitals.coreTemp > 38.5 || vitals.spo2 < 92;
    candidates.push({
      zone: 'brain',
      diagnosis: `Space motion sickness (SMS) / vestibular nausea — reported ${quote} (${vitalsSummary})`,
      severity: critical ? 'CRITICAL' : 'WARNING',
      steps: [
        `Stop all manual/motion work; sit reclined; cool damp cloth to forehead + neck (${vitalsSummary}).`,
        'Promethazine 25 mg IM per kit (or ondansetron ODT); small sips cool fluids — no solids until 45 min clear.',
        'Escalate — hematemesis, fever > 38.5°C, severe diaphoresis → CRITICAL; notify surgeon; log emetic episodes to black box.',
      ],
      confidence: 0.88,
    });
  }

  // 6 — Tachycardia / racing heart / palpitations
  if (hasQuery && matches(q, [/tachycardia/, /racing/, /palpitat/, /pounding/, /skipped/, /skipping/, /arrhythmia/, /irregular/, /rapid/, /fast heart/, /heart pound/, /racing pulse/])) {
    const critical = vitals.heartRate > 140 || (vitals.heartRate > 125 && vitals.spo2 < 93);
    candidates.push({
      zone: 'heart',
      diagnosis: `Tachycardia / palpitations — reported ${quote} · ${vitals.heartRate} BPM sustained (${vitalsSummary})`,
      severity: critical ? 'CRITICAL' : 'WARNING',
      steps: [
        `Stop activity, sit braced; vagal maneuver (carotid massage 5 s ×2, Valsalva 15 s) (${vitalsSummary}).`,
        'Rest seated 5 min; re-check HR ×3; 12-lead ECG snapshot; SpO2 continuous.',
        'Escalate — HR > 140 for 5 min, chest pain, syncope → CRITICAL; notify surgeon; log ECG + trend to black box.',
      ],
      confidence: 0.92,
    });
  }

  // 7 — Chest tightness / shortness of breath / hypoxia
  if (hasQuery && matches(q, [/chest/, /breath/, /hypoxia/, /low oxygen/, /low spo2/, /shortness/, /sob/, /can't breathe/, /tight/, /pressure/, /sat\s*low/, /oxygen/])) {
    const critical = vitals.spo2 < 92;
    candidates.push({
      zone: 'heart',
      diagnosis: `Chest tightness / dyspnea / hypoxia — reported ${quote} · SpO2 ${vitals.spo2.toFixed(1)}% (${vitalsSummary})`,
      severity: critical ? 'CRITICAL' : 'WARNING',
      steps: [
        `Fresh O2 NOW — 100% mask or open ECLSS loop; sit upright; pursed-lip breathing 4 s in / 6 s out (${vitalsSummary}).`,
        'Pulse-ox continuous; check CO2 scrubber + suit integrity; re-measure SpO2 q3min ×3.',
        'Escalate — SpO2 < 90% ×3 readings or cyanosis → CRITICAL; notify surgeon; log readings + ECG to black box.',
      ],
      confidence: 0.9,
    });
  }

  // 8 — Solar flare / radiation exposure
  if (hasQuery && matches(q, [/radiation/, /solar flare/, /solar storm/, /flare/, /geomagnetic/, /spe/, /dose/, /cme/])) {
    const critical = dose > 250 || (solarStormActive && dose > 100);
    candidates.push({
      zone: 'spine',
      diagnosis: `Solar flare / radiation SPE exposure — reported ${quote} · cumulative ${dose.toFixed(1)} mSv (limit 250) (${vitalsSummary})`,
      severity: critical ? 'CRITICAL' : 'WARNING',
      steps: [
        `Shelter NOW — water-polyethylene lined storm cellar; dosimetry badge reading; suit off (${vitalsSummary}).`,
        'Confirm shielding ≥ 10 g/cm²; log dose rate + time-stamp; no further EVA ×48 h.',
        'Escalate — dose-rate spike or prodromal (burns, nausea) → CRITICAL; notify surgeon; log dose curve to black box.',
      ],
      confidence: 0.9,
    });
  }

  // 9 — Lower back / ARED / spinal elongation
  if (hasQuery && matches(q, [/back/, /elongat/, /lumbago/, /ared/, /stretch/, /lumbar/, /sciatica/, /spine pain/, /stretch spine/])) {
    const critical = vitals.boneDensity < 80;
    candidates.push({
      zone: 'spine',
      diagnosis: `Lower back / spinal elongation / ARED strain — reported ${quote} · BMD ${vitals.boneDensity.toFixed(1)}% baseline (${vitalsSummary})`,
      severity: critical ? 'CRITICAL' : 'WARNING',
      steps: [
        `Stop offending load; lie supine knees flexed 15 min; ice pack lumbar 15 min (${vitalsSummary}).`,
        'Check ARED + load harness logs; NSAIDs per kit; 10-min gentle cat-cow stretch ×3 sets.',
        'Escalate — radicular pain, incontinence, or neuro deficit → CRITICAL; DEXA consult; log ROM + pain score to black box.',
      ],
      confidence: 0.88,
    });
  }

  // 10 — Muscle cramp / dehydration / heat illness
  if (hasQuery && matches(q, [/cramp/, /dehydrat/, /thirst/, /heat/, /cramping/, /spasms?/, /spasm/, /electrolyte/, /electrolytes/, /sweat/, /heatstroke/])) {
    const critical = vitals.coreTemp > 39;
    candidates.push({
      zone: 'spine',
      diagnosis: `Muscle cramp / dehydration / heat illness — reported ${quote} · CORE ${vitals.coreTemp.toFixed(1)}°C (${vitalsSummary})`,
      severity: critical ? 'CRITICAL' : 'WARNING',
      steps: [
        `Stop activity; lie supine shade/cooling pack; sips of electrolyte solution 500 ml over 20 min (${vitalsSummary}).`,
        'Stretch + massage affected muscle group; check urine color + specific gravity; 1 L fluid over 60 min total.',
        'Escalate — temp > 39.5°C, confusion, cramps resistant to fluids → CRITICAL; ice-bath if available; notify surgeon; log I/O.',
      ],
      confidence: 0.85,
    });
  }

  // 11 — EVA suit burn / abrasion / friction
  if (hasQuery && matches(q, [/burn/, /blister/, /abrasion/, /friction/, /chafe/, /redness/, /graze/, /suit\s*burn/, /rubbing/, /sore spot/, /skin\s*injury/])) {
    const critical = vitals.coreTemp > 39.5;
    candidates.push({
      zone: 'spine',
      diagnosis: `EVA suit burn / abrasion / friction injury — reported ${quote} · suit-telemetry contact hotspot check (${vitalsSummary})`,
      severity: critical ? 'CRITICAL' : 'WARNING',
      steps: [
        `Halt EVA; back in suit box; inspect liner contact zones; cool running water on burn ×20 min (${vitalsSummary}).`,
        'Debride loose skin gently; apply silvadene if deep; pad hotspot with moleskin; repeat temp check q5min.',
        'Escalate — circumferential burn, airway risk, unknown depth → CRITICAL; notify surgeon; log photos + depth map to black box.',
      ],
      confidence: 0.88,
    });
  }

  // 12 — General vital-aware space triage (unmapped symptom)
  // The astronaut typed/spoke something we don't pattern-match. We still
  // issue a complete 3-step protocol naming the exact query + live vitals,
  // so no two unknown queries ever produce identical output.
  if (candidates.length === 0 && hasQuery) {
    const vitalsHot =
      vitals.heartRate > 125 ||
      vitals.spo2 < 92 ||
      vitals.coreTemp > 38.5 ||
      vitals.sleepScore < 55;
    candidates.push({
      zone: 'brain',
      diagnosis: `Unmapped symptom ${quote} — onboard triage grounded in live vitals (${vitalsSummary})`,
      severity: vitalsHot ? 'WARNING' : 'NOMINAL',
      steps: [
        `Immediate vital + symptom stabilization — stop exertion, sit supported, monitor: ${vitalsSummary}.`,
        `Onboard countermeasure — 500 ml oral fluids, 10-min seated rest, review med kit (analgesics / antipyretics / anti-anxiety); re-check HR/SpO2/CORE in 15 min; keep CO2 scrubber green.`,
        `Escalation criteria — "${q}" persists > 2 h, any vital crosses threshold, or a new symptom onset → treat as CRITICAL; notify flight surgeon; log query + interventions + response to black box.`,
      ],
      confidence: 0.6,
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
