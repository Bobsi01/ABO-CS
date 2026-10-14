# Independent UI, Accessibility & Anti-Slop QA Report: Taal Features, Timeline Bookmarks & Reference Panels

**Evaluator:** Independent UI, Accessibility & Anti-Slop QA Evaluator  
**Audit Date:** 2026-10-14  
**Governing Standards:** `AGENTS.md`, `antislop.md`, `skills/antislop-ui/SKILL.md`, `skills/abo-qa/SKILL.md`, WCAG 2.2 (Level AA / AAA), W3C contrast standards (4.5:1 standard text, 3.0:1 large text / non-text UI)  
**Evaluation Target:** Recently integrated Taal UI features, timeline bookmarks, and reference panels:
- `frontend/src/components/VolcanoScene.tsx`
- `frontend/src/components/EruptionTimeline.tsx`
- `frontend/src/components/HistoricalReferences.tsx`
- `frontend/src/styles.css`
- Independent test fixture: `frontend/src/taalUiA11y.test.tsx`

---

## 1. Executive Summary

This independent quality assurance audit evaluated the user interface, accessibility compliance, and anti-slop design integrity of the recently delivered Taal volcano enhancements.

### Overall Assessment: CONDITIONAL PASS (Quality & Evidence High; 4 Major P1 and 5 Minor P2 Defects Identified)
- **Anti-Slop Adherence:** **PASS**. The established blue interface palette (`#142b49`, `#195cc2`, `#4b607b`, `#b8c8dd`) is preserved. Progressive disclosure via native `<details>` and conditional disclosure cards is strictly followed. Quantitative dispersion model outputs are clearly segregated from illustrative/contextual data overlays via prominent reference badges and explicit non-model disclaimers. No AI marketing buzzwords or forbidden em dashes (`—`, R-02) were introduced. Camera and timeline controls avoid duplication.
- **WCAG 2.2 Color Contrast:** **PASS WITH CAVEAT**. In light mode, all text, badges, and canvas altimeter labels meet or exceed 4.5:1. However, in dark mode (`data-theme="dark"`), the hardcoded white background of `.scene-inspection-card` causes the global `:focus-visible` outline (`var(--action)` = `#9ac5ff`) to achieve only **1.78:1** contrast, failing WCAG 2.2 SC 1.4.11. Additionally, the Alert Level 2 badge (`#b45309` on `#fef3c7`) achieves **4.51:1**, barely clearing the 4.50:1 threshold.
- **Usability & Layout (320 px mobile):** **MAJOR DEFECT DETECTED**. On narrow viewports (320 px – 380 px), the newly added `.scene-inspection-card` (`max-width: 250px`, anchored `right: 0.75rem`) collides with and directly overlaps `.scene-hud` (`left: 0.75rem`).
- **Keyboard Navigation & ARIA:** **MAJOR DEFECT DETECTED**. Inspecting subsurface earthquake hypocenters is operable solely via WebGL mouse clicks on 3D instanced meshes, lacking a keyboard-navigable DOM alternative. Furthermore, neither `.bookmark-detail-card` nor `.scene-inspection-card` can be dismissed using the `Escape` key (violating Antislop R-26 / R-32). Multiple buttons also violate the 44px minimum tap target rule (R-03).
- **Independent Programmatic Test Suite:** Fully authored and verified in `frontend/src/taalUiA11y.test.tsx` (13 tests passing). The full frontend suite passes (18 test files, 79 tests passing; typecheck, ESLint, and Vite build clean).

---

## 2. Scope & Evaluated Components

| Component / Artifact | File Location | Scope of Features Audited |
| :--- | :--- | :--- |
| **VolcanoScene** | `frontend/src/components/VolcanoScene.tsx` | Taal camera presets ("Tagaytay Ridge (caldera rim)", "Cross-wind plume profile"), 3D altitude scale altimeter (FL160–FL650), subsurface seismicity layer with depth stratum radiogroup (All, Conduit ≤15 km, Subduction >15 km), PDZ boundary, 2020 dike intrusion, Alert Level ring, Sentinel-5P TROPOMI cue, `.scene-hud`, and `.scene-inspection-card`. |
| **EruptionTimeline** | `frontend/src/components/EruptionTimeline.tsx` | Historical activity bookmarks (2021–2024), bookmark pill buttons (`.bookmark-pill`), event detail card (`.bookmark-detail-card`), alert level pills (`.pill-alert`), reference badge. |
| **HistoricalReferences** | `frontend/src/components/HistoricalReferences.tsx` | Curated multi-parameter observation evidence section, unrest activity log table (`table-scroll`), WOVOdat monitoring networks (`dl`), status badges (`.badge-status`), HDX damage proxy datasets. |
| **Styles & Theming** | `frontend/src/styles.css` | Light and dark color tokens, HUD cards, tap target dimensions, focus indicators, media queries for 320 px mobile. |
| **Test Fixture** | `frontend/src/taalUiA11y.test.tsx` | Independent Vitest & React Testing Library fixture programmatically asserting contrast formulas, ARIA roles, layer toggles, and defect reproductions. |

---

## 3. Anti-Slop & Design System Audit

Adherence was audited against `antislop.md` and `skills/antislop-ui/SKILL.md`:

### 3.1 Preservation of Established Blue Interface Palette (R-01, R-20, R-29)
- The core interface palette is maintained without trend-stacking, rainbow gradients, or unnecessary glow.
- **Light theme:** Surface `#f2f6fc`, Panel `#ffffff`, Text `#142b49`, Secondary `#4b607b`, Action `#195cc2`, Selected `#e4efff`.
- **Dark theme:** Surface `#0e1a2d`, Panel `#14243a`, Text `#edf4ff`, Secondary `#afc2dd`, Action `#9ac5ff`, Selected `#203d62`.
- Accent color `#195cc2` / `#9ac5ff` is applied selectively to primary interactions (run button, focus rings, radio checked state).
- Quantitative ash contours remain exclusively mapped to the warm yellow-to-brown deposit scale, preserving visual distinction from UI chrome.

### 3.2 Progressive Disclosure & Structural Hierarchy (C-3, R-05, R-14)
- Complex scientific references are housed inside native `<details>` elements that load collapsed by default (`Illustration guide`, `Terrain source & graphics`, and the 3 curated evidence accordions in `HistoricalReferences.tsx`).
- Detailed event metadata in `EruptionTimeline.tsx` is disclosed on demand via interactive bookmark pills, avoiding visual clutter in the playback area.
- Earthquake hypocenter details are disclosed in an inline inspection card only when an individual event is selected.

### 3.3 Absence of Duplicate Controls & Redundant Labels (ABO Redundancy Rule)
- **Camera Controls:** A single unified `Select` control ("Camera view") manages all views: Volcano close-up, Tagaytay Ridge (caldera rim), Cross-wind plume profile, and Regional overview. No duplicate standalone buttons exist for camera views. A single reset button (`<Icon name="reset" />`) restores default perspective.
- **Timeline Controls:** One shared sequence clock drives replay; phase choices (`Before`, `During`, `After`) jump directly to simulation milestones without competing with historical activity bookmarks.
- **Tagaytay Preset Fallback:** If the user switches away from the Taal volcano scenario while viewing Tagaytay Ridge, `VolcanoScene.tsx` automatically falls back to `close` view (L651–L655), preventing invalid states.

### 3.4 Distinct Quantitative vs. Illustrative Badges (Craftsmanship C-5, R-38)
- Every contextual layer is labeled with a clear badge:
  - `<span className="reference-badge">Reference overlay · non-model</span>` in `EruptionTimeline.tsx`
  - `<span className="reference-badge">Reference evidence · non-model</span>` in `HistoricalReferences.tsx`
- Explicit disclaimers in `VolcanoScene.tsx` and detail cards notify users:
  `"Contextual reference overlay - not a computed result of the ash model."`
  `"Published quantities are reference evidence, not a computed historical validation."`
- These labels prevent false equivalence between raw observational context and the parameterized Gaussian ash model.

### 3.5 Copywriting and Buzzword Audit (R-02, R-16)
- **Em Dash Audit (R-02):** A codebase-wide scan confirmed zero em dash characters (`—`, U+2014) in `frontend/src`. En dashes (`–`, U+2013) are appropriately used for numerical date ranges (e.g., "2021–2024").
- **AI Buzzwords (R-16):** Confirmed zero instances of marketing hype ("AI Powered", "Seamless", "Revolutionary", "Cutting Edge", "Effortless"). All labels use precise domain terminology (phreatomagmatic, vog degassing, SO₂ flux in metric tonnes/day, plume height in meters ASL).

---

## 4. WCAG 2.2 Color Contrast Audit

Evaluated using the W3C WCAG 2.2 relative luminance formula:
$$\text{Relative Luminance } L = 0.2126 R + 0.7152 G + 0.0722 B$$
$$\text{Contrast Ratio } CR = \frac{L_1 + 0.05}{L_2 + 0.05} \quad (L_1 \ge L_2)$$
Thresholds: Standard text requires $\ge 4.5:1$; large text ($\ge 24\text{px}$ regular or $\ge 18.67\text{px}$ bold) and UI components require $\ge 3.0:1$.

### 4.1 Contrast Measurement Table

| UI Element & State | Foreground Color | Background Color | Font Size / Weight | Contrast Ratio | WCAG 2.2 Result | Finding / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Depth filter radio text (Light mode)** | `#4b607b` (`--secondary`) | `#f2f6fc` (`--surface`) | 12px (0.75rem) regular | **5.94:1** | **PASS** (AA) | Exceeds 4.5:1 requirement. |
| **Depth filter radio text (Light, on panel)** | `#4b607b` (`--secondary`) | `#ffffff` (`--panel`) | 12px (0.75rem) regular | **6.45:1** | **PASS** (AA) | Exceeds 4.5:1 requirement. |
| **Depth filter radio text (Dark mode)** | `#afc2dd` (`--secondary`) | `#0e1a2d` (`--surface`) | 12px (0.75rem) regular | **9.62:1** | **PASS** (AA / AAA) | Exceeds 7.0:1 AAA standard. |
| **Depth filter radio dot (Light mode)** | `#195cc2` (`--action`) | `#ffffff` / `#f2f6fc` | UI component | **6.27:1 / 5.78:1** | **PASS** (SC 1.4.11) | Exceeds 3.0:1 non-text standard. |
| **Depth filter radio dot (Dark mode)** | `#9ac5ff` (`--action`) | `#0e1a2d` (`--surface`) | UI component | **9.80:1** | **PASS** (SC 1.4.11) | Exceeds 3.0:1 non-text standard. |
| **HUD Inspection card body (`.scene-inspection-card`)** | `#1e3a5f` | `#fffffffa` (card) | 12px (0.75rem) regular | **11.46:1** | **PASS** (AA / AAA) | High contrast dark blue on white. |
| **HUD Inspection card heading (`strong`)** | `#102a45` | `#fffffffa` (card) | 12.8px (0.8rem) bold | **14.59:1** | **PASS** (AA / AAA) | High contrast dark navy on white. |
| **HUD Inspection card button (`button`)** | `#1e3a5f` | `#f0f4f8` (button bg) | 11.2px (0.7rem) regular | **10.41:1** | **PASS** (AA / AAA) | Exceeds 4.5:1 requirement. |
| **HUD Inspection button hover** | `#1e3a5f` | `#e2ebf4` (hover bg) | 11.2px (0.7rem) regular | **9.46:1** | **PASS** (AA / AAA) | Exceeds 4.5:1 requirement. |
| **HUD Inspection focus outline (Dark theme)** | `#9ac5ff` (`var(--action)`) | `#fffffffa` (card bg) | 3px outline (UI) | **1.78:1** | **FAIL (P1)** | **Fails SC 1.4.11 (< 3.0:1). Light cyan outline on white.** |
| **Scene HUD (`.scene-hud`)** | `#203e68` | `#edf4fde8` | 11.2px (0.7rem) regular | **9.72:1** | **PASS** (AA / AAA) | Strong contrast over sky stage. |
| **Bookmark pill default text (Light)** | `#142b49` (`--text`) | `#f2f6fc` (`--surface`) | 12px (0.75rem) regular | **13.16:1** | **PASS** (AA / AAA) | High contrast. |
| **Bookmark pill plume height (Light)** | `#4b607b` (`--secondary`) | `#f2f6fc` (`--surface`) | 12px (0.75rem) tabular | **5.94:1** | **PASS** (AA) | Exceeds 4.5:1 requirement. |
| **Bookmark pill active text (Light)** | `#142b49` (`--text`) | `#e4efff` (`--selected`) | 12px (0.75rem) bold | **12.29:1** | **PASS** (AA / AAA) | High contrast. |
| **Bookmark pill active plume (Light)** | `#4b607b` (`--secondary`) | `#e4efff` (`--selected`) | 12px (0.75rem) tabular | **5.55:1** | **PASS** (AA) | Exceeds 4.5:1 requirement. |
| **Bookmark pill default text (Dark)** | `#edf4ff` (`--text`) | `#0e1a2d` (`--surface`) | 12px (0.75rem) regular | **15.76:1** | **PASS** (AA / AAA) | High contrast. |
| **Bookmark pill plume height (Dark)** | `#afc2dd` (`--secondary`) | `#0e1a2d` (`--surface`) | 12px (0.75rem) tabular | **9.62:1** | **PASS** (AA / AAA) | High contrast. |
| **Bookmark pill active text (Dark)** | `#edf4ff` (`--text`) | `#203d62` (`--selected`) | 12px (0.75rem) bold | **9.96:1** | **PASS** (AA / AAA) | High contrast. |
| **Bookmark pill active plume (Dark)** | `#afc2dd` (`--secondary`) | `#203d62` (`--selected`) | 12px (0.75rem) tabular | **6.08:1** | **PASS** (AA) | Exceeds 4.5:1 requirement. |
| **Alert Level 1 badge (`alert-1`)** | `#15803d` | `#dcfce7` | 10.4px (0.65rem) bold | **4.57:1** | **PASS** (AA) | Above 4.5:1. |
| **Alert Level 2 badge (`alert-2`)** | `#b45309` | `#fef3c7` | 10.4px (0.65rem) bold | **4.51:1** | **BARELY PASS (P2)** | **Passes by 0.01 margin; vulnerable to subpixel antialiasing.** |
| **Alert Level 3 badge (`alert-3`)** | `#b91c1c` | `#fee2e2` | 10.4px (0.65rem) bold | **5.30:1** | **PASS** (AA) | Exceeds 4.5:1. |
| **WOVOdat status badge (`.badge-status`)** | `#15803d` | `#dcfce7` | 11.2px (0.7rem) bold | **4.57:1** | **PASS** (AA) | Above 4.5:1. |
| **Summary count badge (`.summary-count`)** | `#4b607b` (`--secondary`) | `#f2f6fc` (`--surface`) | 12px (0.75rem) regular | **5.94:1** (light) / **9.62:1** (dark) | **PASS** (AA) | Exceeds 4.5:1 in both modes. |
| **Altimeter canvas text (FL160–FL650)** | `#1e3a8a` | `#ffffffd8` (sprite bg) | 26px bold Segoe UI | **10.36:1** (white) / **10.09:1** (blend) | **PASS** (AAA) | Exceeds 7.0:1 AAA standard. |
| **Altimeter ruler ticks / axis** | `#2563eb` | `#e8f0fa` (stage bg) | 1px line / geometry | **4.50:1** | **PASS** (SC 1.4.11) | Exceeds 3.0:1 non-text standard. |
| **Historical table cell text** | `#142b49` (L) / `#edf4ff` (D) | `#ffffff` (L) / `#14243a` (D) | 13.6px (0.85rem) regular | **14.27:1** (L) / **14.13:1** (D) | **PASS** (AAA) | High contrast in both themes. |
| **Historical table caption / muted** | `#4b607b` (L) / `#afc2dd` (D) | `#ffffff` (L) / `#14243a` (D) | 12.8px (0.8rem) regular | **6.45:1** (L) / **8.62:1** (D) | **PASS** (AA) | Exceeds 4.5:1 requirement. |
| **Historical links (`a` tags)** | `#195cc2` (L) / `#9ac5ff` (D) | `#ffffff` (L) / `#14243a` (D) | 13.6px (0.85rem) regular | **6.27:1** (L) / **8.79:1** (D) | **PASS** (AA) | Exceeds 4.5:1 requirement. |

---

## 5. Usability & Layout Audit

### 5.1 Mobile / Narrow Viewport Layout (320 px) (R-03)
- **Viewport Horizontal Overflow:** The page layout holds within 320 px without horizontal page scrollbars. Tables are correctly wrapped inside `<div className="table-scroll">` (`overflow-x: auto; max-width: 100%`).
- **Scene HUD & Inspection Card Collision (Defect P1-2):**
  - In `styles.css`:
    - `.scene-hud` has `position: absolute; top: 0.75rem; left: 0.75rem;`
    - `.scene-inspection-card` has `position: absolute; top: 0.75rem; right: 0.75rem; max-width: 250px;`
  - In a 320 px mobile viewport (where stage width is ~288 px):
    - Sum of offsets and widths: $12\text{px (left)} + \sim 140\text{px (HUD)} + 250\text{px (Card)} + 12\text{px (right)} = 414\text{px} > 288\text{px}$.
    - **Observed Behavior:** When a user taps an earthquake hypocenter on mobile, the inspection card renders directly on top of the `.scene-hud` card, causing severe visual collision and illegibility of both cards.
  - **Remediation Required:** At `@media (max-width: 700px)`, stack `.scene-inspection-card` below `.scene-hud` (e.g. `top: auto; bottom: 3rem; left: 0.75rem; right: 0.75rem; max-width: none;`) or dismiss `.scene-hud` while inspection is active.

### 5.2 Tap Target Sizing (Antislop R-03 / WCAG 2.5.5 / 2.5.8) (Defect P2-1)
Antislop R-03 and ABO AGENTS.md mandate: *"Button sizes meet the minimum tap target (44px)"*.
- **Bookmark Pills:** `.bookmark-pill` in `styles.css` line 104 defines `min-height: 32px;` (fails 44px threshold).
- **Bookmark Detail Close Button:** `.bookmark-detail-card .close-button` in line 115 defines `min-height: 24px; width: 24px;` (fails 44px threshold; barely meets WCAG 2.5.8 minimum exception of 24px, but fails ABO 44px rule).
- **Scene Inspection Close Button:** `.scene-inspection-card button` in line 127 defines `min-height: 24px; padding: 0.15rem 0.45rem;` (fails 44px threshold).
- **Sublayer Radio Labels:** `.sublayer-filter .radio-label` has font-size 0.75rem and no `min-height: 44px` declaration.

### 5.3 Keyboard Focus Navigation & Modals (R-26, R-32, WCAG 2.1.1)
- **Focus Indicators:** Interactive buttons inherit `button:focus-visible, a:focus-visible { outline: 3px solid var(--action); outline-offset: 4px; }`. This provides clear visual focus feedback on all DOM controls.
- **Escape Key Handling Missing (Defect P1-4):**
  - Neither `.bookmark-detail-card` in `EruptionTimeline.tsx` nor `.scene-inspection-card` in `VolcanoScene.tsx` handles the `Escape` key.
  - Pressing `Escape` while an inspection card or detail card is open fails to dismiss it, violating Antislop R-26 (*"A modal or dialog that opens and closes (closable with Escape)"*) and R-32 (*"Dialogs and modals must be closable with Escape"*).
- **Mouse-Only Seismicity Inspection (Defect P1-3):**
  - In `VolcanoScene.tsx`, the 3D hypocenters are rendered as Three.js `instancedMesh` with an `onClick` raycasting handler (L388–L395).
  - There is no keyboard focus target, `<button>`, or accessible HTML table/list in the DOM to select or inspect individual earthquakes. Keyboard-only and assistive technology users cannot inspect earthquake details.
  - *Note:* The adjacent `ReceptorMarkers` feature solves this by providing a synchronized HTML `LocationTable`. A similar accessible list or disclosure table is required for the earthquake catalog.

---

## 6. Categorized Findings Matrix

### Critical Findings (P0 — Blocker)
*No P0 issues identified.* (The application builds cleanly, passes all unit/integration tests, and does not crash or corrupt state).

---

### Major Findings (P1 — Must Fix for Full Compliance)

#### Finding P1-1: Dark Mode Focus Outline Contrast Failure on Inspection Card Close Button
- **Standard:** WCAG 2.2 SC 1.4.11 (Non-text Contrast — Level AA)
- **Location:** `frontend/src/styles.css` (L125–L128, L286)
- **Description:** `.scene-inspection-card` has a hardcoded white background (`#fffffffa`). In dark mode (`data-theme="dark"`), `var(--action)` is `#9ac5ff`. The focus outline on the close button against the white background yields a contrast ratio of only **1.78:1** (below the 3.0:1 threshold).
- **Remediation:** In `styles.css`, define dark theme overrides for `.scene-inspection-card`:
  ```css
  .application[data-theme="dark"] .scene-inspection-card {
    background: var(--panel);
    border-color: var(--line);
    color: var(--text);
  }
  .application[data-theme="dark"] .scene-inspection-card button {
    background: var(--surface);
    border-color: var(--control-line);
    color: var(--text);
  }
  ```

#### Finding P1-2: Narrow Viewport (320 px) Collision Between Scene HUD and Inspection Card
- **Standard:** Antislop R-03 (*"Cards do not collide or clip off-screen"*)
- **Location:** `frontend/src/styles.css` (L123–L128, L249–L270)
- **Description:** At viewports under 380 px, `.scene-hud` (left: 0.75rem, ~140 px width) and `.scene-inspection-card` (right: 0.75rem, max-width 250 px) occupy over 410 px of horizontal space within a ~288 px container, causing them to collide and render text directly over each other.
- **Remediation:** In the `@media (max-width: 700px)` media query in `styles.css`, reposition `.scene-inspection-card`:
  ```css
  @media (max-width: 700px) {
    .scene-inspection-card {
      top: auto;
      bottom: 2.5rem;
      left: 0.5rem;
      right: 0.5rem;
      max-width: none;
    }
  }
  ```

#### Finding P1-3: Mouse-Only Interaction on 3D Seismicity Hypocenters
- **Standard:** WCAG 2.2 SC 2.1.1 (Keyboard — Level A) & Antislop R-32
- **Location:** `frontend/src/components/VolcanoScene.tsx` (L388–L395)
- **Description:** 3D subsurface earthquake spheres can only be clicked using mouse raycasting. There is no keyboard mechanism to navigate through earthquakes or inspect their magnitude, depth, and time.
- **Remediation:** Expose an accessible keyboard alternative—such as an optional compact dropdown, list, or summary table of top earthquakes—when the seismicity layer is enabled, allowing keyboard selection of hypocenters to trigger `onInspectQuake`.

#### Finding P1-4: Detail and Inspection Cards Cannot Be Dismissed with Escape Key
- **Standard:** Antislop R-26 & R-32 (*"Dialogs and modals must be closable with Escape"*)
- **Location:** `frontend/src/components/EruptionTimeline.tsx` (L84–L100) & `frontend/src/components/VolcanoScene.tsx` (L730–L738)
- **Description:** Neither the timeline bookmark detail card nor the 3D scene inspection card implements an `Escape` key event listener. Once opened, keyboard users must tab forward to the close button rather than pressing `Escape`.
- **Remediation:** Attach an `onKeyDown` handler to the card containers or a window listener that sets the active state to `null` on `Escape`:
  ```tsx
  useEffect(() => {
    if (!selectedEvent) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedEvent(null) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedEvent])
  ```

---

### Minor Findings (P2 — Usability, Robustness & Polish)

#### Finding P2-1: Interactive Buttons Below 44px Minimum Tap Target
- **Standard:** Antislop R-03 & WCAG 2.5.5
- **Location:** `frontend/src/styles.css` (L104, L115, L127, L140)
- **Description:** `.bookmark-pill` (`min-height: 32px`), `.close-button` (`min-height: 24px; width: 24px;`), and `.scene-inspection-card button` (`min-height: 24px`) explicitly override the default 44px button height.
- **Remediation:** Increase padding or min-height on mobile to ensure tap areas reach at least 44px, or use pseudo-elements (`::after` hit-box expansion) to maintain visual compactness while providing a 44px touch area.

#### Finding P2-2: Alert Level 2 Badge Contrast Margin Vulnerability
- **Standard:** WCAG 2.2 SC 1.4.3 (Contrast Minimum — Level AA)
- **Location:** `frontend/src/styles.css` (L111)
- **Description:** `.pill-alert.alert-2` uses color `#b45309` on background `#fef3c7`, yielding a contrast ratio of **4.5097:1**. While technically passing the 4.5:1 requirement by 0.0097, subpixel antialiasing on low-DPI displays or small font sizes (10.4px / 0.65rem) can visually dip below 4.5:1.
- **Remediation:** Darken foreground slightly to `#92400e` (contrast 6.13:1) for robust headroom.

#### Finding P2-3: External Links in Historical References Lack Window-Opening Notification
- **Standard:** WCAG 2.2 SC 3.2.5 (Change on Request — Advisory) & G201
- **Location:** `frontend/src/components/HistoricalReferences.tsx` (L158–L160, L189, L195)
- **Description:** WOVOdat and HDX portal links use `target="_blank"` with `rel="noopener noreferrer"`, but provide no visual icon or `sr-only` announcement that an external window will be spawned.
- **Remediation:** Append a visually hidden `<span className="sr-only"> (opens in a new tab)</span>` or an external link icon.

#### Finding P2-4: CSS Class Selector Discrepancy
- **Standard:** Documentation Accuracy
- **Location:** `frontend/src/styles.css` (L125) & `frontend/src/components/VolcanoScene.tsx` (L731)
- **Description:** Specification tasks refer to `.seismicity-hud-card`, but the codebase implements the component using class `.scene-inspection-card`.
- **Remediation:** Align styling or provide `.seismicity-hud-card` as an alias to avoid integration confusion.

#### Finding P2-5: Dark Theme Visual Cohesion on Alert Badges
- **Standard:** Antislop R-21 & R-34 (*"Every theme you ship must work"* and visual harmony)
- **Location:** `frontend/src/styles.css` (L109–L112)
- **Description:** `.pill-alert` badges in `EruptionTimeline.tsx` retain stark light pastel backgrounds (`#dcfce7`, `#fef3c7`, `#fee2e2`) in dark mode, causing visual jarring inside dark bookmark pills.
- **Remediation:** Provide dark-theme tokens (e.g. translucent dark backgrounds with brighter text).

---

## 7. Independent Programmatic Test Fixture Verification

The independent test fixture was authored in `frontend/src/taalUiA11y.test.tsx` and executed via Vitest.

### Execution Command:
```powershell
npm.cmd test -- --run src/taalUiA11y.test.tsx
```

### Verified Test Cases:
1. `WCAG 2.2 Color Contrast Programmatic Verification`:
   - `verifies contrast compliance for Alert level badge text and backgrounds` (PASS: AL1 4.57:1, AL2 4.51:1, AL3 5.30:1, WOVOdat badge 4.57:1).
   - `verifies contrast compliance for 3D flight-level altimeter canvas sprite labels` (PASS: 10.36:1 on white, 10.09:1 on blended sky background; AAA compliant).
   - `verifies contrast compliance for seismicity inspection card in light mode` (PASS: body text 11.46:1, heading 14.59:1, button 10.41:1).
   - `detects contrast defect in dark mode for hardcoded white inspection card focus outline` (PASS: asserts defect finding P1-1 where contrast is 1.78:1 < 3.0:1).
   - `verifies contrast compliance for theme palette tokens across light and dark modes` (PASS: light mode 5.78:1–14.27:1; dark mode 6.08:1–15.76:1).
2. `VolcanoScene Taal Layer Controls & Radiogroup Accessibility`:
   - `exposes Taal camera presets and single camera control without duplicate buttons` (PASS: single select with Tagaytay Ridge, single reset camera button).
   - `renders seismicity depth filter radiogroup and altitude scale view note` (PASS: role `radiogroup`, depth radio buttons toggle correctly, flight level view note rendered in DOM).
   - `renders explicit non-model and contextual disclaimers for all Taal contextual overlays` (PASS: PDZ, Dike, Alert Ring, TROPOMI overlays all include non-model disclaimers).
3. `EruptionTimeline Bookmarks Accessibility & Interaction`:
   - `renders historical activity bookmarks group and toggles event detail card` (PASS: role `group`, `aria-expanded` toggle, detail card region, close button).
   - `identifies lack of Escape key handler on event detail card (Accessibility defect)` (PASS: asserts defect finding P1-4 where card remains open upon Escape key press).
   - `records tap target size limitation on bookmark pills and close buttons` (PASS: asserts defect finding P2-1).
4. `HistoricalReferences Curated Evidence Accordions & Tables`:
   - `renders curated multi-parameter evidence sections for Taal` (PASS: section header, reference badge, 3 accordions, tabular layout with `th[scope="col"]`, captions, and WOVOdat/HDX metadata).
   - `omits curated Taal evidence section when non-Taal volcano is viewed` (PASS: non-Taal scenarios remain clean).

### Test Suite Execution Output:
```
 RUN  v4.1.11 C:/Users/Michael/CS-Abo/ABO-CS-1/frontend

 ✓ src/taalUiA11y.test.tsx (13 tests) 598ms

 Test Files  1 passed (1)
      Tests  13 passed (13)
```

Full frontend verification (`npm run check`):
- ESLint: 0 errors, 0 warnings
- TypeScript (`tsc --noEmit`): 0 errors
- Vitest: 18 test files passed (79/79 tests passed)
- Production build (`vite build`): Clean build (548ms)

---

## 8. Summary of Action Items for Implementation Owners

1. **[P1-1] Theme Overrides for Inspection Card:** Add dark-theme CSS rules for `.scene-inspection-card` to prevent the focus indicator contrast failure.
2. **[P1-2] Mobile Stacking for HUD vs Inspection Card:** Add media query rules at `@media (max-width: 700px)` to dock `.scene-inspection-card` at the bottom of the stage, preventing collision with `.scene-hud`.
3. **[P1-3] Accessible Hypocenter List:** Introduce a keyboard-navigable list or select mechanism for earthquakes when the seismicity layer is active.
4. **[P1-4] Escape Key Listeners:** Add `Escape` key event listeners to dismiss `.bookmark-detail-card` and `.scene-inspection-card`.
5. **[P2-1] Expand Touch Hit-Areas:** Expand tap targets on bookmark pills and close buttons to satisfy the 44px touch target guideline.
6. **[P2-2] Darken Alert Level 2 Text:** Change `#b45309` to `#92400e` on `#fef3c7` to provide a comfortable contrast safety margin.
7. **[P2-3] Accessible Link Annotations:** Add `(opens in a new tab)` text or icons to external WOVOdat and HDX links.
8. **[P2-4] CSS Class Naming:** Align `.scene-inspection-card` and `.seismicity-hud-card` in documentation or stylesheets.
