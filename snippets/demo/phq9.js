// PHQ-9 total and severity band.
// Expected values: Kroenke, Spitzer & Williams (2001), "The PHQ-9: validity of a brief depression
// severity measure", J Gen Intern Med 16(9):606–613 — the published scoring, not app code.
//   Total    = sum of the 9 item answers, each 0–3 (range 0–27)
//   Severity = 0–4 None-minimal · 5–9 Mild · 10–14 Moderate · 15–19 Moderately severe · 20–27 Severe
// Worked example: answers 2,1,2,1,2,1,2,2,1 → total 14 → Moderate.

lens.snippet({
  name: 'PHQ-9',
  async run(k) {
    const answers = k.screen.all({ id: 'phq9-answer' }).map((n) => k.num(n.text));
    if (answers.length !== 9 || answers.some((a) => a == null || a < 0 || a > 3)) {
      return k.na('PHQ-9 total', `need 9 answers of 0–3 on screen, found ${answers.length}`);
    }
    const total = answers.reduce((a, b) => a + b, 0);
    const band = total <= 4 ? 'None-minimal' : total <= 9 ? 'Mild' : total <= 14 ? 'Moderate' : total <= 19 ? 'Moderately severe' : 'Severe';

    k.check('PHQ-9 total', k.screen.find({ id: 'phq9-total' }), total, {
      formula: 'sum of 9 answers (0–3 each)',
      inputs: { answers },
    });
    k.check('PHQ-9 severity', k.screen.find({ id: 'phq9-severity' }), band, {
      formula: 'band of total: 0–4 / 5–9 / 10–14 / 15–19 / 20–27',
      inputs: { total },
    });
  },
});
