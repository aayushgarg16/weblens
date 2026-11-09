// Runs INSIDE the page (via Runtime.evaluate). Returns the visible, readable nodes: the web
// equivalent of an in-app bridge's screen frame. Keep it a single self-contained expression.
// ponytail: top document only — no shadow DOM, no iframes. Add both if a target app needs them.
(() => {
  const W = innerWidth;
  const H = innerHeight;
  const nodes = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  for (let el = walk.currentNode; el; el = walk.nextNode()) {
    const id = el.getAttribute('data-testid') || el.getAttribute('data-test') || el.id || null;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim() || null;
    const isSecret = el.type === 'password' || /otp|pin|password/i.test(el.name || '');
    const value = !isSecret && typeof el.value === 'string' && el.tagName !== 'BUTTON' ? el.value : null;
    if (!text && !id && !value) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || s.opacity === '0') continue;
    nodes.push({
      tag: el.tagName.toLowerCase(),
      id,
      aria: el.getAttribute('aria-label'),
      text,
      value,
      rect: [r.x, r.y, r.width, r.height].map((v) => Math.round(v)),
      offscreen: r.bottom < 0 || r.top > H || r.right < 0 || r.left > W,
    });
  }
  return { url: location.href, title: document.title, size: [W, H], nodes };
})()
