'use client';

import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { HeaderBar } from '@/components/HeaderBar';
import { LeftPanel } from '@/components/LeftPanel';
import { CenterStage } from '@/components/CenterStage';
import { HazardsPanel } from '@/components/HazardsPanel';
import { BlackBoxPanel } from '@/components/BlackBoxPanel';
import { FlightSurgeonConsole } from '@/components/FlightSurgeonConsole';
import { TimelineSimulator } from '@/components/TimelineSimulator';
import { QuickActions } from '@/components/QuickActions';
import { useMissionControl } from '@/hooks/useMissionControl';
import { USE_MOCK_DATA } from '@/services/sentinelService';

function ErrorBanner({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-[1920px] px-3 pt-3 sm:px-4">
      <div
        role="alert"
        className="flex items-center gap-3 rounded-xl border border-critical/35 bg-critical/10 px-3 py-2 backdrop-blur-xl"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-critical" />
        <p className="min-w-0 flex-1 font-mono text-[9px] uppercase tracking-[0.06em] text-critical/90">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="flex shrink-0 items-center gap-1 rounded border border-critical/35 bg-critical/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.1em] text-critical hover:bg-critical/20"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          Retry
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="grid h-6 w-6 shrink-0 place-items-center rounded border border-white/10 text-slate-500 hover:text-slate-300"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export default function MissionControlPage() {
  const mission = useMissionControl();
  const vitals = mission.snapshot?.vitals ?? null;
  const hazards = mission.snapshot?.hazards ?? null;
  const weather = mission.snapshot?.weather ?? null;

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Page-level ambient scan grid */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(0,240,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.022)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_85%)]" />

      <HeaderBar
        crewProfiles={mission.crewProfiles}
        selectedCrewId={mission.selectedCrewId}
        onCrewChange={mission.selectCrew}
        missionDay={mission.missionDay}
        mode={mission.mode}
        onModeChange={mission.changeMode}
        pendingLogCount={mission.pendingLogCount}
        totalLogCount={mission.logs.length}
        lastSync={mission.lastSync}
        onSync={() => void mission.syncNow()}
        isSyncing={mission.isSyncing}
        solarStormActive={mission.solarStormActive}
      />

      {mission.error ? (
        <ErrorBanner
          message={mission.error}
          onRetry={mission.refresh}
          onDismiss={mission.dismissError}
        />
      ) : null}

      <main className="relative z-10 mx-auto flex w-full max-w-[1920px] flex-1 flex-col gap-4 px-3 py-3 sm:px-4">
        <QuickActions />

        {/* Top row — 3D twin with upper telemetry column (untouched) */}
        <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
          <div className="order-2 min-h-0 lg:order-2">
            <LeftPanel
              vitals={vitals}
              solarStormActive={mission.solarStormActive}
            />
          </div>

          <div className="order-1 min-w-0 lg:order-1 lg:col-span-1">
            <CenterStage
              vitals={vitals}
              hazards={hazards}
              weather={weather}
              protocol={mission.protocol}
              selectedOrgan={mission.selectedOrgan}
              solarStormActive={mission.solarStormActive}
              isTriaging={mission.isTriaging}
              onSelectOrgan={(organ) => mission.setSelectedOrgan(organ)}
            />
          </div>
        </div>

        {/* Lower 3-column balanced grid — hazards | AI doctor | black box */}
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
          <div className="min-h-0">
            <HazardsPanel
              hazards={hazards}
              weather={weather}
              solarStormActive={mission.solarStormActive}
              onToggleSolarStorm={mission.toggleSolarStorm}
            />
          </div>

          <div className="min-h-0">
            <FlightSurgeonConsole
              vitals={vitals}
              protocol={mission.protocol}
              logs={mission.logs}
              isTriaging={mission.isTriaging}
              pendingLogCount={mission.pendingLogCount}
              lastSync={mission.lastSync}
              mode={mission.mode}
              solarStormActive={mission.solarStormActive}
              onRunTriage={mission.runTriage}
              onClearProtocol={mission.clearProtocol}
            />
          </div>

          <div id="save-panel" className="min-h-0 scroll-mt-24">
            <BlackBoxPanel
              logs={mission.logs}
              pendingLogCount={mission.pendingLogCount}
              lastSync={mission.lastSync}
              mode={mission.mode}
            />
          </div>
        </div>

        <TimelineSimulator
          missionDay={mission.missionDay}
          onMissionDayChange={mission.setMissionDay}
          snapshot={mission.snapshot}
          solarStormActive={mission.solarStormActive}
          isSnapshotLoading={mission.isSnapshotLoading}
        />
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-[1920px] flex-wrap items-center justify-between gap-2 px-3 pb-3 font-mono text-[7px] uppercase tracking-[0.12em] text-slate-700 sm:px-4">
        <span>
          ASTRO-SENTINEL v1.0 · NASA SPACE APPS CHALLENGE 2026 · AUTONOMOUS
          DEEP-SPACE MEDICAL INTELLIGENCE
        </span>
        <span className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-mint" />
          Service adapter · {USE_MOCK_DATA ? 'SIMULATION' : 'LIVE BACKEND'}
          <span className="text-slate-800">|</span>
          Next.js 15 · WebGL Twin · Edge AI
        </span>
      </footer>
    </div>
  );
}
