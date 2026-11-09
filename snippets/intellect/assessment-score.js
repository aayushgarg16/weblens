// Intellect · wellbeing assessment score (PHQ-4 first; DASS later).
// STATUS: TEMPLATE — not yet run against the logged-in app. Fill the TODOs from a discovery report
// (`npm run discover -- --profile intellect`, then take or open a check-in result).
//
// Why PHQ-4: the logged-out config (GET /api/identity/config, see docs/discovery-public-2026-11-09.md)
// names rules.PHQ4_SCORE, rules.PHQ4_ASSESSMENT_ID and rules.sessionPHQ4Questionnaire.
//
// Expected values come from the PUBLISHED scoring, never from Intellect code:
//   PHQ-4 (Kroenke et al. 2009, Psychosomatics 50(6):613–621):
//     4 items, each 0–3 → total 0–12; bands 0–2 Normal · 3–5 Mild · 6–8 Moderate · 9–12 Severe
//     Anxiety subscale = items 1+2 (≥3 positive) · Depression subscale = items 3+4 (≥3 positive)
//   Worked example: answers 2,1,1,0 → total 4 (Mild); anxiety 3 (positive); depression 1 (negative).
// Before trusting a red row, confirm what rules.PHQ4_SCORE means in Intellect (a threshold? a cut-off
// for routing to a clinician?). That needs their product doc, not a guess.
// DASS (rules.DASS_SCORE, sessionDass5): confirm WHICH DASS form and its scoring source first.

lens.snippet({
  name: 'Intellect · PHQ-4 score',
  async run(k) {
    // TODO: the reply holding the user's raw item answers (NOT a computed score field).
    const reply = k.app.network(/TODO-assessment-answers-endpoint/);
    if (!reply?.json) return k.na('PHQ-4 total', 'TODO: set the answers endpoint from the discovery report, then open a check-in result');

    // TODO: map the reply to the 4 item scores in question order, e.g. reply.json.data.answers.map((a) => a.score)
    const answers = [];
    if (answers.length !== 4) return k.na('PHQ-4 total', 'TODO: map the reply to 4 item scores (0–3)');

    const total = answers.reduce((a, b) => a + b, 0);
    const band = total <= 2 ? 'Normal' : total <= 5 ? 'Mild' : total <= 8 ? 'Moderate' : 'Severe';

    // TODO: selectors for the score / band on screen — prefer an id; else { label: '<text>', take: 'next' }.
    k.check('PHQ-4 total', k.screen.find({ label: /TODO score label/, take: 'next' }), total, {
      formula: 'sum of 4 items (0–3 each)',
      inputs: { answers },
    });
    // TODO: the label text Intellect shows for the band may differ from the paper's words.
    // Map paper band → Intellect wording here only from their written copy, then check it:
    // k.check('PHQ-4 band', k.screen.find({ ... }), wording[band], { inputs: { total } });
    void band;
  },
});
