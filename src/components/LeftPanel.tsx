'use client';

import type { AstronautVitals } from '@/types/telemetry';
import { Panel } from '@/components/ui/Panel';
import { VitalsGrid } from '@/components/VitalsGrid';
import { HeartRateChart } from '@/components/HeartRateChart';

interface LeftPanelProps {
  vitals: AstronautVitals | null;
  solarStormActive: boolean;
}

/**
 * Upper-left telemetry column — live vitals + 24h heart-rate trace.
 * Hazard meters + storm injector live in the lower 3-column grid now.
 */
export function LeftPanel({ vitals, solarStormActive }: LeftPanelProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col gap-3">
      <Panel className="shrink-0 p-3.5">
        <VitalsGrid vitals={vitals} solarStormActive={solarStormActive} />
      </Panel>

      <Panel className="flex min-h-0 flex-1 p-3.5">
        <HeartRateChart vitals={vitals} />
      </Panel>
    </aside>
  );
}
