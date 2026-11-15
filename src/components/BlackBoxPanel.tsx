'use client';

import type {
  ConnectivityMode,
  SyncResult,
  TriageProtocol,
} from '@/types/telemetry';
import { Panel } from '@/components/ui/Panel';
import { BlackBoxLogList } from '@/components/BlackBoxLogList';

interface BlackBoxPanelProps {
  logs: TriageProtocol[];
  pendingLogCount: number;
  lastSync: SyncResult | null;
  mode: ConnectivityMode;
}

/**
 * Black-box reports column — local triage ring buffer + DSN sync status,
 * sized for the balanced lower 3-column grid.
 */
export function BlackBoxPanel({
  logs,
  pendingLogCount,
  lastSync,
  mode,
}: BlackBoxPanelProps) {
  return (
    <Panel className="flex h-full flex-col p-3.5">
      <BlackBoxLogList
        logs={logs}
        pendingCount={pendingLogCount}
        lastSync={lastSync}
        mode={mode}
      />
    </Panel>
  );
}
