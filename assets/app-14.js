(function () {
  'use strict';

  const cfg = { dataVar: 'DATA_14', dataUrl: 'data/14.json' };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const create = (tag, attrs) => Object.assign(document.createElement(tag), attrs || {});

  function buttonClass(type) {
    if (type === 'homework') return 'btn-secondary';
    if (type === 'method') return 'btn-method';
    return 'btn-primary';
  }

  function shortTitle(t) {
    return (t || '').replace(/\s*\([^)]*\)\s*$/, '').trim() || t;
  }

  function topicAnchorId(id) {
    return 't-' + String(id).replace(/\./g, '-');
  }

  function renderGeneralTheory(gt) {
    const section = $('#general-theory');
    const card = $('#general-theory-card');
    if (!section || !card) return;
    if (!gt || !gt.url) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    card.innerHTML = '';
    const a = create('a', { className: 'theory-card', href: gt.url });
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.appendChild(create('div', { className: 'theory-card-title', textContent: gt.title || 'Открыть общую теорию' }));
    a.appendChild(create('span', { className: 'theory-card-cta', textContent: 'Открыть видео →' }));
    card.appendChild(a);
  }

  function renderTopicNav(topics) {
    const nav = $('#topic-nav');
    if (!nav) return;
    nav.innerHTML = '';
    for (const t of topics) {
      const btn = create('button', {
        type: 'button',
        className: 'topic-nav-btn',
        textContent: `${t.id} ${shortTitle(t.title)}`,
      });
      btn.addEventListener('click', () => {
        const el = document.getElementById(topicAnchorId(t.id));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      nav.appendChild(btn);
    }
  }

  function renderTaskCard(task) {
    const card = create('article', { className: 'task-card' });
    card.dataset.id = task.id;
    card.appendChild(create('div', { className: 'task-num', textContent: task.id }));
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

  function renderTopics(topics) {
    const root = $('#topics');
    const empty = $('#empty');
    if (!root) return;
    root.innerHTML = '';
    if (!topics.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    for (const topic of topics) {
      const block = create('section', { className: 'topic-block' });
      block.id = topicAnchorId(topic.id);
      block.dataset.id = topic.id;
      block.dataset.titleLower = (topic.title || '').toLowerCase();

      const header = create('div', { className: 'topic-header' });
      header.appendChild(create('h2', {
        className: 'topic-title',
        textContent: `${topic.id} ${topic.title}`,
      }));
      if (topic.theory && topic.theory.url) {
        const a = create('a', {
          className: 'btn btn-primary topic-theory-btn',
          href: topic.theory.url,
          textContent: topic.theory.title || 'Открыть теорию',
        });
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        header.appendChild(a);
      }
      block.appendChild(header);

      if (topic.tasks && topic.tasks.length) {
        block.appendChild(create('h3', { className: 'topic-practice-title', textContent: 'Практика' }));
        const list = create('div', { className: 'tasks' });
        for (const t of topic.tasks) list.appendChild(renderTaskCard(t));
        block.appendChild(list);
      }
      root.appendChild(block);
    }
  }

  function renderStats(data) {
    let videos = 0,
      theory = 0,
      main = 0,
      hw = 0,
      tasksWithVideo = 0;
    if (data.generalTheory && data.generalTheory.url) {
      videos++;
      theory++;
    }
    const topics = data.topics || [];
    for (const t of topics) {
      if (t.theory && t.theory.url) {
        videos++;
        theory++;
      }
      for (const task of t.tasks || []) {
        if (task.items.length) tasksWithVideo++;
        for (const it of task.items) {
          videos++;
          if (it.type === 'homework') hw++;
          else main++;
        }
      }
    }
    const items = [
      { value: videos, label: 'Доступно видео' },
      { value: theory, label: 'Теоретических видео' },
      { value: main, label: 'Разборов и способов' },
      { value: hw, label: 'ДЗ' },
      { value: tasksWithVideo, label: 'Задач с материалами' },
      { value: topics.length, label: 'Тематических блоков' },
    ];
    const root = $('#stats');
    if (!root) return;
    root.innerHTML = '';
    for (const s of items) {
      const card = create('div', { className: 'stat' });
      card.appendChild(create('div', { className: 'stat-value', textContent: String(s.value) }));
      card.appendChild(create('div', { className: 'stat-label', textContent: s.label }));
      root.appendChild(card);
    }
  }

  function applySearch(qRaw) {
    const q = (qRaw || '').trim().toLowerCase();
    const topics = $$('.topic-block');
    const empty = $('#empty');

    if (!q) {
      topics.forEach((t) => {
        t.hidden = false;
        t.querySelectorAll('.task-card').forEach((c) => (c.hidden = false));
      });
      if (empty) empty.hidden = topics.length === 0;
      return;
    }

    let qid = q;
    if (qid.startsWith('14.')) qid = qid.slice(3);
    const isIdLike = /^[\d.]+$/.test(qid) && qid !== '';

    let anyVisible = false;

    topics.forEach((t) => {
      const topicId = t.dataset.id;
      const topicNum = topicId.replace(/^14\./, '');
      const titleLower = t.dataset.titleLower || '';
      const cards = t.querySelectorAll('.task-card');
      let topicMatch = false;

      if (isIdLike) {
        const dot = qid.indexOf('.');
        const topicPart = dot === -1 ? qid : qid.slice(0, dot);
        const taskPart = dot === -1 ? '' : qid.slice(dot + 1);
        const topicMatches = topicPart === topicNum;
        cards.forEach((c) => {
          const parts = (c.dataset.id || '').split('.');
          const cardTaskNum = parts[2] || '';
          let show = false;
          if (topicMatches) {
            if (taskPart === '') show = true;
            else show = cardTaskNum === taskPart;
          }
          c.hidden = !show;
        });
        topicMatch = topicMatches;
      } else {
        const inTitle = titleLower.includes(q);
        cards.forEach((c) => (c.hidden = !inTitle));
        topicMatch = inTitle;
      }

      t.hidden = !topicMatch;
      if (topicMatch) anyVisible = true;
    });

    if (empty) empty.hidden = anyVisible;
  }

  async function loadData() {
    if (window[cfg.dataVar]) return window[cfg.dataVar];
    const res = await fetch(cfg.dataUrl, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  async function init() {
    let data;
    try {
      data = await loadData();
    } catch (e) {
      const root = $('#topics');
      const empty = $('#empty');
      if (root) root.innerHTML = '';
      if (empty) {
        empty.hidden = false;
        empty.textContent =
          'Не удалось загрузить данные. Откройте сайт через локальный сервер или пересоберите data/14.js скриптом scripts/convert-markdown-to-json.js';
      }
      return;
    }

    renderStats(data);
    renderGeneralTheory(data.generalTheory);
    renderTopicNav(data.topics || []);
    renderTopics(data.topics || []);

    const search = $('#search');
    if (search) search.addEventListener('input', (e) => applySearch(e.target.value));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
