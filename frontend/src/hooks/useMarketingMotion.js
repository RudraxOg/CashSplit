import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

export function useMarketingHeroMotion(scope) {
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set('.rm-hero, .rm-hero-title > span > i, .rm-hero-sub, .rm-hero-ctas, .rm-trust-line, .rm-hero-frame', { clearProps: 'all' });
    });
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      timeline
        .from('.rm-marketing-nav', { y: -12, autoAlpha: 0, duration: 0.55 })
        .from('.rm-hero > .rm-eyebrow', { y: 12, autoAlpha: 0, duration: 0.42 }, '-=0.22')
        .from('.rm-hero-title > span > i', { yPercent: 105, autoAlpha: 0, duration: 0.68, stagger: 0.1 }, '-=0.16')
        .from('.rm-hero-sub', { y: 12, autoAlpha: 0, duration: 0.42 }, '-=0.28')
        .from('.rm-hero-ctas', { y: 12, autoAlpha: 0, duration: 0.42 }, '-=0.24')
        .from('.rm-trust-line', { y: 8, autoAlpha: 0, duration: 0.3 }, '-=0.2')
        .from('.rm-hero-frame', { y: 30, scale: 0.965, autoAlpha: 0, duration: 0.82, ease: 'power3.out' }, '-=0.06')
        .from('.rm-demo-story-banner, .rm-demo-metrics > div, .rm-demo-panel', { y: 8, autoAlpha: 0, duration: 0.28, stagger: 0.06 }, '-=0.18');
      return () => timeline.kill();
    });
    return () => media.revert();
  }, { scope });
}
