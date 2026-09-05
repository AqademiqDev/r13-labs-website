/* ============================================================================
   R13 Labs — site behaviour.

   Three small, independent pieces: the primary navigation, the current-page
   marker, and the contact form. Everything decorative is CSS; nothing here is
   required for the content to render.
   ============================================================================ */

(function () {
  'use strict';

  var desktopNav = window.matchMedia('(min-width: 901px)');

  // Hover-to-open is for real pointers only. On a touch screen a tap fires
  // mouseenter *and* click, so a width-only check would open the menu and then
  // immediately toggle it shut — which is what an iPad in landscape would do.
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* -------------------------------------------------------------------------
     Navigation
     ---------------------------------------------------------------------- */

  function initNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;

    var toggle = nav.querySelector('.nav__toggle');
    var panel = nav.querySelector('.nav__panel');
    var dropdown = nav.querySelector('[data-dropdown]');
    var trigger = dropdown && dropdown.querySelector('.nav__trigger');
    var menu = dropdown && dropdown.querySelector('[data-dropdown-panel]');
    var hoverTimer = null;

    function setDropdown(open) {
      if (!trigger || !menu) return;
      trigger.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
    }

    function setPanel(open) {
      if (!toggle || !panel) return;
      toggle.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('is-open', open);
      if (!open) setDropdown(false);
    }

    if (toggle && panel) {
      toggle.addEventListener('click', function () {
        setPanel(toggle.getAttribute('aria-expanded') !== 'true');
      });
    }

    if (trigger && menu) {
      trigger.addEventListener('click', function () {
        setDropdown(trigger.getAttribute('aria-expanded') !== 'true');
      });

      // Pointer users on desktop get the hover reveal the design specifies; the
      // short close delay keeps the gap between trigger and panel forgiving.
      dropdown.addEventListener('mouseenter', function () {
        if (!desktopNav.matches || !canHover.matches) return;
        window.clearTimeout(hoverTimer);
        setDropdown(true);
      });

      dropdown.addEventListener('mouseleave', function () {
        if (!desktopNav.matches || !canHover.matches) return;
        hoverTimer = window.setTimeout(function () { setDropdown(false); }, 120);
      });

      dropdown.addEventListener('focusout', function (event) {
        if (!dropdown.contains(event.relatedTarget)) setDropdown(false);
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (trigger && trigger.getAttribute('aria-expanded') === 'true') {
        setDropdown(false);
        trigger.focus();
      } else if (toggle && toggle.getAttribute('aria-expanded') === 'true') {
        setPanel(false);
        toggle.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (nav.contains(event.target)) return;
      setDropdown(false);
      if (!desktopNav.matches) setPanel(false);
    });

    desktopNav.addEventListener('change', function () {
      setPanel(false);
      setDropdown(false);
    });
  }

  /* -------------------------------------------------------------------------
     Current page

     Marked from the URL rather than baked into the partial, so the shared nav
     markup stays identical on every page.
     ---------------------------------------------------------------------- */

  function initCurrentPage() {
    var here = window.location.pathname.split('/').pop() || 'index.html';
    var links = document.querySelectorAll('.nav a[href]');

    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute('href') === here) {
        links[i].setAttribute('aria-current', 'page');
      }
    }
  }

  /* -------------------------------------------------------------------------
     Contact form
     ---------------------------------------------------------------------- */

  function initContactForm() {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;

    var sent = document.querySelector('[data-contact-sent]');
    var sentName = sent && sent.querySelector('[data-sent-name]');
    var again = sent && sent.querySelector('[data-send-another]');
    var topics = form.querySelectorAll('.topic');
    var topicValue = form.querySelector('[data-topic-value]');
    var submit = form.querySelector('.form__submit');

    for (var i = 0; i < topics.length; i++) {
      topics[i].addEventListener('click', function (event) {
        for (var j = 0; j < topics.length; j++) {
          topics[j].setAttribute('aria-pressed', String(topics[j] === event.currentTarget));
        }
        if (topicValue) topicValue.value = event.currentTarget.dataset.topic;
      });
    }

    function showError(field, message) {
      var input = field.querySelector('input, textarea');
      var error = field.querySelector('.field__error');
      if (!input || !error) return;
      input.setAttribute('aria-invalid', 'true');
      error.textContent = message;
      error.hidden = false;
    }

    function clearError(field) {
      var input = field.querySelector('input, textarea');
      var error = field.querySelector('.field__error');
      if (!input || !error) return;
      input.removeAttribute('aria-invalid');
      error.hidden = true;
    }

    function validate() {
      var fields = form.querySelectorAll('.field');
      var firstInvalid = null;

      for (var k = 0; k < fields.length; k++) {
        var field = fields[k];
        var input = field.querySelector('input, textarea');
        if (!input || !input.required) continue;

        clearError(field);
        var value = input.value.trim();

        if (!value) {
          showError(field, 'This one is required.');
        } else if (input.type === 'email' && !input.checkValidity()) {
          showError(field, 'That address does not look right.');
        } else {
          continue;
        }

        if (!firstInvalid) firstInvalid = input;
      }

      if (firstInvalid) firstInvalid.focus();
      return !firstInvalid;
    }

    form.addEventListener('input', function (event) {
      var field = event.target.closest('.field');
      if (field) clearError(field);
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!validate()) return;

      var name = (form.elements.name.value || '').trim();
      var endpoint = form.dataset.endpoint;

      function reveal() {
        if (sentName) sentName.textContent = name ? ', ' + name.split(' ')[0] : '';
        form.hidden = true;
        if (sent) {
          sent.hidden = false;
          sent.focus();
        }
      }

      // With no endpoint configured the form behaves exactly as the prototype
      // does — it confirms locally. Set data-endpoint on the <form> to POST for
      // real; see README.
      if (!endpoint) {
        reveal();
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Sending…';

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      })
        .then(function (response) {
          if (!response.ok) throw new Error('Request failed: ' + response.status);
          reveal();
        })
        .catch(function () {
          var error = form.querySelector('[data-form-error]');
          if (error) error.hidden = false;
        })
        .finally(function () {
          submit.disabled = false;
          submit.textContent = 'Send message';
        });
    });

    if (again) {
      again.addEventListener('click', function () {
        form.reset();
        for (var m = 0; m < topics.length; m++) {
          topics[m].setAttribute('aria-pressed', String(m === 0));
        }
        if (topicValue) topicValue.value = topics.length ? topics[0].dataset.topic : '';
        if (sent) sent.hidden = true;
        form.hidden = false;
        form.elements.name.focus();
      });
    }
  }

  /* -------------------------------------------------------------------------
     Confidence demo (Technology)

     The maths lives in confidence.js. This only binds the toggles and writes
     the result back into markup that already ships at full authority, so the
     panel reads correctly with the script absent or still loading.
     ---------------------------------------------------------------------- */

  function initConfidenceDemo() {
    var demo = document.querySelector('[data-confidence]');
    var model = window.R13Confidence;
    if (!demo || !model) return;

    var toggles = demo.querySelectorAll('[data-signal]');
    var rows = demo.querySelectorAll('[data-dimension]');
    var status = demo.querySelector('[data-confidence-status]');
    var signalsOn = model.allOn();

    function render() {
      var dimensions = model.computeDimensions(signalsOn);

      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var dimension = null;

        for (var j = 0; j < dimensions.length; j++) {
          if (dimensions[j].key === row.getAttribute('data-dimension')) {
            dimension = dimensions[j];
          }
        }
        if (!dimension) continue;

        var bar = row.querySelector('[data-confidence-bar]');
        var fill = row.querySelector('[data-confidence-fill]');
        var figure = row.querySelector('[data-confidence-pct]');

        row.setAttribute('data-band', dimension.band);
        fill.style.width = dimension.pct + '%';
        figure.textContent = dimension.pct + '%';
        bar.setAttribute('aria-valuenow', String(dimension.pct));
        bar.setAttribute('aria-valuetext', dimension.pct + '% authority');
      }

      if (status) status.textContent = model.statusLine(signalsOn, dimensions);
    }

    for (var t = 0; t < toggles.length; t++) {
      toggles[t].addEventListener('click', function (event) {
        var button = event.currentTarget;
        var key = button.getAttribute('data-signal');

        signalsOn[key] = !signalsOn[key];
        button.setAttribute('aria-pressed', String(signalsOn[key]));
        render();
      });
    }
  }

  initNav();
  initCurrentPage();
  initContactForm();
  initConfidenceDemo();
})();
