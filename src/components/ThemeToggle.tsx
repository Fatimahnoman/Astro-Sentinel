'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'as-theme';

type Theme = 'dark' | 'light';

/**
 * Day/Night shift toggle. Writes <html data-theme="…"> (pre-painted by the
 * inline script in layout.tsx, so there's no flash) and persists the user's
 * choice to localStorage. Broadcasts to other tabs via `storage` events.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'light' ? 'light' : 'dark');
    setMounted(true);
  }, []);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === 'light' || event.newValue === 'dark')) {
        setTheme(event.newValue);
        document.documentElement.setAttribute('data-theme', event.newValue);
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // storage may be unavailable (private mode) — theme still applies for this tab
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={theme === 'light'}
      aria-label={theme === 'light' ? 'Switch to night mode' : 'Switch to day mode'}
      title={theme === 'light' ? 'Night Mode' : 'Day Mode'}
      className={cn(
        'grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-electric/30 bg-electric/10 text-electric transition-all hover:border-electric/60 hover:bg-electric/20',
        'focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-void)]',
        className,
      )}
    >
      {!mounted ? (
        <span className="h-4 w-4 rounded-full border border-electric/40" aria-hidden />
      ) : theme === 'light' ? (
        <Moon className="h-4 w-4" strokeWidth={1.8} />
      ) : (
        <Sun className="h-4 w-4" strokeWidth={1.8} />
      )}
    </button>
  );
}
