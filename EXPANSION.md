# Expanding weblens

How to take this from a v0.1 demo to something that checks a real app, and then to a general
tool that also covers mobile apps. Written 2026-11-09, after a logged-out look at
`app.intellect.co`. The phases are in order: each one makes the next cheaper.

- [Where it stands](#where-it-stands)
- [What we know about Intellect](#what-we-know-about-intellect-logged-out)
- [Phase 1: with a login](#phase-1-with-a-login)
- [Phase 2: with source code access](#phase-2-with-source-code-access)
- [Phase 3: one core, many adapters](#phase-3-one-core-many-adapters-the-generalisation)
- [Phase 4: features to add](#phase-4-features-to-add)
- [Ground rules](#ground-rules)
- [Open questions](#open-questions)

---

## Where it stands

| Piece | State | Verified how |
|---|---|---|
| Attach to a Chrome tab over CDP | ✅ works | headless Chrome, demo page and app.intellect.co |
| Screen read (visible text, ids, rects) | ✅ works | 45 nodes from the demo page |
| Capture the app's JSON replies + socket frames | ✅ works (JSON only) | 4 Intellect endpoints captured logged out |
| `discover` report (shapes only, digits masked) | ✅ works | `docs/discovery-public-2026-11-09.md` |
| Snippet runtime, `check`, 3-steady-read rule, exit code | ✅ works | `npm run demo` → 3 match, 1 deliberate mismatch, exit 1 |
| `api.get` from inside the page | ⚠ untested on Intellect | Intellect appears to use a bearer token (see below); this may 401 |
| Intellect snippets | 🟡 templates | need a login to fill the TODOs |
| UI, recording, copy report, selector picker | ❌ not built | Phase 4 |

How it compares with the in-app bridge approach mobile tools use:

| In-app bridge (mobile app, USB phone) | weblens (web app, Chrome) |
|---|---|
| bridge compiled into a QA build | nothing in the app: Chrome DevTools Protocol |
| screen frame: widget tree, semantics ids | `walker.js`: DOM text, `data-testid` / `id`, rects |
| network frames from the app's HTTP client | `Network.*` events + `getResponseBody` |
| socket frames from the app's socket layer | `Network.webSocketFrame*` events |
| named app state (state-management providers) | ❌ none yet (see Phase 2) |
| session held by the engine, GET proxy | session stays in the browser; GET runs inside the page |
| per-app names hard-coded in the engine | `profiles/<name>.json` |

---

## What we know about Intellect (logged out)

Source: the public bundle (`app.intellect.co/assets/index-*.js`) and one logged-out `discover`
run. No account was used.

- **App:** a React single-page app built with Vite; screens load lazily per route. It uses Sentry,
  Segment and Stripe, and Agora/Zoom for video sessions.
- **API:** `https://internal.intellect.co/api/<service>/…`, for example `GET /api/identity/config`,
  `GET /api/identity/auth/me`, `POST /api/identity/auth/token`.
- **Auth:** logged out, `/auth/token` returns 401 and `/auth/me` returns 403. This suggests a
  token the app keeps in JS (bearer header) rather than cookies only. **Consequence:** if so,
  `k.api.get` (which relies on the page's cookies) will 401, and snippets should read the app's own
  replies with `k.app.network()`. That is also the better habit, because it checks what the app
  actually received.
- **Live updates:** `socket.internal.intellect.co` (seen in the bundle, not yet in traffic).
- **Leads from `GET /api/identity/config`** (feature flags any visitor can see):

| Config key | What it suggests | Candidate check | Trusted source for the expected value |
|---|---|---|---|
| `PHQ4_SCORE`, `PHQ4_ASSESSMENT_ID`, `sessionPHQ4Questionnaire` | PHQ-4 check-in | total and band shown = published scoring | Kroenke et al. 2009 (published) |
| `DASS_SCORE`, `sessionDass5`, `sessionDass5Questionnaire` | a DASS-based check | subscale scores shown = scoring | the DASS form's manual. **Confirm which form first** |
| `urls.coachingCredits`, `DISABLE_COACHING_OOP` | coaching credits, maybe a separate pool | credits left = granted − used | the plan's written terms |
| `postSessionWellBeingCheck` | a wellbeing check after a session | score shown = scoring | Intellect's product doc (ask) |
| `journal_catalogue`, `TAB_TASKS` | journals, tasks | counts and streaks shown = list | Intellect's product doc (ask) |
| `MIN_USER_AGE` | age gate | sign-up blocks under the minimum | the config value itself is a spec, but read the policy page too |

The bundle also mentions **check-in / mood** ~110×, **minutes** 61× and **booking** ~14×. Times
shown for bookings across timezones are a classic source of bugs and are easy to check.

---

## Phase 1: with a login

Goal: turn the two templates into real checks, then add checks for the leads above.

1. **Use your own account, in a separate Chrome.** Run `./scripts/chrome.sh https://app.intellect.co/`.
   It uses `.chrome-profile/`, so your normal Chrome and its cookies are not involved. Log in there.
2. **Discover, one feature at a time.**
   `npm run discover -- --profile intellect --seconds 90`, then click through one feature (for example
   check-in → result). Repeat per feature. Each report lists:
   - every JSON endpoint, with ids collapsed to `:id` and the reply's **shape** (keys and types, no values)
   - socket URLs and the shape of one frame
   - per screen: elements with a stable id (best selectors) and numbers on screen (digits masked)
3. **Confirm the profile.** If the reports show other API origins (a CDN for config, a second API),
   add them to `profiles/intellect.json` → `origins`. Calls to origins not listed are refused.
4. **Find the raw inputs for each number.** For "credits left", find the reply with the *granted* figure
   and the reply with the *bookings list*, not a reply that already holds "remaining". If only
   the computed value exists, the check is "API value = screen value" (a display check). Say so
   in the snippet header, because it is weaker than a formula check.
5. **Get the trusted source before writing the formula.** Use published scoring for PHQ-4, and the
   plan terms or Intellect's help centre for credits. If no written rule exists, stop and ask; don't
   reverse-engineer it from their JavaScript (rule 1).
6. **Fill the TODOs**, using real numbers from the account in the worked example. Keep those numbers
   generic in comments (no names, no dates of real sessions).
7. **Run it live:** `node src/cli.mjs run --profile intellect`. Explain every red row with numbers
   before calling it a bug: wrong input, rounding the doc specifies, timing, or a real defect.
8. **Check `api.get` once.** If it 401s, keep to `app.network()` and note it in the profile.

Expected friction:
- **Screens that are lists:** the walker only reports rendered nodes. If the list is virtualised, scroll
  to the value.
- **Elements without ids:** Tailwind-style apps often have no `data-testid`. Use label anchors
  (`{ label, take: 'next' | 'below' }`). If a screen has neither, Phase 2 fixes it at the source.
- **Values inside a shadow DOM or an iframe** are not read yet (`walker.js` has a `ponytail:`
  note). Add that only when a real screen needs it.

## Phase 2: with source code access

None of this is needed for Phase 1. Each step makes checks sturdier.

1. **Stable selectors.** Add `data-testid` to every number a snippet checks (the equivalent of
   semantics ids in a mobile bridge). This is cheap, does nothing at runtime, and is shared with E2E tests.
2. **A read-only state hook** (the equivalent of a mobile bridge's named app state). Only in a QA/staging
   build, expose `window.__weblens__ = { state(name) }` returning selected store slices
   (Redux / Zustand / React Query cache), with secrets removed **in the app** before anything
   leaves it. Add `k.app.state(name)` to the runtime to read it via `Runtime.evaluate`.
   This removes the guessing about which reply holds an input.
3. **A QA build flag.** Build the hook only when something like `VITE_QA_BRIDGE=true` is set, so
   production never has it.
4. **Mobile apps.** If Intellect's iOS/Android apps are React Native or Flutter, the hook becomes an
   in-app bridge (WebSocket client → `adb reverse` → engine). The snippets and runtime
   stay the same; only the adapter changes (Phase 3).
5. **Trusted sources in the repo.** Ask for the product docs behind each number (credit rules, score
   bands, streak rules) and link them in snippet headers.

## Phase 3: one core, many adapters (the generalisation)

The point of the exercise: **snippets should not know which kind of app they run against.** A
bridge-based mobile checker and weblens would each have their own engine. The shared part is the snippet runtime; the part
that differs is how screen, network, sockets and state are obtained.

Proposed adapter interface:

```ts
interface Adapter {
  id: 'cdp-web' | 'flutter-bridge' | 'android-a11y' | string;
  connect(profile): Promise<void>;
  screen(): Promise<{ url: string; size: [number, number]; nodes: Node[] }>;   // Node = {id?, text?, value?, rect, flags[]}
  network?: { latest(pattern, method?): Reply | null };   // the app's own replies
  sockets?: { recent(pattern, ms): Frame[] };
  state?:   (name: string) => Promise<unknown>;           // named, redacted app state
  get?:     (url: string, opts) => Promise<Reply>;        // GET only, allowlisted origins
  capabilities(): string[];                               // a snippet declares what it needs; the runtime says "No data: adapter has no state"
}
```

| Adapter | Needs from the app | Screen | Network | Sockets | State |
|---|---|---|---|---|---|
| `cdp-web` (this repo) | nothing | DOM | ✅ | ✅ | via Phase 2 hook |
| `flutter-bridge` | QA build with bridge | widget tree | ✅ | ✅ | named providers |
| `android-a11y` (black-box phone) | nothing | `uiautomator` accessibility tree | ❌ | ❌ | ❌ |
| `rn-bridge` (future) | QA build with bridge | RN tree | ✅ | ✅ | store slices |

Steps:
1. Move `runtime.mjs` (kit, `check`, steady-read rule, verdicts) into a `core/` folder that has no CDP code.
2. Make the profile choose the adapter: `"adapter": "cdp-web"`.
3. **Anything app-specific becomes a profile field, never engine code.** These are the names an
   engine tends to hard-code:
   - which auth header marks a token change
   - which hosts get the session cookie
   - where a socket's auth token comes from
   - product or brand splits (one app, several products with different rules)

   Proposed profile fields: `session.tokenHeader`, `session.cookieHosts`, `sockets.jwtFrom`,
   `brands: { "<folder>/": "<BRAND>", "*": "<DEFAULT>" }`.
4. Snippets declare what they need (`needs: ['network']`), so an `android-a11y` run says
   "No data: adapter cannot see network" instead of failing in an odd way.
5. One results format (JSON rows), so one UI and one CI gate serve every adapter.

Keep the snippet API (`lens.snippet`, `screen.find`, `{ label, take }`, verdict names) stable
across adapters: that is what lets one snippet run against web and mobile.

## Phase 4: features to add

In rough order of value:

1. **Copy report.** A Markdown block per check: formula, inputs, units, verdict. Paste it into a ticket.
   `--json` already emits rows; this formats them.
2. **Selector picker.** Click an element in the page and get `{ id }` or `{ label, take }`. Use CDP
   `Overlay.setInspectMode` + `DOM.getNodeForLocation`.
3. **Small UI.** A local page that shows the table live, plus the "story" per check (inputs → maths →
   screen → verdict), step by step.
4. **Recording and replay.** Save screen snapshots, replies and frames so a check can be re-run
   with no browser (fixtures for CI). Health data makes this sensitive. Add a scrub step that
   keeps shapes and drops values before anything leaves the laptop.
5. **CI mode.** Headless Chrome, scripted login with a **test** account, `run --once`, exit 1 on
   mismatch. Run it before each release.
6. **Timezone checks.** Booking times rendered across browser timezones (CDP
   `Emulation.setTimezoneOverride`). This fits weblens well and is hard to do by hand.

## Ground rules

- **Your own account, your own browser.** No shared, test-pool or other people's accounts unless
  the app owner provides them for this purpose.
- **Read only.** `api.get` is GET only and limited to the profile's origins. The engine never clicks,
  submits or books. (The `discover` report lists the app's own POSTs, such as login. weblens did not send them.)
- **Health data is sensitive.** It may count as personal or health data under PDPA / GDPR /
  HIPAA-like rules depending on country. Recordings stay in gitignored `recordings/`. Discovery
  reports keep shapes, not values. Never paste screen values from a real account into a commit,
  ticket or chat.
- **The expected value never comes from the app's code.** Reading their bundle to learn field
  names is fine. Copying their maths copies their bug.
- **No tolerance.** Explain a gap (rounding rule, stale input, timing) rather than widening a check.
- **Respect the site's terms.** This tool only observes what a logged-in browser already shows.
  It does not scrape at volume, bypass access controls or automate accounts.

## Open questions

Only Intellect, or whoever has their product docs, can answer these:

1. What do `PHQ4_SCORE` and `DASS_SCORE` in config mean: display thresholds, routing cut-offs, or something else?
2. Which DASS form is "Dass5", and what is its scoring source?
3. Credits: is there one pool or separate therapy and coaching pools? Do cancellations or no-shows use a credit?
4. Are streaks and averages in the app computed on the server or the client, and which timezone defines a "day"?
5. Is there a staging environment and a test account? That's needed for Phase 4 CI.
