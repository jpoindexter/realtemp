#!/usr/bin/env node
// rockmap — generate a single-file, interactive roadmap board from one JSON file.
// Usage:  node build-roadmap.mjs [input.json] [output.html]
// Defaults: roadmap.json -> roadmap.html. Zero dependencies. Node 18+ (ESM).

import { readFileSync, writeFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

const IN = argv[2] ?? 'roadmap.json';
const OUT = argv[3] ?? 'roadmap.html';

const esc = (s) =>
  String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const die = (msg) => {
  console.error(`\n  rockmap error: ${msg}\n`);
  exit(1);
};

function load(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    die(`cannot read "${path}". Pass a path, e.g. node build-roadmap.mjs my-roadmap.json`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    die(`"${path}" is not valid JSON — ${e.message}`);
  }
  validate(data, path);
  return data;
}

function validate(d, path) {
  if (!d || typeof d !== 'object') die(`"${path}" must be a JSON object.`);
  if (!Array.isArray(d.columns) || d.columns.length === 0)
    die(`"columns" is required and must be a non-empty array (e.g. Now / Next / Later).`);
  if (!Array.isArray(d.cards)) die(`"cards" is required and must be an array.`);
  const colIds = new Set(d.columns.map((c) => c.id));
  const tierIds = new Set((d.tiers ?? []).map((t) => t.id));
  const trackIds = new Set((d.tracks ?? []).map((t) => t.id));
  for (const [i, c] of d.cards.entries()) {
    if (!c.id) die(`cards[${i}] is missing "id".`);
    if (!c.title) die(`card "${c.id ?? i}" is missing "title".`);
    if (!colIds.has(c.column))
      die(`card "${c.id}" references column "${c.column}" — not declared in "columns".`);
    if (c.tier && tierIds.size && !tierIds.has(c.tier))
      die(`card "${c.id}" references tier "${c.tier}" — not declared in "tiers".`);
    if (c.track && trackIds.size && !trackIds.has(c.track))
      die(`card "${c.id}" references track "${c.track}" — not declared in "tracks".`);
  }
}

const BASE_CSS = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0c0f14;color:#c8cdd8;padding:1.5rem}
h1{font-size:1.25rem;margin-bottom:.35rem;font-weight:600}
.meta{color:#5e6e82;font-size:.72rem;margin-bottom:.9rem;line-height:1.6}
.meta b{color:#f59e0b}
.loop{color:#5e6e82;font-size:.74rem;margin-bottom:.9rem;font-family:ui-monospace,monospace;line-height:1.6}
.loop b{color:#f59e0b;font-weight:600}
.legend{display:flex;flex-wrap:wrap;gap:.85rem;margin-bottom:1.1rem;font-family:ui-monospace,monospace;font-size:.62rem;color:#3e4a5c;line-height:1.5}
.legend span{display:inline-flex;align-items:center;gap:.3rem}
.legend i{width:.7rem;height:.7rem;display:inline-block;border:1px solid}
.filters{display:flex;flex-wrap:wrap;gap:.75rem;margin-bottom:1.25rem;align-items:center}
.filters label{font-size:.65rem;color:#3e4a5c;font-weight:700;font-family:ui-monospace,monospace;letter-spacing:.09em;text-transform:uppercase}
select{background:#10141b;border:1px solid #1e2737;color:#5e6e82;padding:.35rem .6rem;cursor:pointer;font-size:.72rem;font-family:ui-monospace,monospace;min-width:110px}
select:hover{border-color:#384454;color:#a0aab8}
select:focus{outline:none;border-color:#f59e0b;color:#e8eaf0}
option{background:#0c0f14;color:#c8cdd8}
.board{display:grid;grid-template-columns:repeat(var(--cols,3),1fr);gap:1rem;align-items:start}
.col h2{font-size:.65rem;font-weight:700;padding:.3rem .65rem;margin-bottom:.75rem;letter-spacing:.1em;text-transform:uppercase;font-family:ui-monospace,monospace;border-left:3px solid #5e6e82;color:#5e6e82}
.tg{margin-bottom:.75rem}
.tg h3{font-size:.62rem;font-weight:700;color:#3e4a5c;letter-spacing:.09em;text-transform:uppercase;margin-bottom:.35rem;padding:.15rem .5rem;border-left:2px solid #1e2737;font-family:ui-monospace,monospace}
.badges{display:flex;gap:.35rem;margin-bottom:.35rem;flex-wrap:wrap;align-items:center}
.me{font-family:ui-monospace,monospace;font-size:.6rem;padding:.1rem .3rem;border:1px solid #1e2737;color:#5e6e82}
.ver{border-color:#f59e0b;color:#f59e0b}
.lock{border-color:#f87171;color:#f87171}
.gate{border-color:#7a8898;color:#7a8898}
.card{background:#10141b;border:1px solid #1e2737;padding:.65rem;margin-bottom:.4rem}
.card:hover{border-color:#384454}
.hd{display:flex;align-items:baseline;gap:.4rem;margin-bottom:.3rem;flex-wrap:wrap}
.sz{background:transparent;border:1px solid #1e2737;font-size:.6rem;padding:.1rem .3rem;color:#3e4a5c;flex-shrink:0;font-family:ui-monospace,monospace}
.ttl{font-size:.82rem;font-weight:600;flex:1;line-height:1.3;color:#dce0e8;min-width:9rem}
.lens{font-size:.56rem;padding:.05rem .35rem;flex-shrink:0;font-family:ui-monospace,monospace;letter-spacing:.04em;text-transform:uppercase;border:1px solid #2a323e;color:#7a8898}
.sum{font-size:.73rem;color:#5e6e82;line-height:1.5;margin-bottom:.35rem}
details>summary{font-size:.68rem;color:#3e4a5c;cursor:pointer;list-style:none;padding:.15rem 0;font-family:ui-monospace,monospace}
details>summary::marker,details>summary::-webkit-details-marker{display:none}
details>summary::before{content:"\\25b8 "}
details[open]>summary::before{content:"\\25be "}
.done{font-size:.72rem;color:#7a8898;margin-top:.3rem;padding:.35rem .5rem;background:#0c0f14;border-left:2px solid #1e2737;line-height:1.5}
.closes{font-size:.58rem;color:#3e4a5c;font-family:ui-monospace,monospace;margin-top:.3rem}
.sh-section{margin-top:1.75rem}
.sh-section>summary{color:#3e4a5c;cursor:pointer;font-size:.78rem;padding:.45rem .7rem;background:#10141b;border:1px solid #1e2737;list-style:none;font-family:ui-monospace,monospace}
.sh-section>summary::before{content:"\\25b8 "}
.sh-section[open]>summary::before{content:"\\25be "}
.sh-grid{columns:3;column-gap:1rem;margin-top:.75rem}
.sh-grid .card{break-inside:avoid;opacity:.75}
.hidden{display:none!important}
@media(max-width:880px){.board{grid-template-columns:1fr 1fr}.sh-grid{columns:2}}
@media(max-width:560px){.board{grid-template-columns:1fr}.sh-grid{columns:1}}`;

function dynamicCss(d) {
  const rules = [];
  for (const c of d.columns) if (c.color) rules.push(`h2.s-${c.id}{color:${c.color};border-left-color:${c.color}}`);
  for (const t of d.tiers ?? []) if (t.color) rules.push(`.t-${t.id} h3{color:${t.color};border-left-color:${t.color}}`);
  for (const t of d.tracks ?? [])
    rules.push(`.l-${t.id}{color:${t.color};border-color:${t.border ?? t.color};background:${t.bg ?? 'transparent'}}`);
  for (const m of d.models ?? []) rules.push(`.m-${m.id}{border-color:${m.color};color:${m.color}}`);
  return rules.join('\n');
}

const trackMap = (d) => new Map((d.tracks ?? []).map((t) => [t.id, t]));

function renderCard(c, tracks, shipped = false) {
  const sz = c.size ? `<span class="sz">${esc(c.size)}</span>` : '';
  const tr = tracks.get(c.track);
  const lens = tr ? `<span class="lens l-${esc(c.track)}">${esc(tr.label)}</span>` : '';
  const badges = [];
  if (c.model) badges.push(`<span class="me m-${esc(c.model)}">${esc(c.model)}${c.effort ? ` · ${esc(c.effort)}` : ''}</span>`);
  if (c.launch) badges.push(`<span class="me ver">${esc(c.launch)}</span>`);
  if (c.blocker) badges.push(`<span class="me lock">🔒</span>`);
  if (c.gated) badges.push(`<span class="me gate">⊘</span>`);
  const badgesHtml = badges.length ? `<div class="badges">${badges.join('')}</div>` : '';
  const tick = shipped && c.shipped ? ` ✓ ${esc(c.shipped)}` : '';
  const done = c.done ? `<details><summary>Done criteria</summary><p class="done">${esc(c.done)}${tick}</p></details>` : '';
  const closes = c.closes ? `<div class="closes">${esc(c.closes)}</div>` : '';
  return `<div class="card${shipped ? ' s-shipped' : ''}" data-track="${esc(c.track ?? '')}" data-id="${esc(c.id)}" data-size="${esc(c.size ?? '')}" data-tier="${esc(c.tier ?? '')}" data-launch="${esc(c.launch ?? '')}">
<div class="hd">${sz}<span class="ttl">${esc(c.id)} &middot; ${esc(c.title)}</span>${lens}</div>
${badgesHtml}<p class="sum">${esc(c.summary ?? '')}</p>
${done}${closes}</div>`;
}

function renderColumn(col, d, tracks) {
  const inCol = d.cards.filter((c) => c.column === col.id);
  const tiers = d.tiers?.length ? d.tiers : [{ id: '', label: '' }];
  let groups = '';
  for (const t of tiers) {
    const tc = t.id ? inCol.filter((c) => c.tier === t.id) : inCol;
    if (!tc.length) continue;
    const h3 = t.label ? `<h3>${esc(t.label)}</h3>` : '';
    groups += `<div class="tg t-${esc(t.id)}">${h3}\n${tc.map((c) => renderCard(c, tracks)).join('\n')}\n</div>\n`;
  }
  return `<div class="col" data-status="${esc(col.id)}"><h2 class="s-${esc(col.id)}">${esc(col.label)}</h2>\n${groups}</div>`;
}

function renderFilters(d) {
  const have = (key) => d.cards.some((c) => c[key]);
  const opt = (v, label) => `<option value="${esc(v)}">${esc(label)}</option>`;
  const blocks = [];
  if (d.tracks?.length)
    blocks.push(`<label for="track-filter">Track:</label><select id="track-filter">${opt('all', 'All track')}${d.tracks.map((t) => opt(t.id, t.label)).join('')}</select>`);
  if (d.launches?.length || have('launch')) {
    const ls = d.launches?.length ? d.launches : [...new Set(d.cards.map((c) => c.launch).filter(Boolean))].map((id) => ({ id, label: id }));
    blocks.push(`<label for="launch-filter">Launch:</label><select id="launch-filter">${opt('all', 'All launch')}${ls.map((l) => opt(l.id, l.label)).join('')}</select>`);
  }
  if (d.tiers?.length)
    blocks.push(`<label for="priority-filter">Priority:</label><select id="priority-filter">${opt('all', 'All priority')}${d.tiers.map((t) => opt(t.id, t.label.split(/[ ·]/)[0])).join('')}</select>`);
  if (have('size'))
    blocks.push(`<label for="size-filter">Size:</label><select id="size-filter">${opt('all', 'All size')}${['L', 'M', 'S'].map((s) => opt(s, s)).join('')}</select>`);
  if (d.models?.length)
    blocks.push(`<label for="model-filter">Model:</label><select id="model-filter">${opt('all', 'All model')}${d.models.map((m) => opt(m.id, m.id)).join('')}</select>`);
  return blocks.length ? `<div class="filters">\n${blocks.join('\n')}\n</div>` : '';
}

function renderLegend(d) {
  if (!d.tracks?.length) return '';
  const items = d.tracks.map(
    (t) => `<span><i style="border-color:${t.border ?? t.color};background:${t.bg ?? 'transparent'}"></i>${esc(t.label)}</span>`,
  );
  if (d.cards.some((c) => c.blocker)) items.push(`<span style="color:#f87171">🔒 launch blocker</span>`);
  if (d.cards.some((c) => c.gated)) items.push(`<span style="color:#7a8898">⊘ gated</span>`);
  return `<div class="legend">${items.join('')}</div>`;
}

function renderShipped(d, tracks) {
  if (!d.shipped?.length) return '';
  const cards = d.shipped.map((c) => renderCard(c, tracks, true)).join('\n');
  return `<details class="sh-section" open><summary>✅ Shipped (${d.shipped.length})</summary>\n<div class="sh-grid">\n${cards}\n</div>\n</details>`;
}

const FILTER_JS = `(function(){
var f={track:'all',size:'all',launch:'all',priority:'all',model:'all'};
var cards=document.querySelectorAll('.board .card');
function apply(){
cards.forEach(function(c){
var ok=(f.track==='all'||c.dataset.track===f.track)
&&(f.size==='all'||c.dataset.size===f.size)
&&(f.launch==='all'||c.dataset.launch===f.launch)
&&(f.priority==='all'||c.dataset.tier===f.priority)
&&(f.model==='all'||c.querySelector('.m-'+f.model));
c.classList.toggle('hidden',!ok);
});
document.querySelectorAll('.tg,.col').forEach(function(g){
var vis=[].some.call(g.querySelectorAll('.card'),function(c){return !c.classList.contains('hidden');});
g.style.display=vis?'':'none';
});
}
[['track-filter','track'],['size-filter','size'],['launch-filter','launch'],['priority-filter','priority'],['model-filter','model']].forEach(function(p){
var el=document.getElementById(p[0]);
if(el)el.addEventListener('change',function(){f[p[1]]=this.value;apply();});
});
})();`;

function build(d) {
  const tracks = trackMap(d);
  const title = d.title ?? 'Roadmap';
  const counts = `${d.cards.length} slice${d.cards.length === 1 ? '' : 's'}${d.shipped?.length ? ` &middot; ${d.shipped.length} shipped` : ''}`;
  const meta = `<p class="meta">${d.subtitle ? `${esc(d.subtitle)} &middot; ` : ''}${counts}</p>`;
  const loop = d.loop ? `<p class="loop">${esc(d.loop)}</p>` : '';
  const board = `<div class="board" style="--cols:${d.columns.length}">\n${d.columns.map((c) => renderColumn(c, d, tracks)).join('\n')}\n</div>`;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Roadmap</title>
<!-- Generated by rockmap (build-roadmap.mjs) from ${esc(IN)}. Edit the JSON, not this file. -->
<style>${BASE_CSS}
${dynamicCss(d)}</style>
</head>
<body>
<h1>${esc(title)}</h1>
${meta}
${loop}
${renderLegend(d)}
${renderFilters(d)}
${board}
${renderShipped(d, tracks)}
<script>${FILTER_JS}</script>
</body>
</html>
`;
}

const data = load(IN);
writeFileSync(OUT, build(data));
const ship = data.shipped?.length ? `, ${data.shipped.length} shipped` : '';
console.log(`rockmap: wrote ${OUT} (${data.cards.length} slices${ship}) from ${IN}`);
