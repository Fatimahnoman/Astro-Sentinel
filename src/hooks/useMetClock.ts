'use client';

import { useEffect, useState } from 'react';

/**
 * Mission Elapsed Time clock. The first render is intentionally null so the
 * server and client markup match; it starts ticking after mount.
 */
export function useMetClock(missionDay: number): number | null {
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => {
    const startedAt = Date.now();
    const dayOffset = Math.max(0, missionDay - 1) * 86_400;

    const tick = (): void => {
      setElapsed(dayOffset + (Date.now() - startedAt) / 1000);
    };

    tick();
    const interval = window.setInterval(tick, 1_000);
    return () => window.clearInterval(interval);
  }, [missionDay]);

  return elapsed;
}
