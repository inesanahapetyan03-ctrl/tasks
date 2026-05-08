(function () {
  'use strict';

  const RANGE_SIZE = 10;

  const cfg = Object.assign(
    {
      section: '19',
      dataVar: 'DATA_19',
      dataUrl: 'data/19.json',
      maxNumber: 119,
    },
    window.SECTION_CONFIG || {}
  );

  const $ = (sel) => document.querySelector(sel);
  const create = (tag, attrs) => Object.assign(document.createElement(tag), attrs || {});

  function buildRanges(maxNumber) {
    const ranges = [];
    for (let from = 1; from <= maxNumber; from += RANGE_SIZE) {
      const to = Math.min(from + RANGE_SIZE - 1, maxNumber);
      const label = from === to ? String(from) : `${from}–${to}`;
      ranges.push({ from, to, label, id: `g-${from}-${to}` });
    }
    return ranges;
  }

  function normalize(data) {
    if (Array.isArray(data && data.tasks)) {
      return {
        theory: Array.isArray(data.theory) ? data.theory.filter((t) => t && t.url) : [],
        tasks: data.tasks.filter((t) => Array.isArray(t.items) && t.items.length > 0),
      };
    }
    const tasks = [];
    for (const it of (data && data.items) || []) {
      const items = [];
      if (it.mainUrl) items.push({ label: 'Разбор', type: 'main', url: it.mainUrl });
      if (it.homeworkUrl) items.push({ label: 'ДЗ', type: 'homework', url: it.homeworkUrl });
      if (items.length) tasks.push({ number: it.number, items });
    }
    const theory = data && data.theoryUrl ? [{ title: 'Открыть теорию', url: data.theoryUrl }] : [];
    return { theory, tasks };
  }

  function renderTheoryGrid(theory) {
    const section = $('#theory-section');
    const grid = $('#theory-grid');
    if (!grid || !section) return false;
    grid.innerHTML = '';
    if (!theory.length) {
      section.hidden = true;
      return true;
    }
    section.hidden = false;
    for (const t of theory) {
      const card = create('a', { className: 'theory-card', href: t.url });
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
      card.appendChild(create('div', { className: 'theory-card-title', textContent: t.title }));
      card.appendChild(create('span', { className: 'theory-card-cta', textContent: 'Открыть видео →' }));
      grid.appendChild(card);
    }
    return true;
  }

  function renderTheoryLegacy(theory) {
    const block = $('#theory');
    const link = $('#theory-link');
    if (!block || !link) return;
    const url = theory.length ? theory[0].url : '';
    if (!url) {
      block.hidden = true;
      return;
    }
    link.href = url;
    block.hidden = false;
  }

  function renderTheory(theory) {
    if (!renderTheoryGrid(theory)) renderTheoryLegacy(theory);
  }

  function renderStats(tasks, theoryCount) {
    let main = 0,
      methods = 0,
      hw = 0,
      videos = 0;
    for (const t of tasks) {
      for (const it of t.items) {
        videos++;
        if (it.type === 'main') main++;
        else if (it.type === 'method') methods++;
        else if (it.type === 'homework') hw++;
      }
    }

    const data = [{ value: videos, label: 'Доступно видео' }, { value: tasks.length, label: 'Задач с материалами' }];
    if (cfg.section === '18') {
      data.push({ value: main + methods, label: 'Разборов и способов' });
    } else {
      data.push({ value: main, label: 'Разборов' });
    }
    data.push({ value: hw, label: 'ДЗ' });
    if (theoryCount > 0) data.push({ value: theoryCount, label: 'Теоретических видео' });

    const root = $('#stats');
    if (!root) return;
    root.innerHTML = '';
    for (const s of data) {
      const card = create('div', { className: 'stat' });
      card.appendChild(create('div', { className: 'stat-value', textContent: String(s.value) }));
      card.appendChild(create('div', { className: 'stat-label', textContent: s.label }));
      root.appendChild(card);
    }
  }

  function renderRangeNav(ranges, tasks) {
    const nav = $('#range-nav');
    if (!nav) return;
    nav.innerHTML = '';
    for (const r of ranges) {
      const has = tasks.some((t) => t.number >= r.from && t.number <= r.to);
      if (!has) continue;
      const btn = create('button', { type: 'button', className: 'range-btn', textContent: r.label });
      btn.addEventListener('click', () => {
        const el = document.getElementById(r.id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      nav.appendChild(btn);
    }
  }

  function buttonClass(type) {
    if (type === 'homework') return 'btn-secondary';
    if (type === 'method') return 'btn-method';
    return 'btn-primary';
  }

  function renderTaskCard(task) {
    const card = create('article', { className: 'task-card' });
    card.dataset.number = String(task.number);
    const numText = cfg.section === '19' ? `№${task.number}` : `${cfg.section}.${task.number}`;
    card.appendChild(create('div', { className: 'task-num', textContent: numText }));
    const buttons = create('div', { className: 'task-buttons' });
    for (const item of task.items) {
      const a = create('a', {
        className: 'btn ' + buttonClass(item.type),
        href: item.url,
        textContent: item.label,
      });
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      buttons.appendChild(a);
    }
    card.appendChild(buttons);
    return card;
  }

  function renderGroups(ranges, tasks) {
    const root = $('#groups');
    const empty = $('#empty');
    if (!root) return;
    root.innerHTML = '';
    if (!tasks.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    for (const r of ranges) {
      const inRange = tasks.filter((t) => t.number >= r.from && t.number <= r.to);
      if (!inRange.length) continue;
      const group = create('section', { className: 'group', id: r.id });
      group.dataset.from = String(r.from);
      group.dataset.to = String(r.to);
      group.appendChild(create('h2', { textContent: `№${r.label}` }));
      const list = create('div', { className: 'tasks' });
      for (const t of inRange) list.appendChild(renderTaskCard(t));
      group.appendChild(list);
      root.appendChild(group);
    }
  }

  function applySearch(query) {
    const empty = $('#empty');
    let q = (query || '').trim();
    const groups = document.querySelectorAll('.group');
    if (q === '') {
      groups.forEach((g) => {
        g.hidden = false;
        g.querySelectorAll('.task-card').forEach((c) => (c.hidden = false));
      });
      if (empty) empty.hidden = groups.length === 0;
      return;
    }
    const sectionPrefix = cfg.section + '.';
    if (q.startsWith(sectionPrefix)) q = q.slice(sectionPrefix.length);
    q = q.trim();
    const num = /^\d+$/.test(q) ? parseInt(q, 10) : null;

    let anyVisible = false;
    groups.forEach((g) => {
      let groupVisible = false;
      g.querySelectorAll('.task-card').forEach((c) => {
        const n = parseInt(c.dataset.number, 10);
        let match;
        if (num !== null) match = n === num;
        else match = String(n).includes(q);
        c.hidden = !match;
        if (match) groupVisible = true;
      });
      g.hidden = !groupVisible;
      if (groupVisible) anyVisible = true;
    });
    if (empty) empty.hidden = anyVisible;
  }

  async function loadData() {
    if (window[cfg.dataVar]) return window[cfg.dataVar];
    const res = await fetch(cfg.dataUrl, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async function init() {
    let data;
    try {
      data = await loadData();
    } catch (e) {
      const groups = $('#groups');
      const empty = $('#empty');
      if (groups) groups.innerHTML = '';
      if (empty) {
        empty.hidden = false;
        empty.textContent =
          'Не удалось загрузить данные. Откройте сайт через локальный сервер или пересоберите data/' +
          cfg.section +
          '.js скриптом scripts/convert-markdown-to-json.js';
      }
      return;
    }

    const norm = normalize(data);
    const ranges = buildRanges(cfg.maxNumber);

    renderTheory(norm.theory);
    renderStats(norm.tasks, norm.theory.length);
    renderRangeNav(ranges, norm.tasks);
    renderGroups(ranges, norm.tasks);

    const search = $('#search');
    if (search) search.addEventListener('input', (e) => applySearch(e.target.value));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
