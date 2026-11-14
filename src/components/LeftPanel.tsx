'use client';

import { ShieldAlert, Zap } from 'lucide-react';
import type {
  AstronautVitals,
  NasaHazardStatus,
  SpaceWeatherAlert,
} from '@/types/telemetry';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/ui/Panel';
import { VitalsGrid } from '@/components/VitalsGrid';
import { HeartRateChart } from '@/components/HeartRateChart';
import { HazardMeters } from '@/components/HazardMeters';

interface LeftPanelProps {
  vitals: AstronautVitals | null;
  hazards: NasaHazardStatus | null;
  weather: SpaceWeatherAlert | null;
  solarStormActive: boolean;
  onToggleSolarStorm: () => void;
}

export function LeftPanel({
  vitals,
  hazards,
  weather,
  solarStormActive,
  onToggleSolarStorm,
}: LeftPanelProps) {
  return (
    <aside className="flex min-h-0 flex-col gap-3">
      <Panel className="p-3.5">
        <VitalsGrid vitals={vitals} solarStormActive={solarStormActive} />
      </Panel>

      <Panel className="p-3.5">
        <HeartRateChart vitals={vitals} />
      </Panel>

      <Panel className="p-3.5" tone={solarStormActive ? 'critical' : 'cyan'}>
        <HazardMeters hazards={hazards} solarStormActive={solarStormActive} />
      </Panel>

      <button
        type="button"
        aria-pressed={solarStormActive}
        onClick={onToggleSolarStorm}
        title="Toggle a solar storm — the AI doctor will write an emergency plan"
        className={cn(
          'group relative w-full overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-300',
          solarStormActive
            ? 'animate-alert-pulse border-critical/60 bg-critical/15'
            : 'border-critical/35 bg-critical/[0.06] hover:border-critical/55 hover:bg-critical/10',
        )}
      >
        <span className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,42,95,0.07)_0px,rgba(255,42,95,0.07)_1px,transparent_1px,transparent_9px)] opacity-60" />
        <span
          className={cn(
            'pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-critical via-[#ff7b9b] to-critical',
            solarStormActive && 'animate-sentinel-blink',
          )}
        />
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'grid h-9 w-9 place-items-center rounded-lg border',
                solarStormActive
                  ? 'border-critical/60 bg-critical/20 text-critical'
                  : 'border-critical/35 bg-critical/10 text-critical',
              )}
            >
              {solarStormActive ? (
                <ShieldAlert className="h-4 w-4" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
            </span>
            <div>
              <div className="font-display text-[11px] font-bold text-white">
                {solarStormActive ? 'Stand Down Solar Storm' : 'Trigger Solar Storm'}
              </div>
              <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-critical/80">
                EVA EMERGENCY INJECTION
              </div>
            </div>
          </div>
          <div className="text-right">
            <span
              className={cn(
                'block font-mono text-[8px] font-bold uppercase tracking-[0.14em]',
                solarStormActive ? 'text-critical' : 'text-slate-500',
              )}
            >
              {solarStormActive ? 'ACTIVE' : 'ARMED'}
            </span>
            {solarStormActive && weather ? (
              <span className="font-mono text-[8px] text-amber">
                +{weather.radiationImpactmSv.toFixed(1)} mSv
              </span>
            ) : null}
          </div>
        </div>
        <p className="relative mt-2 font-mono text-[8px] leading-relaxed tracking-[0.04em] text-slate-500">
          {solarStormActive
            ? 'SPE waveform injected. Edge AI has issued an autonomous triage protocol and the black box is recording.'
            : 'Inject a solar particle event + EVA contingency into the 180-day transit model.'}
        </p>
      </button>
    </aside>
  );
}
