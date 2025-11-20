import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';

export type Phase = 'skeleton' | 'summary' | 'full';

export interface UsePhasedViewOptions {
  storageKey?: string; // localStorage key to persist phase
  initial?: Phase;
  autoPromoteThresholdMs?: number; // time to wait after enter viewport to promote
}

export function usePhasedView(options?: UsePhasedViewOptions) {
  const { storageKey, initial = 'skeleton', autoPromoteThresholdMs = 800 } = options || {};
  const [currentPhase, setCurrentPhase] = useState<Phase>(() => {
    try {
      if (storageKey) {
        const v = localStorage.getItem(storageKey);
        if (v === 'skeleton' || v === 'summary' || v === 'full') return v;
      }
    } catch (e) {
      // ignore
    }
    return initial;
  });

  const timerRef = useRef<number | null>(null);
  const observedRef = useIntersectionObserver();

  useEffect(() => {
    try {
      if (storageKey) localStorage.setItem(storageKey, currentPhase);
    } catch (e) {
      // ignore
    }
  }, [currentPhase, storageKey]);

  const promotePhase = useCallback((target: Phase) => {
    setCurrentPhase((prev) => {
      const order = ['skeleton', 'summary', 'full'];
      if (order.indexOf(target) <= order.indexOf(prev)) return prev; // never go backwards
      return target;
    });
  }, []);

  const autoPromoteToFull = useCallback(() => {
    // Start a short timer to promote to full (gives user a chance to interact)
    if (currentPhase === 'full') return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setCurrentPhase('full');
    }, autoPromoteThresholdMs);
  }, [currentPhase, autoPromoteThresholdMs]);

  useEffect(() => {
    const el = observedRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const custom = e as CustomEvent<IntersectionObserverEntry>;
      const entry = custom.detail as IntersectionObserverEntry;
      if (entry.isIntersecting) {
        // When enters view, promote to summary and start auto-promote timer
        setCurrentPhase((prev) => (prev === 'skeleton' ? 'summary' : prev));
        autoPromoteToFull();
      }
    };
    el.addEventListener('phased-intersection', handler as EventListener);
    return () => el.removeEventListener('phased-intersection', handler as EventListener);
  }, [observedRef, autoPromoteToFull]);

  // expose a focus handler for keyboard accessibility
  const onFocus = useCallback(() => {
    setCurrentPhase((prev) => (prev === 'skeleton' ? 'summary' : prev));
    autoPromoteToFull();
  }, [autoPromoteToFull]);

  // attachRef to be given to the card DOM node
  const attachRef = observedRef;

  return {
    currentPhase,
    promotePhase,
    autoPromoteToFull,
    onFocus,
    attachRef,
  } as const;
}
