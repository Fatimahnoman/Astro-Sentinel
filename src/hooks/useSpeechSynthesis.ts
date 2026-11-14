'use client';

import { useEffect, useState } from 'react';
import type { TriageProtocol } from '@/types/telemetry';

export function useSpeechSynthesis(
  enabled: boolean,
  protocol: TriageProtocol | null,
): { isSupported: boolean } {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  useEffect(() => {
    if (!enabled || !protocol || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const script = [
      `Flight surgeon protocol. Severity: ${protocol.severity}.`,
      protocol.diagnosis,
      `Step one. ${protocol.steps[0]}`,
      `Step two. ${protocol.steps[1]}`,
      `Step three. ${protocol.steps[2]}`,
    ].join(' ');

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = 'en-US';
    utterance.rate = 0.94;
    utterance.pitch = 0.82;
    utterance.volume = 0.95;
    synth.speak(utterance);

    return () => {
      synth.cancel();
    };
  }, [enabled, protocol]);

  return { isSupported };
}
