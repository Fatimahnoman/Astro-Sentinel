'use client';

import { MessageCircleQuestion, ScanFace, Save, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  target: string;
  number: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: 'violet' | 'cyan' | 'amber';
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    target: 'problems-panel',
    number: '01',
    title: 'Report a Symptom',
    subtitle: 'Tell the AI doctor — type it or tap a suggestion',
    icon: MessageCircleQuestion,
    accent: 'violet',
  },
  {
    target: 'twin-panel',
    number: '02',
    title: 'See the 3D Body',
    subtitle: 'Tap brain, heart or spine to inspect',
    icon: ScanFace,
    accent: 'cyan',
  },
  {
    target: 'save-panel',
    number: '03',
    title: 'Save Your Data',
    subtitle: 'Reports sync with Earth when online',
    icon: Save,
    accent: 'amber',
  },
];

const ACCENT_STYLES: Record<QuickAction['accent'], string> = {
  violet:
    'border-violet/30 bg-violet/10 text-violet hover:border-violet/55 hover:bg-violet/15',
  cyan: 'border-electric/30 bg-electric/10 text-electric hover:border-electric/55 hover:bg-electric/15',
  amber:
    'border-amber/30 bg-amber/10 text-amber hover:border-amber/55 hover:bg-amber/15',
};

/**
 * Three-step guided entry to the whole interface.
 * Step 1 — tell the AI doctor, Step 2 — see your body in 3D, Step 3 — data is saved.
 */
export function QuickActions() {
  const jumpTo = (target: string) => {
    const element = document.getElementById(target);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('flash-focus');
    window.setTimeout(() => element.classList.remove('flash-focus'), 2400);

    if (target === 'problems-panel') {
      window.setTimeout(
        () => document.getElementById('problem-input')?.focus({ preventScroll: true }),
        400,
      );
    }
  };

  return (
    <nav
      aria-label="Three main actions"
      className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-3"
    >
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.target}
            type="button"
            onClick={() => jumpTo(action.target)}
            title={`${action.title} — ${action.subtitle}`}
            className={cn(
              'group flex h-full min-h-[64px] w-full items-center gap-3 rounded-xl border px-3 py-3 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-[#050814] md:min-h-[72px] md:px-4 md:py-3.5',
              ACCENT_STYLES[action.accent],
            )}
          >
            <span className="flex shrink-0 items-center gap-1.5">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} aria-hidden />
              <span className="hidden font-mono text-[8px] font-bold text-slate-500 group-hover:text-slate-300 lg:inline">
                {action.number}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] font-bold uppercase leading-tight tracking-[0.1em] text-white/95 sm:text-[10px]">
                {action.title}
              </span>
              <span className="mt-0.5 block text-[7px] leading-snug text-slate-400 sm:text-[8px]">
                {action.subtitle}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
