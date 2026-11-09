// Session credits left and the weekly mood average on the demo page.
// Expected values: the demo's own "product rules" (stand-ins for a real plan / product doc):
//   Credits left   = plan credits − bookings (completed + upcoming each use one credit)
//   Weekly average = mean of this week's check-ins, shown to 1 decimal place
// Worked examples: 8 − 4 bookings = 4 · (3+4+2+5+4+3+4) / 7 = 25 / 7 = 3.571… → 3.6
// Note the two selector styles: a stable id (best), and a label anchor when there is no id.

lens.snippet({
  name: 'Credits and mood',
  async run(k) {
    const plan = k.num(k.screen.find({ id: 'credits-plan' })?.text);
    const bookings = k.screen.all({ id: 'booking' }).length;
    if (plan == null) k.na('Credits left', 'plan credits not on screen');
    else {
      k.check('Credits left', k.screen.find({ label: 'Credits left', take: 'next' }), plan - bookings, {
        formula: 'plan credits − bookings',
        inputs: { plan, bookings },
      });
    }

    const moods = k.screen.all({ id: 'mood' }).map((n) => k.num(n.text));
    if (!moods.length) return k.na('Mood average', 'no check-ins on screen');
    k.check('Mood average', k.screen.find({ id: 'mood-average' }), moods.reduce((a, b) => a + b, 0) / moods.length, {
      decimals: 1,
      formula: 'mean of check-ins, 1 dp',
      inputs: { moods },
    });
  },
});
