'use client';

import { Component, type ReactNode } from 'react';
import { Crosshair } from 'lucide-react';

interface WebGLBoundaryProps {
  children: ReactNode;
}

interface WebGLBoundaryState {
  hasError: boolean;
}

/**
 * Catches WebGL/Three.js failures (no GPU, blocked context, driver crash) and
 * renders a graceful fallback so the 4-zone HUD — vitals, AI console, 3D organ
 * buttons — keeps working everywhere, even without a working WebGL context.
 */
export class WebGLBoundary extends Component<WebGLBoundaryProps, WebGLBoundaryState> {
  state: WebGLBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WebGLBoundaryState {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="hologram-fallback absolute inset-0 grid place-items-center">
          <div className="flex max-w-xs flex-col items-center gap-3 rounded-xl border border-electric/25 bg-void/80 px-6 py-6 text-center backdrop-blur-md">
            <Crosshair className="h-8 w-8 text-electric" strokeWidth={1.2} />
            <p className="font-display text-[11px] font-semibold text-white/90">
              WebGL Unavailable
            </p>
            <p className="font-mono text-[8px] leading-relaxed uppercase tracking-[0.08em] text-slate-500">
              This browser could not start the 3D engine. All other systems —
              vitals, AI flight surgeon, hazards and black-box logs — work fully.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
