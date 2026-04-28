/**
 * module-cards.js
 * Drives the Architecture Overview module cards.
 *
 * Responsibilities:
 *  - Lazy-fetch per-module markdown from lists/{module}.md
 *  - Toggle expanded / collapsed state with accordion behaviour
 *  - Keyboard accessibility (Enter / Space)
 */

(function () {
  'use strict';

  /* ── State helpers ─────────────────────────────────────────── */

  function setExpanded(card, expanded) {
    card.classList.toggle('is-expanded', expanded);
    card.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function collapseAll(cards, except) {
    cards.forEach((c) => {
      if (c !== except) setExpanded(c, false);
    });
  }

  /* ── Markdown loader ───────────────────────────────────────── */

  async function loadDetails(card) {
    const moduleName = card.dataset.module;
    const detailsEl = card.querySelector('.module-card__details');
    if (!moduleName || !detailsEl) return;
    if (detailsEl.dataset.loaded === 'true') return;

    detailsEl.dataset.loaded = 'true';
    detailsEl.innerHTML = '<p style="color:#94a3b8;font-size:0.8rem">Loading…</p>';

    try {
      const res = await fetch(`lists/${moduleName}.md?_t=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const raw = (await res.text()).trim();

      /* Simple markdown → HTML:
         - ## Heading  → <h4>
         - **bold**    → <strong>
         - * / - item  → accumulated into <ul>
         - blank line  → paragraph break              */
      const lines = raw.replace(/\r\n/g, '\n').split('\n');
      const blocks = [];
      let para = [];
      let listItems = [];

      const flushPara = () => {
        if (!para.length) return;
        blocks.push(`<p>${fmt(para.join(' '))}</p>`);
        para = [];
      };
      const flushList = () => {
        if (!listItems.length) return;
        blocks.push(`<ul>${listItems.map((li) => `<li>${fmt(li)}</li>`).join('')}</ul>`);
        listItems = [];
      };
      const fmt = (t) =>
        t
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

      lines.forEach((raw) => {
        const line = raw.trim();
        if (!line) { flushPara(); flushList(); return; }

        const heading = line.match(/^#{1,3}\s+(.*)/);
        if (heading) {
          flushPara(); flushList();
          blocks.push(`<h4 class="mc-detail-heading">${fmt(heading[1])}</h4>`);
          return;
        }
        const listItem = line.match(/^[*\-]\s+(.*)/);
        if (listItem) { flushPara(); listItems.push(listItem[1]); return; }
        flushList();
        para.push(line);
      });
      flushPara();
      flushList();

      detailsEl.innerHTML = blocks.join('');
    } catch (err) {
      detailsEl.innerHTML = `<p class="mc-detail-error">Could not load details: ${err.message}</p>`;
    }
  }

  /* ── Init ──────────────────────────────────────────────────── */

  function init() {
    const cards = Array.from(document.querySelectorAll('.module-card[data-module]'));
    if (!cards.length) return;

    /* Preload all details so expand feels instant */
    cards.forEach(loadDetails);

    cards.forEach((card) => {
      const toggle = async () => {
        const next = !card.classList.contains('is-expanded');
        collapseAll(cards, next ? card : null);
        setExpanded(card, next);
        if (next) await loadDetails(card);
      };

      card.addEventListener('click', toggle);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
