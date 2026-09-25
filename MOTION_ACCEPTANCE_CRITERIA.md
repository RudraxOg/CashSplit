# RoomMate Motion Acceptance Criteria

Status: analysis-only gate for `/motion-lab` and later production integration.

## Scoring rubric

Score every criterion from 1–5 after replaying the actual page or lab artifact. A score of 4 means acceptable for integration; 5 means exemplary. The required minimums are explicit below.

| Criterion | Required score | Pass condition |
|---|---:|---|
| Purposeful motion | 4+ | Every prominent movement explains hierarchy, fairness, responsibility, shopping or settlement; decorative movement is secondary. |
| Visual hierarchy | 4+ | Eyebrow → headline → supporting copy/CTA → product proof is clear at first glance; no card competes with the primary action. |
| Smooth timing | 4+ | Entrances feel controlled, use approved easing, and have no visible jumps, delayed clicks or competing timelines. |
| RoomMate brand fit | 4+ | Warm off-white, charcoal/navy, green accent, restrained borders/radii and shared-living language remain intact. |
| Mobile behavior | 4+ | 360/390/768px layouts remain readable, flow naturally and never require desktop pinning or tiny product text. |
| Reduced-motion support | 5 | No looping, scrubbing, pinning, blur or large movement; all copy and product states are complete and readable. |
| No layout shift | 5 | No clipped headline, jumping pricing card, overlapping billing label, horizontal overflow or content that moves after it becomes readable. |
| No animation cleanup errors | 5 | Repeated mount/unmount or navigation creates no duplicated timelines, stale ScrollTriggers, console errors or residual inline styles. |

## Measurable checks

### Narrative and visual quality

- Hero’s first readable promise appears without waiting for an animation to finish.
- Headline lines are available as normal text to assistive technology and reveal within 650–700ms.
- Product frame begins no earlier than the supporting copy/CTA grouping and settles within approximately 1.6s of mount.
- Product story states are understandable without relying on color alone.
- At least 70% of motion is transform/opacity-based; no continuous layout-property animation is accepted.

### Responsiveness

Review at 360, 390, 768, 1024 and 1440px widths. Confirm:

- no horizontal scrollbar;
- buttons are at least 44px high and comfortably separated;
- hero headline, prices and plan cadence do not clip or overlap;
- mobile navigation has a visible focus state and does not leave body scrolling enabled while open;
- product-story panels become natural stacked sections below the desktop breakpoint;
- the dashboard remains legible rather than being scaled below useful text size.

### Accessibility

- `prefers-reduced-motion: reduce` produces complete static states for every section.
- Keyboard users can reach and activate all navbar, authentication, pricing, FAQ and footer links without waiting for animation.
- FAQ buttons expose correct `aria-expanded` and `aria-controls`; open answers are readable by assistive technology.
- Decorative orbs/frames are hidden from the accessibility tree.
- Focus is visible against both warm light and dark CTA surfaces.

### Runtime and performance

- Product demo pauses when its root leaves the viewport and when the tab is hidden.
- No separate global scroll listener is attached per component.
- ScrollTrigger instances are scoped and cleaned on unmount; repeated route navigation does not multiply triggers.
- No production markers, fake cursor or autoplay scroll.
- Build completes without errors. Any bundle-size increase from GSAP is recorded and reviewed; no new animation dependency is added beyond `gsap` and `@gsap/react`.
- Browser console remains free of warnings/errors caused by the motion work.

## Manual test script

1. Open the public page in a fresh tab and confirm navbar, hero and product frame sequence.
2. Tab from the address bar through the hero; activate signup and “See how it works” without waiting.
3. Scroll forward and backward through the product story; confirm no scroll-jack and stable section boundaries.
4. Open/close the mobile menu with pointer, keyboard and Escape; click outside and verify body scroll lock is released.
5. Toggle reduced motion in browser settings and reload; verify every section is complete and no looping remains.
6. Navigate away and back repeatedly; inspect the console for duplicate trigger/timeline behavior.
7. Resize through all required widths and inspect overflow, card overlap and readability.
8. Confirm `/signin` and `/signup` remain unchanged and authenticated product routes still load.

## Integration gate

Do not integrate a lab variant until it scores at least the required value in the rubric. Integrate one scene at a time, rerun the build after each scene, and keep the better version when a change improves one score but lowers another. The production page must not include lab controls or debug markers.

## Iteration log template

| Iteration | Scene | Variant/change | Purposeful | Hierarchy | Timing | Brand fit | Mobile | Reduced motion | Layout shift | Cleanup | Decision |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | — | — | — | — | — | — | — | — | — | — | — |
