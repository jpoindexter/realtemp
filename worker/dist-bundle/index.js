var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/lib.ts
var VOTES = ["hotter", "cooler", "spot-on"];
var REPORT_WINDOW_MS = 3 * 60 * 60 * 1e3;
var RATE_LIMIT_MS = 10 * 60 * 1e3;
var COPY_CACHE_TTL_S = 3600;
function toCell(latitude, longitude) {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}
__name(toCell, "toCell");
function isVote(v) {
  return typeof v === "string" && VOTES.includes(v);
}
__name(isVote, "isVote");
function isCopyRequest(body) {
  if (typeof body !== "object" || body === null) return false;
  const b = body;
  return typeof b.trueFeelC === "number" && typeof b.baseC === "number" && Array.isArray(b.deltas) && b.deltas.every(
    (d) => typeof d === "object" && d !== null && typeof d.label === "string" && typeof d.deltaC === "number"
  );
}
__name(isCopyRequest, "isCopyRequest");
function copyPrompt(req) {
  const parts = req.deltas.map((d) => `${d.label} ${d.deltaC >= 0 ? "+" : ""}${d.deltaC}\xB0`).join(", ");
  return `Weather data: air ${req.baseC}\xB0C feels like ${req.trueFeelC}\xB0C (${parts})${req.sweatEfficiencyPct !== null ? `, sweat efficiency ${req.sweatEfficiencyPct}%` : ""}. Write ONE dry, punchy sentence (max 18 words) telling a person on the street what this actually feels like. No emoji, no exclamation marks, no weather-app clich\xE9s.`;
}
__name(copyPrompt, "copyPrompt");
function copyCacheKey(latitude, longitude, nowMs) {
  return `copy:${toCell(latitude, longitude)}:${Math.floor(nowMs / 36e5)}`;
}
__name(copyCacheKey, "copyCacheKey");

// src/push.ts
var b64u = /* @__PURE__ */ __name((buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "b64u");
var enc = /* @__PURE__ */ __name((s) => new TextEncoder().encode(s), "enc");
async function vapidAuthHeader(endpoint, vapid) {
  const aud = new URL(endpoint).origin;
  const header = b64u(enc(JSON.stringify({ typ: "JWT", alg: "ES256" })).buffer);
  const payload = b64u(
    enc(
      JSON.stringify({ aud, exp: Math.floor(Date.now() / 1e3) + 12 * 3600, sub: vapid.subject })
    ).buffer
  );
  const key = await crypto.subtle.importKey("jwk", vapid.privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, [
    "sign"
  ]);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc(`${header}.${payload}`).buffer
  );
  return `vapid t=${header}.${payload}.${b64u(sig)}, k=${vapid.publicKeyB64u}`;
}
__name(vapidAuthHeader, "vapidAuthHeader");
async function sendEmptyPush(endpoint, vapid) {
  const auth = await vapidAuthHeader(endpoint, vapid);
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: auth, TTL: "43200", Urgency: "normal" }
  });
  return r.status;
}
__name(sendEmptyPush, "sendEmptyPush");

// src/push-routes.ts
var json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  }
}), "json");
async function subscribePush(request, env) {
  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  const lat = Number(body?.latitude);
  const lon = Number(body?.longitude);
  const threshold = Number(body?.thresholdC);
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || !Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(threshold)) {
    return json({ error: "Expected { endpoint, latitude, longitude, thresholdC }" }, 400);
  }
  await env.DB.prepare(
    "INSERT INTO push_subscriptions (endpoint, latitude, longitude, threshold_c, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET latitude=excluded.latitude, longitude=excluded.longitude, threshold_c=excluded.threshold_c"
  ).bind(endpoint, lat, lon, threshold, Date.now()).run();
  return json({ ok: true });
}
__name(subscribePush, "subscribePush");
async function unsubscribePush(request, env) {
  const body = await request.json().catch(() => null);
  if (typeof body?.endpoint !== "string") return json({ error: "Expected { endpoint }" }, 400);
  await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(body.endpoint).run();
  return json({ ok: true });
}
__name(unsubscribePush, "unsubscribePush");
async function runHeatCheck(env) {
  if (!env.VAPID_PRIVATE_JWK || !env.VAPID_PUBLIC_KEY) return { checked: 0, sent: 0, pruned: 0 };
  const vapid = {
    privateJwk: JSON.parse(env.VAPID_PRIVATE_JWK),
    publicKeyB64u: env.VAPID_PUBLIC_KEY,
    subject: "mailto:jason@theft.studio"
  };
  const { results } = await env.DB.prepare("SELECT endpoint, latitude, longitude, threshold_c FROM push_subscriptions").all();
  let sent = 0;
  let pruned = 0;
  const maxByArea = /* @__PURE__ */ new Map();
  for (const sub of results) {
    const area = `${sub.latitude.toFixed(1)},${sub.longitude.toFixed(1)}`;
    if (!maxByArea.has(area)) {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${sub.latitude}&longitude=${sub.longitude}&daily=temperature_2m_max&forecast_days=1&timezone=auto`
      ).catch(() => null);
      const data = r?.ok ? await r.json() : null;
      maxByArea.set(area, data?.daily?.temperature_2m_max?.[0] ?? null);
    }
    const maxC = maxByArea.get(area) ?? null;
    if (maxC === null || maxC < sub.threshold_c) continue;
    const status = await sendEmptyPush(sub.endpoint, vapid).catch(() => 0);
    if (status === 404 || status === 410) {
      await env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(sub.endpoint).run();
      pruned++;
    } else if (status >= 200 && status < 300) sent++;
  }
  return { checked: results.length, sent, pruned };
}
__name(runHeatCheck, "runHeatCheck");

// src/index.ts
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
var json2 = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } }), "json");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === "/api/reports" && request.method === "POST") return postReport(request, env);
    if (url.pathname === "/api/reports/summary" && request.method === "GET") return reportSummary(url, env);
    if (url.pathname === "/api/copy" && request.method === "POST") return copy(request, env);
    if (url.pathname === "/api/push/subscribe" && request.method === "POST") return subscribePush(request, env);
    if (url.pathname === "/api/push/subscribe" && request.method === "DELETE") return unsubscribePush(request, env);
    return json2({ error: "Not found" }, 404);
  },
  async scheduled(_event, env) {
    const result = await runHeatCheck(env);
    console.log("heat-check", JSON.stringify(result));
  }
};
async function postReport(request, env) {
  const body = await request.json().catch(() => null);
  const lat = Number(body?.latitude);
  const lon = Number(body?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isVote(body?.vote)) {
    return json2({ error: "Expected { latitude, longitude, vote: hotter|cooler|spot-on }" }, 400);
  }
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  const rateKey = `rate:${ip}`;
  if (await env.CACHE.get(rateKey)) return json2({ error: "One report per 10 minutes." }, 429);
  await env.CACHE.put(rateKey, "1", { expirationTtl: RATE_LIMIT_MS / 1e3 });
  await env.DB.prepare("INSERT INTO reports (cell, vote, created_at) VALUES (?, ?, ?)").bind(toCell(lat, lon), body.vote, Date.now()).run();
  return json2({ ok: true });
}
__name(postReport, "postReport");
async function reportSummary(url, env) {
  const lat = Number(url.searchParams.get("latitude"));
  const lon = Number(url.searchParams.get("longitude"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json2({ error: "Expected ?latitude=&longitude=" }, 400);
  }
  const { results } = await env.DB.prepare(
    "SELECT vote, COUNT(*) as n FROM reports WHERE cell = ? AND created_at > ? GROUP BY vote"
  ).bind(toCell(lat, lon), Date.now() - REPORT_WINDOW_MS).all();
  const counts = { hotter: 0, cooler: 0, "spot-on": 0, ...Object.fromEntries(results.map((r) => [r.vote, r.n])) };
  return json2({ windowHours: 3, counts });
}
__name(reportSummary, "reportSummary");
async function copy(request, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return json2({ available: false, reason: "ANTHROPIC_API_KEY not configured" }, 503);
  }
  const body = await request.json().catch(() => null);
  const lat = Number(body?.latitude);
  const lon = Number(body?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isCopyRequest(body)) {
    return json2({ error: "Expected { latitude, longitude, trueFeelC, baseC, deltas[] }" }, 400);
  }
  const cacheKey = copyCacheKey(lat, lon, Date.now());
  const cached = await env.CACHE.get(cacheKey);
  if (cached) return json2({ available: true, line: cached, cached: true });
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      messages: [{ role: "user", content: copyPrompt(body) }]
    })
  });
  if (!response.ok) return json2({ available: false, reason: `LLM answered ${response.status}` }, 502);
  const data = await response.json();
  const line = data.content?.find((c) => c.type === "text")?.text?.trim();
  if (!line) return json2({ available: false, reason: "Empty LLM response" }, 502);
  await env.CACHE.put(cacheKey, line, { expirationTtl: COPY_CACHE_TTL_S });
  return json2({ available: true, line, cached: false });
}
__name(copy, "copy");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
