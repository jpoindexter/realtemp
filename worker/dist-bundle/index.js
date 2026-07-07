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

// src/index.ts
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
var json = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } }), "json");
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (url.pathname === "/api/reports" && request.method === "POST") return postReport(request, env);
    if (url.pathname === "/api/reports/summary" && request.method === "GET") return reportSummary(url, env);
    if (url.pathname === "/api/copy" && request.method === "POST") return copy(request, env);
    return json({ error: "Not found" }, 404);
  }
};
async function postReport(request, env) {
  const body = await request.json().catch(() => null);
  const lat = Number(body?.latitude);
  const lon = Number(body?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isVote(body?.vote)) {
    return json({ error: "Expected { latitude, longitude, vote: hotter|cooler|spot-on }" }, 400);
  }
  const ip = request.headers.get("CF-Connecting-IP") ?? "local";
  const rateKey = `rate:${ip}`;
  if (await env.CACHE.get(rateKey)) return json({ error: "One report per 10 minutes." }, 429);
  await env.CACHE.put(rateKey, "1", { expirationTtl: RATE_LIMIT_MS / 1e3 });
  await env.DB.prepare("INSERT INTO reports (cell, vote, created_at) VALUES (?, ?, ?)").bind(toCell(lat, lon), body.vote, Date.now()).run();
  return json({ ok: true });
}
__name(postReport, "postReport");
async function reportSummary(url, env) {
  const lat = Number(url.searchParams.get("latitude"));
  const lon = Number(url.searchParams.get("longitude"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ error: "Expected ?latitude=&longitude=" }, 400);
  }
  const { results } = await env.DB.prepare(
    "SELECT vote, COUNT(*) as n FROM reports WHERE cell = ? AND created_at > ? GROUP BY vote"
  ).bind(toCell(lat, lon), Date.now() - REPORT_WINDOW_MS).all();
  const counts = { hotter: 0, cooler: 0, "spot-on": 0, ...Object.fromEntries(results.map((r) => [r.vote, r.n])) };
  return json({ windowHours: 3, counts });
}
__name(reportSummary, "reportSummary");
async function copy(request, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ available: false, reason: "ANTHROPIC_API_KEY not configured" }, 503);
  }
  const body = await request.json().catch(() => null);
  const lat = Number(body?.latitude);
  const lon = Number(body?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !isCopyRequest(body)) {
    return json({ error: "Expected { latitude, longitude, trueFeelC, baseC, deltas[] }" }, 400);
  }
  const cacheKey = copyCacheKey(lat, lon, Date.now());
  const cached = await env.CACHE.get(cacheKey);
  if (cached) return json({ available: true, line: cached, cached: true });
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
  if (!response.ok) return json({ available: false, reason: `LLM answered ${response.status}` }, 502);
  const data = await response.json();
  const line = data.content?.find((c) => c.type === "text")?.text?.trim();
  if (!line) return json({ available: false, reason: "Empty LLM response" }, 502);
  await env.CACHE.put(cacheKey, line, { expirationTtl: COPY_CACHE_TTL_S });
  return json({ available: true, line, cached: false });
}
__name(copy, "copy");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
