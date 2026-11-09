// The snippet runtime: loads snippet files and hands each run() a kit `k` with the screen, API
// access, the app's captured traffic, and helpers that turn a comparison into a result row.
import vm from 'node:vm';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Snippets run in a separate realm, so `x instanceof RegExp` is false for their regexes.
const isRe = (x) => Object.prototype.toString.call(x) === '[object RegExp]';
const matches = (pattern, s) => (s == null ? false : isRe(pattern) ? pattern.test(s) : s === pattern);

// "₹1,234.50" → 1234.5, "−3" → -3. null when there is no number.
export function num(text) {
  if (text == null) return null;
  const m = String(text).replace(/[−–]/g, '-').replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

// ponytail: snippets are our own files, so node:vm is a scope, not a security sandbox.
// If snippets ever come from someone else, run them in a worker with no fs/network.
export function loadSnippets(dir) {
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.js') && !f.startsWith('_')) files.push(p);
    }
  };
  walk(dir);
  const out = [];
  for (const file of files) {
    const ctx = { lens: { snippet: (s) => out.push({ ...s, file: relative(process.cwd(), file) }) }, console };
    vm.runInNewContext(readFileSync(file, 'utf8'), ctx, { filename: file });
  }
  return out;
}

function screenApi(snap) {
  const nodes = snap.nodes;
  const center = (n) => [n.rect[0] + n.rect[2] / 2, n.rect[1] + n.rect[3] / 2];
  const hit = (n, q) =>
    (q.id == null || matches(q.id, n.id)) &&
    (q.text == null || matches(q.text, n.text)) &&
    (q.aria == null || matches(q.aria, n.aria)) &&
    (q.tag == null || q.tag === n.tag);

  // { label, take: 'next' | 'below' }: the value printed beside or under a label.
  function byLabel(q) {
    const label = nodes.find((n) => matches(q.label, n.text));
    if (!label) return null;
    const [lx, ly] = center(label);
    const [x, y, w, h] = label.rect;
    const candidates = nodes.filter((n) => n !== label && n.text).map((n) => ({ n, c: center(n) }));
    const pick =
      q.take === 'below'
        ? candidates.filter(({ n, c }) => c[1] > y + h && n.rect[0] < x + w && n.rect[0] + n.rect[2] > x).sort((a, b) => a.c[1] - b.c[1])
        : candidates.filter(({ n, c }) => c[0] > x + w && Math.abs(c[1] - ly) < Math.max(h, n.rect[3]) / 2).sort((a, b) => a.c[0] - b.c[0]);
    return pick[0]?.n ?? null;
  }

  return {
    url: snap.url,
    title: snap.title,
    nodes,
    find: (q) => (q.label != null ? byLabel(q) : nodes.find((n) => hit(n, q)) ?? null),
    all: (q) => nodes.filter((n) => hit(n, q)),
  };
}

// Builds the kit for one run of one snippet. Rows are pushed into `rows`.
export function makeKit({ engine, profile, snap, rows, snippet }) {
  const screen = screenApi(snap);
  const add = (row) => rows.push({ snippet: snippet.name, ...row });
  return {
    profile: profile.name,
    screen,
    num,

    api: {
      // host is a key of profile.hosts; path is joined onto it.
      get: (path, { host = profile.defaultHost, query, headers } = {}) => {
        const base = profile.hosts?.[host];
        if (!base) return Promise.resolve({ status: 0, error: `no host "${host}" in profile` });
        const u = new URL(path, base);
        for (const [k, v] of Object.entries(query ?? {})) u.searchParams.set(k, v);
        return engine.get(u.href, { headers });
      },
    },

    app: {
      // Latest reply the app itself received whose URL matches (string = substring, or a RegExp).
      network: (pattern, { method = 'GET' } = {}) => {
        for (let i = engine.net.length - 1; i >= 0; i--) {
          const e = engine.net[i];
          const ok = isRe(pattern) ? pattern.test(e.url) : e.url.includes(pattern);
          if (ok && e.method === method) return e;
        }
        return null;
      },
      // Frames the app sent/received on its own sockets in the last `ms`, newest first.
      sockets: (pattern, ms = 5000) =>
        engine.frames
          .filter((f) => f.ts > Date.now() - ms && (isRe(pattern) ? pattern.test(f.url) : f.url.includes(pattern)))
          .reverse(),
    },

    // A value cannot be checked: say which input is missing. Never default it to 0.
    na: (name, why) => add({ name, result: 'No data', note: why }),

    // Compare what the screen shows against the snippet's own expected value.
    // decimals: how the PRODUCT says it is displayed. It is a spec, never a tolerance.
    check(name, node, expected, { decimals, formula, inputs } = {}) {
      const base = { name, formula, inputs };
      if (!node) return add({ ...base, result: 'Not visible', expected, note: 'value not on screen (scroll to it?)' });
      if (expected == null) return add({ ...base, result: 'No data', screen: node.text, note: 'expected value missing' });
      const shown = node.text ?? node.value;
      if (typeof expected === 'string') {
        return add({ ...base, screen: shown, expected, result: shown?.trim() === expected ? 'Matching' : 'Mismatch' });
      }
      const got = num(shown);
      const want = decimals == null ? expected : Number(expected.toFixed(decimals));
      if (got == null) return add({ ...base, screen: shown, expected: want, result: 'Error', note: 'no number in screen text' });
      const result = got === want ? 'Matching' : Math.sign(got) === -Math.sign(want) && want !== 0 ? 'Sign wrong' : 'Mismatch';
      return add({ ...base, screen: shown, expected: want, result, delta: result === 'Matching' ? undefined : +(got - want).toFixed(10) });
    },
  };
}
