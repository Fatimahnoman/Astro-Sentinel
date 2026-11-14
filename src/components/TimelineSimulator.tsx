'use client';

import {
  Apple,
  Bone,
  Dumbbell,
  Gauge,
  Moon,
  Radiation,
  Rocket,
  Shield,
  Timer,
} from 'lucide-react';
import type { TelemetrySnapshot } from '@/types/telemetry';
import { cn } from '@/lib/utils';
import { DataChip } from '@/components/ui/Panel';

interface TimelineSimulatorProps {
  missionDay: number;
  onMissionDayChange: (day: number) => void;
  snapshot: TelemetrySnapshot | null;
  solarStormActive: boolean;
  isSnapshotLoading: boolean;
}

interface Countermeasure {
  icon: typeof Dumbbell;
  label: string;
  title: string;
  detail: string;
  adherence: number;
}

function transitPhase(day: number): string {
  if (day <= 45) return 'EARTH DEPARTURE · OUTBOUND CRUISE';
  if (day <= 120) return 'DEEP-SPACE CRUISE · SOLAR MONITORING';
  if (day <= 160) return 'MARS APPROACH · GRAVITY TRANSITION DRILL';
  return 'MARS ORBIT INSERTION PREP · FINAL 20 DAYS';
}

function buildCountermeasures(
  day: number,
  solarStormActive: boolean,
): Countermeasure[] {
  const exercise: Countermeasure =
    day < 45
      ? {
          icon: Dumbbell,
          label: 'Exercise',
          title: 'ARED Baseline',
          detail: 'Resistance 6×/wk · 45 min · heel-strike loading',
          adherence: 92,
        }
      : day < 120
        ? {
            icon: Dumbbell,
            label: 'Exercise',
            title: 'ARED + Treadmill',
            detail: 'High-load 7×/wk · 60 min · 70–80% VO₂ reserve',
            adherence: 88,
          }
        : {
            icon: Dumbbell,
            label: 'Exercise',
            title: 'High-Load Eccentric',
            detail: 'ARED + rowing 7×/wk · 65 min · spine offload',
            adherence: 84,
          };

  const nutrition: Countermeasure =
    day < 45
      ? {
          icon: Apple,
          label: 'Nutrition',
          title: 'Vitamin D 1,000 IU',
          detail: 'Calcium 1,000 mg · protein 1.4 g/kg/day',
          adherence: 91,
        }
      : day < 120
        ? {
            icon: Apple,
            label: 'Nutrition',
            title: 'Vitamin D 2,000 IU',
            detail: 'Omega-3 2 g · calcium 1,200 mg · protein 1.5 g/kg',
            adherence: 86,
          }
        : {
            icon: Apple,
            label: 'Nutrition',
            title: 'Bone-Protective Stack',
            detail: 'Vitamin D 4,000 IU · protein 1.6 g/kg · bisphosphonate review',
            adherence: 81,
          };

  const shielding: Countermeasure = solarStormActive
    ? {
        icon: Shield,
        label: 'Radiation',
        title: 'Storm Shelter ACTIVE',
        detail: 'Polyethylene + water wall · SPE posture · active dosimetry',
        adherence: 100,
      }
    : {
        icon: Shield,
        label: 'Radiation',
        title: day > 120 ? 'Deep-Sleep Vault Drill' : 'Passive Shield Watch',
        detail: day > 120 ? 'Water-wall bunk readiness · weekly SPE drill' : 'Dosimetry 4 h cadence · GCR trend watch',
        adherence: day > 120 ? 94 : 87,
      };

  const sleep: Countermeasure = {
    icon: Moon,
    label: 'Sleep',
    title: day > 120 ? 'Fatigue Countermeasures' : 'Circadian Anchor',
    detail:
      day > 120
        ? 'Two 20-min naps · CBT-I · protected 8 h window'
        : 'Blue-light lock 22:00 · 8 h window · actigraphy',
    adherence: day > 120 ? 79 : 88,
  };

  return [exercise, nutrition, shielding, sleep];
}

export function TimelineSimulator({
  missionDay,
  onMissionDayChange,
  snapshot,
  solarStormActive,
  isSnapshotLoading,
}: TimelineSimulatorProps) {
  const vitals = snapshot?.vitals;
  const radiation = vitals?.cumulativeRadiation ?? 0;
  const boneLoss = vitals ? 100 - vitals.boneDensity : 0;
  const sleepScore = vitals?.sleepScore ?? 0;
  const progress = ((missionDay - 1) / 179) * 100;
  const countermeasures = buildCountermeasures(missionDay, solarStormActive);
  const sliderBackground = `linear-gradient(90deg, #00F0FF 0%, #9D4EDD ${progress}%, rgba(0,240,255,0.13) ${progress}%, rgba(0,240,255,0.13) 100%)`;

  return (
    <section className="glass-panel relative overflow-hidden rounded-2xl p-3.5">
      <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-electric/55 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(0,240,255,0.03)_50%,transparent_100%)]" />

      <div className="relative flex flex-col gap-3 2xl:flex-row 2xl:items-end">
        {/* Title + day */}
        <div className="flex shrink-0 items-end justify-between gap-4 2xl:w-[315px] 2xl:block">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-electric/25 bg-electric/10 text-electric">
                <Rocket className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="font-display text-[11px] font-semibold text-white" title="See how 180 days in deep space change the body">
                  180-Day Mars Transit Simulator
                </h2>
                <p className="label-micro mt-0.5">Deep-space health model</p>
              </div>
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">
              <Timer className="h-3 w-3 text-electric/70" />
              {transitPhase(missionDay)}
            </div>
          </div>

          <div className="flex items-end gap-2 2xl:mt-2">
            <span className="font-mono text-4xl font-bold leading-none tracking-tight text-white text-glow-cyan">
              {String(missionDay).padStart(3, '0')}
            </span>
            <span className="pb-0.5 font-mono text-[8px] uppercase leading-tight tracking-[0.14em] text-slate-500">
              Mission
              <br />
              Day / 180
            </span>
          </div>
        </div>

        {/* Slider */}
        <div className="min-w-0 flex-1 px-0.5 2xl:px-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-slate-500">
              Launch
            </span>
            <DataChip tone={isSnapshotLoading ? 'amber' : 'cyan'}>
              {isSnapshotLoading ? 'MODEL UPDATING…' : 'LIVE PROJECTION'}
            </DataChip>
            <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-slate-500">
              Mars Arrival
            </span>
          </div>

          <div className="relative mt-2.5">
            <input
              type="range"
              min={1}
              max={180}
              step={1}
              value={missionDay}
              onChange={(event) => onMissionDayChange(Number(event.target.value))}
              className="sentinel-range"
              style={{ background: sliderBackground }}
              aria-label="Mission day, 1 to 180 — drag to see how health changes"
            />
            <div className="pointer-events-none absolute inset-x-0 -bottom-1.5 flex justify-between">
              {[1, 45, 90, 135, 180].map((tick) => (
                <span
                  key={tick}
                  className={cn(
                    'h-1 w-px bg-electric/30',
                    missionDay >= tick && 'bg-violet/70',
                  )}
                />
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between font-mono text-[7.5px] uppercase tracking-[0.1em] text-slate-600">
            <span>Day 001</span>
            <span className="hidden sm:inline">Day 045</span>
            <span>Day 090</span>
            <span className="hidden sm:inline">Day 135</span>
            <span>Day 180</span>
          </div>
        </div>

        {/* Projected stats */}
        <div className="grid shrink-0 grid-cols-3 gap-2 2xl:w-[390px]">
          <div className="glass-inset rounded-xl px-2.5 py-2">
            <div className="flex items-center gap-1">
              <Radiation className="h-3 w-3 text-amber" />
              <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-slate-500">
                Cumulative
              </span>
            </div>
            <div className="mt-1 font-mono text-[16px] font-semibold leading-none text-amber">
              {radiation.toFixed(1)}
              <span className="ml-0.5 text-[8px] font-normal text-slate-500">mSv</span>
            </div>
            <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.08em] text-slate-600">
              RADIATION
            </div>
          </div>

          <div className="glass-inset rounded-xl px-2.5 py-2">
            <div className="flex items-center gap-1">
              <Bone className="h-3 w-3 text-critical" />
              <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-slate-500">
                Bone loss
              </span>
            </div>
            <div className="mt-1 font-mono text-[16px] font-semibold leading-none text-critical">
              {boneLoss.toFixed(2)}
              <span className="ml-0.5 text-[8px] font-normal text-slate-500">%</span>
            </div>
            <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.08em] text-slate-600">
              BMD DECLINE
            </div>
          </div>

          <div className="glass-inset rounded-xl px-2.5 py-2">
            <div className="flex items-center gap-1">
              <Gauge className="h-3 w-3 text-violet" />
              <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-slate-500">
                Sleep
              </span>
            </div>
            <div className="mt-1 font-mono text-[16px] font-semibold leading-none text-violet">
              {sleepScore}
              <span className="ml-0.5 text-[8px] font-normal text-slate-500">/100</span>
            </div>
            <div className="mt-1 font-mono text-[7px] uppercase tracking-[0.08em] text-slate-600">
              RECOVERY
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic countermeasures */}
      <div className="relative mt-3 grid grid-cols-1 gap-2 border-t border-white/[0.06] pt-3 sm:grid-cols-2 xl:grid-cols-4">
        {countermeasures.map((measure) => {
          const Icon = measure.icon;
          return (
            <div
              key={measure.label}
              className="glass-inset rounded-xl px-3 py-2 transition-colors hover:border-electric/20"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5',
                      measure.label === 'Radiation' && solarStormActive
                        ? 'text-critical'
                        : measure.label === 'Nutrition'
                          ? 'text-mint'
                          : measure.label === 'Sleep'
                            ? 'text-violet'
                            : 'text-electric',
                    )}
                  />
                  <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-slate-500">
                    {measure.label}
                  </span>
                </div>
                <span className="font-mono text-[7px] font-bold uppercase tracking-[0.1em] text-electric/70">
                  {measure.adherence}%
                </span>
              </div>
              <div className="mt-1 truncate text-[9.5px] font-semibold text-slate-200">
                {measure.title}
              </div>
              <div className="mt-0.5 line-clamp-2 font-mono text-[7px] leading-relaxed tracking-[0.02em] text-slate-600">
                {measure.detail}
              </div>
              <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-electric to-violet"
                  style={{ width: `${measure.adherence}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
