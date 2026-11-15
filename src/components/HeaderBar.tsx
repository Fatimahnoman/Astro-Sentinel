'use client';

import {
  CloudUpload,
  Database,
  Orbit,
  Radio,
  RefreshCw,
  Satellite,
  ShieldAlert,
  Timer,
  WifiOff,
} from 'lucide-react';
import type { AstronautVitals, ConnectivityMode, SyncResult } from '@/types/telemetry';
import { useMetClock } from '@/hooks/useMetClock';
import { cn, formatMet, formatUtcTime, getInitials } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';

interface HeaderBarProps {
  crewProfiles: AstronautVitals[];
  selectedCrewId: string;
  onCrewChange: (crewId: string) => void;
  missionDay: number;
  mode: ConnectivityMode;
  onModeChange: (mode: ConnectivityMode) => void;
  pendingLogCount: number;
  totalLogCount: number;
  lastSync: SyncResult | null;
  onSync: () => void;
  isSyncing: boolean;
  solarStormActive: boolean;
}

export function HeaderBar({
  crewProfiles,
  selectedCrewId,
  onCrewChange,
  missionDay,
  mode,
  onModeChange,
  pendingLogCount,
  totalLogCount,
  lastSync,
  onSync,
  isSyncing,
  solarStormActive,
}: HeaderBarProps) {
  const met = useMetClock(missionDay);
  const selectedCrew = crewProfiles.find((crew) => crew.crewId === selectedCrewId);
  const earthMode = mode === 'EARTH_DSN_SYNC';
  const lastSyncLabel =
    lastSync && lastSync.lastSyncTime.includes('T')
      ? formatUtcTime(lastSync.lastSyncTime)
      : 'READY';

  const syncLabel = !earthMode
    ? `${pendingLogCount} QUEUED`
    : isSyncing
      ? 'UPLINKING…'
      : pendingLogCount > 0
        ? `${pendingLogCount} QUEUED`
        : `SYNCED ${lastSyncLabel}`;

  return (
    <header className="sticky top-0 z-40 border-b border-electric/15 bg-void/85 backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-electric/55 to-transparent" />
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        {/* Identity */}
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-electric/35 bg-electric/10 shadow-[0_0_28px_-8px_rgba(0,240,255,0.8)] sm:h-11 sm:w-11">
            <Orbit className="h-5 w-5 text-electric sm:h-6 sm:w-6" strokeWidth={1.6} />
            <span className="absolute inset-1 rounded-full border border-violet/45 animate-sentinel-pulse" />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_8px_rgba(45,255,179,0.9)] animate-sentinel-blink" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-lg font-bold leading-none tracking-[0.22em] text-white sm:text-xl">
                ASTRO<span className="text-electric text-glow-cyan">-SENTINEL</span>
              </h1>
              <span className="hidden rounded border border-violet/35 bg-violet/10 px-1.5 py-0.5 font-mono text-[8px] font-semibold tracking-[0.16em] text-violet sm:inline">
                NASA SPACE APPS 2026
              </span>
              {solarStormActive ? (
                <span className="animate-alert-pulse inline-flex items-center gap-1 rounded border border-critical/50 bg-critical/15 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-[0.16em] text-critical"
                  title="Solar storm active — dangerous radiation risk for any spacewalk"
                >
                  <ShieldAlert className="h-2.5 w-2.5" />
                  SPE ACTIVE
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
              Autonomous 3D Astronaut Digital Twin
              <span className="mx-1.5 text-electric/60">//</span>
              Edge AI Flight Surgeon
            </p>
            <p className="mt-0.5 hidden truncate font-mono text-[8px] tracking-[0.08em] text-slate-600 sm:block">
              Your AI doctor in deep space — always on duty
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 items-stretch gap-2 sm:flex sm:flex-wrap">
          {/* Crew selector */}
          <div
            className="glass-inset flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 sm:min-w-[176px]"
            title="Choose the astronaut to monitor — tap to switch crew member"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-electric/30 bg-electric/10 font-mono text-[9px] font-bold text-electric">
              {selectedCrew ? getInitials(selectedCrew.name) : '--'}
            </span>
            <div className="min-w-0 flex-1">
              <label htmlFor="crew-select" className="label-micro block">
                Crew Select
              </label>
              <select
                id="crew-select"
                className="sentinel-select w-full cursor-pointer truncate border-0 bg-transparent p-0 pr-8 text-[11px] font-semibold uppercase tracking-[0.08em] text-white outline-none"
                value={selectedCrewId}
                onChange={(event) => onCrewChange(event.target.value)}
              >
                {crewProfiles.length === 0 ? (
                  <option value="">Linking roster…</option>
                ) : null}
                {crewProfiles.map((crew) => (
                  <option key={crew.crewId} value={crew.crewId}>
                    {crew.name} · {crew.crewId}
                  </option>
                ))}
              </select>
              <span className="block truncate font-mono text-[8px] uppercase tracking-[0.12em] text-slate-500">
                {selectedCrew?.role ?? 'Waiting for body sensor data…'}
              </span>
            </div>
          </div>

          {/* MET clock */}
          <div className="glass-inset relative min-w-0 overflow-hidden rounded-xl px-2.5 py-1.5 sm:px-3">
            <div className="flex items-center gap-1.5" title="Mission elapsed time — days, hours, minutes, seconds since launch">
              <Timer className="h-3 w-3 text-electric" strokeWidth={1.8} />
              <span className="label-micro hidden sm:inline">Mission Time</span>
              <span className="label-micro sm:hidden">MET</span>
              <span className="h-1 w-1 rounded-full bg-mint animate-sentinel-blink" />
            </div>
            <div className="font-mono text-[13px] font-semibold leading-tight tracking-[0.08em] text-white sm:text-[15px] sm:tracking-[0.12em]">
              {formatMet(met)}
            </div>
            <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-slate-500">
              DAY {String(missionDay).padStart(3, '0')} / 180 · MARS TRANSIT
            </div>
          </div>

          {/* Connectivity mode */}
          <div className="glass-inset min-w-0 rounded-xl px-2 py-1.5">
            <div className="mb-1 flex items-center gap-1.5">
              <Radio className="h-3 w-3 text-electric" strokeWidth={1.8} />
              <span className="label-micro" title="Connection to Earth — how we reach mission control">
                Earth Link
              </span>
            </div>
            <div className="flex items-center rounded-lg border border-white/10 bg-black/30 p-0.5">
              <button
                type="button"
                aria-pressed={!earthMode}
                title="Offline — the AI doctor works on board even without a signal from Earth"
                onClick={() => onModeChange('OFFLINE_EDGE')}
                className={cn(
                  'flex items-center gap-1 rounded-md px-1.5 py-1 font-mono text-[8.5px] font-semibold uppercase tracking-[0.08em] transition-all sm:gap-1.5 sm:px-2 sm:text-[9px] sm:tracking-[0.1em]',
                  !earthMode
                    ? 'bg-electric/15 text-electric shadow-[inset_0_0_0_1px_rgba(0,240,255,0.3)]'
                    : 'text-slate-500 hover:text-slate-300',
                )}
              >
                <WifiOff className="h-3 w-3" />
                <span className="sm:hidden">EDGE</span>
                <span className="hidden sm:inline">AI ON BOARD</span>
              </button>
              <button
                type="button"
                aria-pressed={earthMode}
                title="Online — reports sync with Earth via the Deep Space Network"
                onClick={() => onModeChange('EARTH_DSN_SYNC')}
                className={cn(
                  'flex items-center gap-1 rounded-md px-1.5 py-1 font-mono text-[8.5px] font-semibold uppercase tracking-[0.08em] transition-all sm:gap-1.5 sm:px-2 sm:text-[9px] sm:tracking-[0.1em]',
                  earthMode
                    ? 'bg-violet/20 text-violet shadow-[inset_0_0_0_1px_rgba(157,78,221,0.38)]'
                    : 'text-slate-500 hover:text-slate-300',
                )}
              >
                <Satellite className="h-3 w-3" />
                <span className="sm:hidden">DSN</span>
                <span className="hidden sm:inline">EARTH LINK</span>
              </button>
            </div>
          </div>

          {/* Black-box sync badge */}
          <div
            className={cn(
              'glass-inset flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1.5 sm:gap-2 sm:px-2.5',
              earthMode ? 'border-violet/25' : 'border-amber/20',
            )}
            title={`${totalLogCount} saved triage reports — tap the sync icon to send them to Earth when online`}
          >
            <span
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center rounded-lg border sm:h-7 sm:w-7',
                earthMode
                  ? 'border-violet/30 bg-violet/10 text-violet'
                  : 'border-amber/30 bg-amber/10 text-amber',
              )}
            >
              {earthMode ? (
                <CloudUpload className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              ) : (
                <Database className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              )}
            </span>
            <div className="min-w-0">
              <div className="label-micro truncate whitespace-nowrap">
                Black Box<span className="hidden sm:inline"> · {totalLogCount} LOG</span>
              </div>
              <div
                className={cn(
                  'truncate font-mono text-[9px] font-semibold uppercase tracking-[0.06em] sm:text-[10px] sm:tracking-[0.08em]',
                  earthMode ? 'text-violet' : 'text-amber',
                )}
              >
                {syncLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={onSync}
              disabled={!earthMode || isSyncing}
              aria-label="Sync black-box logs to Earth"
              className={cn(
                'ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors',
                earthMode
                  ? 'border-violet/35 bg-violet/10 text-violet hover:bg-violet/20'
                  : 'border-white/10 bg-white/[0.02] text-slate-600',
                isSyncing && 'opacity-70',
              )}
            >
              <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
            </button>
          </div>

          {/* Day/Night shift toggle */}
          <div className="flex items-center justify-center">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
