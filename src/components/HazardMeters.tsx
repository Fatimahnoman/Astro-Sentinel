'use client';

import { ShieldAlert } from 'lucide-react';
import type { NasaHazardStatus } from '@/types/telemetry';
import { HAZARD_META, riskTone } from '@/lib/presentation';
import { cn, clamp } from '@/lib/utils';
import { DataChip, PanelHeading } from '@/components/ui/Panel';

interface HazardMetersProps {
  hazards: NasaHazardStatus | null;
  solarStormActive: boolean;
}

export function HazardMeters({ hazards, solarStormActive }: HazardMetersProps) {
  const dominant = hazards
    ? HAZARD_META.reduce((highest, meta) =>
        hazards[meta.key] > hazards[highest.key] ? meta : highest,
      )
    : null;
  const dominantScore = dominant && hazards ? hazards[dominant.key] : 0;
  const dominantTone = riskTone(dominantScore);

  // Compound coupling: when 2+ hazards are elevated (>= 60), their combined
  // effect exceeds the sum of the individual scores.
  const elevatedCount = hazards
    ? HAZARD_META.filter((meta) => hazards[meta.key] >= 60).length
    : 0;
  const compoundActive = elevatedCount >= 2;
  const compoundMultiplier =
    elevatedCount >= 4 ? '1.50x' : elevatedCount === 3 ? '1.35x' : '1.20x';

  return (
    <>
      <PanelHeading
        icon={ShieldAlert}
        title="Hazards at a Glance"
        kicker="NASA HRP — 5 SPACE RISKS · SCORE 0–100"
        accent={solarStormActive ? 'critical' : 'cyan'}
        right={
          <div className="flex items-center gap-1.5">
            {compoundActive ? (
              <span
                role="status"
                title={`${elevatedCount} of 5 NASA HRP risks are elevated — their combined effect is greater than the sum of the parts`}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] transition-all',
                  elevatedCount >= 3
                    ? 'border-critical/60 bg-critical/15 text-critical shadow-[0_0_16px_-4px_rgba(255,42,95,0.95)]'
                    : 'border-amber/55 bg-amber/10 text-amber shadow-[0_0_16px_-6px_rgba(255,181,71,0.9)]',
                )}
              >
                <span className="h-1 w-1 rounded-full bg-current animate-sentinel-blink" />
                COMPOUND COUPLING: {compoundMultiplier} ACTIVE
              </span>
            ) : null}
            {hazards ? (
              <DataChip tone={dominantScore >= 72 ? 'critical' : 'amber'}>
                {dominant?.abbr} {dominantScore}
              </DataChip>
            ) : (
              <DataChip>—</DataChip>
            )}
          </div>
        }
      />

      {!hazards ? (
        <div className="mt-3 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-7 animate-pulse rounded bg-electric/[0.04]" />
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          {HAZARD_META.map((meta) => {
            const score = hazards[meta.key];
            const tone = riskTone(score);
            return (
              <div key={meta.key} title={`${meta.label}: ${meta.description} — higher score means higher risk (0–100)`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="font-mono text-[8px] font-bold tracking-[0.1em] text-slate-600">
                      {meta.abbr}
                    </span>
                    <span className="truncate text-[10px] font-medium text-slate-300">
                      {meta.label}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 font-mono text-[10px] font-bold tabular-nums',
                      tone.text,
                    )}
                  >
                    {score}
                  </span>
                </div>
                <div
                  className={cn(
                    'relative mt-1 h-1.5 overflow-hidden rounded-full',
                    tone.track,
                  )}
                >
                  <div
                    className={cn(
                      'h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out',
                      tone.bar,
                    )}
                    style={{ width: `${clamp(score, 2, 100)}%` }}
                  />
                  <span className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[7.5px] uppercase tracking-[0.04em] text-slate-600">
                    {meta.description}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 font-mono text-[7.5px] font-bold tracking-[0.1em]',
                      tone.text,
                    )}
                  >
                    {tone.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.06] pt-2">
        <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-slate-600" title="0 = safe, 100 = abort the mission — higher score means higher risk">
          0 = LOW RISK · 100 = ABORT LIMIT
        </span>
        <span
          className={cn(
            'font-mono text-[8px] uppercase tracking-[0.14em]',
            dominantTone.text,
          )}
        >
          DOMINANT {dominantScore}
        </span>
      </div>
    </>
  );
}
