const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SIGNALS,
  DIMENSIONS,
  allOn,
  computeDimensions,
  statusLine,
} = require('../assets/js/confidence.js');

/** The six signals, with the named ones switched off. */
function without(...keys) {
  const on = allOn();
  for (const key of keys) on[key] = false;
  return on;
}

/** Percentages keyed by dimension, so the expectations read as a table. */
function pcts(signalsOn) {
  return Object.fromEntries(computeDimensions(signalsOn).map((d) => [d.key, d.pct]));
}

function bandOf(signalsOn, key) {
  return computeDimensions(signalsOn).find((d) => d.key === key).band;
}

test('every weight table sums to 1.00', () => {
  for (const dimension of DIMENSIONS) {
    const total = Object.values(dimension.weights).reduce((a, b) => a + b, 0);
    assert.ok(
      Math.abs(total - 1) < 1e-9,
      `${dimension.label} weights sum to ${total}, not 1`
    );
  }
});

test('every weight refers to a real signal', () => {
  const keys = new Set(SIGNALS.map((s) => s.key));
  for (const dimension of DIMENSIONS) {
    for (const key of Object.keys(dimension.weights)) {
      assert.ok(keys.has(key), `${dimension.label} weights an unknown signal: ${key}`);
    }
  }
});

test('all signals available puts every dimension at 100%', () => {
  assert.deepEqual(pcts(allOn()), { arousal: 100, valence: 100, load: 100, readiness: 100 });
});

test('all signals off puts every dimension at 0%', () => {
  const off = without(...SIGNALS.map((s) => s.key));
  assert.deepEqual(pcts(off), { arousal: 0, valence: 0, load: 0, readiness: 0 });
});

test('dropping a signal only costs the dimensions that weight it', () => {
  // Presence contributes to cognitive load and readiness, and to nothing else.
  assert.deepEqual(pcts(without('presence')), {
    arousal: 100,
    valence: 100,
    load: 85,
    readiness: 85,
  });
});

test('a signal a dimension does not weight leaves it untouched', () => {
  // Valence has no motion or presence term.
  assert.equal(pcts(without('motion')).valence, 100);
  assert.equal(pcts(without('presence')).valence, 100);
});

test('losses accumulate across several dropped signals', () => {
  assert.deepEqual(pcts(without('heart', 'motion')), {
    arousal: 40,
    valence: 75,
    load: 75,
    readiness: 55,
  });
});

test('percentages are rounded whole numbers', () => {
  for (const dimension of computeDimensions(without('clock', 'light'))) {
    assert.equal(dimension.pct, Math.round(dimension.pct));
  }
});

test('bands split at 70% and 40%', () => {
  // Arousal: 100 → drop heart (.35) → 65 → also drop motion (.25) → 40 →
  // also drop interaction (.2) → 20.
  assert.equal(bandOf(allOn(), 'arousal'), 'high');
  assert.equal(bandOf(without('heart'), 'arousal'), 'mid');
  assert.equal(bandOf(without('heart', 'motion'), 'arousal'), 'mid');
  assert.equal(bandOf(without('heart', 'motion', 'interaction'), 'arousal'), 'low');
});

test('the band boundaries themselves fall the inclusive way', () => {
  // Readiness loses clock (.30) and lands exactly on 70; arousal loses heart
  // and motion (.60) and lands exactly on 40.
  assert.equal(pcts(without('clock')).readiness, 70);
  assert.equal(bandOf(without('clock'), 'readiness'), 'high');

  assert.equal(pcts(without('heart', 'motion')).arousal, 40);
  assert.equal(bandOf(without('heart', 'motion'), 'arousal'), 'mid');
});

test('status line reports full authority when nothing is off', () => {
  assert.equal(
    statusLine(allOn()),
    'All signals available. Every dimension is at full authority.'
  );
});

test('status line reports a hold when everything is off', () => {
  const off = without(...SIGNALS.map((s) => s.key));
  assert.equal(
    statusLine(off),
    'Nothing to read. Authority falls to zero and the output holds where it was, ' +
      'rather than guessing.'
  );
});

test('status line names the lowest dimension in sentence case', () => {
  // Interaction (.45) is cognitive load's largest term, so it falls furthest.
  assert.equal(
    statusLine(without('interaction')),
    'Cognitive load is down to 55% authority. The others keep working at theirs.'
  );

  assert.equal(
    statusLine(without('heart', 'motion')),
    'Arousal is down to 40% authority. The others keep working at theirs.'
  );
});

test('status line ties break towards the first dimension in display order', () => {
  // Presence takes load and readiness to 85% together.
  assert.equal(
    statusLine(without('presence')),
    'Cognitive load is down to 85% authority. The others keep working at theirs.'
  );
});

test('status line accepts precomputed dimensions and agrees with itself', () => {
  const on = without('light', 'clock');
  assert.equal(statusLine(on, computeDimensions(on)), statusLine(on));
});
