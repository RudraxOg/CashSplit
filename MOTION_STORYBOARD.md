# RoomMate Motion Storyboard

Status: analysis-only. This storyboard is the bridge between the supplied video and the isolated `/motion-lab`; it is not a production implementation instruction by itself.

## Reference inspection

Reference: `design/references/roommate-motion-reference.mp4` (source: `public/inspo1.mp4`). Measured duration is 38.73s, portrait 720×1280, 30fps. The storyboard image and one-second frame sequence were generated at:

- `design/references/motion-storyboard.jpg`
- `design/references/motion-frames/frame-001.png` … `frame-039.png`

The frames were read chronologically. The meaningful signal is the change between adjacent frames: a centered page/frame persists while its contents, background treatment and section emphasis change in deliberate stages.

## Reference chronology and useful motion language

| Approx. time | Observed reference beat | Motion language | RoomMate adaptation |
|---:|---|---|---|
| 0–4s | Dark opening with a centered floating webpage and soft green atmosphere; large headline establishes the scene | Calm reveal, depth from restrained background contrast, framed page rather than full-bleed clutter | Use the existing warm RoomMate hero and a rounded dashboard frame. Do not copy the dark financial headline or atmosphere literally. |
| 4–8s | Headline/page content resolves into a lighter, more editorial composition | Dark-to-light tonal transition and typography hierarchy | Keep RoomMate's warm off-white page; use masked headline lines and a quiet nav entrance. |
| 8–12s | Navigation and account-like content appear within the framed page | Staged UI assembly; secondary elements arrive after the primary message | Map to hero copy → CTAs → dashboard frame → internal household cards. |
| 12–16s | Content cards assemble in a measured sequence | Cards enter as a group with stagger and stable rounded geometry | Map to member join, ₹2,400 grocery expense, shares and balances. |
| 16–21s | A dark feature band and multiple cards create a strong visual chapter | Section-level contrast change; cards are the narrative units | Map to the product story's expenses/chores chapters, while keeping RoomMate sage/neutral tokens. |
| 21–26s | Light product/feature presentation returns with larger cards and illustration-like UI | Alternating scene rhythm prevents monotony; primary object remains anchored | Map to shopping and responsibility visibility; use actual product-shaped UI, not stock artwork. |
| 26–31s | Pricing/plan-like content moves toward the close | Sequential pricing emphasis and stable card layout | Map to pricing cards with readable billing cadence and no layout shift. |
| 31–38.73s | Closing dark composition and footer-like information settle the experience | Confident final hold; the page does not end with frantic motion | Map to the dark closing CTA, then a quiet footer. Keep the signup CTA immediately usable. |

## RoomMate chronological storyboard

### Frame 01 — Arrival

The visitor lands in a warm, spacious page. `roommate.` and the primary destinations are visible without a blocking loader. The navbar is integrated with the hero at rest and gains a subtle warm surface only after scroll.

### Frame 02 — Promise

The eyebrow rises first. The two approved headline lines reveal through clipped masks, not a typewriter effect. Supporting copy, “Create your household,” “See how it works,” and the trust line follow in a short stagger. All links remain real links and are available to keyboard users immediately.

### Frame 03 — Product proof

The rounded dashboard frame rises from `scale(.965)` to `scale(1)`. Once the frame is settled, the demo assembles: a new member avatar joins, a grocery expense is added, and the household ledger presents the amount as a shared operation—not as fake live account data.

### Frame 04 — Fairness becomes visible

The member shares resolve around the ₹2,400 grocery expense. A balance card settles after the shares. The movement is short and explanatory: the viewer sees that RoomMate does the arithmetic and exposes the result.

### Frame 05 — Responsibility becomes visible

The scroll story transitions to recurring kitchen cleaning. Weekly cards enter their dates, the assignee appears, and completion uses the existing restrained check-pop. The page never forces the user to scroll; normal scroll position drives the chapter.

### Frame 06 — Everyday coordination

Shopping items enter one at a time. “Dish soap” is added, “Milk” is checked, and a small live-member indicator changes. No particle effects or bouncing decorations are needed; the list state itself is the story.

### Frame 07 — Fewer settlement steps

Several balance connections appear, then unnecessary links fade and the final settlement instructions remain. This communicates clarity and fewer actions without claiming a specific live household balance.

### Frame 08 — The toolkit and the audience

Benefits and feature cards reveal in restrained rows. Audience cards clarify roommates, couples/shared homes and PG/co-living operators. The operator path leads to the intentionally separate multi-property section.

### Frame 09 — Pricing and close

Free, Plus and Properties arrive sequentially but remain stable. The Plus highlight does not jump or overlap its billing cadence. The dark closing CTA then rises gently: “Ready for a calmer household?” The footer resolves quietly with product, support, legal and account links.

## Deliberate exclusions

- No crypto/finance branding, financial-trading imagery or copied reference copy.
- No exact reference composition, page frame proportions or scene graphics.
- No blocking splash screen; any future intro must be under 700ms, once per session and disabled for reduced motion.
- No simulated real cursor; any cursor inside a demo would be clearly decorative and only justified by a later lab experiment.
- No autoplay page scrolling or scroll-jacking.
- No fake customer counts, testimonials or unsupported outcome claims.
- No neon gradients, excessive glassmorphism, purple SaaS styling or unrelated assets.

## Lab sequence

The animation lab should expose, in order: navbar scroll transition, hero variants A/B/C, household dashboard demo, one expenses-to-chores ScrollTrigger scene and closing CTA. Only after a human selects a variant should the approved scene be integrated into production one section at a time.
