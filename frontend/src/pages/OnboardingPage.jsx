import React, { useRef } from 'react';
import { ArrowRight, Check, ListChecks, Receipt, Scale, Users, Wallet, Zap } from 'lucide-react';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll';
import { useMarketingHeroMotion } from '../hooks/useMarketingMotion';
import { AudienceSection, FAQSection, HouseholdProductDemo, MarketingFooter, ProductStory, PropertiesSection } from '../components/marketing/MarketingExperience';

const FEATURES = [
  { icon: Wallet, title: 'Split bills fairly', body: 'Split equally, by amount, percentage, shares or individual receipt items.' },
  { icon: ListChecks, title: 'Rotate chores without chasing', body: 'Assign responsibilities, set due dates and keep recurring work visible.' },
  { icon: Scale, title: 'See the whole household', body: 'Keep expenses, chores, shopping and balances in one shared place.' },
  { icon: Zap, title: 'Settle with fewer payments', body: 'Clear balances with a simple view of who owes what and what happens next.' },
  { icon: Receipt, title: 'Track household spending', body: 'See spending reports and recent activity without searching through old messages.' },
  { icon: Users, title: 'Keep a shared activity history', body: 'Know what was added, completed or settled, and who made the change.' },
];

const HOW_IT_WORKS = [
  { number: '01', title: 'Create your household', body: 'Set up your home, trip or shared space in under a minute.' },
  { number: '02', title: 'Invite the people you live with', body: 'Share one private invite link. Everyone keeps their own account.' },
  { number: '03', title: 'Run the home together', body: 'Add expenses, responsibilities and shopping items as life happens.' },
];

const PLANS = [
  { name: 'Beta', price: '₹0', tag: 'while in public beta', cta: 'Start free', available: true, features: ['Up to 5 members', 'All current split types', 'Chores and shopping', 'Shared household history'] },
  { name: 'Plus', price: 'Roadmap', tag: 'pricing not launched', cta: 'Join the beta', highlight: true, available: true, features: ['Future premium plan', 'Recurring-chore automation', 'Expanded reporting', 'Customization'] },
  { name: 'Properties', price: 'Roadmap', tag: 'not yet available', cta: 'Discuss the roadmap', features: ['Planned for PG operators', 'Property administration', 'Cross-house reporting', 'Data export'] },
];

export default function OnboardingPage() {
  const marketingRef = useRef(null);
  const featuresRef = useRevealOnScroll();
  const workflowRef = useRevealOnScroll();
  const pricingRef = useRevealOnScroll();
  const benefitsRef = useRevealOnScroll();
  const closingRef = useRevealOnScroll();
  useMarketingHeroMotion(marketingRef);

  return (
    <div ref={marketingRef} className="rm-marketing rm-gsap-root">
      <MarketingNavbar />
      <main>
        <section className="rm-hero rm-fade-slide-up">
          <p className="rm-eyebrow">FOR ROOMMATES, FLATMATES & SHARED HOMES</p>
          <h1 className="rm-hero-title"><span><i>Shared bills and chores,</i></span><span><i>finally in sync.</i></span></h1>
          <p className="rm-hero-sub">Split expenses, rotate chores, share shopping lists and see who owes what—all in one calm place your household can rely on.</p>
          <div className="rm-hero-ctas"><a href="/signup" className="rm-pill-btn rm-pill-btn-primary">Create your household <ArrowRight size={15} /></a><a href="#how-it-works" className="rm-pill-btn rm-pill-btn-ghost">See how it works</a></div>
          <p className="rm-trust-line">Free for up to 5 people · No card required · Invite with a link</p>
          <div className="rm-hero-frame rm-fade-slide-up-delayed"><HouseholdProductDemo /></div>
        </section>

        <section ref={benefitsRef} className="rm-proof-strip" aria-label="RoomMate benefits"><span>BUILT FOR SHARED LIVING</span><b className="rm-reveal" style={{ transitionDelay: '80ms' }}>Bills split fairly</b><b className="rm-reveal" style={{ transitionDelay: '160ms' }}>Chores stay visible</b><b className="rm-reveal" style={{ transitionDelay: '240ms' }}>One shared shopping list</b><b className="rm-reveal" style={{ transitionDelay: '320ms' }}>Everyone knows what’s next</b></section>

        <section id="how-it-works" className="rm-workflow" ref={workflowRef}><p className="rm-eyebrow center">A CALMER WAY TO SHARE A HOME</p><h2 className="center">Set up once. Stay in sync.</h2><div className="rm-workflow-grid">{HOW_IT_WORKS.map((step, index) => <article key={step.number} className="rm-workflow-step rm-reveal" style={{ transitionDelay: `${index * 80}ms` }}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div></section>

        <ProductStory />

        <section id="features" className="rm-features" ref={featuresRef}><p className="rm-eyebrow center">EVERYTHING IN ONE HOUSEHOLD</p><h2 className="center">Everything your household needs to stay fair.</h2><p className="rm-section-sub">Money, responsibilities and everyday essentials—organized clearly for everyone.</p><div className="rm-feature-grid">{FEATURES.map((feature, index) => { const Icon = feature.icon; return <article key={feature.title} className="rm-feature-card rm-reveal" style={{ transitionDelay: `${index * 80}ms` }}><div className="rm-feature-icon"><Icon size={18} /></div><h3>{feature.title}</h3><p>{feature.body}</p></article>; })}</div></section>

        <AudienceSection />
        <PropertiesSection />

        <section id="pricing" className="rm-pricing" ref={pricingRef}><p className="rm-eyebrow center">PUBLIC BETA</p><h2 className="center">Start free while RoomMate is in beta.</h2><p className="rm-section-sub">Paid subscriptions and property tooling are roadmap items, not active purchases.</p><div className="rm-pricing-grid">{PLANS.map((plan, index) => <article key={plan.name} className={`rm-price-card rm-reveal ${plan.highlight ? 'rm-price-card-highlight' : ''}`} style={{ transitionDelay: `${index * 80}ms` }}>{plan.highlight && <span className="rm-price-badge">Coming next</span>}<h3>{plan.name}</h3><p className="rm-price-amount">{plan.price}<span>{plan.tag}</span></p><ul>{plan.features.map((feature) => <li key={feature}><Check size={14} />{feature}</li>)}</ul><a href={plan.available ? '/signup' : 'mailto:hello@roommate.app'} className={`rm-pill-btn ${plan.highlight ? 'rm-pill-btn-primary' : 'rm-pill-btn-ghost'}`}>{plan.cta}</a></article>)}</div></section>

        <FAQSection />
        <section ref={closingRef} className="rm-cta-band rm-reveal" id="closing-cta"><h2>Ready for a calmer household?</h2><p>Bring expenses, chores and shopping into one shared place. Invite everyone when you’re ready.</p><div className="rm-cta-actions"><a href="/signup" className="rm-pill-btn rm-pill-btn-primary">Create your household <ArrowRight size={15} /></a><a href="#pricing" className="rm-pill-btn rm-pill-btn-ghost rm-cta-ghost">View beta details</a></div><small>Free during beta · No credit card required</small></section>
      </main>
      <div id="legal"><MarketingFooter /></div>
    </div>
  );
}
