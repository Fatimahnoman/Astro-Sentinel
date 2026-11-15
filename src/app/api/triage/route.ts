/**
 * ASTRO-SENTINEL — AI Doctor Multi-LLM Online Chain
 * -------------------------------------------------
 * NASA Flight Surgeon — online inference endpoint with automatic failover:
 *
 *   1) OpenRouter  (OPENROUTER_API_KEY)  → google/gemini-2.0-flash-001
 *   2) Google      (GEMINI_API_KEY)      → gemini-2.0-flash : generateContent
 *   3) xAI Grok    (GROK_API_KEY / XAI_API_KEY) → grok-2-latest
 *
 * Every provider is capped at 4 seconds. If all fail, or the request is
 * malformed, we answer HTTP 200 with `{ fallback: true }` — the client then
 * uses the on-device offline edge engine with zero user-facing errors.
 *
 * OUTPUT SHAPE (strict JSON, no markdown, no prose):
 *   { "severity": "NOMINAL" | "WARNING" | "CRITICAL",
 *     "organ":    "BRAIN"   | "HEART"   | "SPINE",
 *     "headline": string,
 *     "steps":    [string, string, string],
 *     "provider": string }
 *
 * Grounded in NASA Human Research Program clinical risks: SANS, orthostatic
 * intolerance, radiation SPE, microgravity musculoskeletal loss, CO2 toxicity.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PROVIDER_TIMEOUT_MS = 4000;
const MAX_SYMPTOM_LEN = 500;

interface TriageRequestBody {
  symptom?: unknown;
  vitals?: unknown;
  hazards?: unknown;
  missionDay?: unknown;
  crewMember?: unknown;
}

interface OnlineTriage {
  severity: 'NOMINAL' | 'WARNING' | 'CRITICAL';
  organ: 'BRAIN' | 'HEART' | 'SPINE';
  headline: string;
  steps: [string, string, string];
  provider: string;
}

const FALLBACK_RESPONSE = { fallback: true } as const;
const json = (body: unknown) =>
  Response.json(body, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });

const SYSTEM_PROMPT = [
  'You are SENTINEL-7B, a NASA flight surgeon for deep-space crews, grounded in',
  'NASA Human Research Program (HRP) clinical risk evidence:',
  '• SANS — Spaceflight Associated Neuro-ocular Syndrome (blurry vision, eye pressure)',
  '• Orthostatic Intolerance & Post-EVA dizziness / vertigo / space motion sickness',
  '• Radiation — Solar Particle Events (SPE), cumulative dose, skin burns',
  '• Microgravity bone & muscle deconditioning (BMD, ARED, musculoskeletal strain)',
  '• CO2 toxicity headache, fatigue and sleep/circadian disruption',
  '• Tachycardia, chest tightness, hypoxia and EVA suit-related trauma',
  '',
  'Respond with STRICT JSON only — no markdown, no prose, no code fences.',
  'Exact shape:',
  '{"severity":"NOMINAL|WARNING|CRITICAL","organ":"BRAIN|HEART|SPINE",',
  ' "headline":"<≤90 char diagnosis>",',
  ' "steps":["<step 1 ≤110 char>","<step 2 ≤110 char>","<step 3 ≤110 char>"],',
  ' "provider":"<provider>"}',
  'Step 1 = immediate stabilization, Step 2 = onboard countermeasure/diagnostic,',
  'Step 3 = black-box logging + escalation criteria. Never invent clinical trials,',
  'never give non-JSON output. Steps must reference the actual vitals supplied.',
].join('\n');

function buildUserPrompt(body: TriageRequestBody): string {
  const symptom =
    typeof body.symptom === 'string' ? body.symptom.slice(0, MAX_SYMPTOM_LEN) : 'unknown';
  const v = (body.vitals ?? {}) as Record<string, unknown>;
  const h = (body.hazards ?? {}) as Record<string, unknown>;
  const crew =
    typeof body.crewMember === 'string' ? body.crewMember : 'Crew Member';
  const day = typeof body.missionDay === 'number' ? body.missionDay : 90;

  return [
    `Crew: ${crew} (Mission Day ${day} of 180, Mars transit)`,
    `Symptom: "${symptom}"`,
    `Vitals: HR ${Number(v.heartRate ?? 0) || 0} bpm · SpO2 ${Number(v.spo2 ?? 0) || 0}% · ` +
      `Core Temp ${Number(v.coreTemp ?? 0) || 0}°C · Sleep ${Number(v.sleepScore ?? 0) || 0}/100 · ` +
      `Bone Density ${Number(v.boneDensity ?? 0) || 0}% baseline · Cumulative Radiation ${Number(v.cumulativeRadiation ?? 0) || 0} mSv`,
    `HRP hazards (0-100): RAD ${Number(h.radiation ?? 0) || 0} · ISO ${Number(h.isolation ?? 0) || 0} · ` +
      `DST ${Number(h.distanceFromEarth ?? 0) || 0} · GRV ${Number(h.gravityFields ?? 0) || 0} · ENV ${Number(h.hostileEnvironment ?? 0) || 0}`,
    'Return the strict JSON object now.',
  ].join('\n');
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip markdown code fences if a model wraps the JSON
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    // Last chance: grab the outermost {...} block
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function coerceTriage(data: unknown, provider: string): OnlineTriage | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  const severityRaw = String(d.severity ?? '').toUpperCase();
  const organRaw = String(d.organ ?? '').toUpperCase();
  const headline = String(d.headline ?? d.diagnosis ?? '').trim();
  const stepsRaw = Array.isArray(d.steps) ? d.steps : [];

  const severity =
    severityRaw === 'CRITICAL' || severityRaw === 'WARNING' || severityRaw === 'NOMINAL'
      ? (severityRaw as OnlineTriage['severity'])
      : null;
  const organ =
    organRaw === 'BRAIN' || organRaw === 'HEART' || organRaw === 'SPINE'
      ? (organRaw as OnlineTriage['organ'])
      : null;
  const steps = stepsRaw
    .map((s) => String(s ?? '').trim())
    .filter((s) => s.length > 0)
    .slice(0, 3) as [string, string, string];

  if (!severity || !organ || headline.length === 0 || steps.length !== 3) {
    return null;
  }

  return { severity, organ, headline: headline.slice(0, 140), steps, provider };
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  provider: string,
): Promise<OnlineTriage | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as unknown;
    return coerceTriage(extractJson(extractProviderText(payload, provider)), provider);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractProviderText(payload: unknown, provider: string): string {
  const p = payload as Record<string, unknown> | null;
  if (!p || typeof p !== 'object') return '';

  if (provider === 'GEMINI') {
    // generativelanguage.googleapis.com response shape
    const candidates = (p as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
      .candidates;
    const text = candidates?.[0]?.content?.parts?.map((pt) => pt?.text ?? '').join('') ?? '';
    return text;
  }

  // OpenAI-compatible (OpenRouter / xAI Grok)
  const choices = (p as { choices?: Array<{ message?: { content?: string } }> }).choices;
  return choices?.[0]?.message?.content ?? '';
}

async function callOpenRouter(userPrompt: string): Promise<OnlineTriage | null> {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) return null;
  return postJson(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': process.env.OPENROUTER_REFERER?.trim() ?? 'https://astro-sentinel.vercel.app',
      'X-Title': 'ASTRO-SENTINEL',
    },
    {
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    },
    'OPENROUTER',
  );
}

async function callGemini(userPrompt: string): Promise<OnlineTriage | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  return postJson(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
    {},
    {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 400,
        responseMimeType: 'application/json',
      },
    },
    'GEMINI',
  );
}

async function callGrok(userPrompt: string): Promise<OnlineTriage | null> {
  const key = (process.env.GROK_API_KEY ?? process.env.XAI_API_KEY)?.trim();
  if (!key) return null;
  return postJson(
    'https://api.x.ai/v1/chat/completions',
    { Authorization: `Bearer ${key}` },
    {
      model: 'grok-2-latest',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    },
    'GROK',
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: TriageRequestBody = {};
  try {
    body = (await request.json()) as TriageRequestBody;
  } catch {
    return json(FALLBACK_RESPONSE);
  }

  const symptom = typeof body.symptom === 'string' ? body.symptom.trim() : '';
  if (!symptom || symptom.length < 2) return json(FALLBACK_RESPONSE);

  const userPrompt = buildUserPrompt(body);

  // Sequential failover with per-provider 4s timeout
  const chain: Array<(p: string) => Promise<OnlineTriage | null>> = [
    (p) => callOpenRouter(p),
    (p) => callGemini(p),
    (p) => callGrok(p),
  ];

  for (const call of chain) {
    const result = await call(userPrompt);
    if (result) {
      return json(result);
    }
  }

  return json(FALLBACK_RESPONSE);
}
