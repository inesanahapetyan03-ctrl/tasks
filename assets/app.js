(function () {
  'use strict';

  const RANGE_SIZE = 10;
  const MAX_NUMBER = 119;

  const $ = (sel) => document.querySelector(sel);
  const create = (tag, attrs) => Object.assign(document.createElement(tag), attrs || {});

  function buildRanges(maxNumber) {
    const ranges = [];
    for (let from = 1; from <= maxNumber; from += RANGE_SIZE) {
      const to = Math.min(from + RANGE_SIZE - 1, maxNumber);
      ranges.push({ from, to, id: `g-${from}-${to}` });
    }
    return ranges;
  }

  function hasAny(item) {
    return !!(item && (item.mainUrl || item.homeworkUrl));
  }

  function renderTheory(theoryUrl) {
    const block = $('#theory');
    if (!theoryUrl) {
      block.hidden = true;
      return;
    }
    const link = $('#theory-link');
    link.href = theoryUrl;
    block.hidden = false;
  }

  function renderStats(items) {
    const total = items.length;
    const main = items.filter((i) => i.mainUrl).length;
    const hw = items.filter((i) => i.homeworkUrl).length;
    const withAny = items.filter(hasAny).length;
    const videos = main + hw;

    const data = [
      { value: videos, label: 'Доступно видео' },
      { value: withAny, label: 'Задач с материалами' },
      { value: main, label: 'Разборов' },
      { value: hw, label: 'ДЗ' },
    ];

    const stats = $('#stats');
    stats.innerHTML = '';
    for (const s of data) {
      const card = create('div', { className: 'stat' });
      card.appendChild(create('div', { className: 'stat-value', textContent: String(s.value) }));
      card.appendChild(create('div', { className: 'stat-label', textContent: s.label }));
      stats.appendChild(card);
    }
    void total;
  }

  function renderRangeNav(ranges, items) {
    const nav = $('#range-nav');
    nav.innerHTML = '';
    for (const r of ranges) {
      const hasAvailable = items.some((i) => i.number >= r.from && i.number <= r.to && hasAny(i));
      const btn = create('button', {
        type: 'button',
        className: 'range-btn' + (hasAvailable ? '' : ' disabled'),
        textContent: `${r.from}–${r.to}`,
      });
      if (hasAvailable) {
        btn.addEventListener('click', () => {
          const el = document.getElementById(r.id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } else {
        btn.setAttribute('aria-disabled', 'true');
      }
      nav.appendChild(btn);
    }
  }

  function renderTaskCard(item) {
    const card = create('article', { className: 'task-card' });
    card.dataset.number = String(item.number);
    card.appendChild(create('div', { className: 'task-num', textContent: `№${item.number}` }));

    const buttons = create('div', { className: 'task-buttons' });
    if (item.mainUrl) {
      const a = create('a', {
        className: 'btn btn-primary',
        href: item.mainUrl,
        textContent: 'Разбор',
      });
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      buttons.appendChild(a);
    }
    if (item.homeworkUrl) {
      const a = create('a', {
        className: 'btn btn-secondary',
        href: item.homeworkUrl,
        textContent: 'ДЗ',
      });
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      buttons.appendChild(a);
    }
    card.appendChild(buttons);
    return card;
  }

  function renderGroups(ranges, items) {
    const root = $('#groups');
    root.innerHTML = '';
    const available = items.filter(hasAny);
    if (available.length === 0) {
      $('#empty').hidden = false;
      return;
    }
    $('#empty').hidden = true;

    for (const r of ranges) {
      const inRange = available.filter((i) => i.number >= r.from && i.number <= r.to);
      if (inRange.length === 0) continue;

      const group = create('section', { className: 'group', id: r.id });
      group.dataset.from = String(r.from);
      group.dataset.to = String(r.to);
      group.appendChild(create('h2', { textContent: `№${r.from}–${r.to}` }));

      const list = create('div', { className: 'tasks' });
      for (const item of inRange) list.appendChild(renderTaskCard(item));
      group.appendChild(list);
      root.appendChild(group);
    }
  }

  function applySearch(query) {
    const q = (query || '').trim();
    const groups = document.querySelectorAll('.group');
    let anyVisible = false;

    if (q === '') {
      groups.forEach((g) => {
        g.hidden = false;
        g.querySelectorAll('.task-card').forEach((c) => (c.hidden = false));
      });
      $('#empty').hidden = groups.length === 0;
      return;
    }

    const num = /^\d+$/.test(q) ? parseInt(q, 10) : null;

    groups.forEach((g) => {
      let groupVisible = false;
      g.querySelectorAll('.task-card').forEach((c) => {
        const n = parseInt(c.dataset.number, 10);
        let match;
        if (num !== null) {
          match = n === num;
        } else {
          match = String(n).includes(q);
        }
        c.hidden = !match;
        if (match) groupVisible = true;
      });
      g.hidden = !groupVisible;
      if (groupVisible) anyVisible = true;
    });

    $('#empty').hidden = anyVisible;
  }

  async function loadData() {
    if (window.DATA_19) return window.DATA_19;
    const res = await fetch('data/19.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async function init() {
    let data;
    try {
      data = await loadData();
    } catch (e) {
      $('#groups').innerHTML = '';
      $('#empty').hidden = false;
      $('#empty').textContent =
        'Не удалось загрузить данные. Перегенерируйте data/19.js скриптом scripts/convert-19-md-to-json.js или откройте сайт через локальный сервер.';
      return;
    }

    const items = Array.isArray(data.items) ? data.items : [];
    const ranges = buildRanges(MAX_NUMBER);

    renderTheory(data.theoryUrl || '');
    renderStats(items);
    renderRangeNav(ranges, items);
    renderGroups(ranges, items);

    const search = $('#search');
    search.addEventListener('input', (e) => applySearch(e.target.value));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
