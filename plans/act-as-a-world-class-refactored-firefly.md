# CyberAI — NIDS & Insider Threat Detector UI

## Context

The user wants a complete, high-fidelity, multi-page web application for "CyberAI", an AI-powered Network Intrusion Detection System. The app should feel like a military-grade command center: ultra-modern dark mode, Djeezy Red (#E3000F) as the primary accent, glassmorphism panels, neon glows on critical alerts, and rich data visualizations. The project uses React + Tailwind v4 + shadcn/ui components + Recharts + Motion + Lucide React.

---

## Design Tokens (Global CSS overrides in `src/styles/theme.css`)

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#0D1117` | Page background |
| `--bg-surface` | `#161B22` | Card/panel background |
| `--bg-surface-2` | `#1C2128` | Slightly lighter surface |
| `--brand-red` | `#E3000F` | Djeezy Red — primary accent |
| `--brand-red-glow` | `rgba(227,0,15,0.35)` | Box-shadow glow |
| `--text-primary` | `#F0F6FC` | Main text |
| `--text-muted` | `#8B949E` | Secondary text |
| `--border-color` | `#30363D` | Subtle border |
| Font | `Inter` + `Roboto Mono` | Body + monospace/terminal |

---

## Architecture

**Routing**: React Router v7 (`react-router`) — already installed.

**File structure:**
```
src/app/
├── App.tsx                         ← Router wrapper, global dark theme
├── data/
│   └── mock.ts                     ← All mock data (logs, incidents, metrics)
├── components/
│   ├── layout/
│   │   ├── TopNav.tsx              ← Top navigation bar with CyberAI logo
│   │   └── AppShell.tsx            ← Sidebar + content wrapper
│   ├── MetricCard.tsx              ← Glassmorphism stat card with icon + trend
│   ├── NetworkCanvas.tsx           ← Canvas-based 3D particle animation (WebGL-style)
│   ├── MitreRadar.tsx              ← Recharts RadarChart for MITRE ATT&CK
│   └── SparkLine.tsx               ← Mini Recharts LineChart for trends
└── pages/
    ├── Dashboard.tsx               ← Page 1: Command Center
    ├── AlertsExplorer.tsx          ← Page 2: Log Explorer + filter sidebar
    ├── AlertDetail.tsx             ← Page 3: Split view — raw JSON + AI report
    └── LiveSimulation.tsx          ← Page 4: Simulation control + live terminals
```

---

## Page-by-Page Plan

### Page 1 — Dashboard (Command Center)

**Components:**
- `TopNav` with CyberAI logo (red ⬡ hex icon + "CyberAI" wordmark) and page links
- 4 `MetricCard` components in a 4-col grid:
  - "Total Analyzed Logs" — with upward sparkline
  - "Active Threats" — red glow, pulsing dot indicator
  - "Zero-Day Anomalies" — with warning icon
  - "System Health" — Recharts `RadialBarChart` progress ring at 94%
- Recharts `ComposedChart` (area + line) for "Network Traffic vs Threat Volume" — 24h, red threat overlay
- "Recent Critical Incidents" table using shadcn `Table` — columns: Time, Source IP, Attack Type, Severity badge, AI Score
- Glassmorphism `Card` wrappers throughout (backdrop-blur, semi-transparent background)

### Page 2 — Alerts & Log Explorer

**Components:**
- Left filter sidebar (fixed, ~280px):
  - Source checkboxes: SSH Auth, UEBA Insider Threat, Network Flows, Honeypot
  - Verdict radio: All / ATTACK / BENIGN
  - Confidence score range slider (shadcn `Slider`)
  - Time range select (shadcn `Select`)
- Main content area:
  - Search input with icon
  - shadcn `Table` with columns: Timestamp, Source, Verdict badge, Attack Type, AI Confidence %, Action button
  - Attack rows: red glowing left border (`border-l-4 border-red-600`) + subtle red-tinted background
  - Benign rows: normal surface
  - Pagination controls
  - Row click → navigates to Alert Detail page

### Page 3 — Alert Detail & AI Investigation

**Layout:** Two-column split (50/50), scrollable independently.

**Left panel — Raw Log Terminal:**
- Dark terminal styling (`font-mono`, green-on-black or white-on-near-black)
- Syntax-highlighted JSON display (color-coded keys/values)
- Copy button in top-right corner
- Scrollable with custom thin scrollbar

**Right panel — AI Intelligence Briefing:**
Four collapsible sections (shadcn `Accordion` or always-open cards):
1. **Incident Summary** — AI-generated narrative paragraph, key facts chips
2. **MITRE ATT&CK Context** — `MitreRadar` (Recharts RadarChart) mapping attack to tactics (Initial Access, Execution, Persistence, Lateral Movement, Exfiltration). Visual glowing red overlay.
3. **Threat Assessment** — Risk level gauge (Recharts `RadialBarChart`), IOC list, CVSS-style score
4. **Recommended Actions** — Interactive checklist (shadcn `Checkbox` items): Isolate host, Block IP, Escalate to Tier 2, etc.

**Header:** Incident ID, timestamp, back button, "Generate Report" button

### Page 4 — Live Simulation (The Showpiece)

**Top:** 4 metric cards (Total Simulated, Anomalies Caught, Network Flows, System Attacks) — auto-incrementing counters via `useInterval`

**Center Hero — `NetworkCanvas`:**
- HTML Canvas animation (NOT konva — canvas directly)
- Draws a glowing neural network graph with nodes + edges
- Floating particles stream from left → center core node
- Benign particles: white/gray, smooth pass-through
- Attack particles: start neutral → turn #E3000F on detection → flash + route to "anomaly bucket" on right
- Core node pulses with a red ring when attack is detected
- Uses `requestAnimationFrame` loop

**Control Panel (below hero, 3 cards side-by-side):**
- "SSH Replay" card: shadcn `Switch` toggle + `Slider` for delay
- "UEBA Replay" card: shadcn `Switch` toggle + `Slider` + scenario dropdown
- "Network Scenarios" card: shadcn `Switch` + attack type `Select`
- Each card: glassmorphism, animated border glow when active

**Live Feed Terminals (bottom, 2 side-by-side):**
- Left: "Raw Log Feed" — monospace, streaming new log lines every ~800ms
- Right: "Verdict Feed" — streaming colored results (green BENIGN / red ATTACK)
- Auto-scroll to bottom
- Custom scrollbar

---

## Micro-interactions & Visual Details

- **Hover glow**: buttons get `box-shadow: 0 0 12px rgba(227,0,15,0.6)` on hover via Tailwind arbitrary values or inline style
- **Active threats**: pulsing red dot (CSS `@keyframes pulse` or Motion `animate`)
- **Glassmorphism cards**: `backdrop-blur-md bg-white/5 border border-white/10`
- **Neon border on critical alerts**: `shadow-[0_0_8px_rgba(227,0,15,0.5)]`
- **Table row hover**: subtle background lift
- **Motion**: `motion/react` for page transitions, card entrance animations (fade + slide up)
- **Fonts**: Inter loaded via Google Fonts in `src/styles/fonts.css`; Roboto Mono for terminals/monospace

---

## Mock Data (`src/app/data/mock.ts`)

- 50 log entries with realistic fields: timestamp, sourceIP, destIP, protocol, verdict (ATTACK/BENIGN), attackType (DDoS, Port Scan, SQL Injection, Brute Force, Data Exfiltration, etc.), confidence (0.85–0.99)
- 24h traffic data array (hourly): { time, traffic, threats }
- MITRE tactics scores for radar chart
- One full JSON log blob for AlertDetail raw terminal view

---

## Key Libraries Used

| Library | Usage |
|---|---|
| `react-router` (v7) | Multi-page routing (already installed) |
| `recharts` | Line/area chart, RadarChart, RadialBarChart |
| `motion/react` | Entrance animations, particle motion |
| `lucide-react` | All icons |
| shadcn/ui (local) | Card, Badge, Table, Slider, Switch, Checkbox, Select, Tabs |
| HTML Canvas API | NetworkCanvas 3D particle animation |

---

## Implementation Order

1. `src/styles/fonts.css` — Add Inter + Roboto Mono import
2. `src/app/data/mock.ts` — All mock data
3. `src/app/components/layout/TopNav.tsx` — Navigation
4. `src/app/components/MetricCard.tsx` — Reusable stat card
5. `src/app/components/SparkLine.tsx` — Mini trend chart
6. `src/app/components/MitreRadar.tsx` — MITRE radar chart
7. `src/app/components/NetworkCanvas.tsx` — Canvas particle animation
8. `src/app/pages/Dashboard.tsx` — Page 1
9. `src/app/pages/AlertsExplorer.tsx` — Page 2
10. `src/app/pages/AlertDetail.tsx` — Page 3
11. `src/app/pages/LiveSimulation.tsx` — Page 4
12. `src/app/App.tsx` — Router, global dark theme, shell layout

---

## Remaining Work: Mock Data Integration

`src/app/data/mockAlerts.ts` is complete with 45 alerts and helpers. Two files need updating:

### `src/app/hooks/useWebSocket.ts`
- Import `MOCK_ALERTS` and `generateStreamAlert` from `'../data/mockAlerts'`
- After 1200ms if WebSocket hasn't connected, seed state with `MOCK_ALERTS`
- Start interval every 4s to push `generateStreamAlert()` into state while disconnected
- Clear mock interval + timeout when real WebSocket connects in `ws.onopen`

### `src/app/api/agent.ts`
- Import `getMockLogsResponse` and `getMockReport` from `'../data/mockAlerts'`
- Wrap `fetchLogs` in try/catch — on catch return `getMockLogsResponse(params)`
- Wrap `analyzeAlert` in try/catch — on catch return `{ report: getMockReport(alertId, source) }`
- Wrap `controlSimulation` in try/catch — swallow silently (toast handled in LiveSimulation.tsx)

---

## Verification

After implementation:
- Dashboard shows 45 mock alerts immediately with no backend required
- Alerts explorer shows paginated table with red ATTACK rows
- Alert detail shows AI investigation report from mock
- Live simulation canvas has flowing particles from mock streaming
- All 4 pages render without errors
- Navigation between pages works
- Charts animate on load
- Canvas particle animation runs (requestAnimationFrame loop)
- Responsive layout works on wide screens (1440px+)
