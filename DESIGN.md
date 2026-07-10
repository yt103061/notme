# Tell Poker Design System

This design system treats the product as a tell-driven multiplayer "not me" poker game: the UI is not decoration, it is the board where players read intentional signals, leaked tells, hidden-card anxiety, and betting contradictions.

## Token Layer: Machine-readable Source of Truth

The values below must stay synchronized one-to-one with `design-tokens.json`. Token names are organized in three layers: `primitive`, `semantic`, and `component`.

### Primitive Tokens

#### primitive.color

| Token | Value | Role |
|---|---:|---|
| `ink000` | `#05070D` | Deepest app canvas |
| `ink100` | `#0B1020` | Table surface base |
| `ink200` | `#121A2B` | Read panels and compact cards |
| `ink300` | `#1B2740` | Raised controls and signal bubbles |
| `line300` | `#2A3448` | Subtle borders and separators |
| `white900` | `#F4F7FB` | Primary readable text |
| `white700` | `#AAB6CC` | Secondary readable text |
| `white500` | `#7D8AA3` | Muted text and silence state |
| `blue500` | `#2F80ED` | Reserved primary action blue |
| `blue400` | `#4A96FF` | Snap tell and action hover blue |
| `red500` | `#FF5C7A` | Panic, danger, fold pressure |
| `green500` | `#4CD7A3` | Positive state and confirmed advantage |
| `amber500` | `#F5B84B` | Tank/hesitation tell |
| `violet500` | `#9B6CFF` | Waver tell and uncertainty |

#### primitive.font

| Token | Value |
|---|---|
| `sans` | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| `display` | `Cinzel, Georgia, 'Times New Roman', serif` |

#### primitive.space

| Token | Value |
|---|---:|
| `0` | `0px` |
| `1` | `4px` |
| `2` | `8px` |
| `3` | `12px` |
| `4` | `16px` |
| `5` | `24px` |
| `6` | `32px` |
| `7` | `48px` |
| `8` | `64px` |

#### primitive.radius

| Token | Value |
|---|---:|
| `sm` | `6px` |
| `md` | `10px` |
| `lg` | `16px` |
| `xl` | `24px` |
| `card` | `18px` |
| `pill` | `999px` |

#### primitive.shadow

| Token | Value |
|---|---|
| `none` | `none` |
| `sm` | `0 2px 8px rgba(0, 0, 0, 0.28)` |
| `md` | `0 10px 28px rgba(0, 0, 0, 0.36)` |
| `lg` | `0 18px 48px rgba(0, 0, 0, 0.48)` |
| `hiddenTension` | `0 0 0 1px rgba(74, 150, 255, 0.42), 0 18px 48px rgba(47, 128, 237, 0.24), 0 14px 34px rgba(0, 0, 0, 0.46)` |

#### primitive.motion

| Token | Value |
|---|---:|
| `fast` | `120ms` |
| `standard` | `180ms` |
| `slow` | `280ms` |
| `easing` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |

### Semantic Tokens

| Token | Value | Meaning |
|---|---:|---|
| `semantic.color.surfaceCanvas` | `#05070D` | App background |
| `semantic.color.surfaceTable` | `#0B1020` | Main table field |
| `semantic.color.surfacePanel` | `#121A2B` | Opponent read panels |
| `semantic.color.surfaceRaised` | `#1B2740` | Raised signal/control surfaces |
| `semantic.color.borderSubtle` | `#2A3448` | Dividers and compact panel borders |
| `semantic.color.textPrimary` | `#F4F7FB` | Primary text, WCAG 4.5:1 target |
| `semantic.color.textSecondary` | `#AAB6CC` | Secondary labels, WCAG 4.5:1 target on dark surfaces |
| `semantic.color.textMuted` | `#7D8AA3` | Muted or silent state text |
| `semantic.color.actionPrimary` | `#2F80ED` | The only reserved most-important CTA color |
| `semantic.color.actionPrimaryHover` | `#4A96FF` | Primary CTA hover/focus |
| `semantic.color.tellSnap` | `#4A96FF` | Fast confident tell |
| `semantic.color.tellSteady` | `#AAB6CC` | Normal decision tell |
| `semantic.color.tellTank` | `#F5B84B` | Long-thought tell |
| `semantic.color.tellPanic` | `#FF5C7A` | Last-second tell |
| `semantic.color.tellWaver` | `#9B6CFF` | Choice-change or uncertainty tell |
| `semantic.color.statePositive` | `#4CD7A3` | Confirmed advantage/success |
| `semantic.color.stateDanger` | `#FF5C7A` | Danger/destructive pressure |
| `semantic.color.hiddenCard` | `#070A12` | Hero's unseen notMe card |

#### semantic.typography

| Token | Value |
|---|---|
| `display` | `Cinzel, Georgia, 'Times New Roman', serif`, `34px / 40px`, weight `700`, letter spacing `-0.02em` |
| `title` | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`, `24px / 32px`, weight `700`, letter spacing `-0.01em` |
| `readLabel` | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`, `12px / 16px`, weight `800`, letter spacing `0.06em` |
| `body` | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`, `16px / 24px`, weight `500`, letter spacing `0` |
| `tell` | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`, `13px / 18px`, weight `700`, letter spacing `0.01em` |
| `caption` | `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`, `11px / 14px`, weight `700`, letter spacing `0.06em` |

#### semantic.space, radius, shadow, motion, touch, breakpoint

| Token | Value |
|---|---:|
| `semantic.space.hairline` | `1px` |
| `semantic.space.xs` | `4px` |
| `semantic.space.sm` | `8px` |
| `semantic.space.md` | `12px` |
| `semantic.space.lg` | `16px` |
| `semantic.space.xl` | `24px` |
| `semantic.space.xxl` | `32px` |
| `semantic.radius.control` | `10px` |
| `semantic.radius.panel` | `16px` |
| `semantic.radius.card` | `18px` |
| `semantic.radius.pill` | `999px` |
| `semantic.shadow.panel` | `0 10px 28px rgba(0, 0, 0, 0.36)` |
| `semantic.shadow.modal` | `0 18px 48px rgba(0, 0, 0, 0.48)` |
| `semantic.shadow.hiddenTension` | `0 0 0 1px rgba(74, 150, 255, 0.42), 0 18px 48px rgba(47, 128, 237, 0.24), 0 14px 34px rgba(0, 0, 0, 0.46)` |
| `semantic.motion.fast` | `120ms` |
| `semantic.motion.standard` | `180ms` |
| `semantic.motion.slow` | `280ms` |
| `semantic.motion.easing` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| `semantic.touch.minimum` | `44px` |
| `semantic.breakpoint.compact` | `360px` |
| `semantic.breakpoint.mobile` | `430px` |
| `semantic.breakpoint.tablet` | `768px` |
| `semantic.breakpoint.desktop` | `1024px` |

### Component Tokens

| Token | Value | Role |
|---|---|---|
| `component.opponentReadBoard.mobileLayout` | `fixed-grid` | Never horizontal-scroll opponent reads on mobile |
| `component.opponentReadBoard.mobileColumns` | `3` | Show all three opponents at once |
| `component.opponentReadBoard.compactMinHeight` | `108px` | Minimum compact board height |
| `component.opponentReadBoard.gap` | `4px` | Compact opponent panel gap |
| `component.opponentReadBoard.noHorizontalScroll` | `true` | Opponent reads are primary information |
| `component.opponentMiniPanel.background` | `#121A2B` | Mini panel surface |
| `component.opponentMiniPanel.border` | `#2A3448` | Mini panel border |
| `component.opponentMiniPanel.radius` | `16px` | Mini panel radius |
| `component.opponentMiniPanel.padding` | `8px` | Mini panel padding |
| `component.opponentMiniPanel.minTouchTarget` | `44px` | Tap target for details |
| `component.tellMeter.snapColor` | `#4A96FF` | Snap tell color |
| `component.tellMeter.steadyColor` | `#AAB6CC` | Steady tell color |
| `component.tellMeter.tankColor` | `#F5B84B` | Tank tell color |
| `component.tellMeter.panicColor` | `#FF5C7A` | Panic tell color |
| `component.tellMeter.waverColor` | `#9B6CFF` | Waver tell color |
| `component.tellMeter.pattern` | `color-icon-pattern` | Tells must be redundant |
| `component.signalBubble.background` | `#1B2740` | Signal bubble surface |
| `component.signalBubble.text` | `#F4F7FB` | Signal bubble text |
| `component.signalBubble.radius` | `10px` | Signal bubble radius |
| `component.signalBubble.minHeight` | `24px` | Compact signal height |
| `component.hiddenNotMe.background` | `#070A12` | Unseen card body |
| `component.hiddenNotMe.border` | `#4A96FF` | Hidden-card tension border |
| `component.hiddenNotMe.shadow` | `0 0 0 1px rgba(74, 150, 255, 0.42), 0 18px 48px rgba(47, 128, 237, 0.24), 0 14px 34px rgba(0, 0, 0, 0.46)` | Hidden-card tension shadow |
| `component.hiddenNotMe.pattern` | `noise-mask` | Hidden-card uncertainty pattern |
| `component.actionBar.height` | `72px` | Sticky mobile action zone |
| `component.actionBar.buttonMinHeight` | `44px` | Minimum button target |
| `component.actionBar.primaryColor` | `#2F80ED` | Reserved CTA blue |
| `component.actionBar.radius` | `16px` | Action bar radius |
| `component.actionRevealStrip.background` | `#121A2B` | Simultaneous reveal surface |
| `component.actionRevealStrip.radius` | `16px` | Reveal strip radius |
| `component.actionRevealStrip.gap` | `8px` | Reveal item gap |
| `component.showdownReview.background` | `#0B1020` | Review surface |
| `component.showdownReview.radius` | `24px` | Review radius |
| `component.showdownReview.shadow` | `0 18px 48px rgba(0, 0, 0, 0.48)` | Review elevation |

## Rule Layer: Human-readable Design Rules

## 1. Product Thesis & Atmosphere（世界観・情報密度・設計思想）

This is not a generic fantasy card UI. It is a digital table for reading people when faces, voices, and hands are absent. The atmosphere stays dark and cinematic, but the luxury comes from controlled tension: the player should feel that every pause, silence, and oversized bet might matter.

The core fantasy is: “They can see my missing card. I cannot. What did they accidentally reveal?” Visual richness must never bury that question. Opponent tells, hero hand, community cards, and the current action are all primary gameplay information.

## 2. Core Gameplay Read Path（主役情報の順序）

The invariant read path is: hero hand + community cards → opponent reactions/bets/thinking time → action. The hero hidden notMe sits between the first two as the emotional gap that motivates reading. UI should make players first understand their possible hand, then compare it against opponent signals and leaked tells, then choose a move.

On mobile, opponent information must never require horizontal scrolling. Enemy reactions, bets, thinking time, waver, and silence are as important as cards and must remain visible in a fixed grid.

## 3. Color Palette & Roles（意味名＋hex＋機能的役割）

Use `surfaceCanvas`, `surfaceTable`, and `surfacePanel` to stage the table without visual noise. Use `actionPrimary` only for the most important current action. Tell colors are not decoration: `tellSnap`, `tellTank`, `tellPanic`, and `tellWaver` communicate timing and uncertainty.

Every state uses color + icon + pattern. Snap uses blue plus a lightning icon and sharp flash. Tank uses amber plus an hourglass and slow pulse. Panic uses red plus an exclamation and diagonal stripe. Waver uses violet plus a wave mark and oscillating pattern. Silence uses muted text plus an ellipsis and dotted fade.

## 4. Typography Rules（フォント階層。テル可読性を最優先）

Use display typography sparingly for title moments. During play, readable compact labels matter more than flavor. `tell` at `13px / 18px` is the minimum for opponent read labels; do not shrink it to fit more history. If space is tight, remove old history before reducing current tell legibility.

Player names, bet labels, and tell labels must remain readable at mobile width. Long reactions should collapse to emoji + one keyword, with detailed text available on demand.

## 5. Component Stylings（状態別 default/hover/active/disabled）

### OpponentReadPanel

- default: `component.opponentMiniPanel.background`, `component.opponentMiniPanel.border`, fixed-grid placement, visible card + signal + bet + tell.
- hover/focus: raise border toward `tellSnap`, reveal expanded history affordance, keep all three opponents visible.
- active/selected: use `tellWaver` accent ring and show detail sheet; do not navigate away from the table.
- disabled/folded: lower saturation, keep last bet/tell readable, mark folded with icon + pattern, not color alone.

### TellMeter

- default: show `snap`, `steady`, `tank`, or `panic` as icon + label + pattern.
- hover/focus: show explanation tooltip such as “Tank = long decision”.
- active: pin explanation when tapped on mobile.
- disabled: use muted treatment only when the opponent has no available tell yet.

### SignalBubble

- default: compact bubble with emoji and short statement.
- hover/focus: reveal full line if truncated.
- active: pin the reaction details in the opponent sheet.
- disabled: silence is shown as an explicit `…` state, not an empty missing bubble.

### HiddenNotMeFocus

- default: dark masked card using `hiddenCard`, `hiddenTension`, and `noise-mask`; include a concise explanation that others can see it.
- hover/focus: intensify edge glow and show what information is unknown to the hero.
- active: open a detail overlay connected from the hidden card position.
- disabled: never disable the hidden-card affordance during decision phases; the anxiety is core feedback.

### ActionBar

- default: sticky mobile action area with 44px+ buttons; exactly one primary blue CTA.
- hover/focus: primary uses `actionPrimaryHover`; secondary actions brighten neutral borders.
- active: depress by 1px and keep label contrast above 4.5:1.
- disabled: muted text, no glow, explanatory tooltip for unavailable actions.

### ActionRevealStrip

- default: simultaneous reveal row showing bet + tell + waver for every active player.
- hover/focus: reveal expanded sequence details.
- active: pin reveal summary for review.
- disabled: hidden before the simultaneous reveal moment.

### Modal / Tooltip

- default: modal uses `surfacePanel`, `radius.xl`, and `shadow.modal`; tooltip uses `surfaceRaised` and readable compact text.
- hover/focus: only interactive descendants change.
- active: pin only by explicit tap/focus.
- disabled: explain unavailable actions without decorative noise.

## 6. Layout Principles（モバイルファースト・固定敵Read Board）

Mobile is the primary play surface. The mobile viewport must show all three opponent read panels without horizontal scrolling. At 360px–430px width, use a fixed three-column compact grid; if width is extremely constrained, allow a two-row wrap, but never hide an opponent behind scroll.

Recommended mobile vertical allocation: opponent read board 24–28%, community + pot 18–22%, hero hand + hidden notMe 30–34%, action bar 16–20%. Desktop may expand into a wider board, but must preserve the same information priority.

## 7. Depth & Elevation（影・面の階層。見えなさの緊張）

Depth communicates gameplay priority. Opponent read panels sit on `shadow.panel`, hidden notMe uses `shadow.hiddenTension`, and modal review uses `shadow.modal`. Do not glow every card. Glow only the current missing-information focal point, the active opponent read, or the current primary action.

A hidden notMe card should feel like a cut-out in the player’s knowledge. Use noise, mask, and blue edge tension; do not simply use a generic card back.

## 8. Do's and Don'ts（テル・ポーカー固有アンチパターン）

### Do's

- Do keep all opponent read panels visible on mobile.
- Do present hero hand + community and opponent tells as co-primary information.
- Do encode every tell with color + icon + pattern.
- Do keep the current tell more readable than old history.
- Do use one reserved blue CTA for the most important action.
- Do make the hidden notMe feel emotionally central and unknowable.

### Don'ts

- Do not put opponent reads behind horizontal scroll on mobile.
- Do not treat reactions as decorative emotes; they are gameplay information.
- Do not represent snap/tank/panic/waver by color alone.
- Do not show enemy `not me` labels when the rule is already obvious.
- Do not let pot, chrome, or card ornament overpower opponent tell comparison.
- Do not shrink tell text below `13px / 18px`; remove secondary history instead.
- Do not open hidden-card details without animation from the source card.

## 9. Responsive Behavior（ブレークポイント・タッチターゲット最小44px）

Breakpoints are `360px`, `430px`, `768px`, and `1024px`. Below `430px`, compress copy before hiding opponent panels. Below `360px`, wrap opponent panels to two rows if necessary, but do not use horizontal scroll. Touch targets for action buttons, opponent panels, hidden notMe, and close buttons must be at least `44px`.

Reduced motion users should receive opacity/scale alternatives for tell pulses and hidden-card tension. WCAG contrast target is 4.5:1 or higher for all actionable labels and current tell text.

## 10. Agent Prompt Guide（このシステムでUIを生成する際の即用プロンプト集）

- “Create a mobile-first tell-poker screen using `DESIGN.md` and `design-tokens.json`; keep all three opponent read panels visible without horizontal scroll.”
- “Preserve the read path: hero hand + community → opponent reactions/bets/thinking time → action.”
- “Design opponent tells as gameplay information, not decorative emotes; show color + icon + pattern for snap, tank, panic, and waver.”
- “Render the hero hidden notMe as the emotional center of missing information; others can see it, the hero cannot.”
- “Use primitive → semantic → component tokens and do not add raw colors or sizes without updating both token sources.”
- “Reserve the primary blue accent for exactly one most-important CTA in the current action bar.”
