# Virtual Master League (VML) — Master Design System Specification
**Version:** 1.0.0 (2026 Season Edition)  
**Author:** Principal Frontend Architect & Senior UI/UX Designer  
**Scope:** Universal Design System for Web & Capacitor Mobile App  

---

## 1. Visual Direction & Design Philosophy

Virtual Master League is an elite fantasy football management simulation platform blending tactical depth (similar to Football Manager and eFootball/PES) with collectible excitement (EA Sports FC Ultimate Team).

### Core Pillars
1. **Tactical Precision & Authenticity:** High-contrast data density, clean tabular metrics, and tactical pitch schematics that convey serious football management rather than cartoonish gamification.
2. **Elite Stadium Atmosphere:** Deep obsidian and carbon backgrounds (`#05080e`, `#080c14`) accented with electric sports voltages (Volt `#00ff87`, Cyan `#00f3ff`, Championship Gold `#f59e0b`, and Pitch Turf Emerald).
3. **Restrained, Intentional Elevation:** Avoid gratuitous, blurry glassmorphism and pink/purple gradient overload. Use crisp 1px borders with subtle opacity (`rgba(255, 255, 255, 0.08)` to `rgba(255, 255, 255, 0.14)`), refined radial glows on active interactive targets, and purposeful micro-interactions.
4. **Ergonomic Bi-Directionality (RTL First, LTR Polished):** Built natively for Persian (FA, RTL) with flawless English (EN, LTR) parity. Numbers, clock times, scores, and tactical codes maintain tabular-num alignment in both orientations.
5. **Mobile-First Touch Ergonomics (Capacitor Ready):** Minimum 44px–48px interactive touch targets, safe-area inset preservation (`env(safe-area-inset-bottom)`), zero tap delays, and tactile feedback.

---

## 2. Color System & Design Tokens

### 2.1 Surfaces & Backgrounds
| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--vml-bg-canvas` | `#05080e` | Deep obsidian root application background |
| `--vml-bg-surface-1` | `#080d1a` | Secondary card background, drawers, navigation bars |
| `--vml-bg-surface-2` | `#0f172a` | Elevated cards, modal dialog containers |
| `--vml-bg-surface-3` | `#17233f` | Hover states, active list selections, active pills |
| `--vml-bg-surface-glass` | `rgba(12, 18, 34, 0.85)` | Glassmorphic containers with `backdrop-filter: blur(20px)` |
| `--vml-pitch-turf-center` | `#0e301d` | Center radial stadium turf gradient origin |
| `--vml-pitch-turf-edge` | `#030d07` | Outer edge turf dark absorption |

### 2.2 Brand & Functional Accents
| Token | Hex | Role & Usage |
| :--- | :--- | :--- |
| `--vml-volt` | `#00ff87` | Success, high stamina, positive delta, win status |
| `--vml-cyan` | `#00f3ff` | Primary tactical accent, active navigation, interactive links |
| `--vml-gold` | `#f59e0b` | Championship, VIP badges, budget/coins, trophy highlights |
| `--vml-gold-bright` | `#fbbf24` | Gold text headers, walkout cards, level rewards |
| `--vml-gem-cyan` | `#38bdf8` | Gems currency, premium store transactions |
| `--vml-danger` | `#f43f5e` | Red cards, injuries, transfer ban, dangerous actions, loss |
| `--vml-warning` | `#fb923c` | Yellow cards, medium fatigue, pending confirmation |
| `--vml-info` | `#38bdf8` | Informational callouts, match clock indicators |

### 2.3 Borders & Dividers
| Token | Value | Usage |
| :--- | :--- | :--- |
| `--vml-border-subtle` | `rgba(255, 255, 255, 0.08)` | Baseline container borders and list dividers |
| `--vml-border-default` | `rgba(255, 255, 255, 0.14)` | Standard card frames, table header outlines |
| `--vml-border-active` | `rgba(0, 243, 255, 0.45)` | Focused inputs, hovered cards, selected tabs |
| `--vml-border-gold` | `rgba(245, 158, 11, 0.5)` | Premium/VIP containers, champion podium borders |

### 2.4 Typography Colors & Contrast
- **Text High Emphasis (Headings, primary metrics):** `#ffffff` (Contrast ratio > 15:1 against `#05080e`, exceeds WCAG AAA).
- **Text Medium Emphasis (Labels, body text, subheaders):** `#94a3b8` (Slate 400, contrast ratio 7.2:1).
- **Text Subtle (Meta info, timestamps, secondary hints):** `#64748b` (Slate 500, contrast ratio 4.7:1, meets WCAG AA).
- **Text Inverted (Button labels on Volt/Gold badges):** `#05080e` (Deep obsidian on bright accents, contrast > 12:1).

---

## 3. Typography & Font Pairing

### 3.1 Font Families
1. **Primary Body & Interface:** `'Vazirmatn', system-ui, -apple-system, sans-serif`
   - Uncompromised Persian legibility across all weights (100–900).
   - Clean Latin glyph rendering for mixed Persian-English sports text.
2. **Sports Numbers & Match Telemetry:** `'Rajdhani', 'Vazirmatn', sans-serif`
   - Condensed athletic geometry for scores (`3 - 1`), overalls (`OVR 89`), match minutes (`84'`), and currency values.
   - Enforced `font-variant-numeric: tabular-nums` to ensure perfectly aligned columns.
3. **Telemetry & Tactical Codes:** `'Chakra Petch', 'Rajdhani', monospace`
   - Used for formation labels (`4-3-3`), tactical positions (`DMF`, `RWF`, `CB`), and match timestamps.

### 3.2 Type Scale
| Token / Class | Size | Line Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-display` | 2.5rem (40px) | 1.1 | 900 (Black) | `-0.02em` | Hero banners, walkout titles |
| `text-h1` | 1.75rem (28px) | 1.2 | 800 (ExtraBold) | `-0.01em` | Screen titles, tournament headers |
| `text-h2` | 1.25rem (20px) | 1.3 | 800 (ExtraBold) | `0` | Section headings, modal titles |
| `text-h3` | 1.00rem (16px) | 1.4 | 700 (Bold) | `0` | Card headers, table group labels |
| `text-body` | 0.875rem (14px) | 1.5 | 500 (Medium) | `0` | Standard body copy, descriptions |
| `text-caption`| 0.75rem (12px) | 1.4 | 600 (SemiBold) | `0.02em` | Meta info, badge labels, timestamps |
| `text-micro` | 0.625rem (10px)| 1.3 | 700 (Bold) | `0.05em` | Telemetry chips, positional tags |

---

## 4. Spacing, Elevation & Layout Grid

### 4.1 Spacing Scale (8pt System)
- `space-1`: `4px` (Tight padding within badges and chips)
- `space-2`: `8px` (Gaps between badge icons and text)
- `space-3`: `12px` (Standard inner card padding on mobile)
- `space-4`: `16px` (Standard component padding on mobile/tablet)
- `space-5`: `20px` (Container spacing on desktop)
- `space-6`: `24px` (Major section gaps)
- `space-8`: `32px` (Hero padding, modal inner clearance)
- `space-12`: `48px` (Screen bottom clearance)

### 4.2 Responsive Breakpoints & Shell Widths
- **Mobile (`< 640px`):** Max width `100%`, single-column flow, bottom nav dock fixed at `z-50`, mobile header with drawer trigger.
- **Tablet (`640px – 1024px`):** Max container width `768px`, 2-column card layouts, expanded tactical pitch.
- **Desktop (`1024px – 1280px`):** Max container width `1024px`, side-by-side tactical gameplan + bench list, multi-column market.
- **Wide Desktop (`> 1280px`):** Max container width `1280px` centered with stadium ambiance backdrop margins.

### 4.3 Safe Area & Navigation Spacing Rule
- **Mandatory Root Clearance:** The main scrollable viewport container (`<main>`) MUST always enforce:
  `pb-36 sm:pb-44` (minimum `144px`)
  to prevent fixed bottom docks (`BottomNav`) and mobile home indicator bars from obscuring action buttons.

---

## 5. Component Design Specifications

### 5.1 Buttons & Action Hierarchy
1. **Primary Volt Action (`.vml-btn-primary`):**
   - Background: `linear-gradient(135deg, #00ff87 0%, #10b981 100%)`
   - Text: `#05080e`, font-weight `800`.
   - Shadow: `0 4px 15px rgba(0, 255, 135, 0.35)`.
   - Hover: Translate `-1.5px`, scale `1.02`, shadow glow increase. Active: Scale `0.97`.
2. **Secondary Cyan Action (`.vml-btn-cyan`):**
   - Background: `linear-gradient(135deg, #00f3ff 0%, #0284c7 100%)`
   - Text: `#05080e`, font-weight `800`.
3. **Championship Gold Action (`.vml-btn-gold`):**
   - Background: `linear-gradient(135deg, #fbbf24 0%, #d97706 100%)`
   - Text: `#05080e`, font-weight `800`.
4. **Subtle Surface Action (`.vml-btn-surface`):**
   - Background: `rgba(15, 23, 42, 0.85)`
   - Border: `1px solid rgba(255, 255, 255, 0.12)`
   - Text: `#f8fafc`. Hover: Border `#00f3ff`, text `#00f3ff`.
5. **Danger / Destructive Action (`.vml-btn-danger`):**
   - Background: `rgba(239, 68, 68, 0.15)`
   - Border: `1px solid rgba(239, 68, 68, 0.4)`
   - Text: `#fca5a5`. Hover: Background `rgba(239, 68, 68, 0.3)`.

### 5.2 Cards & Panels
- **Standard Card (`.fc-card`):**
  - Radius: `1.5rem` (`24px`).
  - Border: `1px solid rgba(255, 255, 255, 0.1)`.
  - Background: `rgba(12, 18, 34, 0.85)`.
  - Backdrop Blur: `20px`.
- **Elevated Hero Card (`.fc-card-elevated`):**
  - Background: `linear-gradient(145deg, rgba(20, 29, 56, 0.88) 0%, rgba(10, 15, 28, 0.92) 100%)`.
  - Inset highlight: `inset 0 1px 1px rgba(255, 255, 255, 0.15)`.
- **Team Crest Badge (`.team-crest-badge`):**
  - Crisp high-contrast white-to-slate container (`linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)`) ensuring both dark and light transparent PNG logos remain 100% visible and sharp.

### 5.3 Tables & Data-Dense Screens
- Compact, clean row height (`44px` on desktop, `48px` on touch).
- Sticky header row with backdrop blur (`rgba(8, 12, 20, 0.95)`).
- Tabular numeric alignment (`font-sport`, `tabular-nums`).
- Color-coded qualification zones on leaderboards:
  - Rank 1: Championship Gold podium border & badge.
  - Rank 2–4: Champions League (UCL) Cyan indicator.
  - Rank 5–6: Europa League (UEL) Purple indicator.
  - Rank 14–16: Relegation Rose/Red danger indicator.

### 5.4 Forms & Input Controls
- Dark slate input background (`#05080e` with `rgba(255, 255, 255, 0.08)` border).
- Active focus state: `border-cyan-400` + `box-shadow: 0 0 15px rgba(0, 243, 255, 0.25)`.
- Label typography: 12px uppercase, tracking-wider, `#94a3b8`.
- Inline error messages: Rose-400 text with icon, animated slide-down.

### 5.5 Modals & Full-Screen Overlays (Portal Enforced)
- **Mandatory Portal:** Always rendered with `createPortal(..., document.body)`.
- **Centering Guarantee:** `fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto`.
- **Container Structure:** `relative z-10 bg-slate-950 rounded-3xl w-full max-w-2xl my-auto p-5 border border-slate-800`.
- **Dismissal:** Background click triggers close, `e.stopPropagation()` on inner container.

### 5.6 State Feedback (Loading, Empty, Success, Error)
- **Loading:** Dual-spinning neon rings (Cyan + Purple) with pulsing VML monogram.
- **Empty State:** Distinctive domain-specific icons (trophy, pitch, whistle, player) in glowing rounded-2xl containers with constructive guidance text and clear action button.
- **Success Toast:** Spring-animated floating pill from top-center with emerald glow.
- **Error Toast:** Rose-bordered pill with shake animation.

---

## 6. Accessibility & Motion Guidelines

### 6.1 Keyboard Navigation & Focus
- Every interactive element possesses a distinct `:focus-visible` outline (`2px solid #00f3ff` with `2px` offset).
- Logical tab ordering across form controls, modal dialogs, and tactical dropdowns.

### 6.2 Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 7. Implementation Roadmap & Phasing

- **Phase 1:** Core Foundations & Shell Layout (`index.css`, `MobileHeader`, `BottomNav`, `FCBackground`, `MainDashboard`).
- **Phase 2:** Coach Central Experience (`HomeTab`, `TeamTab`, `EFootballGamePlan`, `TacticalPitch`, `PlayerBoostDrawer`).
- **Phase 3:** Competitions & Real-Time Match (`LeagueTab`, `LeagueStandingsTable`, `BattleRoyaleBracket`, `LiveStreamTab`).
- **Phase 4:** Economy & Negotiations (`MarketTab`, `LeagueDirectory`, `TransferInbox`, `StoreTab`, `ClubTab`).
- **Phase 5:** Newsroom & Coach Identity (`NewsChannelView`, `ProfileView`, `CoachLogin`).
- **Phase 6:** Administration Suite (`AdminLayout`, `AdminPortal.css`, and administrative management pages).
