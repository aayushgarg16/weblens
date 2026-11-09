// Intellect · session credits remaining.
// STATUS: TEMPLATE — "credits" is the most-mentioned feature in the public bundle (160+ mentions),
// but no endpoint or screen has been seen yet. Fill the TODOs from a discovery report.
// Lead: the logged-out config has data.urls.coachingCredits and rules.DISABLE_COACHING_OOP
// (docs/discovery-public-2026-11-09.md) — coaching credits may be their own pool, separate
// from therapy sessions. Confirm before writing one formula for both.
//
// Expected value: credits remaining = credits granted by the plan − credits used by bookings.
// The trusted source is the plan's written terms (employer contract / Intellect's help centre),
// which also settle: do cancelled or no-show sessions use a credit? Does a coaching session cost
// the same as therapy? Write the answer here before trusting a red row.
// Worked example (fill in with real numbers from the account once seen): granted ? − used ? = ?

lens.snippet({
  name: 'Intellect · Credits remaining',
  async run(k) {
    // TODO: the reply that lists the plan's granted credits (raw input).
    const plan = k.app.network(/TODO-plan-or-entitlement-endpoint/);
    // TODO: the reply that lists bookings / sessions with their status (raw input).
    const bookings = k.app.network(/TODO-bookings-endpoint/);
    if (!plan?.json) return k.na('Credits remaining', 'TODO: set the plan endpoint from the discovery report');
    if (!bookings?.json) return k.na('Credits remaining', 'TODO: set the bookings endpoint from the discovery report');

    const granted = null; // TODO: e.g. plan.json.data.totalCredits
    const used = null; // TODO: count bookings whose status consumes a credit (per the plan terms)
    if (granted == null || used == null) return k.na('Credits remaining', 'TODO: map granted / used from the replies');

    // TODO: selector for the credits figure on screen.
    k.check('Credits remaining', k.screen.find({ label: /TODO credits label/i, take: 'next' }), granted - used, {
      formula: 'granted − used',
      inputs: { granted, used },
    });
  },
});
