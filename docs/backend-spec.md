# Astro-Sentinel — Backend Technical Specification

> Status: **Implemented and verified**  
> Scope: Backend only — shared contracts, NASA route, edge triage engine, black-box storage/DSN sync, and service wiring.  
> Explicit non-goal: **Do not modify or create anything under `src/components/`.**

---

## 1. Repository Inspection Findings

Inspected on branch `backend`:

| Path | Status |
| --- | --- |
| `src/types/telemetry.ts` | **Missing** |
| `src/services/sentinelService.ts` | **Missing** |
| `src/lib/` | **Missing** |
| `src/app/api/` | **Missing** |
| `src/` | **Missing** |
| `package.json` | Exists, but is **not** a Next.js setup (no `next`, `react`, `react-dom`, or TypeScript) |
| Lockfiles / `node_modules` | Exist |

The initial commit (`2124d27f`, "chore: initial nextjs 15 setup and team folder structure") contains only `package.json`, `pnpm-lock.yaml`, and committed `node_modules`. All backend source files must therefore be created from scratch.

### Required preflight (not a business feature, but blocking)

1. Add Next.js 15 + React 19 + TypeScript to `package.json`.
2. Add scripts: `dev`, `build`, `start`, `lint`, `typecheck`.
3. Add `tsconfig.json` with the `@/*` → `src/*` alias.
4. Add `next.config.ts` and `next-env.d.ts` (generated on first build).
5. Do **not** add or modify `src/components/`.

> **Status:** toolchain provisioned for build verification (`next`, `react`, `react-dom`, `typescript`, and type packages added). All preflight items are complete; no files under `src/components/` were touched.

---

## 2. Architecture Plan

```
Browser / Frontend
        │
        ▼
src/services/sentinelService.ts        ← Task 5 orchestration boundary
        │
        ├── fetch('/api/nasa')         → src/app/api/nasa/route.ts   (Task 2)
        │                                      │
        │                                      └── NASA DONKI (FLR + GST)
        │
        ├── evaluateEdgeTriage()       → src/lib/edgeMedicalAI.ts     (Task 3)
        ├── calculateLiveHazardsAndVitals()
        │
        └── saveLogToBlackBox()        → src/lib/storageSync.ts       (Task 4)
            syncLogsWithEarthDSN()           │
                                             └── localStorage queue
        ▲
        │
src/types/telemetry.ts                 ← Task 1 single source of truth
```

### Design principles

- **Deterministic edge AI**: no network calls, no Node-only APIs, safe to run client-side.
- **Resilient NASA route**: always HTTP 200; never throws to the client; falls back to the last successful DONKI payload or an empty cached payload.
- **SSR-safe storage**: every `localStorage` access is guarded by `typeof window !== 'undefined'` and `try/catch`.
- **No secrets in client code**: `NASA_API_KEY` is read only inside the route handler; fallback key is `DEMO_KEY`.
- **Pure contract module**: `telemetry.ts` imports nothing.
- **Strict TypeScript**: `strict: true`; no `any` in public APIs.

### Environment variables

```bash
NASA_API_KEY=your_key_here          # optional; defaults to DEMO_KEY
NASA_DONKI_BASE_URL=                # optional test override; defaults to https://api.nasa.gov/DONKI
```

---

## 3. Task 1 — Shared Contract (`src/types/telemetry.ts`)

Single source of truth shared by frontend, API route, edge AI, storage, and service. The six required public types are defined exactly as below, plus supporting types that those six reference.

```ts
// ---------------------------------------------------------------------------
// Core contract required by the frontend
// ---------------------------------------------------------------------------

export type OrganZone = 'brain' | 'heart' | 'spine';

export type ConnectivityMode = 'ONLINE' | 'OFFLINE_CACHED' | 'DSN_SYNC';

export interface AstronautVitals {
  heartRate: number;            // bpm
  systolicBP: number;           // mmHg
  diastolicBP: number;          // mmHg
  oxygenSaturation: number;     // % SpO2
  bodyTemperature: number;      // °C
  respiratoryRate: number;      // breaths/min
  radiationExposure: number;    // cumulative mSv
  boneDensity: number;          // % of pre-mission baseline
  cognitivePerformance: number; // 0–100
  updatedAt: string;            // ISO-8601 timestamp
}

export type HazardLevel = 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface NasaHazardStatus {
  // NASA HRP 5 Hazards, each scored 0–100
  radiation: number;
  isolationConfinement: number;
  distanceFromEarth: number;
  gravityFields: number;
  hostileEnvironment: number;
  overall: HazardLevel;
  updatedAt: string; // ISO-8601 timestamp
}

export type TriageSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface TriageProtocol {
  id: string;
  zone: OrganZone;
  condition: string;
  severity: TriageSeverity;
  recommendation: string;
  steps: string[];
  confidence: number;        // 0–1
  solarStormActive: boolean;
  createdAt: string;         // ISO-8601 timestamp
}

export type SpaceWeatherEventType = 'SOLAR_FLARE' | 'GEOMAGNETIC_STORM';
export type SpaceWeatherSeverity =
  | 'LOW'
  | 'MODERATE'
  | 'HIGH'
  | 'SEVERE'
  | 'EXTREME';
export type AlertSource = 'NASA_DONKI' | 'OFFLINE_CACHED';

export interface SpaceWeatherAlert {
  id: string;
  eventType: SpaceWeatherEventType;
  severity: SpaceWeatherSeverity;
  classType?: string;    // FLR only, e.g. "M5.2"
  kpIndex?: number;      // GST only, max Kp
  startTime: string;
  peakTime?: string;
  endTime?: string;
  sourceLocation?: string;
  summary: string;
  source: AlertSource;
}

// ---------------------------------------------------------------------------
// Supporting contracts
// ---------------------------------------------------------------------------

export interface SpaceWeatherResponse {
  alerts: SpaceWeatherAlert[];
  source: AlertSource;
  connectivity: ConnectivityMode;
  fetchedAt: string;
  cached: boolean;
}

export interface TelemetrySnapshot {
  missionDay: number;
  vitals: AstronautVitals;
  hazards: NasaHazardStatus;
  alerts: SpaceWeatherAlert[];
  connectivity: ConnectivityMode;
  solarStormActive: boolean;
  timestamp: string;
}

export type BlackBoxLogType =
  | 'TELEMETRY'
  | 'TRIAGE'
  | 'ALERT'
  | 'SYSTEM'
  | 'SYNC';

export interface BlackBoxLog {
  id: string;
  type: BlackBoxLogType;
  timestamp: string;
  payload: unknown;
  synced: boolean;
}

export type DsnSyncStatus = 'SYNCED' | 'QUEUED' | 'OFFLINE' | 'ERROR';

export interface DsnSyncResult {
  status: DsnSyncStatus;
  mode: ConnectivityMode;
  syncedCount: number;
  pendingCount: number;
  timestamp: string;
  message: string;
}
```

### Acceptance criteria

- File compiles under `strict` mode.
- Imports nothing.
- All six required types are exported with the exact names above.
- Optional fields use `?`, never `| undefined` in a way that changes emitted JSON shape unnecessarily.
- Contract is documented as canonical; any frontend mismatch must be raised before implementation.

---

## 4. Task 2 — Live NASA DONKI Route (`src/app/api/nasa/route.ts`)

### Route behavior

- Next.js App Router route handler: `export async function GET()`.
- `export const dynamic = 'force-dynamic'; export const revalidate = 0;`
- Fetch both DONKI endpoints over a rolling **30-day window**:
  - `GET {BASE}/FLR?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key={KEY}`
  - `GET {BASE}/GST?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&api_key={KEY}`
- `BASE` defaults to `https://api.nasa.gov/DONKI` and may be overridden by `NASA_DONKI_BASE_URL` for testing.
- API key defaults to `DEMO_KEY`.

### Timeout and resilience

- Each request uses `AbortController` with a hard **5,000 ms** timeout.
- Fetch both in parallel via `Promise.allSettled` so one endpoint failing does not discard the other.
- If **both** fail (offline, timeout, non-2xx, rate limit, malformed JSON) or the combined result is unusable:
  - Return HTTP **200** with the last module-level successful alert cache.
  - Set `source: 'OFFLINE_CACHED'`, `connectivity: 'OFFLINE_CACHED'`, `cached: true`.
  - If no cache exists, return `alerts: []` with the same offline metadata.
- On success:
  - Cache alerts in module scope with a timestamp.
  - Set `source: 'NASA_DONKI'`, `connectivity: 'ONLINE'`, `cached: false`.
- Always set `Cache-Control: no-store`.
- Never expose the API key or raw upstream error payloads to the client.

### Mapping rules

**Solar Flares (`FLR`) → `SpaceWeatherAlert`**

| Field | Mapping |
| --- | --- |
| `id` | `flr-${flrID}` |
| `eventType` | `'SOLAR_FLARE'` |
| `classType` | DONKI `classType` |
| `severity` | First letter: `X` → EXTREME, `M` → SEVERE, `C` → HIGH, `B` → MODERATE, `A`/other → LOW |
| `startTime` | `beginTime` |
| `peakTime` | `peakTime` |
| `endTime` | `endTime` |
| `sourceLocation` | `sourceLocation` |
| `summary` | `${classType} solar flare${sourceLocation ? ` from ${sourceLocation}` : ''}` |
| `source` | `'NASA_DONKI'` |

**Geomagnetic Storms (`GST`) → `SpaceWeatherAlert`**

| Field | Mapping |
| --- | --- |
| `id` | `gst-${gstID}` |
| `eventType` | `'GEOMAGNETIC_STORM'` |
| `kpIndex` | Maximum value of `allKpIndex[].kpIndex` (default `0` if absent) |
| `severity` | Kp ≥ 8 → EXTREME, 7 → SEVERE, 6 → HIGH, 5 → MODERATE, < 5 → LOW |
| `startTime` | `beginTime` |
| `endTime` | `endTime` |
| `summary` | `Geomagnetic storm peaking at Kp ${kpIndex}` |
| `source` | `'NASA_DONKI'` |

### Acceptance criteria

- `GET /api/nasa` returns `SpaceWeatherResponse` with HTTP 200 in online, offline, timeout, and rate-limit scenarios.
- Offline fallback shape is valid and uses `source: 'OFFLINE_CACHED'`.
- No unhandled promise rejection; route never returns HTTP 500 for upstream failure.
- Upstream requests time out at 5 seconds or sooner.
- `npx tsc --noEmit` passes.

---

## 5. Task 3 — Offline Edge Medical AI (`src/lib/edgeMedicalAI.ts`)

Pure, deterministic, network-free module. Exports exactly:

```ts
export function evaluateEdgeTriage(
  query: string,
  vitals: AstronautVitals,
  solarStormActive: boolean
): TriageProtocol;

export function calculateLiveHazardsAndVitals(
  baseVitals: AstronautVitals,
  missionDay: number,
  solarStormActive: boolean
): { vitals: AstronautVitals; hazards: NasaHazardStatus };
```

### 5.1 `evaluateEdgeTriage` rules

Thresholds:

```ts
const TACHYCARDIA_BPM = 115;
const RADIATION_MSV = 150;
const BONE_DENSITY_PCT = 92;
const DIZZINESS_TERMS = [
  'dizzy', 'dizziness', 'vertigo', 'lightheaded', 'light-headed',
  'unsteady', 'eva dizziness',
];
```

Evaluation produces one or more candidate protocols:

1. **Spine / radiation & bone**
   - Trigger: `radiationExposure > 150` **or** `boneDensity < 92` **or** (`solarStormActive` **and** `radiationExposure > 100`).
   - Severity: `CRITICAL` if `radiationExposure > 250` or `boneDensity < 80`; `HIGH` if `radiationExposure > 150` or `boneDensity < 92`; otherwise `MODERATE`.
   - Condition: `Radiation / skeletal risk during solar activity` or `Bone density loss`.
   - Steps: limit EVA, move to radiation shelter, ingest calcium/hydration protocol, notify flight surgeon, schedule DXA scan.

2. **Heart / tachycardia**
   - Trigger: `heartRate > 115`.
   - Severity: `CRITICAL` if `heartRate > 140`; `HIGH` if `> 125`; otherwise `MODERATE`.
   - Condition: `Tachycardia detected`.
   - Steps: stop activity, 5-minute seated rest, re-measure rate/BP/SpO2, ECG if available, notify flight surgeon.

3. **Brain / EVA dizziness**
   - Trigger: normalized query contains any `DIZZINESS_TERMS`.
   - Severity: `HIGH` if `oxygenSaturation < 92` or `systolicBP < 90`; otherwise `MODERATE`.
   - Condition: `EVA-associated dizziness / vestibular disturbance`.
   - Steps: halt EVA, secure tethers, perform orthostatic check, verify CO2/SpO2, cognitive check, guided return.

**Selection:** choose the highest severity; tie-break order is **heart → brain → spine** (cardiac events considered most time-critical). If no rule matches, return a `LOW` severity `brain` protocol titled `No acute organ-specific distress detected` with standard monitoring steps. Always return a valid `TriageProtocol` (never `null`).

Each result receives a generated `id` (UUID with non-crypto fallback), `solarStormActive`, and `createdAt` ISO timestamp.

### 5.2 `calculateLiveHazardsAndVitals` formulas

Constants (documented as approximations inspired by NASA HRP and CSA radiation guidance, not clinical tools):

```ts
const BASE_DOSE_RATE_MSV_PER_DAY = 0.3;
const STORM_DOSE_RATE_MSV_PER_DAY = 1.2;
const BONE_LOSS_PCT_PER_DAY = 0.05;       // ≈1.5% per 30 days
const STORM_BONE_PENALTY_PCT = 0.5;
const CAREER_RADIATION_LIMIT_MSV = 600;
```

Clamp helpers keep all output within physiologically plausible ranges.

| Output | Formula |
| --- | --- |
| `radiationExposure` | `base + (solarStormActive ? 1.2 : 0.3) * missionDay`, rounded to 1 decimal |
| `boneDensity` | `clamp(base - 0.05 * missionDay - (solarStormActive ? 0.5 : 0), 60, 120)`, rounded to 1 decimal |
| `heartRate` | `clamp(round(base + 0.15 * missionDay + (solarStormActive ? 12 : 0)), 40, 200)` |
| `systolicBP` | `clamp(round(base - 0.03 * missionDay + (solarStormActive ? 6 : 0)), 70, 200)` |
| `diastolicBP` | `clamp(round(base - 0.02 * missionDay + (solarStormActive ? 4 : 0)), 40, 130)` |
| `oxygenSaturation` | `clamp(base - 0.01 * missionDay - (solarStormActive ? 0.5 : 0), 80, 100)`, 1 decimal |
| `bodyTemperature` | `clamp(base + 0.005 * missionDay + (solarStormActive ? 0.2 : 0), 34, 42)`, 1 decimal |
| `respiratoryRate` | `clamp(round(base + 0.05 * missionDay + (solarStormActive ? 2 : 0)), 8, 40)` |
| `cognitivePerformance` | `clamp(base - 0.15 * missionDay - (solarStormActive ? 8 : 0), 0, 100)`, 1 decimal |
| `updatedAt` | `new Date().toISOString()` |

NASA HRP 5 Hazard scores (0–100):

| Hazard | Formula |
| --- | --- |
| `radiation` | `clamp(round((radiationExposure / 600) * 100), 0, 100)` |
| `isolationConfinement` | `clamp(round(missionDay * 0.35), 0, 100)` |
| `distanceFromEarth` | `clamp(round((missionDay / 365) * 100), 0, 100)` |
| `gravityFields` | `clamp(round(missionDay * 0.45), 0, 100)` |
| `hostileEnvironment` | `clamp(round(20 + missionDay * 0.15 + (solarStormActive ? 40 : 0)), 0, 100)` |
| `overall` | max score: ≥ 80 → CRITICAL, ≥ 60 → HIGH, ≥ 40 → ELEVATED, else LOW |
| `updatedAt` | `new Date().toISOString()` |

### Acceptance criteria

- Dizziness query returns `zone: 'brain'`.
- `heartRate: 130` returns `zone: 'heart'`.
- `radiationExposure: 200` or `boneDensity: 85` returns `zone: 'spine'`.
- Solar-storm radiation scenario also returns `zone: 'spine'`.
- No network or DOM access; safe in Node, browser, and edge runtime.
- Hazard scores always within 0–100; vitals always within clamps.
- Functions are deterministic except for timestamps/IDs.

---

## 6. Task 4 — Black-Box Storage & DSN Sync (`src/lib/storageSync.ts`)

Client-side, SSR-safe module. Storage key:

```ts
const STORAGE_KEY = 'astro_sentinel_blackbox_logs';
const MAX_LOGS = 500;
```

### Exports

```ts
export function saveLogToBlackBox(
  entry: Omit<BlackBoxLog, 'id' | 'timestamp' | 'synced'>
): BlackBoxLog | null;

export function getBlackBoxLogs(): BlackBoxLog[];

export async function syncLogsWithEarthDSN(
  mode: ConnectivityMode
): Promise<DsnSyncResult>;
```

### Storage behavior

- `saveLogToBlackBox` creates `id`, `timestamp`, `synced: false`, appends the entry, and returns the saved record.
- `getBlackBoxLogs` returns a defensive copy.
- Queue is capped at 500 entries; oldest entries are pruned first.
- All reads/writes are wrapped in `try/catch`:
  - Corrupt JSON → reset to `[]`.
  - Quota exceeded → trim oldest half and retry once; return `null` only if the retry also fails.
- If `window`/`localStorage` is unavailable (SSR), reads return `[]` and writes return `null` without throwing.
- IDs use `crypto.randomUUID()` when available, otherwise a timestamp + random string fallback.

### DSN sync behavior

`syncLogsWithEarthDSN(mode)`:

| Mode | Behavior |
| --- | --- |
| `OFFLINE_CACHED` | No transmission. Return `status: 'OFFLINE'`, `syncedCount: 0`, `pendingCount = unsynced logs`. |
| `ONLINE` | Simulate DSN uplink latency (~600 ms), mark all queued logs `synced: true`. Return `status: 'SYNCED'`. |
| `DSN_SYNC` | Simulate deep-space relay latency (~1,200 ms), mark all queued logs `synced: true`. Return `status: 'SYNCED'`. |
| SSR / no storage | Return `status: 'QUEUED'` with zeroed counts and a message that the black box is unavailable. |
| Unexpected exception | Return `status: 'ERROR'`; never throw. |

- Synced logs are retained for audit and pruned by the 500-entry cap.
- `pendingCount` is always computed from logs with `synced === false`.
- No external Network request is made in this task; the DSN uplink is a local store-and-forward acknowledgement. A future `/api/dsn` endpoint can replace the simulated wait without changing the public API.

### Acceptance criteria

- SSR import and function calls do not throw.
- Logs survive a simulated reload (same `localStorage` key).
- `OFFLINE_CACHED` leaves logs pending; `ONLINE`/`DSN_SYNC` mark them synced.
- Corrupt storage data is recovered gracefully.
- Queue never exceeds 500 entries.

---

## 7. Task 5 — Service Adapter Wiring (`src/services/sentinelService.ts`)

This is the only module the frontend should call. It hides NASA, edge AI, and storage details.

### Required export

```ts
export const USE_MOCK_DATA = false;
```

### Public functions

```ts
export async function fetchTelemetrySnapshot(
  missionDay?: number
): Promise<TelemetrySnapshot>;

export async function executeFlightSurgeonTriage(
  query: string,
  vitals: AstronautVitals,
  solarStormActive: boolean
): Promise<TriageProtocol>;

export async function syncBlackBoxLogs(
  mode: ConnectivityMode
): Promise<DsnSyncResult>;
```

### `fetchTelemetrySnapshot(missionDay = 1)`

1. Call `/api/nasa` with `cache: 'no-store'` and a 6-second `AbortController` safety timeout.
2. Parse `SpaceWeatherResponse`.
3. Compute `solarStormActive`:
   - any `GEOMAGNETIC_STORM` with `kpIndex >= 5`, or
   - any alert with severity `HIGH`, `SEVERE`, or `EXTREME`.
4. Call `calculateLiveHazardsAndVitals(BASE_VITALS, missionDay, solarStormActive)`.
5. Persist a `TELEMETRY` entry in the black box.
6. Return a complete `TelemetrySnapshot`.
7. On fetch/parse failure: return an offline snapshot using `BASE_VITALS`, `solarStormActive: false`, `connectivity: 'OFFLINE_CACHED'`, `alerts: []`, and log a `SYSTEM` entry. Never throw.

`BASE_VITALS` is a documented healthy-astronaut seed (heart rate 72, BP 120/80, SpO2 98, temperature 36.8, respiratory rate 16, radiation 5 mSv, bone density 100%, cognition 95).

When `USE_MOCK_DATA === true`, return a deterministic mock snapshot instead of calling the route; when `false`, use the live path above.

### `executeFlightSurgeonTriage(...)`

- Delegates to `evaluateEdgeTriage(query, vitals, solarStormActive)`.
- Saves a `TRIAGE` log containing query, selected zone, severity, and protocol id.
- Returns the protocol. Logging failures must not affect the return value.

### `syncBlackBoxLogs(mode)`

- Delegates to `syncLogsWithEarthDSN(mode)`.
- On success, saves a `SYNC` log with counts/status.
- Returns the `DsnSyncResult`; never throws.

### Acceptance criteria

- `USE_MOCK_DATA` is exactly `false`.
- No direct NASA, storage, or triage logic remains in service functions beyond orchestration.
- All three functions return valid contract objects and never reject.
- Service module can be imported in a client component without Node-only dependencies.

---

## 8. Ordered Task Checklist

| # | Task | Files | Depends on | Acceptance | Est. | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | **Preflight toolchain** — add Next 15/React 19/TS, scripts, `tsconfig.json` alias, `next.config.ts` | `package.json`, `tsconfig.json`, `next.config.ts` | — | Toolchain installed; `npx tsc --noEmit` passes | S | Complete |
| 1 | **Shared contract** — define all types listed in §3 | `src/types/telemetry.ts` | 0 | Compiles; six required exports present | S | Complete |
| 2 | **NASA DONKI route** — parallel FLR/GST fetch, 5s timeout, mapping, 200 fallback | `src/app/api/nasa/route.ts` | 1 | Online + offline smoke tests return valid `SpaceWeatherResponse` | M | Complete |
| 3 | **Edge medical AI** — `evaluateEdgeTriage`, `calculateLiveHazardsAndVitals` | `src/lib/edgeMedicalAI.ts` | 1 | Brain/heart/spine rule tests pass; hazard/vital clamps verified | M | Complete |
| 4 | **Black-box storage & DSN** — SSR-safe queue and sync | `src/lib/storageSync.ts` | 1 | SSR-safe; online/offline/sync behavior verified | M | Complete |
| 5 | **Service wiring** — `USE_MOCK_DATA = false`, orchestrate Tasks 2–4 | `src/services/sentinelService.ts` | 1–4 | Three public functions return valid contracts; no throws | M | Complete |
| 6 | **Verification** — typecheck, build, route smoke test, rule checks | — | 0–5 | `npx tsc --noEmit`, `npm run build`, route returns 200 | S | Complete |

All checklist items are complete.

### Implementation order

1. Preflight toolchain
2. Task 1 — shared contract
3. Task 2 — NASA route
4. Task 3 — edge AI
5. Task 4 — storage/DSN
6. Task 5 — service wiring
7. Verification

Tasks 2–5 are independent after Task 1 and may be implemented in parallel, but verification follows Task 5.

---

## 9. Verification Plan

### Static

```powershell
npx tsc --noEmit
npm run build
```

### Route smoke test

```powershell
npm run dev
Invoke-WebRequest http://localhost:3000/api/nasa | Select-Object -ExpandProperty Content
```

Expected: HTTP 200 with `alerts`, `source`, `connectivity`, `fetchedAt`, `cached`.

### Offline test

Set `NASA_DONKI_BASE_URL` to an unreachable host, restart dev server, request `/api/nasa`.

Expected: HTTP 200, `source: "OFFLINE_CACHED"`, `connectivity: "OFFLINE_CACHED"`, `cached: true`, no 500.

### Pure-function checks

- Dizziness query → `zone: 'brain'`.
- `heartRate: 130` → `zone: 'heart'`.
- `radiationExposure: 200` → `zone: 'spine'`.
- `boneDensity: 85` → `zone: 'spine'`.
- `calculateLiveHazardsAndVitals` with `missionDay: 180`, storm on → all hazard scores 0–100, vitals in clamps.

### Storage checks (browser console)

- Save a log, reload, confirm `getBlackBoxLogs()` returns it.
- `syncLogsWithEarthDSN('OFFLINE_CACHED')` keeps it pending.
- `syncLogsWithEarthDSN('ONLINE')` marks it synced and returns `status: 'SYNCED'`.
- Import module in SSR context → no throw, empty queue.

### Verification completed (implementation)

The five backend files were typechecked and production-built with the project toolchain (Next.js 15.5.29, TypeScript 5.7.3), then runtime-tested by compiling the pure modules to a temp directory.

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` across the project | PASS |
| `npm run build` (Next.js production build) | PASS |
| EVA dizziness → brain | PASS |
| Tachycardia 130 bpm → heart / HIGH | PASS |
| Radiation 200 mSv → spine | PASS |
| Bone density 85% → spine | PASS |
| Solar storm → spine | PASS |
| No-match → LOW brain protocol | PASS |
| Tie-break prefers heart at CRITICAL | PASS |
| HRP 5 hazard scores within 0–100 | PASS |
| Vitals within physiological clamps | PASS |
| DONKI FLR/GST mapping (severity, Kp, times) | PASS |
| Offline fallback preserves cached alerts | PASS |
| HTTP 429 fallback returns 200 / `OFFLINE_CACHED` | PASS |
| 5-second timeout fallback | PASS |
| SSR storage returns empty queue without throwing | PASS |
| SSR sync returns `QUEUED` | PASS |
| Save → offline pending → online synced | PASS |
| Corrupt storage recovers to empty queue | PASS |

`npx tsc --noEmit` and `npm run build` both complete with zero TypeScript or build errors.

---

## 10. Assumptions & Risks

1. **No frontend source is present**, so the type shapes in §3 are the proposed canonical contract. If the frontend already defines these differently, reconcile before coding.
2. **Next.js 15 toolchain is now provisioned**; Task 0 is complete and both typecheck and production build pass.
3. **DONKI availability and `DEMO_KEY` rate limits** are outside our control; the 200 fallback path is the mitigation.
4. **CSA/NASA formulas are approximations** for a hackathon simulation, not clinical or mission-certified guidance. They are documented as such in code comments only where necessary (no comments added unless requested).
5. **DSN sync is simulated locally** because no `/api/dsn` endpoint is in scope. Public API remains compatible if one is added later.
6. **`AstronautVitals.updatedAt` and all `createdAt`/timestamp fields** use `new Date().toISOString()`; tests must not require exact values.

---

## 11. Out of Scope

- Any file under `src/components/`.
- Frontend pages, styling, 3D scene, charts, or UI state.
- Authentication/authorization.
- A real DSN ground-station endpoint.
- Database persistence; the black box is browser `localStorage` only.
- Automated test framework setup beyond ad-hoc verification commands.

---

## Approval Requested

Please approve or amend the following before implementation:

- Canonical type shapes in §3 (especially `AstronautVitals` fields and `NasaHazardStatus` naming).
- The `OFFLINE_CACHED` fallback returning an empty array when no cache exists.
- The deterministic rule priority `heart → brain → spine`.
- The local/simulated DSN sync (no `/api/dsn` route).
- Adding the Next.js/TypeScript preflight (Task 0) to `package.json` and config files.
