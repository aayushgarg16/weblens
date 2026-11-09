# weblens

Check the numbers a **web app** shows against an independent formula, live. It is the browser
"DevTools snippet" workflow, made repeatable: small JavaScript snippets recompute each value from
raw inputs and a written rule, and weblens shows **Screen · Should be · Result · Δ**.

Mobile tools of this kind usually need a bridge compiled into a QA build of the app. weblens needs
nothing from the app: it attaches to a Chrome window over the DevTools Protocol and reads the page
(visible text and element positions), the app's own API replies, and its WebSocket frames, the same
three inputs such a bridge would send. It's Node ≥ 22 with zero dependencies.

> Status: **v0.1, a demo / starting point.** The offline demo works end to end. The Intellect
> profile is a template: hosts and leads come from a logged-out look at `app.intellect.co`, and
> the snippets need a login to finish. What to do next is in **[EXPANSION.md](EXPANSION.md)**.

## Try it (no login, no network)

```bash
./scripts/chrome.sh demo            # separate Chrome profile, DevTools port on 127.0.0.1:9222
npm run demo                        # one pass over snippets/demo/
```

You should see three ✅ Matching rows and one ❌ Mismatch. The demo page shows severity "Mild"
for a PHQ-9 total of 14; the published bands say "Moderate". The exit code is 1 when anything
mismatches, so it can be used as a CI gate.

Live mode re-reads every 2 s. A mismatch only counts after 3 steady reads that disagree the
same way; until then it shows ⏳ Checking:

```bash
node src/cli.mjs run --profile demo --every 2
```

## Point it at a real app

```bash
./scripts/chrome.sh https://app.intellect.co/   # log in with YOUR account in that window
npm run discover -- --profile intellect --seconds 90   # click through the screens meanwhile
# → recordings/discovery-intellect-<ts>.md : endpoints + JSON shapes, sockets, screen ids/labels
```

Then fill in the TODOs in `snippets/intellect/` and run `node src/cli.mjs run --profile intellect`.

## Layout

| Path | What |
|---|---|
| `src/cdp.mjs` | 50-line DevTools Protocol client (built-in `fetch` + `WebSocket`) |
| `src/engine.mjs` | attach to a tab, capture JSON replies and socket frames, read the screen, GET from inside the page |
| `src/walker.js` | runs in the page: visible nodes with text / id / rect |
| `src/runtime.mjs` | snippet loader and the kit snippets get (`screen`, `api`, `app`, `check`, `na`) |
| `src/cli.mjs` | `run` (table, exit code) and `discover` (shape-only report) |
| `profiles/<name>.json` | per-app: which tab, allowed origins, API hosts |
| `snippets/<profile>/*.js` | the checks. `_*.js` files are not run on their own |
| `fixtures/demo.html` | fictional "Calmly" wellness page for the offline demo |
| `docs/discovery-public-*.md` | logged-out snapshot of Intellect (shapes only) |

## Writing a snippet

```js
// Header: formula + its TRUSTED SOURCE (product doc / published standard) + a worked example.
lens.snippet({
  name: 'Credits',
  async run(k) {
    const plan = k.app.network('/api/plan');        // latest reply the app got (or a RegExp)
    if (!plan?.json) return k.na('Credits left', 'open the plan screen');   // never default to 0
    const node = k.screen.find({ id: 'credits-left' })                      // data-testid / id (best)
              ?? k.screen.find({ label: 'Credits left', take: 'next' });    // or the value beside a label
    k.check('Credits left', node, plan.json.granted - plan.json.used, {
      decimals: 0, formula: 'granted − used', inputs: { granted: plan.json.granted, used: plan.json.used },
    });
  },
});
```

Other kit members: `k.screen.all(q)`, `k.api.get(path, { host, query })` (GET only, run inside the
page with its cookies), `k.app.sockets(pattern, ms)`, `k.num(text)`.

Results: ✅ Matching · ❌ Mismatch / Sign wrong · ⏳ Checking · 👀 Not visible · ∅ No data · ⚠ Error.

## Rules

1. The expected value comes from a product doc or a published standard, **never from the app's code**.
2. Inputs are raw facts. Never feed in the computed value you are checking.
3. Every formula has a worked example with real numbers in its header comment.
4. GET only. No tolerance: `decimals` is how the product says a value is shown, not slack.
5. Your own account only. Nothing from the account is written to the repo (`recordings/` is gitignored;
   discovery reports keep JSON shapes, never values).
