import type { NasaHazardStatus, OrganZone, TriageSeverity } from '@/types/telemetry';

export type ActiveOrgan = Exclude<OrganZone, null>;

export interface OrganMeta {
  label: string;
  short: string;
  subsystem: string;
  description: string;
  color: string;
  dimension: string;
}

export const ORGAN_META: Record<ActiveOrgan, OrganMeta> = {
  brain: {
    label: 'NEURAL / CRANIAL',
    short: 'BRAIN',
    subsystem: 'CNS · VESTIBULAR · OCULAR',
    description: 'Cerebral cortex, vestibular apparatus and neuro-ocular axis.',
    color: '#00F0FF',
    dimension: 'CRANIAL MODULE',
  },
  heart: {
    label: 'CARDIOVASCULAR',
    short: 'HEART',
    subsystem: 'MYOCARDIUM · RHYTHM · HEMODYNAMICS',
    description: 'Myocardial rhythm, stroke volume and fluid-shift response.',
    color: '#00F0FF',
    dimension: 'THORACIC MODULE',
  },
  spine: {
    label: 'AXIAL SKELETAL',
    short: 'SPINE',
    subsystem: 'VERTEBRAE · MARROW · LOAD PATH',
    description: 'Vertebral column, bone mineral density and axial load path.',
    color: '#00F0FF',
    dimension: 'LUMBAR MODULE',
  },
};

export interface SeverityTheme {
  label: string;
  text: string;
  border: string;
  background: string;
  dot: string;
  glow: string;
  hex: string;
}

export const SEVERITY_THEME: Record<TriageSeverity, SeverityTheme> = {
  NOMINAL: {
    label: 'NOMINAL',
    text: 'text-mint',
    border: 'border-mint/35',
    background: 'bg-mint/10',
    dot: 'bg-mint',
    glow: 'shadow-[0_0_24px_-10px_rgba(45,255,179,0.8)]',
    hex: '#2DFFB3',
  },
  WARNING: {
    label: 'WARNING',
    text: 'text-amber',
    border: 'border-amber/40',
    background: 'bg-amber/10',
    dot: 'bg-amber',
    glow: 'shadow-[0_0_24px_-10px_rgba(255,181,71,0.85)]',
    hex: '#FFB547',
  },
  CRITICAL: {
    label: 'CRITICAL',
    text: 'text-critical',
    border: 'border-critical/50',
    background: 'bg-critical/10',
    dot: 'bg-critical',
    glow: 'shadow-[0_0_26px_-8px_rgba(255,42,95,0.9)]',
    hex: '#FF2A5F',
  },
};

export interface HazardMeta {
  key: keyof NasaHazardStatus;
  label: string;
  abbr: string;
  description: string;
}

export const HAZARD_META: readonly HazardMeta[] = [
  {
    key: 'radiation',
    label: 'Space Radiation',
    abbr: 'RAD',
    description: 'GCR + SPE effective dose risk',
  },
  {
    key: 'isolation',
    label: 'Isolation & Confinement',
    abbr: 'ISO',
    description: 'Behavioral health & circadian load',
  },
  {
    key: 'distanceFromEarth',
    label: 'Distance from Earth',
    abbr: 'DST',
    description: 'Comms latency & evacuation constraint',
  },
  {
    key: 'gravityFields',
    label: 'Gravity Fields',
    abbr: 'GRV',
    description: 'Microgravity deconditioning burden',
  },
  {
    key: 'hostileEnvironment',
    label: 'Hostile Environments',
    abbr: 'ENV',
    description: 'Vacuum / thermal / EVA exposure',
  },
] as const;

export interface RiskTone {
  label: string;
  text: string;
  bar: string;
  track: string;
  hex: string;
}

export function riskTone(score: number): RiskTone {
  if (score >= 72) {
    return {
      label: 'SEVERE',
      text: 'text-critical',
      bar: 'from-critical via-[#ff5d82] to-critical',
      track: 'bg-critical/10',
      hex: '#FF2A5F',
    };
  }
  if (score >= 48) {
    return {
      label: 'ELEVATED',
      text: 'text-amber',
      bar: 'from-amber via-[#ffd18f] to-amber',
      track: 'bg-amber/10',
      hex: '#FFB547',
    };
  }
  return {
    label: 'NOMINAL',
    text: 'text-mint',
    bar: 'from-mint via-[#8dffdd] to-mint',
    track: 'bg-mint/10',
    hex: '#2DFFB3',
  };
}

export const VITAL_TONES = {
  cyan: 'from-electric/20 to-transparent text-electric',
  violet: 'from-violet/20 to-transparent text-violet',
  amber: 'from-amber/20 to-transparent text-amber',
  mint: 'from-mint/20 to-transparent text-mint',
  critical: 'from-critical/20 to-transparent text-critical',
} as const;
