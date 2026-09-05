/* ============================================================================
   R13 Labs — the Technology page's confidence model.

   The one piece of real logic on the site: each state dimension fuses a fixed
   set of weighted signals, and its authority is the share of those weights that
   were actually available. Kept apart from site.js and free of any DOM so the
   numbers can be tested directly — see test/confidence.test.js.

   Loaded as a plain <script> in the browser (window.R13Confidence) and with
   require() under Node.
   ============================================================================ */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.R13Confidence = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SIGNALS = [
    { key: 'interaction', label: 'INTERACTION' },
    { key: 'motion', label: 'MOTION' },
    { key: 'light', label: 'AMBIENT LIGHT' },
    { key: 'heart', label: 'HEART RATE' },
    { key: 'presence', label: 'PRESENCE' },
    { key: 'clock', label: 'CLOCK' },
  ];

  // Weights sum to 1.00 per dimension, so every signal available is 100%.
  var DIMENSIONS = [
    {
      key: 'arousal',
      label: 'AROUSAL',
      weights: { heart: .35, motion: .25, interaction: .2, light: .1, clock: .1 },
    },
    {
      key: 'valence',
      label: 'VALENCE',
      weights: { interaction: .35, heart: .25, light: .2, clock: .2 },
    },
    {
      key: 'load',
      label: 'COGNITIVE LOAD',
      weights: { interaction: .45, motion: .25, presence: .15, clock: .15 },
    },
    {
      key: 'readiness',
      label: 'READINESS',
      weights: { clock: .3, heart: .25, motion: .2, presence: .15, light: .1 },
    },
  ];

  var FULL_AUTHORITY = 'All signals available. Every dimension is at full authority.';
  var NO_AUTHORITY =
    'Nothing to read. Authority falls to zero and the output holds where it was, ' +
    'rather than guessing.';

  /** Every signal on — the state the page ships in. */
  function allOn() {
    var on = {};
    for (var i = 0; i < SIGNALS.length; i++) on[SIGNALS[i].key] = true;
    return on;
  }

  /* The three bands are named rather than resolved to colour here: the hexes
     live in the token layer, and the row carries the name as a data attribute. */
  function bandFor(pct) {
    if (pct >= 70) return 'high';
    if (pct >= 40) return 'mid';
    return 'low';
  }

  /** Authority per dimension, as a whole percentage. */
  function computeDimensions(signalsOn) {
    return DIMENSIONS.map(function (dimension) {
      var available = 0;

      for (var key in dimension.weights) {
        if (signalsOn[key]) available += dimension.weights[key];
      }

      var pct = Math.round(available * 100);

      return {
        key: dimension.key,
        label: dimension.label,
        pct: pct,
        band: bandFor(pct),
      };
    });
  }

  function sentenceCase(label) {
    return label.charAt(0) + label.slice(1).toLowerCase();
  }

  /**
   * The single line under the rows. With some — but not all — signals off it
   * names the worst-hit dimension; ties go to the first in display order.
   */
  function statusLine(signalsOn, dimensions) {
    var off = 0;
    for (var i = 0; i < SIGNALS.length; i++) {
      if (!signalsOn[SIGNALS[i].key]) off++;
    }

    if (off === 0) return FULL_AUTHORITY;
    if (off === SIGNALS.length) return NO_AUTHORITY;

    var lowest = (dimensions || computeDimensions(signalsOn)).reduce(function (a, b) {
      return a.pct <= b.pct ? a : b;
    });

    return (
      sentenceCase(lowest.label) +
      ' is down to ' +
      lowest.pct +
      '% authority. The others keep working at theirs.'
    );
  }

  return {
    SIGNALS: SIGNALS,
    DIMENSIONS: DIMENSIONS,
    allOn: allOn,
    computeDimensions: computeDimensions,
    statusLine: statusLine,
  };
});
