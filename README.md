
<div align="center">

# 🛰️ ASTRO-SENTINEL

### 🚀 Autonomous 3D Astronaut Digital Twin & Edge-AI Flight Surgeon

**NASA Space Apps Challenge 2026**

*Houston to Mars — One Neural Net at a Time.*

<br/>

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript)
![NASA](https://img.shields.io/badge/Data-NASA%20DONKI-0B3D91?logo=nasa)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS%20v4-06B6D4?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green.svg)

<br/>

**🌌 What if an astronaut faces a medical emergency millions of kilometres away from Earth?**

ASTRO-SENTINEL brings together an interactive 3D astronaut digital twin, live NASA space-weather monitoring, and an offline Edge-AI Flight Surgeon to explore intelligent medical decision support for deep-space missions.

</div>

---

## 🧭 TABLE OF CONTENTS

- [🚨 The Problem](#-the-problem)
- [💡 Our Solution](#-our-solution)
- [🚀 Key Features](#-key-features)
- [🧠 Core Capabilities](#-core-capabilities)
- [🧬 NASA HRP Risk Alignment](#-nasa-hrp-risk-alignment)
- [🌌 NASA Research Alignment](#-nasa-research-alignment)
- [🏗️ System Architecture](#️-system-architecture)
- [🧰 Technology Stack](#-technology-stack)
- [⚡ Getting Started](#-getting-started)
- [🎮 Interactive Demo Guide](#-interactive-demo-guide)
- [📋 Challenge Requirements](#-challenge-requirements)
- [♿ Accessibility](#-accessibility)
- [🔍 Live vs. Simulated](#-live-vs-simulated)
- [🚀 Deployment](#-deployment)
- [📁 Project Structure](#-project-structure)
- [🏆 Why ASTRO-SENTINEL Matters](#-why-astro-sentinel-matters)

---

## 🚨 THE PROBLEM

### **When Earth Is Out of Reach, Who Takes Care of the Astronaut?**

Imagine an astronaut travelling from Earth to Mars, facing a medical emergency millions of kilometres away from home.

During a deep-space mission lasting approximately **180 days**, astronauts face critical challenges that cannot always be managed through traditional Earth-based medical support.

| Challenge | Impact on Deep-Space Missions |
|---|---|
| 📡 **Communication Delays** | Long communication delays can prevent astronauts from receiving immediate medical guidance from Earth. |
| ☀️ **Space Radiation** | Solar storms and radiation exposure introduce serious environmental health risks. |
| 🦴 **Physical Deterioration** | Bone-density loss, cardiovascular deconditioning, and reduced physical fitness can affect crew health. |
| 🧠 **Neurological & Vestibular Risks** | Spaceflight can affect neuro-ocular health, balance, and sensorimotor functions. |
| 🩺 **Time-Critical Medical Decisions** | Astronauts need onboard capabilities to assess health risks when ground support is unavailable. |

**The Core Challenge:**

Deep-space crews need intelligent onboard health monitoring and medical decision-support capabilities that remain accessible even during communication blackouts.

---

## 💡 OUR SOLUTION

### **Introducing ASTRO-SENTINEL — An Autonomous 3D Astronaut Digital Twin & Edge-AI Flight Surgeon.**

🛰️ **ASTRO-SENTINEL is a next-generation medical command system designed for the challenges of deep-space exploration.**

It combines three essential technologies:

- 🧑‍🚀 **Interactive 3D Digital Twin** — A visual representation of astronaut health with interactive Brain, Heart, and Spine inspection nodes.
- ☀️ **Live NASA Space-Weather Monitoring** — Real solar-flare and geomagnetic-storm information through NASA DONKI.
- 🤖 **Offline Edge-AI Flight Surgeon** — A deterministic, rule-based triage engine that evaluates configured health-risk conditions without requiring internet connectivity.

### 🎯 Our Mission

**Bring intelligent medical decision support closer to the astronaut — even when Earth is millions of kilometres away.**

By combining real external space-weather data, interactive visualization, local decision logic, and persistent onboard logging, ASTRO-SENTINEL demonstrates a resilient approach to exploring future deep-space healthcare systems.

---

## 🚀 KEY FEATURES

<details>
<summary><b>🧑‍🚀 Interactive 3D Astronaut Digital Twin</b></summary>

- Holographic, rotating astronaut visualization.
- Interactive Brain, Heart, and Spine nodes.
- Organ-specific inspection panels.
- Live visual alert indicators.
- Orbit and zoom controls.
- Keyboard-supported organ navigation.

</details>

<details>
<summary><b>☀️ Live NASA DONKI Integration</b></summary>

- Real NASA solar-flare data.
- Geomagnetic-storm monitoring.
- Configured solar-event detection.
- API timeout and caching.
- Fallback handling for service interruptions.

</details>

<details>
<summary><b>🤖 Offline Edge-AI Flight Surgeon</b></summary>

- Local deterministic medical triage.
- Health-risk condition evaluation.
- Three-step emergency response.
- Organ-based priority handling.
- No remote AI model or internet connection required for triage.

</details>

<details>
<summary><b>📦 Onboard Black-Box Logging</b></summary>

- Persistent local event storage.
- 500-slot localStorage ring buffer.
- Telemetry and triage event recording.
- Simulated Earth/DSN synchronization.
- Local data retention during disconnected operation.

</details>

<details>
<summary><b>🪐 180-Day Mars Transit Simulator</b></summary>

- Simulated radiation-dose accumulation.
- Bone-density progression.
- Cardiovascular drift.
- Interactive mission timeline.
- Configurable solar-storm emergency scenario.

</details>

---

## 🧠 CORE CAPABILITIES

### 🧑‍🚀 1. LIVE 3D ASTRONAUT DIGITAL TWIN

A holographic astronaut model serves as the central visual component of the medical command interface.

**What makes it interactive?**

- Built using Three.js, React Three Fiber, and Drei.
- Rotating translucent wireframe astronaut.
- Clickable Brain, Heart, and Spine inspection nodes.
- Organ-specific telemetry and subsystem metrics.
- Visual alert rings that respond to application triage states.
- HUD controls and keyboard navigation for organ selection.

### ☀️ 2. NASA DONKI — LIVE SPACE-WEATHER DETECTION

ASTRO-SENTINEL integrates NASA's DONKI (Space Weather Database Of Notifications, Knowledge, Information) service.

**Technical implementation:**

- `/api/nasa` acts as the NASA DONKI proxy.
- Retrieves Solar Flare (FLR) and Geomagnetic Storm (GST) information.
- Five-second request timeout.
- Module-level caching.
- Fallback responses when NASA services are unavailable or rate-limited.
- Geomagnetic storm detection at Kp ≥ 5 and M/X-class solar flare detection.

Configured environmental hazard signals can trigger visual alerts and escalate the application's compound-hazard indicator.

### 🤖 3. ON-DEVICE EDGE-AI FLIGHT SURGEON

**Medical decision support that does not depend on an active internet connection.**

The `evaluateEdgeTriage()` engine uses deterministic rules to evaluate configured conditions.

**Supported trigger conditions include:**

| Trigger | Configured Threshold / Condition |
|---|---|
| ❤️ Tachycardia | Heart rate > 115 bpm |
| ☢️ Radiation Exposure | Cumulative dose > 150 mSv |
| 🦴 Bone Density | Indicator < 92% |
| 🧠 EVA Symptoms | Dizziness-related keywords |
| ☀️ Solar Exposure | Solar-storm exposure conditions |

**Decision Logic:**

- Evaluates configured medical-risk conditions locally.
- Uses Heart → Brain → Spine priority when resolving competing triggers.
- Identifies the affected organ and severity.
- Generates a structured three-step response.
- Operates without a remote AI model or network request.

⚠️ **Important:** This is a prototype decision-support simulation, not a clinically validated medical device or a replacement for professional medical judgment.

### 📦 4. PERSISTENT ONBOARD BLACK-BOX & DSN SYNC

Deep-space systems need to preserve important events when communication is interrupted.

ASTRO-SENTINEL provides:

- A 500-slot localStorage ring buffer.
- Telemetry frame recording.
- Triage event logging.
- Synchronization event tracking.
- Simulated Earth/DSN uplink.
- Local retention when Earth-Link is unavailable.

### 🪐 5. 180-DAY MARS TRANSIT SIMULATOR

Explore how selected astronaut health indicators may evolve during a long-duration mission.

**Simulation includes:**

- Radiation-dose accumulation.
- Bone-density degradation.
- Cardiovascular drift.
- Interactive timeline controls.
- Countermeasure adaptation logic.
- Solar-storm emergency scenario.

The deterministic simulator allows judges to explore changing mission conditions through an interactive timeline.

---

## 🧬 NASA HRP RISK ALIGNMENT

ASTRO-SENTINEL maps its prototype components to health-risk areas identified by NASA's **Human Research Program (HRP)**.

| Project Component | Related NASA HRP Risk Areas |
|---|---|
| 🧠 Brain Node | Spaceflight-Associated Neuro-ocular Syndrome (SANS), altered sensorimotor and vestibular function, acute space-radiation exposure. |
| ❤️ Heart Node | Cardiovascular adaptations, EVA hypoxia/decompression-related concerns, tachycardia. |
| 🦴 Spine Node | Spaceflight-induced bone changes, reduced cardiorespiratory and musculoskeletal fitness. |
| 🤖 Edge-AI Engine | Operational-support constraints, inadequate sleep, and irregular-schedule stressors. |

**Why this matters:**

The health indicators and subsystem mapping are informed by human-spaceflight risk areas rather than being presented as a generic medical dashboard.

These mappings are research-informed design choices, not claims of clinical validation.

---

## 🌌 NASA RESEARCH ALIGNMENT

ASTRO-SENTINEL draws inspiration from NASA human-spaceflight research and countermeasure development.

- **Tempus Pro & Artemis II Standard Measures:** Inspiration for onboard physiological monitoring and standardized health-data collection.
- **ARCHeR (Artemis II):** Alignment with crew sleep, activity, and behavioural well-being monitoring during isolation and confinement.
- **SANS Research:** Inspiration for representing neuro-ocular and fluid-shift-related risks through the Brain Node.
- **Spinal Health & Exercise Countermeasures:** Inspiration for the long-duration bone-density simulation and resistive-exercise countermeasure concepts.

These are conceptual research alignments. ASTRO-SENTINEL is not an official NASA system and does not implement or validate NASA operational medical protocols.

---

## 🏗️ SYSTEM ARCHITECTURE

### **Modular, Resilient & Offline-Capable Architecture**

The application separates the user interface, service layer, external data integration, and local decision logic.

```text
                 ┌──────────────────────────┐
                 │     Browser Interface    │
                 │    Next.js App Router    │
                 └─────────────┬────────────┘
                               │
                               ▼
                 ┌──────────────────────────┐
                 │    sentinelService.ts    │
                 │   Central Service Layer  │
                 └─────────────┬────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
      ┌──────────────┐ ┌──────────────┐ ┌────────────────┐
      │  /api/nasa   │ │ Edge Triage  │ │ Earth DSN Sync │
      │ NASA DONKI   │ │ Rule Engine  │ │ Local Storage  │
      └──────┬───────┘ └──────┬───────┘ └───────┬────────┘
             │                │                 │
             ▼                ▼                 ▼
        NASA Data        Offline Logic      localStorage
```

### 🔧 Architecture Highlights

- **Central Service Boundary:** `sentinelService.ts` acts as the main UI-to-service connection.
- **Unified Data Contract:** `telemetry.ts` defines shared telemetry types.
- **Offline Decision Engine:** `evaluateEdgeTriage()` operates locally.
- **External API Resilience:** NASA requests include timeout, caching, and fallback handling.
- **Replaceable Data Source:** `USE_MOCK_DATA` provides a central data-source switch.

This modular design supports future integration with live telemetry or a dedicated backend without tightly coupling the interface to its data source.

---

## 🧰 TECHNOLOGY STACK

| Layer | Technology |
|---|---|
| Framework | Next.js 15 — App Router |
| Frontend | React 19 |
| Language | TypeScript — Strict Mode |
| Styling | Tailwind CSS v4 |
| 3D Graphics | Three.js |
| 3D Rendering | React Three Fiber & Drei |
| Charts | Recharts |
| External Data | NASA DONKI API |
| Local Persistence | Browser localStorage |
| Application Services | `sentinelService.ts` |
| Data Contracts | `src/types/telemetry.ts` |

### 🎨 Visual Design System

A futuristic mission-control interface using a dark HUD theme.

| Color | Hex Code | Purpose |
|---|---|---|
| 🌑 Deep Space | `#050814` | Main background |
| 🩵 Neon Cyan | `#00F0FF` | Primary highlights |
| 💜 Electric Violet | `#9D4EDD` | Secondary accents |
| ❤️ Alert Red | `#FF2A5F` | Emergency indicators |

---

## ⚡ GETTING STARTED

Follow these steps to run ASTRO-SENTINEL locally.

### 📋 Prerequisites

- Node.js compatible with the project's Next.js version.
- pnpm (recommended) or npm.
- Git.

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Fatimahnoman/Astro-Sentinel.git
```

### 2️⃣ Navigate to the Project

```bash
cd Astro-Sentinel
```

### 3️⃣ Install Dependencies

```bash
pnpm install
```

Alternatively:

```bash
npm install
```

### 4️⃣ Configure NASA API (Optional)

Get a free NASA API key:

🔗 https://api.nasa.gov/signup

Create a `.env.local` file in the project root:

```env
NASA_API_KEY=your_key_here
```

Optional endpoint configuration:

```env
NASA_DONKI_BASE_URL=https://api.nasa.gov/DONKI
```

The application can use `DEMO_KEY` by default, subject to NASA's rate limits.

### 5️⃣ Start the Development Server

```bash
pnpm dev
```

Open:

**http://localhost:3000**

### 🏭 Production Build

```bash
pnpm build
pnpm start
```

### 🔐 Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NASA_API_KEY` | Optional | `DEMO_KEY` | NASA DONKI API authentication |
| `NASA_DONKI_BASE_URL` | Optional | NASA DONKI endpoint | API endpoint override |

---

## 🎮 INTERACTIVE DEMO GUIDE

### **Explore ASTRO-SENTINEL in 60 Seconds!**

| Step | Action | What to Explore |
|---|---|---|
| 1️⃣ | Launch the application | Explore the mission-control cockpit and 3D astronaut. |
| 2️⃣ | Select an organ | Inspect Brain, Heart, and Spine readings. |
| 3️⃣ | Trigger a solar storm | Observe hazard indicators and emergency-state changes. |
| 4️⃣ | Test the Flight Surgeon | Select a symptom shortcut and inspect the three-step response. |
| 5️⃣ | Move the timeline | Explore the 180-day Mars transit simulation. |
| 6️⃣ | Switch crew profiles | Compare Elena, Tariq, and Kenji demo profiles. |
| 7️⃣ | Toggle Earth-Link | Explore black-box synchronization behaviour. |
| 8️⃣ | Test offline operation | Explore local triage without NASA connectivity. |

💡 **Judge Demo Tip:** Start with the 3D astronaut, trigger the solar-storm scenario, and then test the Edge-AI Flight Surgeon. This demonstrates the project's visualization, external data integration, and offline decision logic in a short sequence.

---

## 📋 NASA SPACE APPS CHALLENGE 2026 — REQUIREMENTS

| Requirement | ASTRO-SENTINEL Implementation |
|---|---|
| 🌍 Real NASA Data | NASA DONKI solar-flare and geomagnetic-storm integration. |
| 🧑‍🚀 Interactive Visualization | 3D astronaut digital twin with selectable organ nodes. |
| 🚀 Human-Spaceflight Relevance | EVA scenarios, radiation risks, HRP hazard mapping, and long-duration mission simulation. |
| 🖥️ Full-Stack Application | Next.js frontend and server-side NASA API route. |
| 📡 Offline Resilience | Local deterministic triage and fallback handling. |
| 🧩 Deployability | Standard Next.js deployment workflow. |
| 🛠️ Clean Architecture | Strict TypeScript and unified telemetry contract. |
| ♿ Accessibility | Keyboard navigation, screen-reader support, and reduced-motion handling. |

---

## ♿ ACCESSIBILITY

**Designed to make mission-critical information easier to navigate.**

- ⌨️ **Keyboard Navigation:** Tab through organ controls; use arrow keys to cycle and Enter/Space to select.
- 🔊 **Screen Readers:** Organ controls announce live readings through accessible status regions.
- 🎯 **Visible Focus:** Clear focus indicators for keyboard users.
- 📱 **Touch-Friendly Controls:** Interactive targets designed around a 44px-or-larger target size.
- 🌀 **Reduced Motion:** Respects `prefers-reduced-motion`.
- 💬 **Plain-English Interface:** Tooltips and clear labels help explain interface indicators.

---

## 🔍 LIVE VS. SIMULATED

### **Transparency Is Part of Good Engineering.**

| Component | Implementation Status |
|---|---|
| ☀️ NASA Space-Weather Alerts | **LIVE DATA** — NASA DONKI when the external service is reachable. |
| 🤖 Edge-AI Triage | **REAL LOCAL LOGIC** — deterministic rule-based evaluation. |
| 📦 Black-Box Logging | **LOCAL PERSISTENCE** — browser localStorage. |
| 📈 Crew Health Indicators | **SIMULATED** — deterministic demo values, not live astronaut wearable data. |
| 📡 DSN Uplink | **SIMULATED** — no operational ground-station connection. |
| 🎙️ Voice Interaction | **BROWSER-BASED** — Web Speech API where supported. |

⚠️ **Medical Disclaimer:** ASTRO-SENTINEL is an experimental hackathon prototype. Its simulated physiological data, rule-based triage, and countermeasure suggestions are not clinically validated and must not be used for real medical decisions.

---

## 🚀 DEPLOYMENT

### **Deploy ASTRO-SENTINEL with Vercel**

1. Visit [Vercel](https://vercel.com/).
2. Select **Add New → Project**.
3. Import the GitHub repository:

   `Fatimahnoman/Astro-Sentinel`

4. Allow Vercel to detect Next.js automatically.
5. Add `NASA_API_KEY` if using a personal NASA API key.
6. Click **Deploy**.

Your application will be built and deployed using the standard Next.js workflow.

---

## 📁 PROJECT STRUCTURE

```text
Astro-Sentinel/
│
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── api/
│   │       └── nasa/
│   │           └── route.ts
│   │
│   ├── components/
│   │   └── ...                 # Mission-control UI and 3D components
│   │
│   ├── hooks/
│   │   └── ...                 # Mission-control state management
│   │
│   ├── lib/
│   │   ├── edgeMedicalAI.ts    # Local triage and hazard logic
│   │   ├── storageSync.ts      # Black-box storage and DSN simulation
│   │   ├── mockTelemetry.ts    # Deterministic telemetry simulation
│   │   └── presentation.ts     # Organ and severity metadata
│   │
│   ├── services/
│   │   └── sentinelService.ts  # Central service boundary
│   │
│   └── types/
│       └── telemetry.ts        # Unified telemetry contract
│
└── README.md
```

---

## 🏆 WHY ASTRO-SENTINEL MATTERS

### **Beyond a Dashboard. Toward Intelligent Deep-Space Medical Support.**

ASTRO-SENTINEL brings together three important engineering concepts:

🧑‍🚀 **Human-Centred Visualization**

An interactive 3D digital twin makes astronaut health information easier to explore and understand.

☀️ **Real-World Space-Weather Integration**

NASA DONKI data connects environmental space-weather events with the mission's hazard-monitoring interface.

🤖 **Offline Edge Intelligence**

A local deterministic triage engine demonstrates how essential decision-support logic can remain available when network connectivity is unavailable.

📡 **Resilient Mission Architecture**

Local event persistence and simulated synchronization explore how onboard systems can handle communication interruptions.

> **"It isn't just a dashboard — it's a concept for medical decision support when Earth is out of reach."**

---

<div align="center">

## 🛰️ BUILT FOR THE NEXT FRONTIER

**ASTRO-SENTINEL**

*Designed for the distance between Earth and Mars.*

🚀 **NASA Space Apps Challenge 2026**

[![GitHub](https://img.shields.io/badge/GitHub-Explore%20Repository-181717?logo=github)](https://github.com/Fatimahnoman/Astro-Sentinel)

**Explore the cockpit. Trigger a scenario. Discover the future of space medicine.** 🌌

</div>
