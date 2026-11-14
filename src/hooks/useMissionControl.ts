'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  executeFlightSurgeonTriage,
  fetchCrewProfiles,
  fetchTelemetrySnapshot,
  syncBlackBoxLogs,
} from '@/services/sentinelService';
import type {
  AstronautVitals,
  ConnectivityMode,
  OrganZone,
  SyncResult,
  TelemetrySnapshot,
  TriageProtocol,
} from '@/types/telemetry';
import { clamp } from '@/lib/utils';

export const DEFAULT_MISSION_DAY = 90;
const LOG_LIMIT = 24;

/**
 * Owns every piece of mission state and is the ONLY consumer of the service
 * adapter at the page level. All child components receive plain props.
 */
export function useMissionControl() {
  const [crewProfiles, setCrewProfiles] = useState<AstronautVitals[]>([]);
  const [selectedCrewId, setSelectedCrewId] = useState('');
  const [missionDay, setMissionDayState] = useState(DEFAULT_MISSION_DAY);
  const [solarStormActive, setSolarStormActive] = useState(false);
  const [mode, setMode] = useState<ConnectivityMode>('OFFLINE_EDGE');

  const [snapshot, setSnapshot] = useState<TelemetrySnapshot | null>(null);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(true);
  const [selectedOrgan, setSelectedOrgan] = useState<OrganZone>('heart');

  const [protocol, setProtocol] = useState<TriageProtocol | null>(null);
  const [isTriaging, setIsTriaging] = useState(false);
  const [logs, setLogs] = useState<TriageProtocol[]>([]);

  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const stormTriageClaim = useRef(false);

  const dismissError = useCallback(() => setError(null), []);

  /* ---------------------------------------------------------------- */
  /*  Crew roster                                                      */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    fetchCrewProfiles()
      .then((profiles) => {
        if (cancelled) return;
        setCrewProfiles(profiles);
        setSelectedCrewId((current) => current || profiles[0]?.crewId || '');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : 'Unable to load crew roster.');
        setIsSnapshotLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  /* ---------------------------------------------------------------- */
  /*  Telemetry snapshot (debounced while scrubbing the timeline)      */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedCrewId) return;

    let cancelled = false;
    setIsSnapshotLoading(true);

    const timer = window.setTimeout(() => {
      fetchTelemetrySnapshot(selectedCrewId, missionDay, solarStormActive)
        .then((nextSnapshot) => {
          if (cancelled) return;
          setSnapshot(nextSnapshot);
          setError(null);
        })
        .catch((cause: unknown) => {
          if (cancelled) return;
          setError(
            cause instanceof Error ? cause.message : 'Telemetry link interrupted.',
          );
        })
        .finally(() => {
          if (!cancelled) setIsSnapshotLoading(false);
        });
    }, 160);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedCrewId, missionDay, solarStormActive, refreshTick]);

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */
  const setMissionDay = useCallback((day: number) => {
    setMissionDayState(Math.round(clamp(day, 1, 180)));
  }, []);

  const selectCrew = useCallback((crewId: string) => {
    setSelectedCrewId(crewId);
    setProtocol(null);
    setSelectedOrgan('heart');
  }, []);

  const changeMode = useCallback((nextMode: ConnectivityMode) => {
    setMode(nextMode);
  }, []);

  const toggleSolarStorm = useCallback(() => {
    setSolarStormActive((previous) => {
      if (!previous) stormTriageClaim.current = true;
      return !previous;
    });
  }, []);

  const runTriage = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || !snapshot || isTriaging) return;

      setIsTriaging(true);
      try {
        const result = await executeFlightSurgeonTriage(
          trimmed,
          snapshot.vitals,
          solarStormActive,
          mode,
        );
        setProtocol(result);
        if (result.affectedOrgan) setSelectedOrgan(result.affectedOrgan);
        setLogs((previous) => [result, ...previous].slice(0, LOG_LIMIT));
        setError(null);
      } catch (cause: unknown) {
        setError(
          cause instanceof Error ? cause.message : 'Edge AI triage inference failed.',
        );
      } finally {
        setIsTriaging(false);
      }
    },
    [snapshot, solarStormActive, mode, isTriaging],
  );

  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncBlackBoxLogs(logs, mode);
      if (mode === 'EARTH_DSN_SYNC') {
        setLogs((previous) =>
          previous.map((log) => (log.synced ? log : { ...log, synced: true })),
        );
      }
      setLastSync(result);
      setError(null);
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : 'Black-box uplink failed.',
      );
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, logs, mode]);

  const pendingLogCount = useMemo(
    () => logs.filter((log) => !log.synced).length,
    [logs],
  );

  /* Auto-drain the black box whenever the DSN link is open. */
  useEffect(() => {
    if (mode !== 'EARTH_DSN_SYNC' || pendingLogCount === 0) return;
    void syncNow();
  }, [mode, pendingLogCount, syncNow]);

  /* A solar-storm toggle should immediately produce an autonomous protocol. */
  useEffect(() => {
    if (!stormTriageClaim.current || !solarStormActive || !snapshot) return;
    if (!snapshot.weather.eventType.includes('SOLAR PARTICLE')) return;

    stormTriageClaim.current = false;
    let cancelled = false;
    setIsTriaging(true);

    executeFlightSurgeonTriage('Solar flare exposure', snapshot.vitals, true, mode)
      .then((result) => {
        if (cancelled) return;
        setProtocol(result);
        if (result.affectedOrgan) setSelectedOrgan(result.affectedOrgan);
        setLogs((previous) => [result, ...previous].slice(0, LOG_LIMIT));
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error ? cause.message : 'Emergency triage inference failed.',
        );
      })
      .finally(() => {
        if (!cancelled) setIsTriaging(false);
      });

    return () => {
      cancelled = true;
    };
  }, [solarStormActive, snapshot, mode]);

  const refresh = useCallback(() => {
    setError(null);
    setRefreshTick((tick) => tick + 1);
  }, []);

  const clearProtocol = useCallback(() => setProtocol(null), []);

  return {
    // roster + mission
    crewProfiles,
    selectedCrewId,
    missionDay,
    solarStormActive,
    mode,
    // live data
    snapshot,
    isSnapshotLoading,
    error,
    // hologram + triage
    selectedOrgan,
    setSelectedOrgan,
    protocol,
    isTriaging,
    logs,
    // black box
    pendingLogCount,
    lastSync,
    isSyncing,
    // actions
    selectCrew,
    setMissionDay,
    changeMode,
    toggleSolarStorm,
    runTriage,
    syncNow,
    refresh,
    clearProtocol,
    dismissError,
  };
}

export type MissionControl = ReturnType<typeof useMissionControl>;
