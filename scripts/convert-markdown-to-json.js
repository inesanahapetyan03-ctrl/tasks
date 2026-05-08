#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SECTIONS = {
  '17': {
    src: '17.md',
    out: 'data/17.json',
    outJs: 'data/17.js',
    dataVar: 'DATA_17',
    title: '№17 — видеоразборы',
  },
  '18': {
    src: '18.md',
    out: 'data/18.json',
    outJs: 'data/18.js',
    dataVar: 'DATA_18',
    title: '№18 — видеоразборы',
  },
  '19': {
    src: '19.md',
    out: 'data/19.json',
    outJs: 'data/19.js',
    dataVar: 'DATA_19',
    title: '№19 — видеоразборы',
    legacy: true,
  },
};

function extractUrl(cell) {
  if (!cell) return '';
  const m = cell.match(/\((https?:\/\/[^)\s]+)\)/);
  return m ? m[1] : '';
}

function parseRows(md) {
  const rows = [];
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    if (/^\|\s*-+\s*\|/.test(line)) continue;
    if (/^\|\s*Материал\s*\|/i.test(line)) continue;
    const parts = line.split('|').map((s) => s.trim());
    const cells = parts.slice(1, -1);
    if (cells.length < 2) continue;
    const label = cells[0].replace(/^#+/, '').trim();
    const url = extractUrl(cells[1]);
    if (!label) continue;
    rows.push({ label, url });
  }
  return rows;
}

function methodFromText(text) {
  const t = text.trim().toLowerCase();
  if (t === 'первый способ') return { label: '1 способ', order: 1 };
  if (t === 'второй способ') return { label: '2 способ', order: 2 };
  if (t === 'третий способ') return { label: '3 способ', order: 3 };
  if (t === 'четвёртый способ' || t === 'четвертый способ') return { label: '4 способ', order: 4 };
  if (t === 'пятый способ') return { label: '5 способ', order: 5 };
  return { label: text.trim(), order: 90 };
}

function parseSection(section, md, title) {
  const sectionPrefixRe = new RegExp(`^${section}\\.(\\d+)\\s*(.*)$`);
  const rows = parseRows(md);
  const theory = [];
  const taskMap = new Map();

  for (const { label, url } of rows) {
    const m = label.match(sectionPrefixRe);
    if (m) {
      const number = parseInt(m[1], 10);
      const rest = (m[2] || '').trim();
      if (!url) continue;
      let item;
      if (!rest) {
        item = { label: 'Разбор', type: 'main', url, _order: 0 };
      } else if (/^ДЗ$/i.test(rest)) {
        item = { label: 'ДЗ', type: 'homework', url, _order: 50 };
      } else {
        const bracket = rest.match(/^\((.+)\)$/);
        if (bracket) {
          const ml = methodFromText(bracket[1]);
          item = { label: ml.label, type: 'method', url, _order: ml.order };
        } else {
          item = { label: rest, type: 'method', url, _order: 90 };
        }
      }
      if (!taskMap.has(number)) taskMap.set(number, []);
      taskMap.get(number).push(item);
    } else {
      if (url) theory.push({ title: label, url });
    }
  }

  const tasks = Array.from(taskMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([number, items]) => {
      items.sort((a, b) => a._order - b._order);
      items.forEach((i) => delete i._order);
      return { number, items };
    });

  return { section, title, theory, tasks };
}

function parseLegacy19(md) {
  const rows = parseRows(md);
  const items = new Map();
  let theoryUrl = '';
  for (const { label, url } of rows) {
    if (/^Теория$/i.test(label)) {
      theoryUrl = url;
      continue;
    }
    const m = label.match(/^№\s*(\d+)\s*(ДЗ)?$/i);
    if (!m) continue;
    const number = parseInt(m[1], 10);
    const isHomework = !!m[2];
    if (!items.has(number)) items.set(number, { number, mainUrl: '', homeworkUrl: '' });
    const it = items.get(number);
    if (isHomework) it.homeworkUrl = url;
    else it.mainUrl = url;
  }
  const sorted = Array.from(items.values()).sort((a, b) => a.number - b.number);
  return { theoryUrl, items: sorted };
}

function buildOne(num) {
  const cfg = SECTIONS[num];
  if (!cfg) {
    console.error(`Неизвестный раздел: ${num}`);
    return false;
  }
  const src = path.join(ROOT, cfg.src);
  if (!fs.existsSync(src)) {
    console.warn(`Пропущен ${cfg.src} — файл не найден`);
    return false;
  }
  const md = fs.readFileSync(src, 'utf8');
  const data = cfg.legacy ? parseLegacy19(md) : parseSection(num, md, cfg.title);

  const out = path.join(ROOT, cfg.out);
  const outJs = path.join(ROOT, cfg.outJs);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.writeFileSync(outJs, `window.${cfg.dataVar} = ${JSON.stringify(data, null, 2)};\n`, 'utf8');

  if (cfg.legacy) {
    const total = data.items.length;
    const main = data.items.filter((i) => i.mainUrl).length;
    const hw = data.items.filter((i) => i.homeworkUrl).length;
    const withAny = data.items.filter((i) => i.mainUrl || i.homeworkUrl).length;
    console.log(
      `№${num}: всего ${total} | разборов ${main} | ДЗ ${hw} | хотя бы одно видео ${withAny} | теория ${data.theoryUrl ? 'есть' : 'нет'}`
    );
  } else {
    let main = 0,
      methods = 0,
      hw = 0,
      videos = 0;
    for (const t of data.tasks) {
      for (const i of t.items) {
        videos++;
        if (i.type === 'main') main++;
        else if (i.type === 'method') methods++;
        else if (i.type === 'homework') hw++;
      }
    }
    console.log(
      `№${num}: задач ${data.tasks.length} | разборов ${main} | способов ${methods} | ДЗ ${hw} | теория ${data.theory.length} | видео ${videos}`
    );
  }
  return true;
}

function main() {
  const args = process.argv.slice(2);
  const targets = args.length ? args : Object.keys(SECTIONS);
  for (const t of targets) buildOne(t);
}

main();
