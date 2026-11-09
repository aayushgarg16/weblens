// Minimal Chrome DevTools Protocol client. Node >= 22 ships fetch + WebSocket, so no dependencies.
// Chrome must be started with --remote-debugging-port (see scripts/chrome.sh).

export async function attach({ port = 9222, match }) {
  let list;
  try {
    list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  } catch {
    throw new Error(`Chrome is not listening on port ${port}. Start it with ./scripts/chrome.sh`);
  }
  const pages = list.filter((t) => t.type === 'page');
  const tab = pages.find((t) => match(t.url));
  if (!tab) {
    throw new Error(`No Chrome tab matches this profile. Open the app first. Open tabs:\n  ${pages.map((t) => t.url).join('\n  ') || '(none)'}`);
  }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error('Could not open the DevTools socket for that tab'));
  });

  let nextId = 0;
  const pending = new Map();
  const handlers = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (p) msg.error ? p.rej(new Error(msg.error.message)) : p.res(msg.result);
    } else {
      for (const h of handlers.get(msg.method) ?? []) h(msg.params);
    }
  };

  return {
    url: tab.url,
    send: (method, params = {}) =>
      new Promise((res, rej) => {
        const id = ++nextId;
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ id, method, params }));
      }),
    on: (method, fn) => handlers.set(method, [...(handlers.get(method) ?? []), fn]),
    close: () => ws.close(),
  };
}
