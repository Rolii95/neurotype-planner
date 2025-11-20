import { useEffect, useRef } from 'react';

export function useIntersectionObserver(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const event = new CustomEvent('phased-intersection', { detail: entry });
        el.dispatchEvent(event);
      });
    }, options || { threshold: 0.5 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, options]);

  return ref;
}
