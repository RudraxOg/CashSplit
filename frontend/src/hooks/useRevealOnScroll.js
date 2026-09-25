import { useEffect, useRef } from 'react';

export function useRevealOnScroll() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') {
      container?.querySelectorAll('.rm-reveal').forEach((item) => item.classList.add('rm-reveal-in'));
      return undefined;
    }
    const items = container.querySelectorAll('.rm-reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('rm-reveal-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return containerRef;
}
