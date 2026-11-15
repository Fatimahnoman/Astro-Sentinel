'use client';

import dynamic from 'next/dynamic';
import {
  Activity,
  Bone,
  Brain,
  Crosshair,
  HeartPulse,
  ScanLine,
  type LucideIcon,
} from 'lucide-react';
import type {
  AstronautVitals,
  NasaHazardStatus,
  OrganZone,
  SpaceWeatherAlert,
  TriageProtocol,
} from '@/types/telemetry';
import {
  ORGAN_META,
  SEVERITY_THEME,
  type ActiveOrgan,
} from '@/lib/presentation';
import { cn } from '@/lib/utils';
import { DataChip } from '@/components/ui/Panel';
import { WebGLBoundary } from '@/components/WebGLBoundary';

const HologramTwin = dynamic(() => import('@/components/HologramTwin'), {
  ssr: false,
  loading: () => <TwinLoader />,
});

function TwinLoader() {
  return (
    <div className="hologram-fallback absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative grid h-20 w-20 place-items-center rounded-full border border-electric/25">
          <span className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-electric/70" />
          <Crosshair className="h-7 w-7 text-electric" strokeWidth={1.2} />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-electric/80">
          Initializing holographic twin
        </span>
      </div>
    </div>
  );
}

const ORGAN_ICONS: Record<ActiveOrgan, LucideIcon> = {
  brain: Brain,
  heart: HeartPulse,
  spine: Bone,
};

/** Tab/keyboard order for organ selection — shared by buttons and arrow-key cycling. */
const ORGAN_ORDER: ActiveOrgan[] = ['brain', 'heart', 'spine'];

interface CenterStageProps {
  vitals: AstronautVitals | null;
  hazards: NasaHazardStatus | null;
  weather: SpaceWeatherAlert | null;
  protocol: TriageProtocol | null;
  selectedOrgan: OrganZone;
  solarStormActive: boolean;
  isTriaging: boolean;
  onSelectOrgan: (organ: ActiveOrgan) => void;
}

interface OrganMetric {
  label: string;
  value: string;
}

function buildOrganMetrics(
  organ: ActiveOrgan,
  vitals: AstronautVitals | null,
): OrganMetric[] {
  if (!vitals) {
    return [
      { label: 'LINK', value: 'SYNCING' },
      { label: 'SIGNAL', value: '—' },
      { label: 'MODEL', value: '—' },
    ];
  }

  if (organ === 'brain') {
    return [
      { label: 'O₂ SATURATION', value: `${vitals.spo2}%` },
      {
        label: 'CNS PERFUSION',
        value: vitals.heartRate > 120 ? 'ELEVATED' : 'STABLE',
      },
      {
        label: 'VESTIBULAR',
        value: vitals.sleepScore < 55 ? 'FATIGUE' : 'SYNCED',
      },
    ];
  }

  if (organ === 'heart') {
    return [
      { label: 'RHYTHM', value: `${vitals.heartRate} BPM` },
      { label: 'O₂ DELIVERY', value: `${vitals.spo2}%` },
      {
        label: 'HEMODYNAMICS',
        value: vitals.heartRate > 120 ? 'HIGH DEMAND' : 'STABLE',
      },
    ];
  }

  return [
    { label: 'BONE DENSITY', value: `${vitals.boneDensity.toFixed(2)}%` },
    {
      label: 'MINERAL LOSS',
      value: `${(100 - vitals.boneDensity).toFixed(2)}%`,
    },
    {
      label: 'AXIAL LOAD',
      value: vitals.boneDensity < 94 ? 'UNLOADED' : 'NOMINAL',
    },
  ];
}

export function CenterStage({
  vitals,
  hazards,
  weather,
  protocol,
  selectedOrgan,
  solarStormActive,
  isTriaging,
  onSelectOrgan,
}: CenterStageProps) {
  const selectedMeta = selectedOrgan ? ORGAN_META[selectedOrgan] : null;
  const OrganIcon = selectedOrgan ? ORGAN_ICONS[selectedOrgan] : ScanLine;
  const matchingProtocol =
    protocol && protocol.affectedOrgan !== null && protocol.affectedOrgan === selectedOrgan
      ? protocol
      : null;
  const severityTheme = matchingProtocol
    ? SEVERITY_THEME[matchingProtocol.severity]
    : null;
  const globalTheme = protocol ? SEVERITY_THEME[protocol.severity] : null;
  const metrics = selectedOrgan ? buildOrganMetrics(selectedOrgan, vitals) : [];

  // Plain-language, screen-reader-friendly announcement of the current selection.
  const announcement = selectedMeta
    ? `Selected organ: ${selectedMeta.label}. ${selectedMeta.description} ` +
      `Status: ${matchingProtocol ? `${matchingProtocol.severity}. ${matchingProtocol.diagnosis}` : `monitoring, no focal anomaly detected. Heart rate ${vitals?.heartRate ?? 'unknown'} beats per minute.`}`
    : 'No organ selected. Choose brain, heart or spine to inspect the crew member.';

  const handleOrganKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!selectedOrgan) return;
    const index = ORGAN_ORDER.indexOf(selectedOrgan);
    let next: ActiveOrgan | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = ORGAN_ORDER[(index + 1) % ORGAN_ORDER.length];
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = ORGAN_ORDER[(index - 1 + ORGAN_ORDER.length) % ORGAN_ORDER.length];
    } else if (event.key === 'Home') {
      next = ORGAN_ORDER[0];
    } else if (event.key === 'End') {
      next = ORGAN_ORDER[ORGAN_ORDER.length - 1];
    } else {
      return;
    }
    event.preventDefault();
    onSelectOrgan(next);
  };

  const topStatus = solarStormActive
    ? { label: 'SPE ALERT', tone: 'critical' as const, pulse: true }
    : protocol
      ? {
          label: protocol.severity,
          tone:
            protocol.severity === 'CRITICAL'
              ? ('critical' as const)
              : protocol.severity === 'WARNING'
                ? ('amber' as const)
                : ('mint' as const),
          pulse: protocol.severity !== 'NOMINAL',
        }
      : { label: 'MESH STANDBY', tone: 'cyan' as const, pulse: false };

  return (
    <section
      id="twin-panel"
      className="scanlines relative min-h-[620px] scroll-mt-24 overflow-hidden rounded-2xl border border-electric/15 bg-[#050814]/45 shadow-[inset_0_0_80px_rgba(0,240,255,0.04)] lg:min-h-[720px]"
    >
      {/* environment */}
      <div className="hud-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_55%_at_50%_48%,rgba(0,240,255,0.08),transparent_60%),radial-gradient(ellipse_35%_40%_at_75%_20%,rgba(157,78,221,0.09),transparent_65%)]" />
      <div className="animate-drift-x pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,240,255,0.10),transparent_62%)] blur-2xl" />

      {/* the actual twin — fills the stage */}
      <div
        className="absolute inset-0"
        role="img"
        aria-label="Interactive 3D hologram of the astronaut's body with three organ nodes: brain, heart and spine. Use the organ buttons beside this view, or Tab then Enter, to inspect each organ."
      >
        <WebGLBoundary>
          <HologramTwin
            vitals={vitals}
            protocol={protocol}
            selectedOrgan={selectedOrgan}
            solarStormActive={solarStormActive}
            onSelectOrgan={onSelectOrgan}
          />
        </WebGLBoundary>
      </div>

      {/* corner brackets */}
      <span className="corner-bracket left-2 top-2 border-l-2 border-t-2" />
      <span className="corner-bracket right-2 top-2 border-r-2 border-t-2" />
      <span className="corner-bracket bottom-2 left-2 border-b-2 border-l-2" />
      <span className="corner-bracket bottom-2 right-2 border-b-2 border-r-2" />

      {/* organ selector — always visible, keyboard + screen-reader friendly */}
      <div
        className="absolute left-3 top-16 z-10 sm:top-[4.25rem]"
        role="group"
        aria-label="Choose an organ to inspect"
        onKeyDown={handleOrganKeys}
      >
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {ORGAN_ORDER.map((organ) => {
            const Icon = ORGAN_ICONS[organ];
            const meta = ORGAN_META[organ];
            const selected = selectedOrgan === organ;
            return (
              <button
                key={organ}
                type="button"
                onClick={() => onSelectOrgan(organ)}
                aria-pressed={selected}
                title={`${meta.label} — ${meta.description}`}
                className={cn(
                  'flex min-h-[44px] items-center gap-1.5 rounded-lg border px-2 py-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] outline-none backdrop-blur-sm transition-all',
                  'focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-[#050814]',
                  selected
                    ? 'border-violet/60 bg-violet/20 text-violet shadow-[0_0_18px_-6px_rgba(157,78,221,0.85)]'
                    : 'border-white/10 bg-void/60 text-slate-400 hover:border-electric/40 hover:bg-electric/10 hover:text-electric',
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                <span className="hidden min-[430px]:inline">{meta.short}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 max-w-[96px] font-mono text-[6.5px] uppercase leading-snug tracking-[0.1em] text-slate-600">
          Tap an organ to inspect
        </p>
      </div>

      {/* screen-reader announcement of the current organ selection */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* top HUD */}
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-electric animate-sentinel-blink" />
            <span className="font-display text-[10px] font-semibold text-white/90">
              Holographic Digital Twin
            </span>
            <span className="rounded border border-electric/25 bg-electric/10 px-1 py-0.5 font-mono text-[7px] font-bold tracking-[0.14em] text-electric">
              LIVE MESH
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">
            <span>BIO-RIG 3D · 12,480 VERTS</span>
            <span className="text-electric/50">ORGAN NODES · 03</span>
            <span className="hidden sm:inline">
              Kp {weather ? weather.kpIndex.toFixed(1) : '—'} ·{' '}
              {weather?.flareClass ?? '—'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <DataChip tone={topStatus.tone}>
            <span
              className={cn(
                'h-1 w-1 rounded-full',
                topStatus.tone === 'critical'
                  ? 'bg-critical'
                  : topStatus.tone === 'amber'
                    ? 'bg-amber'
                    : topStatus.tone === 'mint'
                      ? 'bg-mint'
                      : 'bg-electric',
                topStatus.pulse && 'animate-sentinel-blink',
              )}
            />
            {topStatus.label}
          </DataChip>
          <span className="font-mono text-[7px] uppercase tracking-[0.16em] text-slate-600" title="Wheel scrolls the page · +/− buttons zoom the twin · toggle ZOOM/SCROLL for wheel zoom · drag to rotate the twin">
            {isTriaging ? 'EDGE INFERENCE RUNNING…' : 'Wheel scrolls page · +/− zoom twin · Scroll⇄Zoom toggle on twin'}
          </span>
        </div>
      </div>

      {/* node legend */}
      <div className="pointer-events-none absolute right-3 top-24 hidden flex-col gap-1.5 rounded-lg border border-white/[0.07] bg-void/55 p-2 backdrop-blur-sm sm:flex">
        <span className="flex items-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.1em] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-electric shadow-[0_0_8px_rgba(0,240,255,0.9)]" />
          Nominal node
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.1em] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-violet shadow-[0_0_8px_rgba(157,78,221,0.9)]" />
          Selected
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.1em] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-critical shadow-[0_0_8px_rgba(255,42,95,0.9)]" />
          Critical alert
        </span>
      </div>

      {/* HUD bottom: selected organ inspection */}
      <div className="pointer-events-none absolute inset-x-3 bottom-3">
        <div className="glass-inset relative overflow-hidden rounded-xl p-3 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.95)] backdrop-blur-xl">
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-electric/50 to-transparent" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-lg border',
                  severityTheme
                    ? cn(severityTheme.border, severityTheme.background, severityTheme.text)
                    : 'border-electric/30 bg-electric/10 text-electric',
                )}
              >
                <OrganIcon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <div className="label-micro">
                  Organ Inspection · {selectedOrgan ? 'NODE LOCKED' : 'NO TARGET'}
                </div>
                <div className="truncate font-display text-[11px] font-semibold text-white">
                  {selectedMeta ? selectedMeta.label : 'SELECT AN ORGAN NODE'}
                </div>
                <div className="truncate font-mono text-[7.5px] uppercase tracking-[0.12em] text-slate-500">
                  {selectedMeta
                    ? `${selectedMeta.subsystem} · ${selectedMeta.dimension}`
                    : 'CLICK BRAIN, HEART OR SPINE ON THE TWIN'}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <DataChip
                tone={
                  severityTheme
                    ? matchingProtocol?.severity === 'CRITICAL'
                      ? 'critical'
                      : matchingProtocol?.severity === 'WARNING'
                        ? 'amber'
                        : 'mint'
                    : 'cyan'
                }
              >
                {severityTheme
                  ? severityTheme.label
                  : selectedMeta
                    ? 'MONITORING'
                    : 'STANDBY'}
              </DataChip>
              <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-slate-600">
                {protocol ? `GLOBAL ${protocol.severity}` : 'NO ACTIVE PROTOCOL'}
              </span>
            </div>
          </div>

          {selectedMeta ? (
            <>
              <p className="mt-2 line-clamp-2 font-mono text-[8.5px] leading-relaxed tracking-[0.02em] text-slate-400">
                {matchingProtocol
                  ? matchingProtocol.diagnosis
                  : `${selectedMeta.description} No focal anomaly detected. Continuous mesh surveillance at 5-minute cadence.`}
              </p>

              <div className="mt-2 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-2">
                {metrics.map((metric) => (
                  <div key={metric.label}>
                    <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-slate-600">
                      {metric.label}
                    </div>
                    <div
                      className={cn(
                        'mt-0.5 font-mono text-[10px] font-semibold tracking-[0.04em]',
                        severityTheme ? severityTheme.text : 'text-electric',
                      )}
                    >
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-2 flex items-center gap-2 border-t border-white/[0.06] pt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-600">
              <Activity className="h-3 w-3 text-electric/70" />
              Awaiting organ selection from the holographic mesh
            </div>
          )}

          <div className="mt-1.5 flex items-center justify-between font-mono text-[7px] uppercase tracking-[0.12em] text-slate-600">
            <span>
              HRP DOMINANT{' '}
              {hazards
                ? Math.max(
                    hazards.radiation,
                    hazards.isolation,
                    hazards.distanceFromEarth,
                    hazards.gravityFields,
                    hazards.hostileEnvironment,
                  )
                : '—'}
            </span>
            <span className={globalTheme ? globalTheme.text : 'text-slate-600'}>
              EDGE AI · {isTriaging ? 'INFERENCE' : 'READY'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
