'use client';

import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  CloudUpload,
  Crosshair,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import type { TriageProtocol } from '@/types/telemetry';
import { ORGAN_META, SEVERITY_THEME } from '@/lib/presentation';
import { cn, formatUtcTime } from '@/lib/utils';
import { DataChip } from '@/components/ui/Panel';

interface ProtocolCardProps {
  protocol: TriageProtocol | null;
  isTriaging: boolean;
  onClear: () => void;
}

export function ProtocolCard({
  protocol,
  isTriaging,
  onClear,
}: ProtocolCardProps) {
  if (isTriaging) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-electric/20 bg-electric/[0.04] p-4">
        <div className="animate-sweep-down absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-electric/10 to-transparent" />
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-sentinel-blink rounded-full bg-electric" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-electric">
            Edge AI inference running…
          </span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-2 w-4/5 animate-pulse rounded bg-electric/15" />
          <div className="h-2 w-full animate-pulse rounded bg-electric/10" />
          <div className="h-2 w-3/5 animate-pulse rounded bg-electric/10" />
        </div>
        <p className="mt-3 font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">
          LOCAL MODEL · NO UPLINK REQUIRED · TRIAGE RULES v2.4
        </p>
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-4 py-6 text-center">
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-violet/25 bg-violet/10 text-violet">
          <Sparkles className="h-4 w-4" />
        </div>
        <p className="mt-2.5 font-display text-[10px] font-semibold text-slate-300">
          Waiting for a Symptom
        </p>
        <p className="mx-auto mt-1 max-w-[240px] font-mono text-[8px] leading-relaxed tracking-[0.04em] text-slate-600">
          Type your symptom, tap a chip, or press the mic. The on-board AI
          doctor answers with a simple 3-step plan.
        </p>
        <div className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[7px] uppercase tracking-[0.14em] text-slate-600">
          <Crosshair className="h-2.5 w-2.5 text-electric/60" />
          No uplink · autonomy locked
        </div>
      </div>
    );
  }

  const theme = SEVERITY_THEME[protocol.severity];
  const organ = protocol.affectedOrgan
    ? ORGAN_META[protocol.affectedOrgan]
    : null;
  const SeverityIcon =
    protocol.severity === 'CRITICAL'
      ? ShieldAlert
      : protocol.severity === 'WARNING'
        ? AlertTriangle
        : CheckCircle2;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border p-3',
        theme.border,
        theme.background,
      )}
    >
      <span
        className={cn(
          'absolute inset-x-0 top-0 h-px',
          protocol.severity === 'CRITICAL'
            ? 'bg-gradient-to-r from-transparent via-critical to-transparent'
            : 'bg-gradient-to-r from-transparent via-electric/50 to-transparent',
        )}
      />
      {protocol.severity === 'CRITICAL' ? (
        <span className="pointer-events-none absolute inset-0 animate-sentinel-pulse bg-[radial-gradient(circle_at_50%_0%,rgba(255,42,95,0.14),transparent_60%)]" />
      ) : null}

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'grid h-8 w-8 place-items-center rounded-lg border',
              theme.border,
              'bg-black/20',
              theme.text,
            )}
          >
            <SeverityIcon className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div>
            <div className="label-micro">Active Emergency Protocol</div>
            <div
              className={cn(
                'font-display text-[11px] font-bold',
                theme.text,
                protocol.severity === 'CRITICAL' && 'text-glow-red',
              )}
            >
              {theme.label} · {organ?.short ?? 'SYSTEMIC'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <DataChip
            tone={
              protocol.severity === 'CRITICAL'
                ? 'critical'
                : protocol.severity === 'WARNING'
                  ? 'amber'
                  : 'mint'
            }
          >
            <span className={cn('h-1 w-1 rounded-full', theme.dot)} />
            {formatUtcTime(protocol.timestamp)}
          </DataChip>
          <button
            type="button"
            onClick={onClear}
            aria-label="Dismiss active protocol"
            className="grid h-6 w-6 place-items-center rounded border border-white/10 text-slate-500 transition-colors hover:border-white/20 hover:text-slate-300"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      <p className="relative mt-2.5 text-[10.5px] leading-relaxed text-slate-200">
        {protocol.diagnosis}
      </p>

      <div className="relative mt-3 space-y-2">
        {protocol.steps.map((step, index) => (
          <div key={index} className="flex gap-2">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full border font-mono text-[8px] font-bold',
                  theme.border,
                  'bg-black/30',
                  theme.text,
                )}
              >
                {index + 1}
              </span>
              {index < 2 ? (
                <span className="mt-0.5 h-full w-px bg-gradient-to-b from-white/15 to-transparent" />
              ) : null}
            </div>
            <p className="pb-1 pt-0.5 text-[9.5px] leading-relaxed text-slate-400">
              {step}
            </p>
          </div>
        ))}
      </div>

      <div className="relative mt-2 flex items-center justify-between border-t border-white/[0.08] pt-2">
        <span className="flex items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-slate-500">
          {protocol.synced ? (
            <>
              <CloudUpload className="h-3 w-3 text-mint" />
              Black box synced to Earth DSN
            </>
          ) : (
            <>
              <CloudOff className="h-3 w-3 text-amber" />
              Local black box · uplink queued
            </>
          )}
        </span>
        <span className={cn('font-mono text-[7.5px] font-bold tracking-[0.12em]', theme.text)}>
          EDGE AI // TRIAGE
        </span>
      </div>
    </div>
  );
}
