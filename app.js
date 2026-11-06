(function () {
  'use strict';

  var cfg = window.PARTY || {};
  var start = new Date(cfg.start).getTime();
  var end = new Date(cfg.end).getTime();

  /* ---------- Countdown ---------- */

  var board = document.getElementById('cd-board');
  var label = document.getElementById('cd-label');
  var cells = {};
  board.querySelectorAll('[data-unit]').forEach(function (el) { cells[el.dataset.unit] = el; });

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function tick() {
    var now = Date.now();
    if (now >= start) {
      label.hidden = true;
      board.outerHTML = '<p class="countdown-live">' +
        (now < end ? '🏁 המרוץ התחיל!' : '🏆 תודה שהגעתם למרוץ!') + '</p>';
      return false;
    }
    var s = Math.floor((start - now) / 1000);
    cells.d.textContent = Math.floor(s / 86400);
    cells.h.textContent = pad(Math.floor(s % 86400 / 3600));
    cells.m.textContent = pad(Math.floor(s % 3600 / 60));
    cells.s.textContent = pad(s % 60);
    return true;
  }

  if (tick()) {
    var timer = setInterval(function () { if (!tick()) clearInterval(timer); }, 1000);
  }

  /* ---------- PayBox link (editable from the sheet) ---------- */

  var payLink = document.getElementById('paybox-link');
  if (cfg.paybox) payLink.href = cfg.paybox;

  if (cfg.scriptUrl && window.fetch) {
    var ctrl = window.AbortController ? new AbortController() : null;
    if (ctrl) setTimeout(function () { ctrl.abort(); }, 5000);
    fetch(cfg.scriptUrl + '?action=config', ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && typeof data.paybox === 'string' && /^https:\/\//.test(data.paybox)) {
          payLink.href = data.paybox;
        }
      })
      .catch(function () { /* keep the built-in link */ });
  }

  /* ---------- RSVP form ---------- */

  var form = document.getElementById('rsvp-form');
  var nameInput = document.getElementById('child-name');
  var nameError = document.getElementById('name-error');
  var allergyError = document.getElementById('allergies-error');
  var detailsField = document.getElementById('details-field');
  var detailsInput = document.getElementById('allergy-details');
  var submitBtn = form.querySelector('.btn-submit');
  var formError = document.getElementById('form-error');
  var done = document.getElementById('rsvp-done');
  var doneName = document.getElementById('done-name');
  var previewNote = document.getElementById('preview-note');
  var againBtn = document.getElementById('rsvp-again');

  function allergyValue() {
    var checked = form.querySelector('input[name="allergies"]:checked');
    return checked ? checked.value : '';
  }

  function setFieldError(errorEl, show) {
    errorEl.hidden = !show;
    errorEl.closest('.field').classList.toggle('has-error', show);
  }

  form.addEventListener('change', function (e) {
    if (e.target.name === 'allergies') {
      var yes = e.target.value === 'yes';
      detailsField.hidden = !yes;
      if (!yes) detailsInput.value = '';
      setFieldError(allergyError, false);
    }
  });

  nameInput.addEventListener('input', function () {
    if (nameInput.value.trim()) setFieldError(nameError, false);
  });

  function setSending(on) {
    submitBtn.disabled = on;
    submitBtn.querySelector('.btn-label').hidden = on;
    submitBtn.querySelector('.btn-sending').hidden = !on;
  }

  function send(data) {
    if (!cfg.scriptUrl) {
      // Preview mode: nothing is saved.
      return new Promise(function (resolve) { setTimeout(resolve, 600); });
    }
    // Apps Script doesn't send CORS headers on POST, so the response is opaque.
    // A resolved fetch means the request reached Google.
    return fetch(cfg.scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      body: new URLSearchParams(data),
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    formError.hidden = true;

    var name = nameInput.value.trim();
    var allergies = allergyValue();
    setFieldError(nameError, !name);
    setFieldError(allergyError, !allergies);
    if (!name) { nameInput.focus(); return; }
    if (!allergies) { form.querySelector('input[name="allergies"]').focus(); return; }

    var data = {
      name: name,
      allergies: allergies,
      details: allergies === 'yes' ? detailsInput.value.trim() : '',
    };

    setSending(true);
    send(data)
      .then(function () {
        doneName.textContent = name;
        previewNote.hidden = !!cfg.scriptUrl;
        form.hidden = true;
        done.hidden = false;
        done.focus({ preventScroll: true });
        done.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch(function () {
        formError.hidden = false;
      })
      .then(function () { setSending(false); });
  });

  againBtn.addEventListener('click', function () {
    form.reset();
    detailsField.hidden = true;
    done.hidden = true;
    form.hidden = false;
    nameInput.focus();
  });
})();
