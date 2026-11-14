'use client';

import { CloudOff, CloudUpload, Database } from 'lucide-react';
import type { ConnectivityMode, SyncResult, TriageProtocol } from '@/types/telemetry';
import { ORGAN_META, SEVERITY_THEME } from '@/lib/presentation';
import { cn, formatUtcTime } from '@/lib/utils';
import { DataChip, PanelHeading } from '@/components/ui/Panel';

interface BlackBoxLogListProps {
  logs: TriageProtocol[];
  pendingCount: number;
  lastSync: SyncResult | null;
  mode: ConnectivityMode;
}

export function BlackBoxLogList({
  logs,
  pendingCount,
  lastSync,
  mode,
}: BlackBoxLogListProps) {
  const lastSyncLabel =
    lastSync && lastSync.lastSyncTime.includes('T')
      ? formatUtcTime(lastSync.lastSyncTime)
      : null;

  return (
    <>
      <PanelHeading
        icon={Database}
        title="Saved Reports · Black Box"
        kicker="OFFLINE BLACK-BOX LOGS • STORED ONBOARD"
        right={
          <DataChip tone={pendingCount > 0 ? 'amber' : 'mint'}>
            {pendingCount > 0 ? `${pendingCount} PENDING` : `${logs.length} LOCAL`}
          </DataChip>
        }
      />

      <div className="cyber-scroll mt-2.5 max-h-[196px] space-y-1.5 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.015] px-3 py-5 text-center">
            <Database className="mx-auto h-4 w-4 text-slate-600" />
            <p className="mt-1.5 font-mono text-[8px] uppercase tracking-[0.16em] text-slate-600">
              No triage records yet
            </p>
            <p className="mt-1 font-mono text-[7px] tracking-[0.06em] text-slate-700">
              Protocols are recorded here as they are generated.
            </p>
          </div>
        ) : (
          logs.map((log, index) => {
            const theme = SEVERITY_THEME[log.severity];
            const organ = log.affectedOrgan
              ? ORGAN_META[log.affectedOrgan].short
              : 'SYSTEMIC';
            return (
              <div
                key={`${log.timestamp}-${index}`}
                className="group rounded-lg border border-white/[0.07] bg-white/[0.015] px-2 py-1.5 transition-colors hover:border-electric/20 hover:bg-electric/[0.03]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        theme.dot,
                        log.severity === 'CRITICAL' && 'animate-sentinel-blink',
                      )}
                    />
                    <span
                      className={cn(
                        'font-mono text-[8px] font-bold uppercase tracking-[0.1em]',
                        theme.text,
                      )}
                    >
                      {log.severity}
                    </span>
                    <span className="font-mono text-[7.5px] text-slate-600">
                      {formatUtcTime(log.timestamp)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-slate-600">
                      {organ}
                    </span>
                    {log.synced ? (
                      <CloudUpload
                        className="h-3 w-3 text-mint"
                        aria-label="Synced to DSN"
                      />
                    ) : (
                      <CloudOff
                        className="h-3 w-3 text-amber"
                        aria-label="Queued locally"
                      />
                    )}
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-[8.5px] leading-snug text-slate-400">
                  {log.diagnosis}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-2">
        <span className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-slate-600">
          {mode === 'EARTH_DSN_SYNC'
            ? lastSyncLabel
              ? `LAST DSN SYNC · ${lastSyncLabel}`
              : 'DSN LINK OPEN · AWAITING SYNC'
            : 'DSN CLOSED · LOCAL ONLY'}
        </span>
        <span className="font-mono text-[7.5px] uppercase tracking-[0.12em] text-slate-600">
          {logs.length}/24 RECORDS
        </span>
      </div>
    </>
  );
}
