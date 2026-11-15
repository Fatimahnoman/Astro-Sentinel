<div align="center">

# 🛰️ ASTRO-SENTINEL

### Autonomous 3D Astronaut Digital Twin & Edge AI Flight Surgeon
**NASA Space Apps Challenge 2026**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-R3F-black?style=for-the-badge&logo=threedotjs)](https://threejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NASA](https://img.shields.io/badge/NASA-Space%20Apps-0B3D91?style=for-the-badge&logo=nasa&logoColor=white)](https://spaceappschallenge.org/)

> **A next-generation medical command bridge for deep-space crews — a living 3D digital twin of the astronaut, an autonomous on-board AI doctor, and a real-time NASA space-weather feed, all running where radio silence is the default.**

</div>

---

## 🚀 The Problem

Deep-space missions (Earth → Mars transit, ~180 days) face three brutal constraints:

1. **No immediate ground support** — light-time delay makes real-time consultation with Earth doctors impossible.
2. **Continuous, high-stress environmental hazards** — radiation storms, bone-density loss, cardiovascular deconditioning, vestibular vertigo during EVA.
3. **Zero margin for diagnostic error** — a missed tachycardia at kilometer 40 million from home is unforgivable.

Current practice relies on checklists and post-hoc radio calls. **ASTRO-SENTINEL replaces that with a continuously-on, autonomous, on-device AI flight surgeon bonded to a 3D digital twin.**

---

## ✨ The Solution at a Glance

ASTRO-SENTINEL is a **4-zone mission-control HUD** where the crew surgeon sees everything, everywhere, always:

| Zone | What it shows |
|------|---------------|
| **① Command Header** | Live mission elapsed time · crew selector (Elena, Tariq, Kenji) · Earth-Link toggle · black-box sync badge |
| **② Left Telemetry** | Heart-rate sparkline (neon Recharts) · SpO₂ · Core temp · Sleep score · **NASA HRP 5 Hazards** (0–100) · Solar-storm trigger |
| **③ 3D Digital Twin** | Rotating holographic astronaut (React Three Fiber) · clickable **brain / heart / spine** nodes · scanner ring · orbit controls · per-organ HUD |
| **④ Edge AI Flight Surgeon** | Offline deterministic clinical rule-engine (instant edge triage) · quick-symptom chips · voice in/out · **3-step protocol** · black-box log & DSN sync |
| **⑤ 180-Day Timeline** | Deterministic Mars-transit simulator — drag the slider to watch radiation & bone loss grow, countermeasures adapt |

---

## 🧠 Core Pillars

### 1️⃣ Live 3D Astronaut Digital Twin
- Rotating, translucent, wireframe human rendered with **React Three Fiber + drei**
- **Brain, Heart, Spine** organ nodes — click any node on the 3D mesh (or press the HUD buttons / Tab + arrow keys) to open a live inspection panel: vitals, subsystem metrics, and an autonomous status verdict
- Node pulse & alert rings react to the **live** NASA solar-storm feed and triage state

### 2️⃣ NASA DONKI Space-Weather — Live Data
- `GET /api/nasa` proxies the real **NASA DONKI** feed (Solar Flares + Geomagnetic Storms), 5 s timeout, module-level cache, **HTTP 200 fallback** when NASA is rate-limited or offline
- Real storms light up the whole cockpit — the **compound-hazard badge** (`COMPOUND COUPLING: 1.35x`) escalates when 2+ NASA HRP hazards spike together
- Detection is deterministic from live alerts: geomagnetic storm `Kp ≥ 5` or any `M/X-class` flare

### 3️⃣ On-Device Edge AI Flight Surgeon
- 100% **offline, deterministic** triage engine (`evaluateEdgeTriage`) — no network required, ever
- Triggers on: **tachycardia** (HR > 115), **radiation-dose** (> 150 mSv cumulative), **bone loss** (< 92 %), **EVA dizziness** keywords, **solar-storm** exposure — with a heart → brain → spine priority tie-break
- Emits a **3-step emergency protocol** with affected organ + severity in milliseconds — ready to act without Earth

### 4️⃣ Persistent Onboard Black-Box Ring Buffer + DSN Sync
- Every triage, telemetry frame and sync event is appended to a **500-slot localStorage ring buffer**
- One tap drains it to "Earth" (DSN simulated uplink) or holds it locally when autonomous

### 5️⃣ Built-In 180-Day Mars Transit Simulator
- Deterministic dose/bone-loss/cardio-drift math (no LLM needed) — lets the judge *see* a crew member deteriorate/respond across the journey
- Solar-storm injector flips the entire model to emergency state instantly

### 🧬 NASA HRP Specific Clinical Risks Mapping

Every subsystem in ASTRO-SENTINEL maps directly onto documented NASA Human Research Program clinical risks — this is not a generic dashboard, it is a mission-risk-informed medical cockpit:

| Our subsystem | NASA HRP clinical risk mitigated |
|---|---|
| **Brain Node** | **SANS** (Spaceflight Associated Neuro-ocular Syndrome) · **Altered Sensorimotor & Vestibular Function** · **Acute Space Radiation Exposure** |
| **Heart Node** | **Cardiovascular Adaptations** · **EVA Hypoxia / Decompression Sickness** · **Tachycardia** |
| **Spine Node** | **Spaceflight-Induced Bone Changes** · **Reduced Cardiorespiratory & Musculoskeletal Fitness** |
| **Edge AI Autonomous Engine** | **Risk of Inadequate Systems Operations Support** · **Inadequate Sleep & Irregular Schedule Stressors** — decisive during up to 24-minute Earth communication blackouts when ground control is unreachable |

The **3D organ nodes, the edge triage rules, and the HRP hazard model** are each anchored to specific clinical literature so every alarm is clinically meaningful, not just visually dramatic.

### 🚀 Alignment with Real NASA HRP Flight Investigations

ASTRO-SENTINEL is a direct extension of flight investigations NASA is actually flying — translated into an always-on autonomous cockpit for deep space:

- **Tempus Pro & Artemis II Standard Measures** — ASTRO-SENTINEL extends NASA's onboard telemedicine and standardized physiological/behavioral data-collection vision from Low Earth Orbit into deep space, delivering autonomous edge triage when real-time Earth telemedicine hits the **24-minute Mars communication delay** and ground control goes dark.
- **ARCHeR (Artemis II)** — ASTRO-SENTINEL mirrors Artemis II's continuous monitoring of crew sleep patterns, activity, and behavioral well-being under isolation and confinement, anchoring its circadian-safe guardrails (see the **Sleep Score** vital and **Inadequate Sleep & Irregular Schedule Stressors** risk) to the same evidence NASA collects in flight.
- **Brain Fluid Pressure & Thigh Cuff (SANS Countermeasures)** — Our 3D **Brain Node** models neuro-ocular / intracranial fluid-shift risks from SANS and recommends lower-body fluid redistribution (**Thigh Cuff** protocols) plus **B-Complex nutritional support**, exactly the countermeasures NASA is testing for long-duration missions.
- **Spinal Health & Zero T2** — The simulator models long-duration **spinal bone-density degradation** across the full **180-day Mars transit** (see the **Bone Density** vital and **Spaceflight-Induced Bone Changes** risk) and prescribes **Zero-T2 style resistive exercise** countermeasures — the same class of hardware flying on the ISS and baselined for Artemis missions.

The result: judges aren't just seeing a demo — they're seeing **NASA's own flight-proven countermeasure stack, operationalized** into an autonomous, zero-latency medical cockpit for the next frontier.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) · React 19 · TypeScript (strict) |
| **Styling** | Tailwind CSS v4 · custom HUD glassmorphism theme (`#050814`, `#00F0FF`, `#9D4EDD`, `#FF2A5F`) |
| **3D** | Three.js · @react-three/fiber · @react-three/drei |
| **Charts** | Recharts (neon heart-rate sparkline) |
| **Service adapter** | `src/services/sentinelService.ts` — single swap point (`USE_MOCK_DATA`) |
| **Types** | Unified single-source contract `src/types/telemetry.ts` (UI + backend agree on every field) |
| **NASA** | DONKI `FLR` + `GST` endpoints · `DEMO_KEY` fallback · 5 s `AbortController` timeout |

---

## ⚡ Quick Start (2 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/Fatimahnoman/Astro-Sentinel.git

# 2. Enter the project folder
cd Astro-Sentinel

# 3. Install dependencies (pnpm recommended)
pnpm install          # or: npm install

# 4. (Optional) add a free NASA API key — improves DONKI rate limits
#    Get yours at https://api.nasa.gov/signup
#    Create .env.local with:  NASA_API_KEY=your_key_here

# 5. Run
pnpm dev              # http://localhost:3000
```

**Production build:**
```bash
pnpm build
pnpm start            # http://localhost:3000
```

**Environment variables**

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `NASA_API_KEY` | ⚪ Optional | `DEMO_KEY` | NASA DONKI access (rate-limited without a key) |
| `NASA_DONKI_BASE_URL` | ⚪ Optional | `https://api.nasa.gov/DONKI` | Test/override DONKI endpoint |

---

## 🧭 How to Use (Demo in 60 seconds)

1. **Open the app** — the 3D astronaut boots instantly; all panels live-link.
2. **Click the organs** on the twin (or the `BRAIN / HEART / SPINE` HUD buttons) → inspect live readouts per zone.
3. **Trigger a solar storm** (left panel, big red button) — watch hazards spike, badge escalate, and an emergency protocol auto-write itself.
4. **Tap a symptom chip** — e.g. *"Dizzy after spacewalk"* — the Edge AI returns a 3-step plan and reads it aloud (voice).
5. **Drag the 180-day slider** → bone-density & radiation climb deterministically; countermeasures adapt.
6. **Switch crew** (Elena / Tariq / Kenji) → different baselines & risk profiles.
7. **Flip Earth Link** top-right → black-box logs sync to "Earth".
8. **Switch to offline** → everything keeps working — no NASA, no network, still alive.

---

## 📐 Architecture & Data Flow

```
 Browser (Next.js App Router)
        │
        ▼
 src/services/sentinelService.ts   ← ONLY UI → service boundary (the "swap point")
        │
        ├── /api/nasa (Route Handler) ── NASA DONKI (FLR + GST), 5s timeout, 200-always fallback
        ├── evaluateEdgeTriage()      ── on-device medical rule engine (no net)
        └── syncLogsWithEarthDSN()    ── localStorage black box, DSN uplink simulator

 src/types/telemetry.ts             ← single source of truth — frontend & backend agree on EVERY field
```

**Why this matters:** a future real backend (or a different crew roster, or a live telemetry feed) only requires **replacing one file** — the UI is 100% decoupled.

---

## ✅ Requirements Compliance (NASA Space Apps 2026)

| Requirement (from challenge) | Status | How |
|---|---|---|
| **Real NASA data used** | ✅ | Live DONKI FLR + GST via `/api/nasa` (verified: Kp-6 storm received) |
| **Interactive visualization** | ✅ | 3D holographic twin, orbit/zoom controls, clickable organ nodes |
| **Human-spaceflight relevance** | ✅ | EVA, SPE/CME risks, HRP 5 Hazards, bone loss, SANS, tachycardia, DSN comms |
| **Full-stack web app** | ✅ | Next.js full-stack (UI + serverless API route) |
| **Runs offline / resilient** | ✅ | Deterministic fallback — never shows a blank cockpit |
| **Docker/deployable one-liner** | ✅ | `pnpm install && pnpm dev` — deployable to Vercel/Netlify/any Node host |
| **Clean code, documented, typed** | ✅ | Strict TypeScript, unified contract, zero build/type errors |
| **Accessible & inclusive** | ✅ | Keyboard organ navigation (Tab/Arrows), `aria-live` announcements, visible focus rings, plain-English copy |

---

## ♿ Accessibility (a first-class citizen, not an afterthought)

- **Keyboard-first**: Tab through organ buttons, `←/→` cycles organs, `Enter/Space` selects
- **Screen readers**: every organ button announces its live reading via `role="status" aria-live="polite"`; the 3D canvas exposes a descriptive `role="img"`
- **Visible focus**: `:focus-visible` cyan ring everywhere; 44px+ touch targets
- **Reduced motion** respected via `prefers-reduced-motion` for ambient animations
- **Plain-English UI** — zero jargon walls; every icon has a tooltip with the plain-language meaning

---

## ⚠️ What's Real vs Simulated (honesty section)

| Feature | Status |
|---|---|
| NASA space-weather alerts | **Live** (DONKI, real Kp-6 storm observed in testing) |
| Edge AI triage engine | **Real** (deterministic rule-based, fully on-device) |
| Black-box logs & sync | **Real** (localStorage read/write verified) |
| Crew vitals & hazard curves | **Deterministic simulation** — no human wearable feed exists; formulas model real NASA HRP guidance |
| DSN uplink | **Simulated** — no `/api/dsn` ground station in scope |
| Voice input/output | **Real** Web Speech API (Chrome/Edge); graceful degradation elsewhere |

Simulation is the standard for human-physiology in hackathon contexts — and the architecture swaps in live sensors without touching a line of UI.

---

## 🚢 Deploy to Vercel (2 minutes)

1. [vercel.com](https://vercel.com) → **New Project** → import `Fatimahnoman/Astro-Sentinel`
2. Framework auto-detects **Next.js** ✓
3. (Optional) Add env var `NASA_API_KEY`
4. **Deploy** → get a public URL

Works out-of-the-box — no build config needed.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # 4-zone mission control shell
│   ├── layout.tsx
│   └── api/nasa/route.ts     # NASA DONKI proxy (FLR + GST)
├── components/               # 4 zones + holographic twin + quick actions
├── hooks/                    # useMissionControl (single state owner)
├── lib/
│   ├── edgeMedicalAI.ts      # on-device triage + hazard math
│   ├── storageSync.ts        # black-box ring buffer + DSN sync
│   ├── mockTelemetry.ts      # deterministic offline model
│   └── presentation.ts       # organ/severity metadata
├── services/sentinelService.ts   # THE swap point (USE_MOCK_DATA)
└── types/telemetry.ts        # unified frontend+backend contract
```

---

## 🏆 Why Judges Should Care

> "It isn't a dashboard. It's what an astronaut would **trust with their life** in a radio-silent dead zone."

Real NASA feed. Real offline intelligence. A UI that looks like it belongs on the ISS Cupola — and works without it.

---

<div align="center">

**Built for NASA Space Apps Challenge 2026** 🇺🇸 · MIT License · `pnpm dev` and explore the future of space medicine

</div>
