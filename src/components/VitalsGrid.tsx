'use client';

import {
  Activity,
  Bone,
  Droplets,
  HeartPulse,
  Moon,
  Thermometer,
  type LucideIcon,
} from 'lucide-react';
import type { AstronautVitals } from '@/types/telemetry';
import { cn, clamp } from '@/lib/utils';
import { DataChip, PanelHeading } from '@/components/ui/Panel';

type VitalState = 'nominal' | 'elevated' | 'critical';

const TONE: Record<VitalState, { text: string; bar: string; label: string }> = {
  nominal: {
    text: 'text-electric',
    bar: 'from-electric to-[#00a6c8]',
    label: 'NOMINAL',
  },
  elevated: {
    text: 'text-amber',
    bar: 'from-amber to-[#ff8a3d]',
    label: 'ELEVATED',
  },
  critical: {
    text: 'text-critical',
    bar: 'from-critical to-[#ff6a3d]',
    label: 'CRITICAL',
  },
};

interface VitalCardProps {
  label: string;
  value: string;
  unit: string;
  detail: string;
  progress: number;
  state: VitalState;
  icon: LucideIcon;
  wide?: boolean;
}

function VitalCard({
  label,
  value,
  unit,
  detail,
  progress,
  state,
  icon: Icon,
  wide,
}: VitalCardProps) {
  const tone = TONE[state];

  return (
    <div
      className={cn(
        'glass-inset group relative overflow-hidden rounded-xl px-2.5 py-2 transition-colors hover:border-electric/25',
        wide && 'col-span-2',
        state === 'critical' && 'border-critical/30',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="label-micro truncate">{label}</span>
        <Icon
          className={cn('h-3.5 w-3.5 shrink-0', tone.text)}
          strokeWidth={1.8}
        />
      </div>

      <div className="mt-1 flex items-baseline gap-1">
        <span
          className={cn(
            'font-mono text-[23px] font-semibold leading-none tabular-nums tracking-tight',
            tone.text,
          )}
        >
          {value}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
          {unit}
        </span>
      </div>

      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out',
            tone.bar,
          )}
          style={{ width: `${clamp(progress, 2, 100)}%` }}
        />
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[8px] uppercase tracking-[0.06em] text-slate-500">
          {detail}
        </span>
        <span
          className={cn(
            'shrink-0 font-mono text-[8px] font-bold uppercase tracking-[0.1em]',
            tone.text,
          )}
        >
          {tone.label}
        </span>
      </div>
    </div>
  );
}

interface VitalsGridProps {
  vitals: AstronautVitals | null;
  solarStormActive: boolean;
}

export function VitalsGrid({ vitals, solarStormActive }: VitalsGridProps) {
  const heartState: VitalState = !vitals
    ? 'nominal'
    : vitals.heartRate >= 120
      ? 'critical'
      : vitals.heartRate >= 100 || solarStormActive
        ? 'elevated'
        : 'nominal';
  const oxygenState: VitalState = !vitals
    ? 'nominal'
    : vitals.spo2 < 92
      ? 'critical'
      : vitals.spo2 < 95
        ? 'elevated'
        : 'nominal';
  const tempState: VitalState = !vitals
    ? 'nominal'
    : vitals.coreTemp >= 38.2
      ? 'critical'
      : vitals.coreTemp >= 37.5
        ? 'elevated'
        : 'nominal';
  const sleepState: VitalState = !vitals
    ? 'nominal'
    : vitals.sleepScore < 55
      ? 'critical'
      : vitals.sleepScore < 72
        ? 'elevated'
        : 'nominal';
  const boneState: VitalState = !vitals
    ? 'nominal'
    : vitals.boneDensity < 94
      ? 'critical'
      : vitals.boneDensity < 97
        ? 'elevated'
        : 'nominal';

  const hrValues = vitals?.heartRateHistory.map((sample) => sample.bpm) ?? [];
  const hrRange =
    hrValues.length > 0
      ? `${Math.min(...hrValues)}–${Math.max(...hrValues)} BPM · 24H`
      : 'AWAITING TELEMETRY';
  const boneLoss = vitals ? (100 - vitals.boneDensity).toFixed(2) : '0.00';

  return (
    <>
      <PanelHeading
        icon={Activity}
        title="Live Astronaut Vitals"
        kicker={
          vitals
            ? `${vitals.name} // ${vitals.crewId}`
            : 'AUTONOMOUS BIOMETRIC STREAM'
        }
        right={
          <DataChip tone={solarStormActive ? 'critical' : 'cyan'}>
            <span
              className={cn(
                'h-1 w-1 rounded-full',
                solarStormActive
                  ? 'bg-critical animate-sentinel-blink'
                  : 'bg-mint animate-sentinel-blink',
              )}
            />
            {solarStormActive ? 'STRESS' : 'LIVE'}
          </DataChip>
        }
      />

      {!vitals ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                'glass-inset h-[76px] animate-pulse rounded-xl',
                index === 4 && 'col-span-2',
              )}
            />
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <VitalCard
            label="Heart Rate"
            value={String(vitals.heartRate)}
            unit="BPM"
            detail={hrRange}
            progress={(vitals.heartRate / 170) * 100}
            state={heartState}
            icon={HeartPulse}
          />
          <VitalCard
            label="SpO₂"
            value={String(vitals.spo2)}
            unit="%"
            detail="PULSE OXIMETRY"
            progress={((vitals.spo2 - 84) / 16) * 100}
            state={oxygenState}
            icon={Droplets}
          />
          <VitalCard
            label="Core Temp"
            value={vitals.coreTemp.toFixed(1)}
            unit="°C"
            detail="THERMAL CORE"
            progress={((vitals.coreTemp - 35) / 4.5) * 100}
            state={tempState}
            icon={Thermometer}
          />
          <VitalCard
            label="Sleep Score"
            value={String(vitals.sleepScore)}
            unit="/100"
            detail="CIRCADIAN RECOVERY"
            progress={vitals.sleepScore}
            state={sleepState}
            icon={Moon}
          />
          <VitalCard
            label="Bone Density"
            value={vitals.boneDensity.toFixed(2)}
            unit="% BASELINE"
            detail={`−${boneLoss}% MINERAL LOSS · DXA MODEL`}
            progress={vitals.boneDensity}
            state={boneState}
            icon={Bone}
            wide
          />
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.06] pt-2">
        <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-slate-600">
          Source · Bio-harness / wearables
        </span>
        <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-electric/60">
          5 min cadence
        </span>
      </div>
    </>
  );
}
