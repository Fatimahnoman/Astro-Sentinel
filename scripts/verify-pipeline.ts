/**
 * ASTRO-SENTINEL — pipeline smoke test (no test framework, no browser).
 *
 *   pnpm verify            # runs: tsx scripts/verify-pipeline.ts
 *
 * Exercises the REAL modules: /api/nasa route handler, edgeMedicalAI,
 * storageSync and sentinelService, with fetch + localStorage shimmed.
 *
 * Levels:  MUST   = spec requirement. Any failure => exit code 1.
 *          SHOULD = correctness/demo-risk issue. Printed as WARN, exit code 0.
 */
import { GET } from '../src/app/api/nasa/route';
import {
  calculateLiveHazardsAndVitals,
  evaluateEdgeTriage,
} from '../src/lib/edgeMedicalAI';
import { getMockCrewProfiles } from '../src/lib/mockTelemetry';
import {
  getBlackBoxLogs,
  saveLogToBlackBox,
  syncLogsWithEarthDSN,
} from '../src/lib/storageSync';
import {
  fetchTelemetrySnapshot,
  syncBlackBoxLogs,
} from '../src/services/sentinelService';
import type {
  AstronautVitals,
  BlackBoxLog,
  SpaceWeatherAlert,
  SpaceWeatherResponse,
  TriageProtocol,
} from '../src/types/telemetry';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* ----------------------------- tiny runner ----------------------------- */
type Level = 'MUST' | 'SHOULD';
const results: { section: string; name: string; level: Level; ok: boolean; note?: string }[] = [];
let section = '';
let pendingNotes: string[] = [];
const note = (s: string) => void pendingNotes.push(s);
const flush = () => { pendingNotes.forEach((n) => console.log(`      ↳ ${n}`)); pendingNotes = []; };

async function check(name: string, level: Level, fn: () => void | Promise<void>) {
  try {
    await fn();
    results.push({ section, name, level, ok: true });
    console.log(`  PASS  [${level}] ${name}`);
    flush();
  } catch (e) {
    const msg = e instanceof Error ? e.message.split('\n')[0] : String(e);
    results.push({ section, name, level, ok: false, note: msg });
    console.log(`  ${level === 'MUST' ? 'FAIL' : 'WARN'}  [${level}] ${name}\n      ↳ ${msg}`);
    flush();
  }
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
function head(title: string) {
  section = title;
  console.log(`\n== ${title} ==`);
}

/* ------------------------------- shims -------------------------------- */
class MemStorage {
  private m = new Map<string, string>();
  failNextSet = false;
  failAllSets = false;
  getItem = (k: string) => (this.m.has(k) ? (this.m.get(k) as string) : null);
  removeItem = (k: string) => void this.m.delete(k);
  clear = () => this.m.clear();
  setItem = (k: string, v: string) => {
    if (this.failAllSets) throw new DOMException('quota', 'QuotaExceededError');
    if (this.failNextSet) {
      this.failNextSet = false;
      throw new DOMException('quota', 'QuotaExceededError');
    }
    this.m.set(k, v);
  };
}
const ls = new MemStorage();
const g = globalThis as unknown as Record<string, unknown>;
g.window = { localStorage: ls };

type Donki = (url: string, init?: RequestInit) => Promise<Response>;
let donki: Donki = async () => new Response('[]');
let clientOffline = false; // true = the browser itself has no network (fetch('/api/nasa') rejects)
g.fetch = async (input: unknown, init?: RequestInit) => {
  const url = String(input);
  if (url.startsWith('/api/nasa')) {
    if (clientOffline) throw new TypeError('Failed to fetch');
    return GET();
  }
  return donki(url, init);
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const nowIso = () => new Date().toISOString();

/* ------------------------------ helpers ------------------------------- */
const crews = getMockCrewProfiles();
const DAYS = Array.from({ length: 180 }, (_, i) => i + 1);
const state = (crew: AstronautVitals, day: number, storm: boolean) =>
  calculateLiveHazardsAndVitals(crew, day, storm);
const strip = (p: TriageProtocol) => JSON.stringify({ ...p, timestamp: '' });

function validAlert(a: SpaceWeatherAlert): boolean {
  return (
    typeof a.id === 'string' && typeof a.eventType === 'string' &&
    typeof a.flareClass === 'string' && Number.isFinite(a.kpIndex) &&
    Number.isFinite(a.radiationImpactmSv) && !Number.isNaN(Date.parse(a.timestamp))
  );
}
function validNasaBody(b: SpaceWeatherResponse) {
  assert(Array.isArray(b.alerts) && b.alerts.every(validAlert), 'alerts[] failed schema');
  assert(b.source === 'NASA_DONKI' || b.source === 'OFFLINE_CACHED', `bad source ${b.source}`);
  assert(b.connectivity === 'EARTH_DSN_SYNC' || b.connectivity === 'OFFLINE_EDGE', 'bad connectivity');
  assert(typeof b.cached === 'boolean' && !Number.isNaN(Date.parse(b.fetchedAt)), 'bad cached/fetchedAt');
}

/* ============================== A. /api/nasa ============================ */
async function sectionA() {
  head('A. /api/nasa — schema + offline fallback');
  const call = async () => {
    const res = await GET();
    return { status: res.status, body: (await res.json()) as SpaceWeatherResponse };
  };

  // Cold start FIRST (module cache empty).
  donki = async () => json({ error: 'OVER_RATE_LIMIT' }, 429);
  await check('429 rate-limit (cold start) -> HTTP 200 + valid schema', 'MUST', async () => {
    const { status, body } = await call();
    assert(status === 200, `status ${status}`);
    validNasaBody(body);
    assert(body.source === 'OFFLINE_CACHED' && body.cached, 'not flagged OFFLINE_CACHED');
  });
  await check('cold-start fallback carries usable mock telemetry (non-empty alerts[])', 'SHOULD', async () => {
    const { body } = await call();
    assert(body.alerts.length > 0, 'alerts[] is empty on cold start — spec asks for structured mock solar/radiation telemetry');
  });

  donki = async () => { throw new TypeError('fetch failed'); };
  await check('network failure (fetch throws) -> HTTP 200', 'MUST', async () => {
    const { status, body } = await call();
    assert(status === 200, `status ${status}`);
    validNasaBody(body);
  });

  donki = async () => new Response('<html>502</html>', { status: 200 });
  await check('200 with non-JSON body -> HTTP 200', 'MUST', async () => {
    const { status, body } = await call();
    assert(status === 200, `status ${status}`);
    validNasaBody(body);
  });

  donki = (_u, init) =>
    new Promise((_, reject) =>
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
    );
  await check('hung upstream aborts within ~5s timeout -> HTTP 200', 'MUST', async () => {
    const t0 = Date.now();
    const { status, body } = await call();
    const dt = Date.now() - t0;
    note(`resolved in ${dt} ms`);
    assert(status === 200, `status ${status}`);
    assert(dt < 6500, `took ${dt} ms`);
    validNasaBody(body);
  });

  const day = nowIso();
  donki = async (url) =>
    url.includes('/FLR')
      ? json([{ flrID: 'F-1', classType: 'M5.2', beginTime: day }])
      : json([{ gstID: 'G-1', beginTime: day, allKpIndex: [{ kpIndex: 4 }, { kpIndex: 6 }] }]);
  await check('healthy DONKI -> NASA_DONKI, flare + storm mapped', 'MUST', async () => {
    const { status, body } = await call();
    assert(status === 200, `status ${status}`);
    validNasaBody(body);
    assert(body.source === 'NASA_DONKI' && !body.cached, 'wrong source');
    assert(body.alerts.length === 2, `expected 2 alerts, got ${body.alerts.length}`);
    assert(body.alerts.some((a) => a.kpIndex === 6), 'max Kp not extracted');
  });

  donki = async () => { throw new TypeError('fetch failed'); };
  await check('after a good fetch, outage serves last-known alerts (warm cache)', 'MUST', async () => {
    const { body } = await call();
    assert(body.source === 'OFFLINE_CACHED' && body.alerts.length === 2, `got ${body.alerts.length} alerts`);
  });

  donki = async (url) => (url.includes('/FLR') ? json([{ flrID: 'F-2', classType: 'C1.1', beginTime: day }]) : json({}, 429));
  await check('partial failure (FLR ok, GST 429) -> HTTP 200 with FLR data', 'MUST', async () => {
    const { status, body } = await call();
    assert(status === 200 && body.alerts.some((a) => a.id === 'flr-F-2'), 'flare missing');
  });

  await check('every flare is labelled "SOLAR PARTICLE EVENT" (X-ray flare ≠ SPE)', 'SHOULD', async () => {
    const { body } = await call();
    const flare = body.alerts.find((a) => a.id.startsWith('flr-'));
    assert(flare && !/SOLAR PARTICLE/i.test(flare.eventType), `eventType="${flare?.eventType}" — a C1.1 flare is labelled a particle event`);
  });
}

/* ========================= B. edgeMedicalAI rules ======================= */
async function sectionB() {
  head('B. edgeMedicalAI — Nominal / 180-day transit / Solar-storm emergency');

  await check('NOMINAL: day 1, no storm, all crew -> NOMINAL + 3 steps', 'MUST', () => {
    for (const c of crews) {
      const { vitals } = state(c, 1, false);
      const p = evaluateEdgeTriage('routine status check', vitals, false);
      assert(p.severity === 'NOMINAL', `${c.crewId}: ${p.severity}`);
      assert(p.steps.length === 3 && p.steps.every(Boolean), 'steps != 3');
    }
  });

  await check('180-day transit dose is physically plausible (200–450 mSv; commonly cited ≈1.5–1.8 mSv/day in transit)', 'MUST', () => {
    for (const c of crews) {
      const { vitals } = state(c, 180, false);
      note(`${c.crewId} day-180 dose ${vitals.cumulativeRadiation} mSv, bone ${vitals.boneDensity}%, HR ${vitals.heartRate}`);
      assert(vitals.cumulativeRadiation > 200 && vitals.cumulativeRadiation < 450, `${vitals.cumulativeRadiation} mSv`);
    }
  });

  await check('180-day transit escalates triage to ≥ WARNING for every crew member', 'MUST', () => {
    for (const c of crews) {
      const { vitals } = state(c, 180, false);
      const p = evaluateEdgeTriage('routine status check', vitals, false);
      assert(p.severity !== 'NOMINAL', `${c.crewId} still NOMINAL at day 180`);
    }
  });

  await check('hazard scores stay in [0,100] and never decrease with mission day', 'MUST', () => {
    for (const c of crews) {
      let prev: Record<string, number> | null = null;
      for (const d of DAYS) {
        const h = state(c, d, false).hazards as unknown as Record<string, number>;
        for (const [k, v] of Object.entries(h)) {
          assert(v >= 0 && v <= 100, `${c.crewId} d${d} ${k}=${v}`);
          if (prev) assert(v >= prev[k], `${c.crewId} d${d} ${k} decreased`);
        }
        prev = h;
      }
    }
  });

  await check('SOLAR STORM at day 180 -> CRITICAL, organ set, shelter-first protocol', 'MUST', () => {
    for (const c of crews) {
      const { vitals } = state(c, 180, true);
      const p = evaluateEdgeTriage('Solar flare exposure', vitals, true);
      assert(p.severity === 'CRITICAL', `${c.crewId}: ${p.severity}`);
      assert(p.affectedOrgan !== null && p.steps.length === 3, 'organ/steps');
      assert(/shelter|cellar/i.test(p.steps[0]), `step 1 is "${p.steps[0]}"`);
    }
  });

  await check('storm adds a bounded dose (≤ 250 mSv NASA SPE limit), not a retroactive multiplier', 'MUST', () => {
    for (const c of crews) {
      const delta = state(c, 180, true).vitals.cumulativeRadiation - state(c, 180, false).vitals.cumulativeRadiation;
      note(`${c.crewId}: storm toggle at day 180 adds ${delta.toFixed(0)} mSv`);
      assert(delta <= 250, `${c.crewId}: +${delta.toFixed(0)} mSv from one storm toggle`);
    }
  });

  await check('radiation hazard is scaled to a real limit (300 mSv = 50% of 600 mSv career ⇒ score < 100)', 'SHOULD', () => {
    const { hazards } = state({ ...crews[0], cumulativeRadiation: 300 }, 0, false);
    assert(hazards.radiation < 100, `score=${hazards.radiation} — scale divides by 250 (the per-SPE limit), not the 600 mSv career limit`);
  });

  await check('radiation meter does not saturate before day 180 (slider keeps resolution)', 'SHOULD', () => {
    const bad: string[] = [];
    for (const c of crews) {
      const sat = DAYS.find((d) => state(c, d, false).hazards.radiation >= 100);
      note(`${c.crewId} radiation meter pegs at 100 on day ${sat ?? 'never'}`);
      if (sat && sat < 180) bad.push(`${c.crewId}@d${sat}`);
    }
    assert(bad.length === 0, `saturates early: ${bad.join(', ')}`);
  });

  await check('all three triage branches (heart/brain/spine) are reachable from UI inputs', 'SHOULD', () => {
    const seen = new Map<string, number>();
    const queries = ['routine status check', 'Dizzy after spacewalk', 'my heart is racing', 'chest pain'];
    let maxHr = 0;
    for (const c of crews) for (const d of DAYS) for (const storm of [false, true]) {
      const { vitals } = state(c, d, storm);
      maxHr = Math.max(maxHr, vitals.heartRate);
      for (const q of queries) {
        const p = evaluateEdgeTriage(q, vitals, storm);
        const key = `${p.affectedOrgan}/${p.severity}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
    }
    note(`outcomes seen: ${[...seen.keys()].sort().join(', ')}`);
    note(`max simulated heart rate anywhere on the slider: ${maxHr} bpm (tachycardia rule needs > 115)`);
    assert([...seen.keys()].some((k) => k.startsWith('heart/')), 'tachycardia branch is dead code from the UI (no crew/day/storm reaches HR > 115; query text is ignored by this rule)');
  });

  await check('every HRP hazard that is scored can influence triage (isolation/sleep test)', 'SHOULD', () => {
    const base = state(crews[0], 90, false).vitals;
    const a = strip(evaluateEdgeTriage('status', { ...base, sleepScore: 100, coreTemp: 36.6 }, false));
    const b = strip(evaluateEdgeTriage('status', { ...base, sleepScore: 20, coreTemp: 40.5 }, false));
    assert(a !== b, 'sleepScore 100→20 and coreTemp 36.6→40.5 leave triage unchanged: Isolation / Distance / Gravity / Hostile-Env have no triage trigger');
  });

  await check('deterministic (ignoring timestamp) and NaN-safe', 'MUST', () => {
    const v = state(crews[1], 120, true).vitals;
    assert(strip(evaluateEdgeTriage('dizzy', v, true)) === strip(evaluateEdgeTriage('dizzy', v, true)), 'non-deterministic');
    const r = calculateLiveHazardsAndVitals(crews[0], Number.NaN, false);
    assert(Object.values(r.hazards).every((x) => Number.isFinite(x)), 'NaN leaked');
  });
}

/* ===================== C. storageSync queue & sync ====================== */
async function sectionC() {
  head('C. storageSync — offline queue -> DSN sync');
  ls.clear();

  await check('offline: logs persist to localStorage, newest first, unsynced', 'MUST', () => {
    saveLogToBlackBox({ type: 'TELEMETRY', payload: { n: 1 } });
    saveLogToBlackBox({ type: 'TRIAGE', payload: { n: 2 } });
    saveLogToBlackBox({ type: 'ALERT', payload: { n: 3 } });
    const raw = JSON.parse(ls.getItem('astro_sentinel_blackbox_logs') ?? '[]') as BlackBoxLog[];
    const logs = getBlackBoxLogs();
    assert(raw.length === 3 && logs.length === 3, `len ${logs.length}`);
    assert((logs[0].payload as { n: number }).n === 3 && logs.every((l) => !l.synced), 'order/synced');
  });

  await check('OFFLINE_EDGE sync: status OFFLINE, nothing drained, queue intact', 'MUST', async () => {
    const r = await syncLogsWithEarthDSN('OFFLINE_EDGE');
    assert(r.status === 'OFFLINE' && r.syncedCount === 0 && r.pendingCount === 3, JSON.stringify(r));
    assert(getBlackBoxLogs().every((l) => !l.synced), 'queue mutated');
  });

  await check('EARTH_DSN_SYNC: SYNCED, 3 drained, 0 pending', 'MUST', async () => {
    const r = await syncLogsWithEarthDSN('EARTH_DSN_SYNC');
    assert(r.status === 'SYNCED' && r.syncedCount === 3 && r.pendingCount === 0, JSON.stringify(r));
    assert(getBlackBoxLogs().every((l) => l.synced), 'not all marked synced');
  });

  await check('second sync is idempotent (syncedCount 0)', 'MUST', async () => {
    const r = await syncLogsWithEarthDSN('EARTH_DSN_SYNC');
    assert(r.syncedCount === 0, `re-synced ${r.syncedCount}`);
  });

  await check('ring buffer caps at 500 and keeps the newest', 'MUST', () => {
    ls.clear();
    for (let i = 0; i < 650; i++) saveLogToBlackBox({ type: 'TELEMETRY', payload: { i } });
    const logs = getBlackBoxLogs();
    assert(logs.length === 500 && (logs[0].payload as { i: number }).i === 649, `len ${logs.length}`);
  });

  await check('corrupted storage JSON self-heals without throwing', 'MUST', () => {
    ls.setItem('astro_sentinel_blackbox_logs', '{not json');
    assert(getBlackBoxLogs().length === 0, 'did not recover');
    assert(saveLogToBlackBox({ type: 'SYSTEM', payload: {} }) !== null, 'cannot write after heal');
  });

  await check('quota error never throws; total failure returns null', 'MUST', () => {
    ls.clear();
    ls.failAllSets = true;
    assert(saveLogToBlackBox({ type: 'SYSTEM', payload: {} }) === null, 'expected null');
    ls.failAllSets = false;
  });

  await check('quota retry does not silently drop UNSYNCED logs', 'SHOULD', () => {
    ls.clear();
    for (let i = 0; i < 100; i++) saveLogToBlackBox({ type: 'TRIAGE', payload: { i } });
    ls.failNextSet = true;
    saveLogToBlackBox({ type: 'TRIAGE', payload: { i: 100 } });
    const left = getBlackBoxLogs().length;
    assert(left >= 101, `only ${left}/101 unsynced logs survived a single quota error (halves the queue)`);
  });

  await check('critical TRIAGE log survives 500 later TELEMETRY writes', 'SHOULD', () => {
    ls.clear();
    saveLogToBlackBox({ type: 'TRIAGE', payload: { critical: true } });
    for (let i = 0; i < 500; i++) saveLogToBlackBox({ type: 'TELEMETRY', payload: { i } });
    assert(getBlackBoxLogs().some((l) => l.type === 'TRIAGE'), 'evicted by telemetry spam (FIFO has no priority)');
  });

  await check('service.syncBlackBoxLogs: after a full drain, pending == 0 (SYNC audit log must not stay unsynced)', 'SHOULD', async () => {
    ls.clear();
    saveLogToBlackBox({ type: 'TRIAGE', payload: { a: 1 } });
    await syncBlackBoxLogs([], 'EARTH_DSN_SYNC');
    const pending = getBlackBoxLogs().filter((l) => !l.synced).length;
    assert(pending === 0, `${pending} log(s) still pending right after a successful sync`);
  });

  await check('service.syncBlackBoxLogs: reports 0 when nothing was queued', 'SHOULD', async () => {
    ls.clear();
    const fakeUiLogs = Array.from({ length: 5 }, () => ({}) as TriageProtocol);
    const r = await syncBlackBoxLogs(fakeUiLogs, 'EARTH_DSN_SYNC');
    assert(r.syncedCount === 0, `reported ${r.syncedCount} synced with an empty queue (falls back to UI logs.length)`);
  });

  await check('service.syncBlackBoxLogs: DSN ERROR is not reported as success', 'SHOULD', async () => {
    ls.clear();
    saveLogToBlackBox({ type: 'TRIAGE', payload: {} });
    ls.failAllSets = true;
    const fakeUiLogs = Array.from({ length: 4 }, () => ({}) as TriageProtocol);
    const r = await syncBlackBoxLogs(fakeUiLogs, 'EARTH_DSN_SYNC');
    ls.failAllSets = false;
    assert(r.syncedCount === 0, `write failed but UI is told ${r.syncedCount} logs synced`);
  });

  await check('persisted TRIAGE log contains the full 3-step protocol (replayable after reload)', 'SHOULD', async () => {
    ls.clear();
    const { executeFlightSurgeonTriage } = await import('../src/services/sentinelService');
    await executeFlightSurgeonTriage('dizzy', state(crews[0], 90, false).vitals, false, 'OFFLINE_EDGE');
    const t = getBlackBoxLogs().find((l) => l.type === 'TRIAGE');
    const p = t?.payload as { steps?: unknown[] } | undefined;
    assert(Array.isArray(p?.steps) && p.steps.length === 3, 'only a summary is stored (no steps/timestamp)');
  });

  await check('persisted TELEMETRY log contains vitals', 'SHOULD', async () => {
    ls.clear();
    donki = async () => json([]);
    await fetchTelemetrySnapshot('CDR-001', 30, false);
    const t = getBlackBoxLogs().find((l) => l.type === 'TELEMETRY');
    const p = t?.payload as { vitals?: unknown } | undefined;
    assert(p?.vitals !== undefined, 'payload has only {crewId, missionDay, flags, alertCount} — no vitals');
  });

  await check('persisted logs are read back into the UI (getBlackBoxLogs has a consumer)', 'SHOULD', () => {
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f) && readFileSync(p, 'utf8').includes('getBlackBoxLogs') && !p.endsWith('storageSync.ts')) hits.push(p);
      }
    };
    walk('src');
    assert(hits.length > 0, 'nothing imports getBlackBoxLogs: the black box is write-only, UI log list is lost on reload');
  });
}

/* ================ D. service integration (route <-> engine) ============= */
async function sectionD() {
  head('D. sentinelService — live path + offline degradation');
  ls.clear();

  await check('quiet sun: a single C1.1 flare from DONKI must NOT force storm state', 'MUST', async () => {
    donki = async (url) => (url.includes('/FLR') ? json([{ flrID: 'Q-1', classType: 'C1.1', beginTime: nowIso() }]) : json([]));
    const live = await fetchTelemetrySnapshot('CDR-001', 10, false);
    const calm = state(crews[0], 10, false);
    note(`weather: ${live.weather.eventType}`);
    assert(live.hazards.hostileEnvironment === calm.hazards.hostileEnvironment, `hostile-env ${live.hazards.hostileEnvironment} vs calm ${calm.hazards.hostileEnvironment}`);
    assert(live.vitals.heartRate === calm.vitals.heartRate, 'storm HR bump applied on a quiet-sun day');
  });

  await check('DONKI empty + storm off -> nominal telemetry', 'MUST', async () => {
    donki = async () => json([]);
    const live = await fetchTelemetrySnapshot('FE-002', 45, false);
    assert(JSON.stringify(live.hazards) === JSON.stringify(state(crews[1], 45, false).hazards), 'hazards differ');
  });

  await check('real M/X flare or Kp ≥ 5 DOES trigger storm state', 'MUST', async () => {
    donki = async (url) => (url.includes('/FLR') ? json([{ flrID: 'X-1', classType: 'X2.0', beginTime: nowIso() }]) : json([]));
    const live = await fetchTelemetrySnapshot('CDR-001', 10, false);
    assert(JSON.stringify(live.hazards) === JSON.stringify(state(crews[0], 10, true).hazards), 'storm not applied');
  });

  clientOffline = true;
  await check('browser offline (/api/nasa unreachable): never throws, returns local model', 'MUST', async () => {
    const live = await fetchTelemetrySnapshot('MS-003', 60, false);
    assert(JSON.stringify(live.hazards) === JSON.stringify(state(crews[2], 60, false).hazards), 'not local model');
    assert(live.weather.eventType === 'SOLAR ACTIVITY NOMINAL', live.weather.eventType);
  });

  await check('browser offline + user-triggered storm -> simulated SPE alert + storm hazards', 'MUST', async () => {
    const live = await fetchTelemetrySnapshot('MS-003', 150, true);
    assert(/SIMULATED/.test(live.weather.eventType), live.weather.eventType);
    assert(JSON.stringify(live.hazards) === JSON.stringify(state(crews[2], 150, true).hazards), 'storm hazards missing');
  });
  clientOffline = false;

  await check('server outage: route replays last cached alerts (no staleness flag) — storm state must not persist forever', 'SHOULD', async () => {
    // Prior test left an X2.0 flare in the route's module cache. Now NASA is down.
    donki = async () => { throw new TypeError('NASA down'); };
    const live = await fetchTelemetrySnapshot('CDR-001', 10, false);
    const calm = state(crews[0], 10, false);
    assert(live.hazards.hostileEnvironment === calm.hazards.hostileEnvironment, 'cached flare keeps cockpit in storm state during outage; cache has no TTL / age check');
  });

  await check('an X-class flare from 10 days ago is not an ACTIVE storm today (recency window)', 'SHOULD', async () => {
    donki = async (url) =>
      url.includes('/FLR')
        ? json([{ flrID: 'OLD-1', classType: 'X1.5', beginTime: new Date(Date.now() - 10 * 864e5).toISOString() }])
        : json([]);
    const live = await fetchTelemetrySnapshot('FE-002', 20, false);
    const calm = state(crews[1], 20, false);
    assert(live.hazards.hostileEnvironment === calm.hazards.hostileEnvironment, 'any alert inside the 30-day DONKI lookback is treated as live; no recency filter');
  });

  await check('OFFLINE_EDGE mode performs zero network calls (README: "no NASA, no network")', 'SHOULD', () => {
    const src = readFileSync('src/services/sentinelService.ts', 'utf8');
    const sig = /export async function fetchTelemetrySnapshot\(([\s\S]*?)\)\s*:/.exec(src)?.[1] ?? '';
    assert(/mode|ConnectivityMode/.test(sig), 'fetchTelemetrySnapshot has no mode parameter; the app polls /api/nasa even in OFFLINE_EDGE (the default mode)');
  });
}

/* --------------------------------- main -------------------------------- */
(async () => {
  await sectionA();
  await sectionB();
  await sectionC();
  await sectionD();

  const must = results.filter((r) => r.level === 'MUST');
  const should = results.filter((r) => r.level === 'SHOULD');
  const mf = must.filter((r) => !r.ok);
  const sf = should.filter((r) => !r.ok);
  console.log('\n──────────────────────────────────────────────');
  console.log(`MUST   : ${must.length - mf.length}/${must.length} pass`);
  console.log(`SHOULD : ${should.length - sf.length}/${should.length} pass`);
  if (mf.length) { console.log('\nMUST failures:'); mf.forEach((r) => console.log(`  ✗ [${r.section.split('.')[0]}] ${r.name}`)); }
  if (sf.length) { console.log('\nSHOULD warnings:'); sf.forEach((r) => console.log(`  ! [${r.section.split('.')[0]}] ${r.name}`)); }
  process.exit(mf.length ? 1 : 0);
})();
