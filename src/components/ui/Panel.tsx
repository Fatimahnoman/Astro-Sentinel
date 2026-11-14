import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PanelProps {
  children: ReactNode;
  className?: string;
  tone?: 'cyan' | 'violet' | 'critical';
  id?: string;
}

export function Panel({ children, className, tone = 'cyan', id }: PanelProps) {
  return (
    <section
      id={id}
      className={cn(
        'glass-panel relative rounded-2xl',
        tone === 'violet' && 'glass-panel-violet',
        tone === 'critical' && 'border-critical/35',
        className,
      )}
    >
      <span className="pointer-events-none absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-electric/45 to-transparent" />
      <span className="pointer-events-none absolute left-0 top-3 h-5 w-px bg-electric/50" />
      <span className="pointer-events-none absolute bottom-3 right-0 h-5 w-px bg-violet/50" />
      {children}
    </section>
  );
}

interface PanelHeadingProps {
  icon: LucideIcon;
  title: string;
  kicker?: string;
  right?: ReactNode;
  className?: string;
  accent?: 'cyan' | 'violet' | 'critical';
}

export function PanelHeading({
  icon: Icon,
  title,
  kicker,
  right,
  className,
  accent = 'cyan',
}: PanelHeadingProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'grid h-8 w-8 shrink-0 place-items-center rounded-lg border',
            accent === 'cyan' && 'border-electric/25 bg-electric/10 text-electric',
            accent === 'violet' && 'border-violet/30 bg-violet/10 text-violet',
            accent === 'critical' && 'border-critical/35 bg-critical/10 text-critical',
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <div>
          <h2 className="font-display text-[11px] font-semibold leading-tight text-white/95">
            {title}
          </h2>
          {kicker ? <p className="label-micro mt-0.5">{kicker}</p> : null}
        </div>
      </div>
      {right}
    </div>
  );
}

interface DataChipProps {
  children: ReactNode;
  tone?: 'cyan' | 'violet' | 'mint' | 'amber' | 'critical' | 'muted';
  className?: string;
}

export function DataChip({ children, tone = 'muted', className }: DataChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.14em]',
        tone === 'cyan' && 'border-electric/30 bg-electric/10 text-electric',
        tone === 'violet' && 'border-violet/35 bg-violet/15 text-violet',
        tone === 'mint' && 'border-mint/30 bg-mint/10 text-mint',
        tone === 'amber' && 'border-amber/35 bg-amber/10 text-amber',
        tone === 'critical' && 'border-critical/40 bg-critical/15 text-critical',
        tone === 'muted' && 'border-white/10 bg-white/[0.03] text-slate-400',
        className,
      )}
    >
      {children}
    </span>
  );
}
