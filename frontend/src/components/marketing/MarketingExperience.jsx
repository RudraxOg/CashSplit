import React, { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, ChefHat, CircleDollarSign, ClipboardList, Home, ListChecks, Receipt, ShoppingCart, Users, Wallet } from 'lucide-react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const STORY = [
  { eyebrow: 'FAIR EXPENSES', title: 'Split the bill without doing the maths.', body: 'Divide expenses equally, by amount, percentage, shares or individual items—and always know who owes what.', kind: 'expense' },
  { eyebrow: 'SHARED RESPONSIBILITY', title: 'Rotate chores without chasing anyone.', body: 'Assign responsibilities, create recurring rotations and keep everyone clear on what needs to happen next.', kind: 'chore' },
  { eyebrow: 'ONE LIVE LIST', title: 'Everyone knows what the house needs.', body: 'Add household essentials together, avoid duplicate purchases and check items off while shopping.', kind: 'shopping' },
  { eyebrow: 'SIMPLER SETTLEMENTS', title: 'Settle up with fewer payments.', body: 'RoomMate turns a confusing web of balances into the clearest way for everyone to settle.', kind: 'balance' },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update(); query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

function useInViewport(ref) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') { setVisible(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.12 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

export function HouseholdProductDemo() {
  const ref = useRef(null);
  const visible = useInViewport(ref);
  const reduced = useReducedMotion();
  const [tabVisible, setTabVisible] = useState(!document.hidden);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (reduced || !visible || !tabVisible) return undefined;
    const timer = window.setInterval(() => setPhase((value) => (value + 1) % 5), 2200);
    return () => window.clearInterval(timer);
  }, [reduced, tabVisible, visible]);

  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const staticPhase = reduced ? 4 : phase;
  return (
    <div ref={ref} className="rm-demo-shell" aria-label="Animated RoomMate household dashboard">
      <div className="rm-demo-browserbar"><span /><span /><span /><small>roommate.app / my-household</small><div className="rm-demo-live"><i /> 4 people online</div></div>
      <div className="rm-demo-layout">
        <aside className="rm-demo-nav"><strong><i /> roommate.</strong><span className="active"><Home size={13} /> Overview</span><span><Receipt size={13} /> Expenses</span><span><ListChecks size={13} /> Chores</span><span><ShoppingCart size={13} /> Shopping</span><span><Wallet size={13} /> Balances</span></aside>
        <div className="rm-demo-main">
          <div className="rm-demo-header"><div><small>MONDAY, AUGUST 25</small><h3>Good morning, Krishna.</h3></div><div className="rm-demo-members"><b>A</b><b>N</b><b>R</b><button>+ Add</button></div></div>
          <div className="rm-demo-story-banner" data-phase={staticPhase}><span>{staticPhase === 0 ? <Users size={14} /> : staticPhase === 1 ? <Receipt size={14} /> : staticPhase === 2 ? <ChefHat size={14} /> : staticPhase === 3 ? <ShoppingCart size={14} /> : <Check size={14} />}</span><p>{staticPhase === 0 ? 'Aman joined your household' : staticPhase === 1 ? '₹2,400 grocery expense added' : staticPhase === 2 ? 'Kitchen cleaning assigned to Neha' : staticPhase === 3 ? 'Dish soap added to the list' : 'Balances simplified to 2 payments'}</p><small>just now</small></div>
          <div className="rm-demo-metrics"><div><small>Total expenses</small><strong>{staticPhase >= 1 ? '₹18,760' : '₹16,360'}</strong><em>this month</em></div><div><small>Everyone is covered</small><strong>{staticPhase >= 4 ? '₹0' : '₹2,400'}</strong><em>{staticPhase >= 4 ? 'settled clearly' : 'to settle'}</em></div><div><small>Open chores</small><strong>{staticPhase >= 2 ? '3' : '2'}</strong><em>across the week</em></div></div>
          <div className="rm-demo-panels"><div className="rm-demo-panel"><header><b>Recent expenses</b><small>View all</small></header><div className={`rm-demo-expense ${staticPhase === 1 ? 'is-new' : ''}`}><span className="rm-demo-category grocery"><ShoppingCart size={13} /></span><div><b>Groceries</b><small>Krishna paid · 4 people</small></div><strong>₹2,400</strong></div><div className="rm-demo-share-row"><span><b>K</b><b>A</b><b>N</b><b>R</b></span><small>₹600 each</small><em>Equal split</em></div></div><div className="rm-demo-panel"><header><b>{staticPhase >= 3 ? 'Shopping list' : 'This week'}</b><small>{staticPhase >= 3 ? '3 items' : 'Chores'}</small></header><div className={`rm-demo-task ${staticPhase >= 2 ? 'done' : ''}`}><span>{staticPhase >= 2 ? <Check size={13} /> : <ChefHat size={13} />}</span><p>Kitchen cleaning<small>Neha · Today</small></p><em>{staticPhase >= 2 ? 'Done' : 'Due today'}</em></div><div className={`rm-demo-task ${staticPhase >= 3 ? 'done' : ''}`}><span>{staticPhase >= 3 ? <Check size={13} /> : <ShoppingCart size={13} />}</span><p>{staticPhase >= 3 ? 'Dish soap' : 'Milk & vegetables'}<small>{staticPhase >= 3 ? 'Added by Aman' : 'Shared list'}</small></p><em>{staticPhase >= 3 ? 'Added' : 'Open'}</em></div></div></div>
        </div>
      </div>
    </div>
  );
}

function StoryPanel({ kind }) {
  if (kind === 'expense') return <div className="rm-story-panel-content rm-story-expense"><div className="rm-story-receipt"><Receipt size={17} /><div><b>Groceries</b><small>Today · paid by Krishna</small></div><strong>₹2,400</strong></div><div className="rm-story-avatars"><b>K</b><b>A</b><b>N</b><b>R</b></div><div className="rm-story-share"><span>Krishna</span><strong>₹600</strong><em>paid ₹2,400</em></div><div className="rm-story-share"><span>Aman</span><strong>₹600</strong><em>owes ₹600</em></div><div className="rm-story-share"><span>Neha</span><strong>₹600</strong><em>owes ₹600</em></div><div className="rm-story-share"><span>Rohit</span><strong>₹600</strong><em>owes ₹600</em></div></div>;
  if (kind === 'chore') return <div className="rm-story-panel-content"><div className="rm-story-week"><small>THIS WEEK</small><b>Kitchen rotation</b><span>Mon 25 <i /> Tue 26 <i /> Wed 27 <i /> Thu 28</span></div><div className="rm-story-chore-card"><span><ChefHat size={17} /></span><div><b>Clean the kitchen</b><small>Due today · recurring weekly</small></div><strong>Neha</strong></div><div className="rm-story-chore-card complete"><span><Check size={17} /></span><div><b>Take out recycling</b><small>Completed just now</small></div><strong>Rohit</strong></div></div>;
  if (kind === 'shopping') return <div className="rm-story-panel-content"><div className="rm-story-list-head"><ShoppingCart size={17} /><div><b>Household shopping</b><small>3 people contributing</small></div><span><b>K</b><b>A</b><b>N</b></span></div><div className="rm-story-list-item"><span className="rm-story-check"><Check size={12} /></span><b>Milk</b><small>Added by Aman</small></div><div className="rm-story-list-item"><span className="rm-story-check empty" /><b>Dish soap</b><small>Added by Neha</small></div><div className="rm-story-list-item"><span className="rm-story-check empty" /><b>Vegetables</b><small>Added by Krishna</small></div></div>;
  return <div className="rm-story-panel-content"><div className="rm-story-balance-title"><ScaleIcon /><div><b>Simple settlement</b><small>After 6 shared expenses</small></div></div><div className="rm-story-transfer"><span className="rm-story-person">A</span><div><b>Aman pays Krishna</b><small>one clear payment</small></div><strong>₹600</strong></div><div className="rm-story-transfer"><span className="rm-story-person purple">N</span><div><b>Neha pays Krishna</b><small>one clear payment</small></div><strong>₹600</strong></div><p className="rm-story-settled"><Check size={14} /> 4 old connections simplified</p></div>;
}

function ScaleIcon() { return <span className="rm-story-scale"><CircleDollarSign size={17} /></span>; }

export function ProductStory() {
  const [active, setActive] = useState(0);
  const storyRef = useRef(null);
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add({ reduceMotion: '(prefers-reduced-motion: reduce)' }, ({ conditions }) => {
      if (conditions.reduceMotion) { setActive(0); return undefined; }
      const steps = gsap.utils.toArray('.rm-story-step');
      const triggers = steps.map((step, index) => ScrollTrigger.create({
        trigger: step,
        start: 'top 65%',
        end: 'bottom 35%',
        onEnter: () => setActive(index),
        onEnterBack: () => setActive(index),
      }));
      return () => triggers.forEach((trigger) => trigger.kill());
    });
    return () => media.revert();
  }, { scope: storyRef });
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { gsap.set('.rm-story-panel', { clearProps: 'all' }); return undefined; }
    gsap.fromTo('.rm-story-panel', { y: 12, autoAlpha: 0, scale: 0.985 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.58, ease: 'power3.out', overwrite: true });
    return undefined;
  }, { scope: storyRef, dependencies: [active], revertOnUpdate: true });
  return <section ref={storyRef} className="rm-product-story rm-gsap-story" aria-label="How RoomMate keeps shared living in sync"><div className="rm-story-copy">{STORY.map((step, index) => <article data-index={index} className={`rm-story-step ${active === index ? 'active' : ''}`} key={step.kind}><p className="rm-eyebrow">{step.eyebrow}</p><h2>{step.title}</h2><p>{step.body}</p><span className="rm-story-index">0{index + 1} / 04</span><div className="rm-story-mobile-panel"><StoryPanel kind={step.kind} /></div></article>)}</div><div className="rm-story-sticky"><div className="rm-story-sticky-inner"><div className="rm-story-stage-label">ROOMMATE / LIVE HOUSEHOLD</div><div className="rm-story-panel"><StoryPanel kind={STORY[active].kind} /></div><div className="rm-story-progress">{STORY.map((step, index) => <span key={step.kind} className={index === active ? 'active' : ''} />)}</div></div></div></section>;
}

export function AudienceSection() {
  const audiences = [{ icon: Users, title: 'Roommates and flatmates', body: 'Split rent, groceries and utilities while keeping chores fair.' }, { icon: Home, title: 'Couples and shared homes', body: 'Keep everyday responsibilities visible without turning them into repeated reminders.' }, { icon: BuildingIcon, title: 'PG and co-living operators', body: 'Manage multiple households, shared expenses and recurring responsibilities from one place.' }];
  return <section className="rm-audiences"><p className="rm-eyebrow center">MADE FOR THE WAY PEOPLE SHARE SPACE</p><h2 className="center">One calmer system for every shared home.</h2><div className="rm-audience-grid">{audiences.map(({ icon: Icon, title, body }) => <article className="rm-audience-card" key={title}><Icon size={19} /><h3>{title}</h3><p>{body}</p></article>)}</div></section>;
}

function BuildingIcon(props) { return <span className="rm-building-icon"><ClipboardList {...props} /></span>; }

export function PropertiesSection() {
  return <section className="rm-properties-section" id="properties"><div><p className="rm-eyebrow">PROPERTIES ROADMAP</p><h2>Property tooling is being explored.</h2><p>The current beta is built for individual households. PG administration, cross-house reporting, billing, and exports are not available yet.</p><a href="mailto:hello@roommate.app" className="rm-pill-btn rm-pill-btn-primary">Discuss the roadmap</a></div><div className="rm-property-preview" aria-label="Concept preview, not a live product"><header><b><i /> Concept preview</b><span>Not yet available</span></header><div className="rm-property-row"><span>Household overview</span><b>Planned</b><strong>Roadmap</strong></div><div className="rm-property-row"><span>Property reporting</span><b>Planned</b><strong>Roadmap</strong></div><div className="rm-property-row"><span>CSV export</span><b>Planned</b><strong>Roadmap</strong></div><footer><small>Illustrative only</small><span>Contact us →</span></footer></div></section>;
}

export function FAQSection() {
  const [open, setOpen] = useState(0);
  const questions = [
    ['Is RoomMate free?', 'Yes. RoomMate is free during its public beta. Paid subscriptions and history limits are not active yet.'],
    ['Does everyone in the household need an account?', 'Yes. Each person uses their own RoomMate account so expenses, responsibilities and invite membership stay attributable.'],
    ['Can RoomMate split expenses unequally?', 'Yes. The current expense engine supports equal, shares, percentage, exact, adjustment and itemized split strategies.'],
    ['Can chores repeat automatically?', 'Recurring chore rules are supported by the data model. The household can assign recurring responsibilities and due dates.'],
    ['How do household settlements work?', 'Balances are calculated from shared expenses and settlements. The product can show simplified transfers where the current group setting enables debt simplification.'],
    ['Is RoomMate suitable for PGs and co-living properties?', 'The Properties plan and multi-household reporting direction are designed for operators. Property billing and advanced admin workflows are not implemented yet.'],
    ['Can I leave or delete a household?', 'Account deletion is supported through the authenticated account flow. A dedicated self-service leave-household action is not yet exposed in the public UI.'],
  ];
  return <section className="rm-faq" id="faq"><div className="rm-faq-intro"><p className="rm-eyebrow">QUESTIONS, ANSWERED</p><h2>Good to know before you begin.</h2><p>Clear expectations are part of a calmer household.</p></div><div className="rm-faq-list">{questions.map(([question, answer], index) => { const expanded = open === index; const panelId = `faq-answer-${index}`; return <div className={`rm-faq-item ${expanded ? 'open' : ''}`} key={question}><h3><button type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setOpen(expanded ? -1 : index)}>{question}<span aria-hidden="true">{expanded ? '−' : '+'}</span></button></h3><div id={panelId} role="region" aria-hidden={!expanded} className="rm-faq-answer"><p>{answer}</p></div></div>; })}</div></section>;
}

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return <footer className="rm-marketing-footer"><div className="rm-footer-brand"><a href="/" className="rm-marketing-logo"><span className="rm-marketing-logo-mark" />roommate.</a><p>One shared home. One clear place.</p><small>© {year} RoomMate</small></div><div><p className="rm-footer-label">PRODUCT</p><a href="#how-it-works">How it works</a><a href="#product">Features</a><a href="#pricing">Pricing</a><a href="#properties">For properties</a></div><div><p className="rm-footer-label">SUPPORT</p><a href="#faq">FAQ</a><a href="mailto:hello@roommate.app">Contact</a><a href="#faq">Help centre</a></div><div><p className="rm-footer-label">ACCOUNT</p><a href="/signin">Sign in</a><a href="/signup">Start free</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></div></footer>;
}
