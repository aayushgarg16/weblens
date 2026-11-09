// The engine: attaches to one Chrome tab, keeps what the app fetched and received, reads the
// screen on demand, and makes GET calls from inside the page so the session never leaves the browser.
import { readFileSync } from 'node:fs';
import { attach } from './cdp.mjs';

const WALKER = readFileSync(new URL('./walker.js', import.meta.url), 'utf8');
const MAX_BODY = 256 * 1024;
const MAX_NET = 300;
const MAX_FRAMES = 500;

export async function startEngine(profile, { port = 9222 } = {}) {
  const allowed = new Set(profile.origins);
  const isAllowed = (url) => {
    try {
      return allowed.has(new URL(url).origin);
    } catch {
      return false;
    }
  };
  const cdp = await attach({ port, match: (url) => profile.match.some((p) => url.startsWith(p)) });

  const methods = new Map(); // requestId -> { method, url }
  const net = []; // newest last: { ts, method, url, status, mime, json?, text? }
  const sockUrls = new Map(); // requestId -> ws url
  const frames = []; // { ts, url, dir, data }

  cdp.on('Network.requestWillBeSent', (p) => methods.set(p.requestId, { method: p.request.method, url: p.request.url }));
  cdp.on('Network.responseReceived', (p) => {
    const m = methods.get(p.requestId);
    if (m) Object.assign(m, { status: p.response.status, mime: p.response.mimeType });
  });
  cdp.on('Network.loadingFinished', async (p) => {
    const m = methods.get(p.requestId);
    methods.delete(p.requestId);
    // API replies only: JSON. Scripts, styles and HTML are noise for checking numbers.
    if (!m || !isAllowed(m.url) || !/json/.test(m.mime ?? '')) return;
    try {
      const { body, base64Encoded } = await cdp.send('Network.getResponseBody', { requestId: p.requestId });
      if (base64Encoded || body.length > MAX_BODY) return;
      const entry = { ts: Date.now(), method: m.method, url: m.url, status: m.status, mime: m.mime, text: body };
      try {
        entry.json = JSON.parse(body);
      } catch {}
      net.push(entry);
      if (net.length > MAX_NET) net.shift();
    } catch {} // body already evicted by Chrome: skip it
  });
  cdp.on('Network.webSocketCreated', (p) => sockUrls.set(p.requestId, p.url));
  const onFrame = (dir) => (p) => {
    frames.push({ ts: Date.now(), url: sockUrls.get(p.requestId) ?? '?', dir, data: p.response.payloadData });
    if (frames.length > MAX_FRAMES) frames.shift();
  };
  cdp.on('Network.webSocketFrameReceived', onFrame('in'));
  cdp.on('Network.webSocketFrameSent', onFrame('out'));
  await cdp.send('Network.enable', { maxPostDataSize: 0 });
  await cdp.send('Runtime.enable');

  async function evaluate(expression) {
    const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  }
  // Attaching right as a tab opens can read a half-loaded page; wait for load once.
  await evaluate(`document.readyState === 'complete' || new Promise((r) => addEventListener('load', () => r(true), { once: true }))`);

  return {
    url: cdp.url,
    net,
    frames,
    screen: () => evaluate(WALKER),

    // GET only, allowlisted origins only, run inside the page with the page's own cookies.
    // The tool never sees a token. If the app sends a bearer header from JS (not a cookie),
    // these calls will 401 — then read the app's own reply with app.network() instead.
    async get(url, { headers = {} } = {}) {
      if (!isAllowed(url)) return { status: 0, error: `origin not in profile.origins: ${url}` };
      const expr = `fetch(${JSON.stringify(url)}, { method: 'GET', credentials: 'include', headers: ${JSON.stringify(headers)} })
        .then(async (r) => ({ status: r.status, text: await r.text() }))
        .catch((e) => ({ status: 0, error: String(e) }))`;
      const r = await evaluate(expr);
      if (r.text) {
        try {
          r.json = JSON.parse(r.text);
        } catch {}
      }
      return r;
    },

    close: () => cdp.close(),
  };
}
