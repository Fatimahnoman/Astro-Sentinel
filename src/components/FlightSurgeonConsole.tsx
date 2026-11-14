'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Activity,
  Cpu,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import type {
  AstronautVitals,
  ConnectivityMode,
  SyncResult,
  TriageProtocol,
} from '@/types/telemetry';
import { cn } from '@/lib/utils';
import { Panel, PanelHeading, DataChip } from '@/components/ui/Panel';
import { ProtocolCard } from '@/components/ProtocolCard';
import { BlackBoxLogList } from '@/components/BlackBoxLogList';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

const QUICK_SYMPTOMS = [
  {
    label: 'Dizzy after spacewalk',
    hint: 'NEURO / SANS',
    query: 'Dizzy after spacewalk',
  },
  {
    label: 'Tachycardia alert',
    hint: 'CARDIO / RHYTHM',
    query: 'Tachycardia alert',
  },
  {
    label: 'Solar flare exposure',
    hint: 'RAD / SPE',
    query: 'Solar flare exposure',
  },
] as const;

interface FlightSurgeonConsoleProps {
  vitals: AstronautVitals | null;
  protocol: TriageProtocol | null;
  logs: TriageProtocol[];
  isTriaging: boolean;
  pendingLogCount: number;
  lastSync: SyncResult | null;
  mode: ConnectivityMode;
  solarStormActive: boolean;
  onRunTriage: (query: string) => Promise<void>;
  onClearProtocol: () => void;
}

export function FlightSurgeonConsole({
  vitals,
  protocol,
  logs,
  isTriaging,
  pendingLogCount,
  lastSync,
  mode,
  solarStormActive,
  onRunTriage,
  onClearProtocol,
}: FlightSurgeonConsoleProps) {
  const [query, setQuery] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTranscript = useCallback((transcript: string) => {
    setQuery((previous) => (previous ? `${previous} ${transcript}` : transcript));
    inputRef.current?.focus();
  }, []);

  const { isListening, isSupported, voiceError, toggleListening } =
    useVoiceInput(handleTranscript);
  const { isSupported: speechSupported } = useSpeechSynthesis(voiceEnabled, protocol);

  const submitQuery = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || !vitals || isTriaging) return;
      setQuery('');
      void onRunTriage(trimmed);
    },
    [vitals, isTriaging, onRunTriage],
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitQuery(query);
  };

  const triggerQuickSymptom = (symptomQuery: string) => {
    if (!vitals || isTriaging) return;
    setQuery(symptomQuery);
    submitQuery(symptomQuery);
  };

  return (
    <aside className="flex min-h-0 flex-col gap-3">
      {/* Console + input */}
      <Panel id="problems-panel" className="scroll-mt-24 p-3.5" tone="violet">
        <PanelHeading
          icon={Cpu}
          title="AI Doctor · Edge Flight Surgeon"
          kicker="ON-BOARD AI DOCTOR — ALWAYS AVAILABLE"
          accent="violet"
          right={
            <DataChip tone="violet">
              <span className="h-1 w-1 rounded-full bg-mint animate-sentinel-blink" />
              ON LOCAL
            </DataChip>
          }
        />

        <div
          className="mt-2.5 flex items-center justify-between gap-2 rounded-lg border border-violet/15 bg-violet/[0.045] px-2 py-1.5"
          title="No internet needed — the AI runs on the spacecraft itself"
        >
          <div className="flex items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.12em] text-violet/80">
            <Cpu className="h-3 w-3" />
            SENTINEL-7B · 4-BIT QUANT
          </div>
          <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-mint">
            AUTONOMY LOCKED
          </span>
        </div>

        <div className="mt-2 flex items-center gap-1.5 font-mono text-[7.5px] uppercase tracking-[0.1em] text-slate-500">
          <Activity className="h-3 w-3 text-electric/70" />
          CONTEXT ·{' '}
          {vitals
            ? `HR ${vitals.heartRate} · SpO₂ ${vitals.spo2}% · CORE ${vitals.coreTemp.toFixed(1)}°C`
            : 'AWAITING BIOMETRIC FRAME'}
          {solarStormActive ? (
            <span className="ml-auto text-critical">SPE CONTEXT</span>
          ) : null}
        </div>

        {/* Quick symptom chips */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {QUICK_SYMPTOMS.map((symptom) => (
            <button
              key={symptom.query}
              type="button"
              disabled={!vitals || isTriaging}
              onClick={() => triggerQuickSymptom(symptom.query)}
              title={`${symptom.label} — one tap and the AI doctor gives you a 3-step plan`}
              className="group flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.025] px-2 py-1 text-left transition-all hover:border-violet/35 hover:bg-violet/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-[#050814] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Zap className="h-2.5 w-2.5 text-violet" />
              <span>
                <span className="block text-[9px] font-medium leading-tight text-slate-300 group-hover:text-white">
                  {symptom.label}
                </span>
                <span className="block font-mono text-[6.5px] uppercase tracking-[0.12em] text-slate-600">
                  {symptom.hint}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Query input */}
        <form onSubmit={handleSubmit} className="mt-2.5">
          <div className="glass-inset flex items-center gap-1 rounded-xl p-1 transition-colors focus-within:border-electric/35">
            <input
              id="problem-input"
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={280}
              disabled={!vitals || isTriaging}
              placeholder={
                isSupported
                  ? 'Describe the symptom — e.g., dizzy after spacewalk'
                  : 'Type the symptom — e.g., dizzy after spacewalk'
              }
              aria-label="Describe your symptoms to the AI doctor"
              className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[10.5px] text-slate-200 outline-none placeholder:text-slate-600 disabled:cursor-not-allowed"
            />

            <button
              type="button"
              onClick={toggleListening}
              disabled={!isSupported || !vitals || isTriaging}
              aria-pressed={isListening}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              title={
                isSupported
                  ? isListening
                    ? 'Stop listening'
                    : 'Speak your symptoms to the AI doctor'
                  : 'Voice input not available in this browser — type instead'
              }
              className={cn(
                'grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-all',
                isListening
                  ? 'animate-alert-pulse border-critical/60 bg-critical/20 text-critical'
                  : 'border-white/10 bg-white/[0.03] text-slate-500 hover:border-electric/30 hover:text-electric disabled:cursor-not-allowed disabled:opacity-35',
              )}
            >
              <Mic className="h-3.5 w-3.5" />
            </button>

            <button
              type="submit"
              disabled={!query.trim() || !vitals || isTriaging}
              aria-label="Run flight surgeon triage"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-electric/35 bg-electric/15 text-electric transition-colors hover:bg-electric/25 disabled:cursor-not-allowed disabled:opacity-35"
            >
              {isTriaging ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </form>

        {/* Voice control strip */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                'h-1.5 w-1.5 shrink-0 rounded-full',
                isListening ? 'bg-critical animate-sentinel-blink' : 'bg-mint',
              )}
            />
            <span
              className={cn(
                'truncate font-mono text-[7px] uppercase tracking-[0.12em]',
                isListening ? 'text-critical' : 'text-slate-600',
              )}
            >
              {isListening
                ? 'MIC LIVE — SPEAK NOW'
                : isSupported
                  ? 'MIC READY — SPEAK ANYTIME'
                  : 'VOICE NOT SUPPORTED — TYPE INSTEAD'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setVoiceEnabled((enabled) => !enabled)}
            disabled={!speechSupported}
            aria-pressed={voiceEnabled}
            title={
              speechSupported
                ? 'Read the active care plan aloud'
                : 'Voice output not available in this browser'
            }
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[7.5px] font-semibold uppercase tracking-[0.1em] transition-colors',
              voiceEnabled
                ? 'border-electric/40 bg-electric/15 text-electric'
                : 'border-white/10 bg-white/[0.02] text-slate-500 hover:border-white/20 hover:text-slate-300',
              !speechSupported && 'cursor-not-allowed opacity-40',
            )}
          >
            {voiceEnabled ? (
              <Volume2 className="h-3 w-3" />
            ) : (
              <VolumeX className="h-3 w-3" />
            )}
            Voice Out {voiceEnabled ? 'On' : 'Off'}
          </button>
        </div>

        {voiceError ? (
          <p className="mt-1.5 rounded border border-critical/25 bg-critical/10 px-2 py-1 font-mono text-[7px] uppercase tracking-[0.08em] text-critical">
            {voiceError}
          </p>
        ) : null}
      </Panel>

      {/* Active protocol */}
      <Panel
        className="p-3.5"
        tone={protocol?.severity === 'CRITICAL' ? 'critical' : 'cyan'}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-violet" />
            <span className="font-display text-[10px] font-semibold text-white/90">
              Your 3-Step AI Plan
            </span>
          </div>
          <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-slate-600" title="Three simple steps the on-board AI doctor wants you to follow">
            EDGE OUTPUT · 3 STEPS
          </span>
        </div>
        <ProtocolCard
          protocol={protocol}
          isTriaging={isTriaging}
          onClear={onClearProtocol}
        />
      </Panel>

      {/* Black box */}
      <div id="save-panel" className="scroll-mt-24">
        <Panel className="p-3.5">
          <BlackBoxLogList
            logs={logs}
            pendingCount={pendingLogCount}
            lastSync={lastSync}
            mode={mode}
          />
        </Panel>
      </div>

      <p className="px-1 text-center font-mono text-[7px] uppercase leading-relaxed tracking-[0.1em] text-slate-700">
        Research prototype · not a substitute for a human flight surgeon
      </p>
    </aside>
  );
}
