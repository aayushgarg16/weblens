#!/usr/bin/env node
// weblens run      --profile <name> [--once] [--every 2s] [--port 9222]
// weblens discover --profile <name> [--seconds 60] [--port 9222]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { startEngine } from './engine.mjs';
import { loadSnippets, makeKit } from './runtime.mjs';

const [cmd = 'run', ...rest] = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = rest.indexOf(`--${name}`);
  if (i < 0) return dflt;
  const v = rest[i + 1];
  return v == null || v.startsWith('--') ? true : v;
};
const seconds = (s) => (typeof s === 'string' ? parseFloat(s) : s);

const profileName = arg('profile', 'demo');
const profilePath = `profiles/${profileName}.json`;
if (!existsSync(profilePath)) {
  console.error(`No profile ${profilePath}`);
  process.exit(2);
}
const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
const port = Number(arg('port', 9222));

let engine;
try {
  engine = await startEngine(profile, { port });
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
console.error(`attached to ${engine.url}`);

if (cmd === 'discover') await discover();
else if (cmd === 'run') await run();
else {
  console.error(`unknown command ${cmd}`);
  process.exit(2);
}

async function runOnce(snippets, history) {
  const snap = await engine.screen();
  const rows = [];
  for (const s of snippets) {
    try {
      await s.run(makeKit({ engine, profile, snap, rows, snippet: s }));
    } catch (e) {
      rows.push({ snippet: s.name, name: '(snippet)', result: 'Error', note: e.message });
    }
  }
  // A mismatch counts only after 3 steady reads that disagree the same way.
  // Until then it is "Checking" (the page may still be loading or a value may be moving).
  if (history) {
    for (const r of rows) {
      const key = `${r.snippet}::${r.name}`;
      const h = [...(history.get(key) ?? []), `${r.result}|${r.screen}`].slice(-3);
      history.set(key, h);
      if ((r.result === 'Mismatch' || r.result === 'Sign wrong') && !(h.length === 3 && h.every((x) => x === h[0]))) r.result = 'Checking';
    }
  }
  return rows;
}

function print(rows) {
  const icon = { Matching: '✅', Mismatch: '❌', 'Sign wrong': '❌', Checking: '⏳', 'Not visible': '👀', 'No data': '∅', Error: '⚠' };
  console.table(
    rows.map((r) => ({
      Snippet: r.snippet,
      Check: r.name,
      Screen: r.screen ?? '',
      'Should be': r.expected ?? '',
      Result: `${icon[r.result] ?? ''} ${r.result}`,
      Δ: r.delta ?? '',
      Note: r.note ?? '',
    })),
  );
}

async function run() {
  const snippets = loadSnippets(`snippets/${profileName}`);
  if (!snippets.length) console.error(`no snippets under snippets/${profileName}/`);
  if (arg('once', false)) {
    const rows = await runOnce(snippets, null);
    print(rows);
    if (arg('json', false)) console.log(JSON.stringify(rows, null, 2));
    engine.close();
    process.exit(rows.some((r) => r.result === 'Mismatch' || r.result === 'Sign wrong') ? 1 : 0);
  }
  const every = seconds(arg('every', '2')) * 1000;
  const history = new Map();
  for (;;) {
    const rows = await runOnce(snippets, history);
    console.clear();
    console.log(`${profile.name} · ${new Date().toLocaleTimeString()} · Ctrl+C to stop`);
    print(rows);
    await new Promise((r) => setTimeout(r, every));
  }
}

// ---------------------------------------------------------------------------------------------
// discover: click around the logged-in app for N seconds; writes a report of what exists —
// endpoints, JSON SHAPES (keys and types, never values), socket URLs, and screen ids/labels —
// so snippets can be written without guessing. The report holds no account data by design.
async function discover() {
  const secs = seconds(arg('seconds', '60'));
  console.error(`recording for ${secs}s — use the app now (open the screens you want to check)`);
  const screens = new Map();
  const end = Date.now() + secs * 1000;
  while (Date.now() < end) {
    try {
      const s = await engine.screen();
      if (profile.match.some((p) => s.url.startsWith(p))) screens.set(new URL(s.url).pathname, s);
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }

  const collapse = (url) => {
    const u = new URL(url);
    const path = u.pathname
      .split('/')
      .map((seg) => (/^\d+$|^[0-9a-f-]{16,}$|^[A-Za-z0-9_-]{20,}$/i.test(seg) ? ':id' : seg))
      .join('/');
    return `${u.origin}${path}${u.search ? ` ?${[...u.searchParams.keys()].join('&')}` : ''}`;
  };
  const shape = (v, depth = 0) => {
    if (Array.isArray(v)) return v.length ? [shape(v[0], depth)] : [];
    if (v && typeof v === 'object') {
      if (depth >= 3) return '{…}';
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x, depth + 1)]));
    }
    return v === null ? 'null' : typeof v;
  };
  const mask = (t) => (t ?? '').replace(/\d/g, '#');

  const endpoints = new Map();
  for (const e of engine.net) {
    const key = `${e.method} ${collapse(e.url)}`;
    const prev = endpoints.get(key);
    endpoints.set(key, { count: (prev?.count ?? 0) + 1, status: e.status, shape: prev?.shape ?? (e.json !== undefined ? shape(e.json) : e.mime) });
  }
  const sockets = new Map();
  for (const f of engine.frames) {
    const s = sockets.get(f.url) ?? { in: 0, out: 0, sample: null };
    s[f.dir]++;
    if (!s.sample) {
      try {
        s.sample = shape(JSON.parse(f.data));
      } catch {
        s.sample = `text: ${mask(String(f.data).slice(0, 60))}`;
      }
    }
    sockets.set(f.url, s);
  }

  const out = [];
  out.push(`# Discovery — ${profile.name}`, '', `Recorded ${new Date().toISOString()} for ${secs}s. Values are never stored: JSON is reduced to its shape and on-screen digits are masked as #.`, '');
  out.push(`## Endpoints (${endpoints.size})`, '');
  for (const [k, v] of [...endpoints].sort()) {
    out.push(`### \`${k}\``, `status ${v.status} · seen ${v.count}×`, '```json', JSON.stringify(v.shape, null, 2), '```', '');
  }
  out.push(`## Sockets (${sockets.size})`, '');
  for (const [url, s] of sockets) out.push(`- \`${collapse(url.replace(/^ws/, 'http'))}\` — in ${s.in}, out ${s.out}`, '  ```json', `  ${JSON.stringify(s.sample)}`, '  ```');
  out.push('', `## Screens (${screens.size})`, '');
  for (const [path, s] of screens) {
    out.push(`### \`${path}\` — ${s.title}`, '');
    const withId = s.nodes.filter((n) => n.id);
    if (withId.length) out.push('Stable ids (best selectors):', ...withId.slice(0, 40).map((n) => `- \`{ id: '${n.id}' }\` ${n.tag} — ${mask(n.text)}`), '');
    const numeric = s.nodes.filter((n) => /\d/.test(n.text ?? '') && !n.offscreen);
    if (numeric.length) out.push('Numbers on screen (checkable candidates):', ...numeric.slice(0, 40).map((n) => `- ${n.tag}${n.aria ? ` aria="${n.aria}"` : ''} — \`${mask(n.text)}\``), '');
  }
  const file = `recordings/discovery-${profileName}-${Date.now()}.md`;
  writeFileSync(file, out.join('\n'));
  console.error(`wrote ${file}`);
  engine.close();
}
