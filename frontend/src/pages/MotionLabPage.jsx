import React, { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Check, ChefHat, CircleDollarSign, Home, ListChecks, ShoppingCart, Users, Wallet } from 'lucide-react';
import './motionLab.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const VARIANTS = {
  A: { label: 'Restrained masked reveal', subtitle: 'Typography leads. Product proof follows with a quiet, editorial rhythm.' },
  B: { label: 'Cinematic staged reveal', subtitle: 'A fuller sequence with more visible dashboard assembly and scene depth.' },
  C: { label: 'Product-first dashboard reveal', subtitle: 'The household UI arrives early so the product becomes the opening statement.' },
};

function useReducedMotionOverride(enabled) {
  const [systemReduced, setSystemReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return enabled || systemReduced;
}

function MiniNav() {
  return <header className="rm-lab-nav" data-lab-nav><a href="/" className="rm-lab-logo"><i />roommate.</a><nav><a href="#lab-hero">Hero</a><a href="#lab-story">Story</a><a href="#lab-close">Close</a></nav><a href="/signup" className="rm-lab-nav-cta">Start free</a></header>;
}

function DashboardDemo({ variant, reduced, timelineKey }) {
  const ref = useRef(null);
  const [phase, setPhase] = useState(0);
  const visibleRef = useRef(false);
  const hiddenRef = useRef(document.hidden);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') { visibleRef.current = true; return undefined; }
    const observer = new IntersectionObserver(([entry]) => { visibleRef.current = entry.isIntersecting; }, { threshold: 0.12 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => { hiddenRef.current = document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (reduced) { setPhase(4); return undefined; }
    setPhase(0);
    const timer = window.setInterval(() => {
      if (visibleRef.current && !hiddenRef.current) setPhase((value) => (value + 1) % 5);
    }, variant === 'B' ? 1450 : 1800);
    return () => window.clearInterval(timer);
  }, [reduced, variant, timelineKey]);

  const event = ['Aman joined your household', '₹2,400 grocery expense added', 'Kitchen cleaning assigned to Neha', 'Dish soap added to the list', 'Balances simplified to 2 payments'][phase];
  return <div ref={ref} className={`rm-lab-dashboard variant-${variant.toLowerCase()}`} aria-label="RoomMate household dashboard preview">
    <div className="rm-lab-browser"><span /><span /><span /><small>roommate.app / my-household</small><b><i /> 4 people online</b></div>
    <div className="rm-lab-dashboard-body">
      <aside><strong><i />roommate.</strong><span className="active"><Home size={13} /> Overview</span><span><Wallet size={13} /> Expenses</span><span><ListChecks size={13} /> Chores</span><span><ShoppingCart size={13} /> Shopping</span></aside>
      <div className="rm-lab-dashboard-main">
        <div className="rm-lab-dashboard-head"><div><small>MONDAY, AUGUST 25</small><h3>Good morning, Krishna.</h3></div><div className="rm-lab-avatars"><b>K</b><b>A</b><b>N</b><button>+ Add</button></div></div>
        <div className="rm-lab-event"><span>{phase === 0 ? <Users size={14} /> : phase === 1 ? <CircleDollarSign size={14} /> : phase === 2 ? <ChefHat size={14} /> : phase === 3 ? <ShoppingCart size={14} /> : <Check size={14} />}</span><strong>{event}</strong><small>just now</small></div>
        <div className="rm-lab-metrics"><div><small>Total expenses</small><strong>{phase >= 1 ? '₹18,760' : '₹16,360'}</strong><em>this month</em></div><div><small>To settle</small><strong>{phase >= 4 ? '₹0' : '₹2,400'}</strong><em>{phase >= 4 ? 'settled clearly' : 'across 4 people'}</em></div><div><small>Open chores</small><strong>{phase >= 2 ? '3' : '2'}</strong><em>this week</em></div></div>
        <div className="rm-lab-panels"><section><header><b>Recent expenses</b><small>View all</small></header><div className={`rm-lab-expense ${phase === 1 ? 'new' : ''}`}><span><ShoppingCart size={13} /></span><div><b>Groceries</b><small>Krishna paid · 4 people</small></div><strong>₹2,400</strong></div><div className="rm-lab-split"><span><b>K</b><b>A</b><b>N</b><b>R</b></span><small>₹600 each</small><em>Equal split</em></div></section><section><header><b>{phase >= 3 ? 'Shopping list' : 'This week'}</b><small>{phase >= 3 ? '3 items' : 'Chores'}</small></header><div className={`rm-lab-task ${phase >= 2 ? 'done' : ''}`}><span>{phase >= 2 ? <Check size={13} /> : <ChefHat size={13} />}</span><div><b>Kitchen cleaning</b><small>Neha · Today</small></div><em>{phase >= 2 ? 'Done' : 'Due today'}</em></div><div className={`rm-lab-task ${phase >= 3 ? 'done' : ''}`}><span>{phase >= 3 ? <Check size={13} /> : <ShoppingCart size={13} />}</span><div><b>{phase >= 3 ? 'Dish soap' : 'Milk & vegetables'}</b><small>{phase >= 3 ? 'Added by Aman' : 'Shared list'}</small></div><em>{phase >= 3 ? 'Added' : 'Open'}</em></div></section></div>
      </div>
    </div>
  </div>;
}

function HeroExperiment({ variant, reduced, replaySignal, onProgress }) {
  const scope = useRef(null);
  useGSAP(() => {
    const targets = gsap.utils.toArray('[data-hero-item]', scope.current);
    const frame = scope.current?.querySelector('[data-hero-frame]');
    const setComplete = () => onProgress(1);
    if (reduced) {
      gsap.set(targets, { clearProps: 'all' });
      gsap.set(frame, { clearProps: 'all' });
      onProgress(1);
      return undefined;
    }
    const timeline = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, onUpdate: () => onProgress(timeline.progress()), onComplete: setComplete });
    const copy = variant === 'C' ? '[data-hero-copy]' : '[data-hero-copy]';
    if (variant === 'C') {
      timeline.fromTo(frame, { y: 28, scale: .97, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: .78 })
        .from('[data-hero-eyebrow]', { y: 10, autoAlpha: 0, duration: .35 }, '-=.38')
        .from('[data-hero-title]', { y: 18, autoAlpha: 0, duration: .5 }, '-=.18')
        .from(copy, { y: 10, autoAlpha: 0, duration: .35 }, '-=.2');
    } else {
      timeline.from('[data-hero-nav]', { y: -10, autoAlpha: 0, duration: .42 })
        .from('[data-hero-eyebrow]', { y: 12, autoAlpha: 0, duration: .38 }, '-=.18')
        .from('[data-hero-line]', { yPercent: 105, autoAlpha: 0, duration: variant === 'B' ? .7 : .62, stagger: variant === 'B' ? .12 : .09 }, '-=.1')
        .from(copy, { y: 12, autoAlpha: 0, duration: .38 }, '-=.22')
        .from(frame, { y: 30, scale: .965, autoAlpha: 0, duration: variant === 'B' ? .88 : .76 }, '-=.04');
    }
    timeline.play(0);
    return () => timeline.kill();
  }, { scope, dependencies: [variant, reduced, replaySignal], revertOnUpdate: true });

  return <div ref={scope} className="rm-lab-hero-experiment">
    <div data-hero-nav><MiniNav /></div>
    <div className="rm-lab-hero-copy"><p data-hero-eyebrow>FOR ROOMMATES, FLATMATES & SHARED HOMES</p><h1 data-hero-title><span><i data-hero-line>Shared bills and chores,</i></span><span><i data-hero-line>finally in sync.</i></span></h1><p data-hero-copy>Split expenses, rotate chores, share shopping lists and see who owes what—all in one calm place your household can rely on.</p><div data-hero-copy className="rm-lab-actions"><a href="/signup">Create your household <ArrowRight size={15} /></a><a href="#lab-story">See how it works</a></div><small data-hero-copy>Free for up to 5 people · No card required · Invite with a link</small></div>
    <div data-hero-frame className="rm-lab-frame"><DashboardDemo variant={variant} reduced={reduced} timelineKey={replaySignal} /></div>
  </div>;
}

function StoryExperiment({ reduced, speed, onScene, onProgress }) {
  const scope = useRef(null);
  const panel = useRef(null);
  const [active, setActive] = useState(0);
  const steps = [
    ['Expenses', 'Split the bill without doing the maths.', '₹2,400 groceries split equally between Krishna, Aman, Neha and Rohit.'],
    ['Chores', 'Rotate chores without chasing anyone.', 'Kitchen cleaning is assigned to Neha and marked complete.'],
  ];
  useGSAP(() => {
    if (reduced) { gsap.set(panel.current, { clearProps: 'all' }); onProgress(1); return undefined; }
    const mm = gsap.matchMedia();
    mm.add('(min-width: 861px)', () => {
      const trigger = ScrollTrigger.create({ trigger: scope.current, start: 'top 18%', end: 'bottom 80%', scrub: .35, onUpdate: (self) => { const next = self.progress > .52 ? 1 : 0; setActive((current) => current === next ? current : next); onScene(next); onProgress(self.progress); } });
      return () => trigger.kill();
    });
    mm.add('(max-width: 860px)', () => {
      const trigger = ScrollTrigger.create({ trigger: scope.current, start: 'top 65%', end: 'bottom 35%', onEnter: () => { setActive(0); onScene(0); }, onLeave: () => { setActive(1); onScene(1); }, onEnterBack: () => { setActive(0); onScene(0); }, onLeaveBack: () => setActive(0) });
      return () => trigger.kill();
    });
    return () => mm.revert();
  }, { scope, dependencies: [reduced, speed], revertOnUpdate: true });

  useEffect(() => { if (!panel.current || reduced) return undefined; gsap.fromTo(panel.current, { y: 12, scale: .985, autoAlpha: .72 }, { y: 0, scale: 1, autoAlpha: 1, duration: .7 / speed, ease: 'power3.out', overwrite: true, onUpdate: () => onProgress(.52) }); return undefined; }, [active, reduced, speed, onProgress]);

  return <section ref={scope} id="lab-story" className="rm-lab-story"><div className="rm-lab-story-copy"><p className="rm-lab-kicker">ISOLATED SCROLL EXPERIMENT</p>{steps.map(([label, title, body], index) => <article className={index === active ? 'active' : ''} key={label}><small>0{index + 1} / 02</small><p>{label}</p><h2>{title}</h2><span>{body}</span></article>)}</div><div className="rm-lab-story-stage"><div className="rm-lab-stage-head"><span>ROOMMATE / LIVE HOUSEHOLD</span><b>{steps[active][0]}</b></div><div ref={panel} className="rm-lab-story-panel">{active === 0 ? <><div className="rm-lab-receipt"><CircleDollarSign size={18} /><div><b>Groceries</b><small>Today · paid by Krishna</small></div><strong>₹2,400</strong></div><div className="rm-lab-share-title">Equal split <span>4 people</span></div>{['Krishna · paid ₹2,400', 'Aman · owes ₹600', 'Neha · owes ₹600', 'Rohit · owes ₹600'].map((item) => <div className="rm-lab-share" key={item}><span>{item[0]}</span><b>{item}</b><strong>₹600</strong></div>)}</> : <><div className="rm-lab-week"><small>THIS WEEK</small><b>Kitchen rotation</b><span>Mon 25 · Tue 26 · Wed 27 · Thu 28</span></div><div className="rm-lab-chore"><span><ChefHat size={16} /></span><div><b>Clean the kitchen</b><small>Recurring weekly · Neha</small></div><strong><Check size={14} /> Done</strong></div><div className="rm-lab-chore muted"><span><Check size={16} /></span><div><b>Take out recycling</b><small>Completed just now · Rohit</small></div><strong>Complete</strong></div></>}</div><div className="rm-lab-progress"><i className={active === 0 ? 'active' : ''} /><i className={active === 1 ? 'active' : ''} /></div></div></section>;
}

function MotionLabPage() {
  const [variant, setVariant] = useState('B');
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [reducedOverride, setReducedOverride] = useState(false);
  const [replaySignal, setReplaySignal] = useState(0);
  const [scene, setScene] = useState('Hero entrance');
  const [progress, setProgress] = useState(0);
  const reduced = useReducedMotionOverride(reducedOverride);
  const pageRef = useRef(null);

  useEffect(() => { gsap.globalTimeline.timeScale(paused ? 0 : speed); return () => { gsap.globalTimeline.timeScale(1); }; }, [paused, speed]);
  useEffect(() => { document.title = 'Motion Lab · RoomMate'; return () => { document.title = 'RoomMate'; }; }, []);

  return <main ref={pageRef} className="rm-motion-lab">
    <section id="lab-hero" className="rm-lab-hero"><div className="rm-lab-hero-intro"><div><p className="rm-lab-kicker">DEVELOPMENT-ONLY MOTION LAB</p><h1>Find the motion that makes shared living feel clear.</h1><p>Compare three isolated hero directions before anything touches the production onboarding page.</p></div><div className="rm-lab-status"><span className="rm-lab-live-dot" /> Scene: <b>{scene}</b><small>{Math.round(progress * 100)}% complete</small></div></div><HeroExperiment variant={variant} reduced={reduced} replaySignal={replaySignal} onProgress={setProgress} /></section>
    <section className="rm-lab-controls" aria-label="Motion lab controls"><div><span className="rm-lab-kicker">EXPERIMENT CONTROLS</span><h2>{VARIANTS[variant].label}</h2><p>{VARIANTS[variant].subtitle}</p></div><div className="rm-lab-control-grid"><fieldset><legend>Hero variant</legend>{Object.entries(VARIANTS).map(([key, value]) => <button key={key} className={variant === key ? 'selected' : ''} onClick={() => { setVariant(key); setReplaySignal((n) => n + 1); setScene(`Hero variant ${key}`); }}><b>{key}</b>{value.label}</button>)}</fieldset><div className="rm-lab-control-row"><button onClick={() => setReplaySignal((n) => n + 1)}><span>↻</span> Replay</button><button onClick={() => setPaused((value) => !value)}>{paused ? '▶ Resume' : 'Ⅱ Pause'}</button><label>Speed<select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option></select></label><label className="rm-lab-toggle"><input type="checkbox" checked={reducedOverride} onChange={(event) => setReducedOverride(event.target.checked)} /> Reduced motion</label></div></div></section>
    <StoryExperiment reduced={reduced} speed={speed} onScene={(index) => { setScene(index ? 'Chores transition' : 'Expenses transition'); }} onProgress={setProgress} />
    <section id="lab-close" className="rm-lab-close"><p className="rm-lab-kicker">FINAL CTA EXPERIMENT</p><h2>Ready for a calmer household?</h2><p>Bring expenses, chores and shopping into one shared place.</p><div><a href="/signup">Create your household <ArrowRight size={15} /></a><a href="/">Back to onboarding</a></div></section>
  </main>;
}

export default MotionLabPage;
