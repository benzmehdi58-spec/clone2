# MASTER IMPLEMENTATION PROMPT
## Custom-IPT — Image Processing Toolbox
## UI/UX Transformation to Adobe Creative Cloud Standard
### Production-Grade Specification Document — v1.0

---

## SECTION 1 — PROJECT GOAL

You are tasked with performing a **complete, surgical UI/UX transformation** of an existing
Python desktop application called **Custom-IPT (Image Processing Toolbox)**, built with
**PySide6 + Matplotlib + NumPy**.

You MUST NOT rewrite the image processing algorithms. You MUST NOT break any existing
functionality. Your sole mission is:

1. Completely redesign the visual interface to match the attached reference screenshot with
   pixel-perfect fidelity.
2. Add every missing UI feature, panel, control, and interaction that is visible in the
   reference but absent from the current code.
3. Achieve a result that is visually indistinguishable from professional Adobe Creative Cloud
   desktop software (Photoshop, Premiere Pro, Adobe Express).

**The reference screenshot is the single, absolute source of truth.** Every decision — layout,
color, spacing, typography, icon, behavior — must be derived from it.

---

## SECTION 2 — SCREENSHOT ANALYSIS INSTRUCTIONS

Before writing a single line of code, you must perform a systematic analysis of the reference
screenshot. Document internally:

- The exact pixel dimensions and proportions of each UI region (sidebar width ~245px,
  right panel width ~265px, toolbar height ~52px, bottom panel height ~240px, status
  bar height ~28px).
- Every text label, its font weight, approximate size, and color.
- Every icon and what it represents.
- Every interactive control (slider, dropdown, checkbox, button, tab).
- The exact dark color values used across all surfaces (use the color system in Section 19).
- The border and separator styles between panels.
- The visual hierarchy: which elements are most prominent, which are subdued.
- All states visible: active tab vs inactive tab, selected tool vs unselected tool,
  checked checkbox, active history item vs inactive.

Only after completing this internal analysis should you begin modifying code.

---

## SECTION 3 — VISUAL DESIGN REQUIREMENTS

### 3.1 Overall Aesthetic
The application must look like a **professional dark-theme desktop creative tool** on par
with Adobe Photoshop or Premiere Pro. Characteristics:
- Deep, rich dark surfaces — not pure black, but layered charcoal grays.
- Subtle panel borders using slightly lighter gray strokes.
- Blue accent color (`#1473E6` — Adobe blue) used exclusively for: active tabs, selected
  tool highlights, primary action buttons, active history items, checkbox fills, slider
  thumbs, and focused states.
- All text is crisp, never blurry, with clear size hierarchy.
- No rounded corners on panels or toolbars (sharp, rectilinear geometry).
- Slight inner shadows on canvas areas to create depth.
- Consistent 1px separator lines between all panel regions.

### 3.2 Surface Layers (from darkest to lightest)
| Layer | Usage | Hex |
|---|---|---|
| Base | Window background, deepest panels | `#1C1C1C` |
| Surface-1 | Sidebar, right panel background | `#252525` |
| Surface-2 | Toolbar, bottom panel background | `#2D2D2D` |
| Surface-3 | Hover states, input backgrounds | `#333333` |
| Surface-4 | Active item highlight, selected row | `#383838` |
| Border | Panel separators, control outlines | `#3A3A3A` |
| Border-Light | Subtle dividers | `#404040` |

### 3.3 Text Colors
| Role | Hex |
|---|---|
| Primary text | `#E8E8E8` |
| Secondary text / labels | `#ABABAB` |
| Disabled text | `#606060` |
| Section headers | `#FFFFFF` |
| Active/accent text | `#4CA3FF` (lighter Adobe blue for text) |

### 3.4 Accent Colors
| Role | Hex |
|---|---|
| Primary action (Appliquer button) | `#1473E6` |
| Primary action hover | `#1A82FF` |
| Active tab underline | `#1473E6` |
| Selected tool indicator | `#1473E6` |
| History item — blue dot (Image chargée) | `#4CA3FF` |
| History item — green dot (completed op) | `#2D9F5D` |
| History item — active op | `#38B86E` (brighter green) |
| History item — inactive dot | `#555555` |
| Danger / delete icon | `#E84040` |
| Warning | `#F5A623` |

---

## SECTION 4 — LAYOUT REQUIREMENTS

The main window is divided into **6 fixed regions**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MENU BAR (height: 30px)                                                │
├─────────────────────────────────────────────────────────────────────────┤
│  TOOLBAR (height: 52px)                                                 │
├──────────────┬──────────────────────────────────────────┬───────────────┤
│              │  CANVAS HEADER (tabs + image info, 36px) │               │
│  LEFT PANEL  ├──────────────────────────────────────────┤  RIGHT PANEL  │
│  (width:245) │  IMAGE COMPARISON VIEW (flexible height) │  (width: 265) │
│              ├──────────────────────────────────────────┤               │
│              │  CANVAS TOOLBAR (height: 40px)           │               │
│              ├──────────────────────────────────────────┤               │
│              │  BOTTOM ANALYSIS PANEL (height: 240px)   │               │
├──────────────┴──────────────────────────────────────────┴───────────────┤
│  STATUS BAR (height: 28px)                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Critical layout rules:**
- Left panel has a fixed width of **245px**, not resizable.
- Right panel has a fixed width of **265px**, not resizable.
- Center workspace (canvas area + bottom panel) fills all remaining horizontal space.
- The right panel is split vertically: **Parameters section** (top, flexible) + **History
  section** (bottom, fixed ~220px).
- A **1px `#3A3A3A` border** separates every region from its neighbors.
- Use `QSplitter` with movement disabled OR fixed `setFixedWidth`/`setFixedHeight` to
  enforce these dimensions.
- Minimum window size: **1100 × 700px**.

---

## SECTION 5 — NAVIGATION & TOOLBAR REQUIREMENTS

### 5.1 Menu Bar
Height: 30px. Background: `#1C1C1C`. Text: `#E8E8E8`, font-size 13px.

Menu items (exactly as in reference):
- **Fichier** — Ouvrir, Enregistrer, Enregistrer sous, Séparateur, Reset, Séparateur, Quitter
- **Edition** — Annuler (Ctrl+Z), Rétablir (Ctrl+Y), Séparateur, Copier résultat
- **Affichage** — Zoom avant, Zoom arrière, Ajuster à la fenêtre, Taille réelle, Séparateur,
  Afficher histogramme, Afficher profil de ligne
- **Outils** — (mirrors sidebar tool list with keyboard shortcuts)
- **Analyse** — Histogramme, Profil de ligne, Mesure de distance
- **Aide** — À propos, Documentation

### 5.2 Quick Access Toolbar
Height: **52px**. Background: `#2D2D2D`. Bottom border: `1px solid #3A3A3A`.
Internal padding: `8px 12px`. Items separated by `1px #3A3A3A` vertical dividers.

**Exact buttons in order (left to right):**

| Button | Icon | Label | Shortcut |
|---|---|---|---|
| Ouvrir | 📁 folder-open (Tabler: `IconFolderOpen`) | "Ouvrir" | Ctrl+O |
| Enregistrer | 💾 floppy (Tabler: `IconDeviceFloppy`) | "Enregistrer" | Ctrl+S |
| Enregistrer sous | export (Tabler: `IconFileExport`) | "Enregistrer sous" | Ctrl+Shift+S |
| *(separator)* | — | — | — |
| Reset | refresh-ccw (Tabler: `IconRefresh`) | "Reset" | Ctrl+R |
| *(separator)* | — | — | — |
| Annuler | arrow-back (Tabler: `IconArrowBack`) | "Annuler" | Ctrl+Z |
| Rétablir | arrow-forward (Tabler: `IconArrowForward`) | "Rétablir" | Ctrl+Y |
| *(separator)* | — | — | — |
| Zoom dropdown | zoom (Tabler: `IconZoom`) | "100%" | — |
| Ajuster fenêtre | maximize (Tabler: `IconArrowsMaximize`) | — | Ctrl+0 |
| Zoom avant | zoom-in (Tabler: `IconZoomIn`) | — | Ctrl++ |
| Zoom arrière | zoom-out (Tabler: `IconZoomOut`) | — | Ctrl+- |
| Main (pan) | hand (Tabler: `IconHandMove`) | — | H |

**Button style:**
- Each button: height 36px, min-width 36px, padding `4px 10px`.
- Icon size: 18×18px.
- Icon + label side by side for the first 7 buttons (icon left, label right).
- Icon-only for zoom controls and pan tool.
- Background: transparent normally; `#383838` on hover; `#404040` on press.
- No visible border on buttons (borderless style).
- Labels: font-size 12px, color `#ABABAB`.

**Zoom dropdown:**
- `QComboBox` showing current zoom level: "25%", "50%", "75%", "100%", "150%", "200%",
  "Ajuster", "Taille réelle".
- Width: 85px. Height: 28px.
- Background: `#333333`. Border: `1px solid #3A3A3A`. Text: `#E8E8E8`.
- Dropdown arrow: `#ABABAB`.

---

## SECTION 6 — LEFT TOOLS PANEL REQUIREMENTS

### 6.1 Panel Header
Text: **"OUTILS"** in uppercase, font-size 11px, font-weight 600, color `#ABABAB`,
letter-spacing 1.2px. Right-aligned ✕ close icon (Tabler: `IconX`, 14px, `#606060`).
Height: 36px. Padding: `0 12px`. Bottom border: `1px solid #3A3A3A`.

### 6.2 Section Headers
Four collapsible sections. Each header:
- Background: transparent (no fill).
- Text: font-size 12px, font-weight 700, color `#FFFFFF`.
- Left accent bar: **3px solid** accent color for the currently active/expanded section,
  transparent for others.
- Height: 32px. Padding: `0 12px 0 16px`.
- No collapse arrow needed (keep all expanded by default).
- Bottom border: none (spacing handled by padding).

**Sections and their accent colors:**
1. **Transformations Ponctuelles** — accent `#1473E6`
2. **Filtres (Convolution)** — accent `#1473E6`
3. **Morphologie** — accent `#1473E6`
4. **Analyse** — accent `#1473E6`

### 6.3 Tool Items
Each tool item is a `QPushButton` or custom `QWidget`:
- Height: **32px**. Full-width. Padding: `0 12px 0 32px` (icon indented from left).
- Icon: 16×16px, color `#ABABAB` normally, `#E8E8E8` on hover/selected.
- Label: font-size 12px, color `#ABABAB` normally, `#E8E8E8` on hover/selected.
- Background: transparent normally; `#2E2E2E` on hover; `#383838` when selected.
- Selected state: left border `3px solid #1473E6`; background `#2A3A52`.
- No bottom border between items.

### 6.4 Complete Tool List with Icons

**Transformations Ponctuelles:**
| Tool | Icon (Tabler) | Label |
|---|---|---|
| Luminosité / Contraste | `IconSun` (☀) | Luminosité / Contraste |
| Égalisation d'histogramme | `IconChartBar` (📊) | Égalisation d'histogramme |
| Seuillage (Otsu) | `IconAdjustmentsHorizontal` (⊡) | Seuillage (Otsu) |

**Filtres (Convolution):**
| Tool | Icon (Tabler) | Label |
|---|---|---|
| Moyenneur | `IconGridDots` (⊞) | Moyenneur |
| Médian | `IconLayoutGrid` (⊟) | Médian |
| Gaussien | `IconCircleDot` (✳) | Gaussien |
| Sobel | `IconArrowsHorizontal` (↔) | Sobel |
| Prewitt | `IconArrowsDiagonal` (↗) | Prewitt |
| Laplacien | `IconDiamond` (◇) | Laplacien |
| Netteté (Unsharp Mask) | `IconSparkles` (✦) | Netteté (Unsharp Mask) |

**Morphologie:**
| Tool | Icon (Tabler) | Label |
|---|---|---|
| Érosion | `IconMinus` with circle (⊖) | Érosion |
| Dilatation | `IconPlus` with circle (⊕) | Dilatation |
| Ouverture | `IconCircleOff` (○) | Ouverture |
| Fermeture | `IconCircle` (●) | Fermeture |
| Squelette (Zhang-Suen) | `IconBone` or `IconVectorSpline` | Squelette (Zhang-Suen) |

**Analyse:**
| Tool | Icon (Tabler) | Label |
|---|---|---|
| Histogramme | `IconChartHistogram` (📈) | Histogramme |
| Profil de ligne | `IconTrendingUp` (↗) | Profil de ligne |
| Mesure de distance | `IconRuler` (📏) | Mesure de distance |

**Icon implementation note:** Since Tabler icons are not available as a PySide6 package,
implement all icons using `QIcon` from embedded SVG strings (use `QSvgRenderer` +
`QPixmap`) or Unicode characters rendered in a `QLabel`. Provide clean, minimal SVG paths
for each icon that match the Tabler aesthetic (1.5px stroke, rounded linecaps, 24×24 viewBox).

---

## SECTION 7 — MAIN WORKSPACE REQUIREMENTS

### 7.1 Canvas Header Bar
Height: **36px**. Background: `#252525`. Bottom border: `1px solid #3A3A3A`.

**Left side — Tab switcher:**
Two tabs: **"Original"** and **"Résultat"**.
- Inactive tab: text `#ABABAB`, font-size 12px, background transparent, no underline.
- Active tab: text `#E8E8E8`, font-size 12px, font-weight 600, bottom border
  `2px solid #1473E6`, background transparent.
- Tab padding: `0 16px`. Tab height: 36px.
- Clicking "Original" shows the untouched original image; "Résultat" shows processed result.
  **This is a display toggle, not a destructive action.**

**Right side — Image metadata:**
Two text segments separated by `1px #3A3A3A` vertical line:
- Segment 1: Image dimensions, e.g., `"1920 × 1080"` — font-size 11px, color `#ABABAB`.
- Segment 2: Color mode, e.g., `"Niveaux de gris (8 bits)"` or `"Couleur RGB (8 bits)"` —
  font-size 11px, color `#ABABAB`.
- Padding: `0 16px`.

### 7.2 Image Comparison View
The center image area shows **two images side by side** separated by a `1px #3A3A3A`
vertical divider:
- **Left half:** Original image, fit to available space, maintaining aspect ratio.
- **Right half:** Processed result, same dimensions as left.
- Background of empty area (no image): `#1A1A1A` with a subtle centered message
  `"Ouvrir une image pour commencer"` in `#404040`, font-size 13px.
- When "Aperçu en temps réel" is enabled in the right panel, the result image updates
  **live** as sliders are moved (debounced at 150ms to avoid lag).
- Mouse cursor changes to crosshair `Qt.CrossCursor` in normal mode, hand `Qt.OpenHandCursor`
  in pan mode, and pencil in line-draw mode.

### 7.3 Canvas Toolbar (below image, above bottom panel)
Height: **40px**. Background: `#2D2D2D`. Border-top and border-bottom: `1px solid #3A3A3A`.
Padding: `0 12px`.

**Left side — Canvas tools (4 icon buttons):**
| Button | Icon | Tooltip | Behavior |
|---|---|---|---|
| Main (Pan) | hand icon | "Outil Main - Déplacer l'image" | Drag to pan when zoomed |
| Sélection | rectangle-dashed icon | "Outil Sélection - Sélectionner une zone" | Draw selection rect |
| Dessin / Ligne | pencil icon | "Outil Dessin - Tracer une ligne de profil" | Line profile mode |
| Pipette | eyedropper icon | "Outil Pipette - Mesurer l'intensité" | Click to sample pixel |

Tool button style:
- Size: 28×28px. Icon: 16×16px.
- Background: transparent normally; `#383838` on hover.
- **Active tool:** background `#2A3A52`, border `1px solid #1473E6`.
- Tools are mutually exclusive (radio-button behavior).

**Right side of canvas toolbar — Coordinate display:**
Format: `"X: 532  Y: 276  |  Intensité: 142"`
- Updates live as mouse moves over image canvas.
- Font-size: 12px. Color: `#ABABAB` for labels, `#E8E8E8` for values.
- Separator `|`: color `#3A3A3A`.
- For color images show: `"X: 532  Y: 276  |  R: 214  G: 187  B: 142"`

---

## SECTION 8 — IMAGE COMPARISON VIEW REQUIREMENTS

### 8.1 Rendering
- Use a custom `QWidget` subclass that overrides `paintEvent` for both image panes.
- Convert `np.ndarray` → `QImage` → `QPixmap` for display, scaled with
  `Qt.KeepAspectRatio` and `Qt.SmoothTransformation`.
- The two panes must always be exactly equal in width (each gets 50% of canvas width minus
  the 1px divider).
- Support zoom levels (25% to 200%) controlled by the toolbar zoom control.
  Implement zoom via scaling the QPixmap, centered on the mouse cursor position.

### 8.2 Pan Mode
When the Hand tool is active and the image is zoomed in:
- Click + drag pans both images simultaneously (keeping them synchronized).
- Cursor: `Qt.OpenHandCursor` normally, `Qt.ClosedHandCursor` while dragging.

### 8.3 Line Profile Interaction
When the Line tool is selected:
- User clicks point A, then clicks point B on either image pane.
- Draw a **red line** (`#FF4444`, width 2px) with small circular endpoints (radius 4px,
  filled `#FF4444`) overlaid on the image using `QPainter`.
- After the second click, auto-trigger the line profile calculation and switch the bottom
  panel to "PROFIL DE LIGNE" tab and populate the graph.
- The line persists as an overlay until the user starts a new line or switches tools.

### 8.4 Distance Measurement Interaction
When the Mesure de distance tool (from sidebar Analyse section) is active:
- User clicks point A, then point B.
- Draw: two filled red circles (radius 4px), a dashed red line between them
  (`Qt.DashLine`, `#FF4444`).
- Display the computed distance in the canvas toolbar coordinate area:
  `"Distance: 142.3 pixels"`.
- Also update the MESURE DE DISTANCE tab in the bottom panel with full details.

### 8.5 Pixel Sampling (Pipette)
When the Pipette tool is active:
- On mouse click, read the pixel value at the clicked coordinates.
- Display in the canvas toolbar: `"X: 532  Y: 276  |  Intensité: 142"` (grayscale)
  or RGB values (color).
- Optionally, show a small tooltip-style popup near the cursor.

---

## SECTION 9 — RIGHT PARAMETERS PANEL REQUIREMENTS

### 9.1 Panel Structure
The right panel (265px wide) is split into two vertical sections:
- **Top: PARAMÈTRES section** (flexible height, scrollable if needed).
- **Bottom: HISTORIQUE DES OPÉRATIONS section** (fixed ~220px height).
- Separated by `1px solid #3A3A3A` horizontal divider.

### 9.2 PARAMÈTRES Header
Text: **"PARAMÈTRES"** — uppercase, font-size 11px, font-weight 600, color `#ABABAB`,
letter-spacing 1.2px. Right side: ✕ close icon (`#606060`, 14px).
Height: 36px. Padding: `0 12px`. Bottom border: `1px solid #3A3A3A`.

### 9.3 Tool Name Display
When a tool is selected, display its name prominently:
- Font-size: **14px**, font-weight: **700**, color: `#FFFFFF`.
- Padding: `12px 14px 8px 14px`.
- This is the first element inside the parameters content area.
- Example: `"Gaussian Blur"` when Gaussien filter is selected.

### 9.4 Parameter Controls

**Slider control pattern** (used for kernel size, sigma, alpha, beta, etc.):
```
Label text                          Current Value
━━━━━━━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━ (slider track)
Min value                           Max value
```
- Label: font-size 12px, color `#ABABAB`. Value: font-size 12px, color `#E8E8E8`,
  right-aligned, bold.
- Slider track height: 4px, background `#3A3A3A`, border-radius 2px.
- Slider fill (left of thumb): `#1473E6`.
- Slider thumb: circle, diameter 14px, background `#1473E6`, no border.
  On hover: diameter 16px, box-shadow `0 0 0 3px rgba(20,115,230,0.3)`.
- Min/max labels: font-size 10px, color `#606060`, shown below track.
- Spacing: 14px between each parameter group.

**Dropdown (QComboBox) pattern** (used for kernel size selector, border type):
```
Label text
┌─────────────────────────────────▾┐
│ 5 × 5                             │
└───────────────────────────────────┘
```
- Label: font-size 12px, color `#ABABAB`, margin-bottom 4px.
- ComboBox: height 28px, background `#333333`, border `1px solid #3A3A3A`,
  color `#E8E8E8`, font-size 12px. Dropdown arrow: `#ABABAB`.
- Options for kernel size: "3 × 3", "5 × 5", "7 × 7".
- Options for border type: "Symétrique", "Réfléchi", "Constant (0)".

**Checkbox pattern** (used for "Aperçu en temps réel"):
```
☑ Aperçu en temps réel
```
- Checkbox size: 14×14px. When checked: background `#1473E6`, checkmark `#FFFFFF`.
- When unchecked: background `transparent`, border `1px solid #606060`.
- Label: font-size 12px, color `#ABABAB`.
- **Default state: CHECKED** (real-time preview enabled by default).
- Margin: `8px 0`.

### 9.5 Per-Tool Parameter Definitions

**Luminosité / Contraste:**
- Slider: Contraste (α), range 0.1–3.0, step 0.05, default 1.0
- Slider: Luminosité (β), range -100 to +100, step 1, default 0
- Checkbox: Aperçu en temps réel

**Égalisation d'histogramme:**
- No sliders (algorithm has no parameters)
- Show: `"Aucun paramètre requis"` in `#606060`, font-size 12px, italic, centered.
- Checkbox: Aperçu en temps réel

**Seuillage (Otsu):**
- Read-only display: `"Seuil calculé : —"` (updates to actual threshold after Apply)
  Style: font-size 12px, color `#ABABAB`; value in `#4CA3FF`.
- Checkbox: Aperçu en temps réel

**Moyenneur / Médian:**
- Dropdown: Taille du noyau (3×3, 5×5, 7×7)
- Checkbox: Aperçu en temps réel

**Gaussien:**
- Dropdown: Taille du noyau (3×3, 5×5, 7×7)
- Slider: Sigma, range 0.1–5.0, step 0.1, default 1.2
- Dropdown: Type de bordure (Symétrique, Réfléchi, Constant)
- Checkbox: Aperçu en temps réel

**Sobel / Prewitt:**
- Radio buttons: Mode — "Magnitude", "Axe X (Gx)", "Axe Y (Gy)"
  Style: radio circle 14px, accent `#1473E6`.
- Checkbox: Aperçu en temps réel

**Laplacien:**
- Checkbox: Connectivité 8 (`"Noyau 8-connexe"`)
- Checkbox: Accentuation (add to original)
- Checkbox: Aperçu en temps réel

**Netteté (Unsharp Mask):**
- Slider: Intensité, range 0.5–3.0, default 1.5
- Slider: Sigma flou, range 0.5–2.0, default 1.0
- Checkbox: Aperçu en temps réel

**Érosion / Dilatation / Ouverture / Fermeture:**
- Dropdown: Forme (Carré, Croix)
- Dropdown: Taille (3×3, 5×5)
- Checkbox: Aperçu en temps réel

**Squelette (Zhang-Suen):**
- No parameters. Show: `"Algorithme de Zhang-Suen"` info text.
- Checkbox: Aperçu en temps réel

### 9.6 Action Buttons

Two buttons at the bottom of the parameters content area:

**Appliquer:**
- Height: 34px. Full-width minus 28px horizontal padding.
- Background: `#1473E6`. Color: `#FFFFFF`. Font-size: 13px. Font-weight: 600.
- Icon left: checkmark (✓, `IconCheck`, 16px, white).
- Hover: background `#1A82FF`. Press: background `#0E5EC4`.
- No border-radius (sharp corners).

**Réinitialiser:**
- Height: 32px. Full-width minus 28px horizontal padding.
- Background: transparent. Color: `#ABABAB`. Font-size: 12px.
- Border: `1px solid #3A3A3A`.
- Hover: background `#2D2D2D`, color `#E8E8E8`.
- Behavior: resets result image to original, clears all parameter modifications.

---

## SECTION 10 — REAL-TIME PREVIEW SYSTEM REQUIREMENTS

### 10.1 Behavior
When "Aperçu en temps réel" checkbox is **checked**:
- Every slider value change triggers a re-computation of the processing algorithm.
- Debounce delay: **150ms** (use `QTimer.singleShot` to avoid running on every tick).
- The result pane updates automatically **without** the user pressing "Appliquer".
- The "Appliquer" button label changes to **"Confirmer"** to indicate the preview is already
  visible and clicking will commit it to history.
- A subtle **pulsing blue dot** (8px diameter, `#1473E6`) appears next to "Résultat" tab
  label while processing is running.

### 10.2 Performance Constraints
- For large images (> 1 megapixel), auto-scale down to a 512px-max preview for real-time
  computation, then apply full-resolution only on final Appliquer/Confirmer.
- Show a `QProgressBar` (thin, 3px height, blue, at the top of the canvas area) during
  full-resolution processing. Hide when complete.

### 10.3 When Unchecked
- No live updates. Processing only occurs on "Appliquer" click.
- The pulsing dot is hidden.

---

## SECTION 11 — HISTOGRAM & ANALYTICS PANEL REQUIREMENTS

### 11.1 Panel Structure
The bottom panel occupies the full width of the center workspace (between left and right
panels). Height: **240px**. Background: `#252525`. Top border: `1px solid #3A3A3A`.

Three tabs across the top:
- **HISTOGRAMME** | **PROFIL DE LIGNE** | **MESURE DE DISTANCE**
- Tab style: uppercase, font-size 11px, letter-spacing 0.8px.
- Active tab: color `#E8E8E8`, bottom border `2px solid #1473E6`.
- Inactive tab: color `#606060`, no underline.
- Tab height: 36px. Padding: `0 20px`.
- Tab separator: `1px solid #3A3A3A` vertical lines.

### 11.2 HISTOGRAMME Tab Layout
The histogram tab is divided into **three horizontal sections**:

**Left — Histogram graph (~55% width):**
- Matplotlib `FigureCanvasQTAgg` embedded.
- Figure background: `#1E1E1E`. Axes background: `#1E1E1E`.
- For grayscale: white/light-gray filled bars with `#B0B0B0` color, full opacity.
- For color: three semi-transparent curves — R: `#FF6060` (alpha 0.7), G: `#60FF60`
  (alpha 0.7), B: `#6090FF` (alpha 0.7).
- X-axis: range 0–255, ticks at 0, 64, 128, 192, 255. Tick color: `#555555`.
  Tick labels: font-size 9px, color `#777777`.
- Y-axis: auto-scaled, ticks with K suffix (0, 2K, 4K, 6K, 8K, 10K).
  Tick color: `#555555`. Tick labels: font-size 9px, color `#777777`.
- Grid lines: `#2A2A2A`, linestyle `--`, alpha 0.5.
- **Gradient fill below curve:** use `fill_between` with a gradient from histogram color
  (alpha 0.6) to transparent.
- A thin gradient bar below the X-axis showing the grayscale ramp (black to white).
- Axis spine color: `#3A3A3A`.
- Updates automatically after every operation.
- Margins: tight layout with padding `(4, 4, 4, 4)`.

**Center — Statistiques panel (~20% width):**
Title: **"STATISTIQUES"** — uppercase, font-size 10px, font-weight 700, color `#ABABAB`,
letter-spacing 1px. Margin-bottom: 8px.

Statistics table (two-column layout):
```
Min          0
Max        255
Moyenne    126.48
Médiane    127
Écart type  48.67
```
- Left column (labels): font-size 11px, color `#777777`.
- Right column (values): font-size 11px, color `#E8E8E8`, right-aligned, monospace font.
- Row height: ~22px. Alternating subtle background (transparent / `#1E1E1E`).
- Values update after every operation, same timing as histogram.

**Right — Aperçu 100% panel (~25% width):**
Title: **"APERÇU 100%"** — uppercase, font-size 10px, font-weight 700, color `#ABABAB`,
letter-spacing 1px. Margin-bottom: 4px.

- A small `QLabel` displaying a **cropped 100% zoom** patch of the result image
  (center crop of size ~150×100px of the actual image pixels, no scaling).
- This shows true pixel-level detail.
- Border: `1px solid #3A3A3A`.
- On the thumbnail, if a line profile is active, draw the same red line overlay at scale.
- Updates after every operation.

---

## SECTION 12 — STATISTICS PANEL REQUIREMENTS

Statistics are computed from the **currently displayed result image** (or original if no
operation applied yet). All computations use NumPy only.

| Statistic | Computation |
|---|---|
| Min | `np.min(img)` |
| Max | `np.max(img)` |
| Moyenne | `np.mean(img)`, formatted to 2 decimal places |
| Médiane | `np.median(img)`, formatted to 0 decimal places |
| Écart type | `np.std(img)`, formatted to 2 decimal places |

For color images, compute on the grayscale equivalent: `0.299R + 0.587G + 0.114B`.
Display is a `QWidget` with a `QGridLayout` — not a Matplotlib subplot.

---

## SECTION 13 — LINE PROFILE PANEL REQUIREMENTS

### 13.1 Tab Content
The **PROFIL DE LIGNE** tab shows a full-width Matplotlib graph.

**Left side (~65% width) — Intensity profile graph:**
- X-axis: "Distance (pixels)", range 0 to line length.
  Ticks: 0, 200, 400, 600, 800, max. Labels: font-size 9px, color `#777777`.
- Y-axis: "Intensité", range 0–255.
  Ticks: 0, 64, 128, 192, 255. Labels: font-size 9px, color `#777777`.
- Plot line: `#4CA3FF`, linewidth 1.5px, no markers.
- For color images: three lines — R `#FF6060`, G `#60FF60`, B `#6090FF`.
- Grid: `#2A2A2A`, `--`, alpha 0.4.
- Same figure styling as histogram (dark background, dark axes).

**Right side (~35% width) — Thumbnail with line:**
- Show the result image thumbnail (~170×120px).
- Draw the profile line in red on the thumbnail.
- Below: show start/end coordinates:
  `"A: (x1, y1)  →  B: (x2, y2)"` font-size 10px, color `#777777`.
- Show line length: `"Longueur: 1024 pixels"` font-size 10px, color `#ABABAB`.

### 13.2 Bresenham Implementation
The line profile must use a correct Bresenham's line algorithm to collect pixel coordinates.
The extracted values are the pixel intensities at each coordinate along the line.

---

## SECTION 14 — DISTANCE MEASUREMENT REQUIREMENTS

### 14.1 Tab Content (MESURE DE DISTANCE)
When two points are clicked in distance mode, display:

**Large distance readout (centered, prominent):**
- Value: e.g., `"142.3"` — font-size 36px, font-weight 700, color `#E8E8E8`.
- Unit: `"pixels"` — font-size 14px, color `#777777`, below the value.

**Two-column details:**
```
Point A       (532, 276)
Point B       (674, 318)
ΔX            142 px
ΔY            42 px
Distance      148.1 px
Angle         16.5°
```
- Label: font-size 11px, color `#777777`.
- Value: font-size 11px, color `#E8E8E8`, monospace.

**Thumbnail showing both points and the line.**

---

## SECTION 15 — HISTORY PANEL REQUIREMENTS

### 15.1 Header
Text: **"HISTORIQUE DES OPÉRATIONS"** — uppercase, font-size 10px, font-weight 700,
color `#ABABAB`, letter-spacing 1px.
Height: 32px. Padding: `0 12px`. Top border: `1px solid #3A3A3A`.
Right side: trash icon (`IconTrash`, 14px, `#606060`; hover: `#E84040`) — clears all
history (with confirmation dialog).

### 15.2 History Items
Each item occupies one row, height **32px**.

Layout per row:
```
● N  Operation Name                [icon]
```
- Colored dot (8px diameter, filled circle): see color rules below.
- Number `N`: font-size 11px, color `#606060`, fixed-width 16px.
- Operation name: font-size 12px, truncated with ellipsis if too long.
- The currently "active" (last applied) item: **background `#2A3A52`**, text `#E8E8E8`,
  left border `2px solid #38B86E`.
- All other items: background transparent, text `#ABABAB`.
- Hover: background `#2D2D2D`.

**Dot colors:**
- Item 1 "Image chargée": `#4CA3FF` (blue)
- Items that produced a result change: `#2D9F5D` (green, dimmer) for old items
- Currently active item: `#38B86E` (bright green)
- Pending/not-yet-applied: `#555555` (gray)

**Clicking a history item:** restores the result image to that state (implement an undo
stack where each entry stores a copy of the result `np.ndarray` + operation name).

**Maximum history items shown:** 6 (scroll if more). Use `QScrollArea` with scrollbar
hidden but functional (`setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)`), scroll with
mouse wheel.

---

## SECTION 16 — STATUS BAR REQUIREMENTS

Height: **28px**. Background: `#1C1C1C`. Top border: `1px solid #3A3A3A`.
Font-size: 11px. Color: `#777777`. Padding: `0 12px`.

Three segments separated by `1px #3A3A3A` vertical lines:

1. **Left:** Application state message — e.g., `"Prêt"` when idle; `"Traitement en cours…"`
   during processing; `"Opération appliquée : Gaussian Blur"` after success.
   Color: `#ABABAB` for status text. Max-width ~300px.

2. **Center:** `"Image : lake_mountains.jpg"` — filename only, truncated if long.
   `"Aucune image"` when no file loaded.

3. **Right:** Two sub-segments:
   - `"Taille : 1920 × 1080"` — pixel dimensions.
   - `"Niveaux de gris (8 bits)"` or `"Couleur RGB (8 bits)"` — mode.
   Both separated by `|` in `#3A3A3A`.

---

## SECTION 17 — ICONOGRAPHY REQUIREMENTS

### 17.1 Icon Style
All icons must match the **Tabler Icons** aesthetic:
- 24×24px viewBox.
- Stroke-based (not filled), stroke-width 1.5–2px.
- Rounded line caps and joins.
- Minimal, geometric, and clean.
- Rendered at 16×16px or 18×18px in the UI.

### 17.2 Icon Color States
| State | Color |
|---|---|
| Default | `#ABABAB` |
| Hover | `#E8E8E8` |
| Active / Selected | `#4CA3FF` |
| Disabled | `#555555` |
| Danger (delete) | `#E84040` |

### 17.3 Implementation
Since PySide6 does not bundle Tabler Icons natively, implement icons via **inline SVG
strings**. Create a helper class:
```python
class IconProvider:
    @staticmethod
    def get_icon(name: str, color: str = "#ABABAB", size: int = 16) -> QIcon:
        svg_map = {
            "folder-open": '<svg ...>...</svg>',
            "floppy": '<svg ...>...</svg>',
            # ... all icons
        }
        svg = svg_map[name].replace('currentColor', color)
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.transparent)
        renderer = QSvgRenderer(svg.encode())
        painter = QPainter(pixmap)
        renderer.render(painter)
        painter.end()
        return QIcon(pixmap)
```
Provide complete SVG path data for every icon used in the application.

---

## SECTION 18 — TYPOGRAPHY REQUIREMENTS

### 18.1 Font Stack
Primary font: **"Segoe UI"** (Windows), **"SF Pro Display"** (macOS), **"Ubuntu"** (Linux).
Fallback: system sans-serif.
Apply via: `app.setFont(QFont("Segoe UI", 10))` at startup.

Monospace font (for coordinate values, statistics values): **"Cascadia Code"**, **"Consolas"**,
or **"DejaVu Sans Mono"** as fallback.

### 18.2 Type Scale
| Role | Size | Weight | Color |
|---|---|---|---|
| Window title | 13px | 400 | `#E8E8E8` |
| Panel headers | 11px | 600 | `#ABABAB` |
| Section headers in sidebar | 12px | 700 | `#FFFFFF` |
| Tool item labels | 12px | 400 | `#ABABAB` |
| Parameter labels | 12px | 400 | `#ABABAB` |
| Parameter values | 12px | 600 | `#E8E8E8` |
| Tool name in params panel | 14px | 700 | `#FFFFFF` |
| Button labels | 13px | 600 | `#FFFFFF` |
| Tab labels | 11px | 600 | `#E8E8E8` (active) |
| Status bar text | 11px | 400 | `#777777` |
| Statistics labels | 11px | 400 | `#777777` |
| Statistics values | 11px | 400 | `#E8E8E8` (monospace) |
| Distance readout | 36px | 700 | `#E8E8E8` |

---

## SECTION 19 — COLOR SYSTEM REQUIREMENTS

Apply the entire color system via a **QSS (Qt StyleSheet)** string applied to the
`QApplication` at startup. Structure it as:

```python
STYLESHEET = """
QMainWindow, QWidget#centralWidget {
    background-color: #1C1C1C;
}
QMenuBar {
    background-color: #1C1C1C;
    color: #E8E8E8;
    font-size: 13px;
    border-bottom: 1px solid #3A3A3A;
}
QMenuBar::item:selected {
    background-color: #2D2D2D;
}
QMenu {
    background-color: #252525;
    border: 1px solid #3A3A3A;
    color: #E8E8E8;
}
QMenu::item:selected {
    background-color: #1473E6;
}
QToolBar {
    background-color: #2D2D2D;
    border-bottom: 1px solid #3A3A3A;
    spacing: 4px;
}
QPushButton {
    background-color: transparent;
    color: #ABABAB;
    border: none;
    font-size: 12px;
}
QPushButton:hover {
    background-color: #383838;
    color: #E8E8E8;
}
QPushButton#btnAppliquer {
    background-color: #1473E6;
    color: #FFFFFF;
    font-size: 13px;
    font-weight: bold;
}
QPushButton#btnAppliquer:hover {
    background-color: #1A82FF;
}
QPushButton#btnReinitialiser {
    background-color: transparent;
    color: #ABABAB;
    border: 1px solid #3A3A3A;
}
QSlider::groove:horizontal {
    height: 4px;
    background-color: #3A3A3A;
    border-radius: 2px;
}
QSlider::sub-page:horizontal {
    background-color: #1473E6;
    border-radius: 2px;
}
QSlider::handle:horizontal {
    width: 14px;
    height: 14px;
    margin: -5px 0;
    border-radius: 7px;
    background-color: #1473E6;
}
QComboBox {
    background-color: #333333;
    border: 1px solid #3A3A3A;
    color: #E8E8E8;
    height: 28px;
    padding-left: 8px;
    font-size: 12px;
}
QComboBox::drop-down {
    border: none;
    width: 20px;
}
QComboBox QAbstractItemView {
    background-color: #252525;
    border: 1px solid #3A3A3A;
    color: #E8E8E8;
    selection-background-color: #1473E6;
}
QCheckBox {
    color: #ABABAB;
    font-size: 12px;
}
QCheckBox::indicator {
    width: 14px;
    height: 14px;
    border: 1px solid #606060;
    background-color: transparent;
}
QCheckBox::indicator:checked {
    background-color: #1473E6;
    border-color: #1473E6;
}
QScrollBar:vertical {
    background-color: #252525;
    width: 6px;
}
QScrollBar::handle:vertical {
    background-color: #3A3A3A;
    border-radius: 3px;
    min-height: 20px;
}
QScrollBar::handle:vertical:hover {
    background-color: #555555;
}
QStatusBar {
    background-color: #1C1C1C;
    color: #777777;
    font-size: 11px;
    border-top: 1px solid #3A3A3A;
}
QTabBar::tab {
    background-color: transparent;
    color: #606060;
    font-size: 11px;
    font-weight: 600;
    padding: 0 20px;
    height: 36px;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 2px solid transparent;
}
QTabBar::tab:selected {
    color: #E8E8E8;
    border-bottom: 2px solid #1473E6;
}
"""
```

Supplement with per-widget `setStyleSheet()` calls where QSS specificity is insufficient.

---

## SECTION 20 — INTERACTION & ANIMATION REQUIREMENTS

### 20.1 Hover Transitions
- All button and tool-item hover states should feel instant (no CSS transition needed in Qt,
  as Qt handles repaints; ensure no artificial delay).
- Slider thumb hover enlargement: implement via `QProxyStyle` override of `drawComplexControl`
  if needed.

### 20.2 Tab Switching
- Switching between Original/Résultat tabs: instant image swap, no animation.
- Switching between HISTOGRAMME/PROFIL DE LIGNE/MESURE DE DISTANCE tabs: instant.

### 20.3 Processing Feedback
- When "Appliquer" is clicked, immediately:
  1. Disable the Appliquer button (set text to "Traitement…").
  2. Show the thin progress bar at the top of the canvas.
  3. Run the processing in a `QThread` to avoid freezing the UI.
  4. On completion: re-enable button, hide progress bar, update all displays, add to history.

### 20.4 Tool Selection Feedback
- Clicking a tool in the sidebar: immediately highlight it (background `#2A3A52`,
  left border `3px solid #1473E6`) and update the right parameter panel content.

### 20.5 Canvas Cursor Behavior
| Mode | Cursor |
|---|---|
| Default (no tool) | `Qt.ArrowCursor` |
| Pan tool | `Qt.OpenHandCursor` (dragging: `Qt.ClosedHandCursor`) |
| Selection tool | `Qt.CrossCursor` |
| Line/Draw tool | `Qt.CrossCursor` |
| Pipette tool | Custom pipette cursor (QCursor from QPixmap) |
| Over image when zoomed | Changes to pan cursor automatically if zoom > 100% |

---

## SECTION 21 — RESPONSIVENESS REQUIREMENTS

The application is a **fixed-layout desktop app**, not a responsive web app. However:

- Minimum window size: **1100 × 700px** enforced with `setMinimumSize`.
- Left panel (245px) and right panel (265px) are fixed-width.
- The **center workspace** (`canvas + bottom panel`) scales to fill remaining space.
- The image canvas itself uses `Qt.KeepAspectRatio` scaling, so images always fit correctly.
- When the window is resized, only the center canvas changes size; panels do not.
- The bottom analysis panel has a **fixed height of 240px** and does not resize.
- Use `QSplitter(Qt.Horizontal)` with panel sizes set and `setChildrenCollapsible(False)`.

---

## SECTION 22 — ACCESSIBILITY REQUIREMENTS

- All buttons and interactive controls must have `setToolTip()` with a descriptive French
  string.
- All icons must have associated text labels (never icon-only for primary actions).
- Keyboard shortcuts: Ctrl+O (open), Ctrl+S (save), Ctrl+Z (undo), Ctrl+Y (redo),
  Ctrl+R (reset), Ctrl++ / Ctrl+- (zoom), Ctrl+0 (fit to window), H (pan tool),
  L (line tool), D (distance tool), Escape (cancel current tool action).
- Focus indicators: all focusable controls must show a visible focus ring
  (`border: 1px solid #4CA3FF`).

---

## SECTION 23 — TECHNICAL IMPLEMENTATION REQUIREMENTS

### 23.1 Threading
- **Never run image processing on the main (UI) thread.**
- Use `QThread` + `QObject` worker pattern with signals:
  ```python
  class ProcessingWorker(QObject):
      finished = Signal(np.ndarray)
      error = Signal(str)
      
      def run(self):
          try:
              result = self.func(**self.params)
              self.finished.emit(result)
          except Exception as e:
              self.error.emit(str(e))
  ```

### 23.2 Undo/Redo Stack
Implement a simple stack:
```python
class HistoryStack:
    def __init__(self, max_size=20):
        self.stack = []  # list of (name: str, image: np.ndarray)
        self.index = -1
    
    def push(self, name, image): ...
    def undo(self) -> tuple: ...
    def redo(self) -> tuple: ...
    def clear(self): ...
```
Each entry stores a **full copy** of the result image (`image.copy()`).

### 23.3 Image Conversion
```python
def ndarray_to_qpixmap(arr: np.ndarray) -> QPixmap:
    if arr.ndim == 2:  # grayscale
        h, w = arr.shape
        qimg = QImage(arr.data, w, h, w, QImage.Format_Grayscale8)
    elif arr.ndim == 3:  # RGB
        h, w, c = arr.shape
        qimg = QImage(arr.data, w, h, w * c, QImage.Format_RGB888)
    return QPixmap.fromImage(qimg.copy())  # .copy() ensures data ownership
```

### 23.4 Matplotlib Integration
```python
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg
from matplotlib.figure import Figure

class MplCanvas(FigureCanvasQTAgg):
    def __init__(self, parent=None, width=5, height=3):
        fig = Figure(figsize=(width, height), facecolor='#1E1E1E', tight_layout=True)
        self.axes = fig.add_subplot(111)
        self.axes.set_facecolor('#1E1E1E')
        super().__init__(fig)
        self.setParent(parent)
```

### 23.5 Real-Time Preview Timer
```python
self._preview_timer = QTimer()
self._preview_timer.setSingleShot(True)
self._preview_timer.setInterval(150)
self._preview_timer.timeout.connect(self._apply_preview)

def _on_slider_changed(self):
    if self.chk_realtime.isChecked():
        self._preview_timer.start()  # restarts the 150ms window
```

### 23.6 Dependencies (no new ones)
```
PySide6
matplotlib
numpy
Pillow
```
No additional packages. All SVG icons are embedded as strings in the source.

---

## SECTION 24 — ACCEPTANCE CRITERIA

The implementation is complete and correct when ALL of the following are true:

**Layout:**
- [ ] Left panel is exactly 245px wide, always visible, with 4 tool sections.
- [ ] Right panel is exactly 265px wide, with PARAMÈTRES (top) + HISTORIQUE (bottom).
- [ ] Bottom analysis panel is exactly 240px tall with 3 tabs.
- [ ] Status bar shows 3 segments (state | filename | size+mode).
- [ ] Toolbar shows all 13 controls in correct order with icons and labels.
- [ ] Canvas header shows Original/Résultat tabs + image metadata on the right.

**Visual:**
- [ ] Background surfaces use the exact dark palette defined in Section 19.
- [ ] All accent/active states use `#1473E6` Adobe blue.
- [ ] All sliders have the correct track/thumb styling.
- [ ] All section headers in sidebar have the left accent bar.
- [ ] Appliquer button is solid blue, Réinitialiser is ghost/outline.

**Functional:**
- [ ] Opening an image populates both canvas panes and updates all panels.
- [ ] Each tool selected in the sidebar updates the right parameter panel correctly.
- [ ] Real-time preview works with 150ms debounce when checkbox is checked.
- [ ] Appliquer runs processing in a QThread, shows progress, updates history.
- [ ] Undo (Ctrl+Z) and Redo (Ctrl+Y) work through the history stack.
- [ ] Reset restores the original image, clears history.
- [ ] Histogram updates after every operation.
- [ ] Statistics update after every operation.
- [ ] Line profile tool draws red line, populates PROFIL DE LIGNE tab correctly.
- [ ] Distance measurement tool draws overlay, shows result in MESURE DE DISTANCE tab.
- [ ] Pixel coordinate display updates live as mouse moves over canvas.
- [ ] Zoom in/out and zoom dropdown all work and scale both panes simultaneously.
- [ ] Pan tool works when image is zoomed in.
- [ ] History panel entries are clickable and restore the corresponding image state.
- [ ] Trash icon in history panel clears history after confirmation.
- [ ] Saving exports the current result image via PIL.

**Quality:**
- [ ] No UI freezes during image processing (threading correctly implemented).
- [ ] All tooltips present on every button and tool.
- [ ] Keyboard shortcuts all functional.
- [ ] Application runs with: `pip install PySide6 matplotlib numpy Pillow && python custom_ipt.py`.

---

*End of Master Implementation Prompt — Custom-IPT v1.0*
*Total specification sections: 24 | Target platform: Python 3.10+ / PySide6 / Windows-macOS-Linux*
