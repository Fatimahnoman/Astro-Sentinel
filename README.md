import pypandoc

readme = r'''<div align="center">

# 🛰️ ASTRO-SENTINEL

### Autonomous 3D Astronaut Digital Twin & Edge-AI Flight Surgeon

**NASA Space Apps Challenge 2026**  
*Houston to Mars — one neural net at a time.*

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NASA API](https://img.shields.io/badge/Data-NASA%20DONKI-0B3D91?logo=nasa)](https://api.nasa.gov/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**A mission-control medical cockpit designed for the realities of deep-space exploration.**

Explore astronaut health through an interactive 3D digital twin, monitor real NASA space-weather alerts, and run an offline edge-triage engine — even when communication with Earth is unavailable.

</div>

---

## 🧭 Explore the Project

- [🚨 The Challenge](#-the-challenge)
- [💡 Our Approach](#-our-approach)
- [🧠 Core Capabilities](#-core-capabilities)
- [🧬 NASA HRP Risk Alignment](#-nasa-hrp-risk-alignment)
- [🌌 Connection to NASA Flight Research](#-connection-to-nasa-flight-research)
- [🏗️ Architecture](#️-architecture)
- [🧰 Technology Stack](#-technology-stack)
- [⚡ Getting Started](#-getting-started)
- [🎮 60-Second Demo Guide](#-60-second-demo-guide)
- [📋 Challenge Requirements](#-challenge-requirements)
- [♿ Accessibility](#-accessibility)
- [🔍 Live vs. Simulated](#-live-vs-simulated)
- [🚀 Deployment](#-deployment)
- [📁 Project Structure](#-project-structure)
- [🏆 Why ASTRO-SENTINEL Matters](#-why-astro-sentinel-matters)

---

## 🚨 The Challenge

A crew travelling from Earth to Mars may spend approximately **180 days in transit** — far beyond the reach of immediate medical support from Earth.

Deep-space healthcare introduces three critical challenges:

| Challenge | Why It Matters |
|---|---|
| 📡 **Communication delay** | With long communication delays — potentially up to 24 minutes one-way — astronauts cannot depend on real-time consultation with Earth. |
| ☀️ **Continuous exposure risks** | Radiation events, bone-density loss, cardiovascular deconditioning, sleep disruption, and vestibular symptoms can affect crew health. |
| 🩺 **Limited margin for error** | A developing medical issue must be identified and assessed when ground-based support is not immediately available. |

Traditional checklists and delayed radio consultations are not enough for every time-critical scenario.

**ASTRO-SENTINEL explores a more resilient approach:** an onboard medical-support concept that combines a 3D astronaut digital twin, NASA space-weather data, and a deterministic edge-triage engine.

> 🎯 **Our design goal:** keep essential monitoring and decision-support capabilities available onboard, including during communication outages.

---

## 💡 Our Approach

ASTRO-SENTINEL brings the mission picture together in an interactive medical command interface.

The cockpit is organized around five connected areas:

| Mission area | What it provides |
|---|---|
| 🎛️ **Mission Command Header** | Mission elapsed time, crew selection, Earth-Link control, and black-box sync status. |
| 📈 **Health & Hazard Telemetry** | Heart-rate visualization, oxygen level, core temperature, sleep score, NASA HRP hazard indicators, and solar-storm status. |
| 🧑‍🚀 **3D Astronaut Digital Twin** | An interactive holographic astronaut with selectable brain, heart, and spine inspection points. |
| 🤖 **Edge-AI Flight Surgeon** | Offline rule-based triage, symptom shortcuts, voice interaction, emergency protocols, and event logging. |
| 🪐 **180-Day Mission Timeline** | A deterministic Mars-transit simulation showing how selected health-risk indicators can change over time. |

The result is a single interface for exploring crew status, environmental hazards, and onboard medical decision support.

---

## 🧠 Core Capabilities

### 🧑‍🚀 1. Interactive 3D Astronaut Digital Twin

A holographic astronaut model acts as the visual centre of the medical cockpit.

- Built with **Three.js**, **React Three Fiber**, and **Drei**.
- Rotating, translucent wireframe-style astronaut visualization.
- Selectable **Brain**, **Heart**, and **Spine** inspection nodes.
- Organ-specific panels display vital readings, subsystem metrics, and status assessments.
- Node pulses and alert rings respond to the current triage state and available solar-weather alerts.
- Organ selection is also available through HUD controls and keyboard navigation.

### ☀️ 2. Live NASA DONKI Space-Weather Monitoring

ASTRO-SENTINEL connects to NASA's DONKI (Space Weather Database Of Notifications, Knowledge, Information) service for solar and geomagnetic event data.

- A Next.js API route retrieves solar-flare (FLR) and geomagnetic-storm (GST) information.
- A five-second request timeout helps prevent the interface from waiting indefinitely.
- Cached responses and fallback handling help the cockpit remain usable when NASA's service is unavailable or rate-limited.
- Geomagnetic storm alerts at **Kp ≥ 5**, or an **M- or X-class solar flare**, can trigger the application's deterministic alert logic.
- Combined hazard indicators escalate when multiple configured NASA HRP hazard signals rise together.

### 🦾 3. Offline Edge-AI Flight Surgeon

The onboard triage component is a **deterministic, rule-based engine** designed to run locally without requiring an AI-model API call or an active internet connection.

It evaluates configured conditions such as:

- Elevated heart rate (**HR > 115 bpm**).
- Cumulative radiation dose (**> 150 mSv**).
- Bone-density indicator (**< 92%**).
- EVA-related dizziness keywords.
- Solar-storm exposure conditions.

The engine applies a defined priority order — **Heart → Brain → Spine** — when resolving competing triggers.

It then produces a structured, three-step response containing the affected organ and severity level.

> ℹ️ This is a prototype decision-support simulation, not a certified medical device or a replacement for professional medical judgment.

### 📦 4. Persistent Onboard Black-Box Logging

Mission events should remain available even when communication is interrupted.

- Triage events, telemetry frames, and sync events are stored in a **500-slot localStorage ring buffer**.
- The interface can initiate a simulated uplink to the mission's Earth/DSN endpoint.
- When the connection is unavailable or Earth-Link is disabled, records remain stored locally.
- The logging flow demonstrates a foundation for later integration with a real onboard data service.

### 🪐 5. 180-Day Mars Transit Simulator

Explore how selected health indicators may evolve during a long-duration mission.

- A deterministic timeline models radiation-dose accumulation, bone-density change, and cardiovascular drift.
- Move the timeline slider to inspect different points in the simulated journey.
- Countermeasure responses adapt according to the simulator's configured logic.
- A solar-storm scenario can switch the simulation into an emergency state.

The simulator makes long-duration mission risks easier to explore visually — without presenting simulated values as live astronaut measurements.

---

## 🧬 NASA HRP Risk Alignment

ASTRO-SENTINEL is informed by risk areas identified by NASA's **Human Research Program (HRP)**. The prototype connects selected risks to its digital-twin inspection points and decision-support logic.

| ASTRO-SENTINEL component | Related NASA HRP risk areas |
|---|---|
| 🧠 **Brain Node** | Spaceflight-Associated Neuro-ocular Syndrome (SANS), altered sensorimotor and vestibular function, and acute space-radiation exposure. |
| ❤️ **Heart Node** | Cardiovascular adaptations, EVA hypoxia/decompression-related concerns, and elevated heart-rate conditions. |
| 🦴 **Spine Node** | Spaceflight-induced bone changes and reduced cardiorespiratory and musculoskeletal fitness. |
| 🤖 **Edge-Triage Engine** | Operational-support constraints, inadequate sleep, and irregular-schedule stressors — especially relevant when Earth communication is delayed or unavailable. |

These mappings provide the rationale behind the prototype's monitoring categories and simulated alerts. They are not a claim of clinical validation or NASA endorsement.

---

## 🌌 Connection to NASA Flight Research

The project draws inspiration from areas of human-spaceflight research and countermeasure development, including:

- **Tempus Pro & Artemis II Standard Measures:** onboard health monitoring and standardized physiological and behavioural data collection.
- **ARCHeR (Artemis II):** monitoring crew sleep, activity, and behavioural well-being during isolation and confinement.
- **SANS research and fluid-shift countermeasures:** the Brain Node represents neuro-ocular and fluid-shift risk areas explored in spaceflight research.
- **Spinal health and exercise countermeasures:** the transit simulator represents long-duration bone and musculoskeletal concerns and the importance of resistive exercise.

These are research inspirations and conceptual alignments. ASTRO-SENTINEL does not implement or validate NASA's operational medical protocols, and it is not an official NASA system.

---

## 🏗️ Architecture

The application keeps the user interface separate from its service and decision-logic layers.

```text
                  ┌──────────────────────────────┐
                  │       Browser Interface      │
                  │     Next.js App Router       │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │ sentinelService.ts           │
                  │ Central UI / service boundary│
                  └──────────────┬───────────────┘
                                 │
             ┌───────────────────┼────────────────────┐
             │                   │                    │
             ▼                   ▼                    ▼
    ┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │ /api/nasa       │  │ evaluateEdge     │  │ syncLogsWith     │
    │ NASA DONKI      │  │ Triage()         │  │ EarthDSN()       │
    │ FLR + GST       │  │ Local rule engine│  │ Local log buffer │
    └────────────────┘  └──────────────────┘  └──────────────────┘
             │                   │                    │
             ▼                   ▼                    ▼
       NASA API data       Offline decisions      localStorage
```

### Design decisions

- **Single service boundary:** `src/services/sentinelService.ts` is the central connection between the UI and application services.
- **Unified data contract:** `src/types/telemetry.ts` defines the shared telemetry structure used across the frontend and service layer.
- **Offline-first decision logic:** `evaluateEdgeTriage()` does not depend on a remote model or network request.
- **Resilient external-data handling:** the NASA API route includes timeout, caching, and fallback behaviour.
- **Replaceable data source:** the `USE_MOCK_DATA` service switch supports changing the data source without coupling the UI to backend implementation details.

This separation is intended to make future integration with live telemetry or a dedicated backend easier to manage.

---

## 🧰 Technology Stack

| Layer | Technologies |
|---|---|
| Framework | Next.js 15 — App Router |
| UI | React 19, TypeScript (strict mode) |
| Styling | Tailwind CSS v4, custom mission-control HUD theme |
| 3D visualization | Three.js, React Three Fiber, React Three Drei |
| Charts | Recharts |
| Space-weather data | NASA DONKI — FLR and GST endpoints |
| Application services | `sentinelService.ts` |
| Data contracts | `src/types/telemetry.ts` |
| Local persistence | Browser `localStorage` |

### Visual identity

The interface uses a dark, high-contrast mission-control theme with cyan, violet, and alert-red accents.

- Background: `#050814`
- Cyan: `#00F0FF`
- Violet: `#9D4EDD`
- Alert red: `#FF2A5F`

---

## ⚡ Getting Started

### Prerequisites

- Node.js compatible with your installed Next.js version.
- pnpm (recommended) or npm.
- Git.

### 1. Clone the repository

```bash
git clone https://github.com/Fatimahnoman/Astro-Sentinel.git
```

### 2. Open the project directory

```bash
cd Astro-Sentinel
```

### 3. Install dependencies

```bash
pnpm install
```

Or use npm:

```bash
npm install
```

### 4. Configure the NASA API key (optional)

A NASA API key is optional. The project can use `DEMO_KEY` as the default, subject to its rate limits.

Get a key from [NASA API](https://api.nasa.gov/signup), then create a `.env.local` file in the project root:

```env
NASA_API_KEY=your_key_here
```

Optional endpoint override:

```env
NASA_DONKI_BASE_URL=https://api.nasa.gov/DONKI
```

### 5. Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production build

```bash
pnpm build
pnpm start
```

### Environment variables

| Variable | Required? | Default | Purpose |
|---|---|---|---|
| `NASA_API_KEY` | No | `DEMO_KEY` | NASA DONKI API access. A personal key offers higher rate limits. |
| `NASA_DONKI_BASE_URL` | No | `https://api.nasa.gov/DONKI` | NASA DONKI endpoint override for testing or configuration. |

---

## 🎮 60-Second Demo Guide

Want to explore the main experience quickly? Follow this path:

1. **Launch the cockpit** — the 3D astronaut and mission panels load.
2. **Inspect the digital twin** — select Brain, Heart, or Spine to view its readings and status.
3. **Trigger a solar-storm scenario** — use the solar-storm control and observe the hazard indicators and triage response.
4. **Test the Flight Surgeon** — select a symptom shortcut, such as *“Dizzy after spacewalk”*, and inspect the generated three-step protocol.
5. **Explore the mission timeline** — drag the 180-day slider to see the simulated health indicators change.
6. **Switch crew profiles** — compare the Elena, Tariq, and Kenji demo profiles.
7. **Test Earth-Link** — toggle the connection control and inspect the black-box sync behaviour.
8. **Try offline operation** — disconnect or use the offline state to explore local triage and stored data without NASA connectivity.

🎯 **Demo tip:** Trigger the solar-storm scenario, inspect an organ node, and then test a symptom shortcut. This gives a quick view of the project's 3D, environmental-data, and offline-triage components.

---

## 📋 NASA Space Apps Challenge 2026 — Requirements

| Requirement area | Implementation in ASTRO-SENTINEL |
|---|---|
| 🌍 Real NASA data | NASA DONKI solar-flare and geomagnetic-storm data through `/api/nasa`. |
| 🧊 Interactive visualization | 3D astronaut digital twin, orbit/zoom controls, and selectable organ nodes. |
| 🚀 Human-spaceflight relevance | EVA-related scenarios, solar-weather alerts, HRP risk mapping, bone-loss simulation, SANS-related risk areas, and communication constraints. |
| 🖥️ Full-stack application | Next.js application with frontend and server-side API route. |
| 📡 Offline resilience | Local deterministic triage and fallback data behaviour. |
| 🧩 Deployability | Standard Next.js build and deployment workflow. |
| 🧹 Typed architecture | Strict TypeScript and a shared telemetry contract. |
| ♿ Accessibility | Keyboard navigation, screen-reader announcements, visible focus states, and reduced-motion support. |

---

## ♿ Accessibility

Accessibility is part of the interface design, not an afterthought.

- **Keyboard navigation:** move through organ controls with Tab; use arrow keys to cycle and Enter/Space to select.
- **Screen-reader support:** organ controls announce live readings through status regions, and the 3D canvas provides a descriptive accessible role.
- **Visible focus:** keyboard focus indicators help users identify the active control.
- **Touch-friendly controls:** interactive targets are designed with a 44px-or-larger target size.
- **Reduced motion:** ambient animations respect the `prefers-reduced-motion` setting.
- **Clear language:** tooltips and plain-English labels help explain interface indicators.

---

## 🔍 Live vs. Simulated

Transparency matters — especially in a project involving astronaut health.

| Feature | Current implementation |
|---|---|
| ☀️ NASA space-weather alerts | **Live external data** from NASA DONKI when the service is reachable; fallback behaviour is used if unavailable. |
| 🤖 Edge-AI triage | **Local deterministic rule engine**; does not require a network connection. |
| 📦 Black-box event storage | **Local persistence** using browser `localStorage`. |
| 📈 Crew vitals and hazard curves | **Deterministic simulation**; not connected to real astronaut wearables or live crew telemetry. |
| 📡 DSN / Earth uplink | **Simulated**; this project does not connect to an operational Deep Space Network ground station. |
| 🎙️ Voice interaction | Uses the browser Web Speech API where supported, with graceful degradation in other environments. |

**Important:** ASTRO-SENTINEL is a hackathon prototype and research-inspired demonstration. Its simulated physiology, rule-based triage, and countermeasure suggestions are not clinically validated and must not be used for real medical decisions.

---

## 🚀 Deployment

ASTRO-SENTINEL can be deployed to a Node.js-compatible hosting platform. For Vercel:

1. Open [Vercel](https://vercel.com/).
2. Select **Add New → Project**.
3. Import `Fatimahnoman/Astro-Sentinel` from GitHub.
4. Allow Vercel to detect the Next.js framework.
5. Add `NASA_API_KEY` if you want to use a personal NASA API key.
6. Select **Deploy**.

The application uses a standard Next.js project structure and does not require a custom build configuration for a typical Vercel deployment.

---

## 📁 Project Structure

```text
src/
├── app/
│   ├── page.tsx                  # Mission-control interface
│   ├── layout.tsx                # Application layout
│   └── api/
│       └── nasa/
│           └── route.ts          # NASA DONKI API proxy
├── components/                   # Cockpit zones, 3D twin, and controls
├── hooks/
│   └── ...                       # Mission-control state management
├── lib/
│   ├── edgeMedicalAI.ts          # Local triage and hazard logic
│   ├── storageSync.ts            # Black-box buffer and DSN sync simulation
│   ├── mockTelemetry.ts          # Deterministic demo telemetry
│   └── presentation.ts           # Organ and severity metadata
├── services/
│   └── sentinelService.ts        # Central service boundary / data-source switch
└── types/
    └── telemetry.ts             # Shared telemetry data contract
```

---

## 🏆 Why ASTRO-SENTINEL Matters

Deep-space exploration demands systems that can keep providing useful support when communication, time, and resources are constrained.

ASTRO-SENTINEL brings together three ideas:

- 🧑‍🚀 **A human-centred 3D digital twin** to make astronaut health information easier to explore.
- ☀️ **Real NASA space-weather data** to connect environmental events with mission-risk awareness.
- 🤖 **Offline edge decision support** to demonstrate how essential local logic can remain available during communication gaps.

> **“It isn't just a dashboard — it's a concept for medical decision support when Earth is out of reach.”**

**Built for NASA Space Apps Challenge 2026** 🇺🇸  
**Repository:** [github.com/Fatimahnoman/Astro-Sentinel](https://github.com/Fatimahnoman/Astro-Sentinel)

*Explore the cockpit. Trigger a scenario. See how ASTRO-SENTINEL responds.*

---

<div align="center">

### 🛰️ ASTRO-SENTINEL
**Designed for the distance between Earth and Mars.**

</div>
'''

output_path = "/mnt/data/README_ASTRO_SENTINEL.md"
pypandoc.convert_text(readme, "md", format="md", outputfile=output_path, extra_args=["--standalone"])
print(f"Created: {output_path}")
