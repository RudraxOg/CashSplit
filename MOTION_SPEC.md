# RoomMate Motion Specification

Status: analysis-only specification for the storyboard → lab → integration workflow.

## Reference baseline

The supplied reference is `design/references/roommate-motion-reference.mp4`, copied from `public/inspo1.mp4`. `ffprobe` reports 38.73 seconds, 720×1280 portrait, H.264 video at 30fps with AAC audio. The generated chronological assets are in `design/references/motion-frames/` and `design/references/motion-storyboard.jpg`.

The reference uses a centered floating-page frame, quiet scene changes, masked/translated typography, staged card assembly, alternating light/dark bands and a deliberate closing composition. RoomMate adapts those techniques without copying the reference's product, layout, branding or claims.

## Global motion rules

- Default easing: `cubic-bezier(0.16, 1, 0.3, 1)` for entrances; GSAP equivalent `power3.out` or `expo.out` where appropriate.
- Quick feedback: 160–220ms. Card entrances: 400–550ms. Section entrances: 550–700ms. Product transitions: 700–900ms.
- Stagger: 70–100ms, with a complete group under 500ms.
- Use transforms and opacity. Do not animate layout geometry continuously.
- No auto-scroll, scroll-jacking, fake cursor, blocking loader, or uncontrolled parallax.
- GSAP is reserved for coordinated timelines and desktop pinned story scenes. CSS handles hover/focus and simple reveal styling. `useGSAP` scopes and cleans every GSAP context.
- The existing marketing content, routes, pricing, tokens and authentication behavior remain authoritative.

## Scene matrix

| Scene | RoomMate section | Trigger | Element | Initial state | Final state | Duration | Delay | Stagger | Easing | Animation technique | Desktop behavior | Mobile behavior | Reduced-motion behavior |
|---|---|---|---|---|---|---:|---:|---:|---|---|---|---|---|
| 01 | Navbar | Initial mount; scroll state after leaving hero | Logo, links, CTA | Integrated, transparent/light | Visible; compact surface after scroll | 420ms | 0ms | 60ms | Expo-out | CSS state class + GSAP entry | Sticky; surface, blur, border and shadow become visible after scroll | Sticky compact header; accessible drawer | Static visible nav; no blur transition required |
| 02 | Hero | Initial mount | Eyebrow | `y: 12`, transparent | `y: 0`, visible | 420ms | 80ms | — | Expo-out | GSAP timeline | Enters first to establish context | Same sequence, shorter movement | Fully visible immediately |
| 03 | Hero | Initial mount | Masked headline lines | `yPercent: 105`, clipped | `yPercent: 0` | 650–700ms | 160ms | 90ms per line | Expo-out | Overflow mask + GSAP timeline | Two approved RoomMate lines reveal in order | No clipping; lines remain readable and may enter as one group | No mask animation; complete text shown |
| 04 | Hero | Initial mount | Supporting copy, CTAs, trust line | `y: 12`, transparent | Stable readable content | 420ms | 500ms | 70ms | Expo-out | GSAP timeline | CTAs become keyboard-available immediately; visual entrance does not block focus | Stacked buttons, 44px minimum targets | Static content |
| 05 | Hero product frame | Initial mount and viewport visibility | Dashboard browser frame and preview cards | `y: 30`, `scale: .965`, transparent | `y: 0`, `scale: 1`, visible | 820ms | 650ms | 80ms for internal cards | Expo-out | GSAP timeline + viewport pause | Premium frame rises after copy; internal demo assembles after frame settles | Normal-flow frame; no pinned sequence | Complete static dashboard state |
| 06 | Benefits strip | 15% viewport intersection | Four benefit labels | Slight `y: 10`, transparent | Visible and settled | 450ms | 0ms | 80ms | Expo-out | Existing reveal observer/CSS | Single row or wrapped row; no decorative motion beyond stagger | Two-column or stacked wrap | All labels visible |
| 07 | How it works | 15% viewport intersection | Three steps and connector | Cards below baseline; connector undrawn | Steps visible; connector drawn | 550ms | 0ms | 90ms | Expo-out | CSS/SVG stroke draw + reveal observer | Horizontal sequence communicates create → invite → share | Vertical progress line; no pinning | Connector and steps complete |
| 08 | Product story: expenses | Scroll enters story; desktop ScrollTrigger selects step | Receipt, member avatars, share amounts, balance card | Panel opacity .82, `y: 16`, detail cards hidden | ₹2,400 grocery is split and amounts settle | 780ms | 0ms | 80ms | Expo-out | ScrollTrigger state change + scoped GSAP timeline | Sticky product stage; normal scrolling controls progress | Stacked article with static expense panel | Final expense state shown, no scrub/pin |
| 09 | Product story: chores | Scroll enters second story step | Weekly cards, assignee avatar, completion mark | Upcoming cards offset and unconfirmed | Recurring kitchen-cleaning chore assigned/completed | 780ms | 0ms | 80ms | Expo-out | ScrollTrigger state change + check-pop | Stage transitions only when step changes | Natural stacked section | Completed state visible |
| 10 | Product story: shopping | Scroll enters third story step | Milk/dish soap items and live member indicator | Items below baseline, unchecked | Item added and another checked | 780ms | 0ms | 80ms | Expo-out | ScrollTrigger state change + scoped timeline | Stage remains pinned only within story bounds | Static list with simple reveal | Both meaningful statuses readable without motion/color |
| 11 | Product story: balances | Scroll enters fourth story step | Balance connections and settlement instructions | Several neutral connections | Minimal settlement instructions remain | 820ms | 0ms | 90ms | Expo-out | SVG/transform transition in stage | Unnecessary links fade after final state; no financial data is implied as live | Stacked final settlement card | Simplified final state displayed |
| 12 | Features | 15% viewport intersection | Six feature cards | `y: 24`, blurred/transparent | Visible, readable | 600ms | 0ms | 80ms | Expo-out | Existing reveal observer/CSS | Hover max `translateY(-3px)` and restrained shadow | Single/two-column cards; touch has no hover dependency | No blur or movement |
| 13 | Audience cards | 15% viewport intersection | Roommates, shared homes, operators | Slightly below baseline | Visible | 500ms | 0ms | 80ms | Expo-out | CSS/reveal observer | Operator card links conceptually to properties section | Stacked cards | Static cards |
| 14 | Properties | 15% viewport intersection | B2B copy and multi-property preview | Preview assembled in small stages | Dashboard preview settled | 650ms | 0ms | 80ms | Expo-out | Scoped GSAP or CSS sequence | Two-column presentation with mailto CTA | Stacked content then preview | Complete preview visible |
| 15 | Pricing | 15% viewport intersection | Free, Plus, Properties cards | `y: 24`, transparent | Stable readable plans | 550ms | 0ms | 90ms | Expo-out | Existing reveal observer/CSS | Highlighted Plus card remains geometrically stable | Cards stack without overlap or lifted clipping | All plan information visible immediately |
| 16 | FAQ | User activates accordion | Answer panel | Closed, height/opacity zero | Open with answer readable | 220ms | 0ms | — | Ease-out | CSS grid/opacity transition; semantic buttons | One answer may open at a time; keyboard-safe | Same behavior, no forced scroll | Instant open/close |
| 17 | Closing CTA | 15% viewport intersection | Dark panel, heading, CTAs | `y: 24`, `scale: .985`, transparent | `y: 0`, `scale: 1`, visible | 650ms | 0ms | 80ms | Expo-out | Existing reveal observer/CSS | Confident final scene, no aggressive zoom | Natural-flow panel with stacked CTAs | Static complete panel |
| 18 | Footer | 15% viewport intersection | Footer columns and legal/account links | Slightly below baseline | Visible | 450ms | 0ms | 70ms | Expo-out | CSS/reveal observer | Quiet exit; no looping ambient animation | Stacked columns | Static |

## Responsive and lifecycle constraints

Desktop ScrollTrigger is limited to the product-story section and must use `gsap.matchMedia`. On mobile, the story is normal document flow; no pinning or scrubbed scene is required. All timelines use `useGSAP` cleanup. Product-demo ambient animation pauses when its root is outside the viewport and when `document.visibilityState !== 'visible'`; it is disabled for reduced motion.
