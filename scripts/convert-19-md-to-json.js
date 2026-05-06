#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, '19.md');
const OUT = path.join(ROOT, 'data', '19.json');
const OUT_JS = path.join(ROOT, 'data', '19.js');

function extractUrl(cell) {
  if (!cell) return '';
  const match = cell.match(/\((https?:\/\/[^)\s]+)\)/);
  return match ? match[1] : '';
}

function parse(md) {
  const lines = md.split(/\r?\n/);
  const items = new Map();
  let theoryUrl = '';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;
    if (/^\|\s*-+\s*\|/.test(line)) continue;
    if (/^\|\s*Материал\s*\|/i.test(line)) continue;

    const parts = line.split('|').map(s => s.trim());
    const cells = parts.slice(1, -1);
    if (cells.length < 2) continue;

    const label = cells[0];
    const url = extractUrl(cells[1]);

    if (/^Теория$/i.test(label)) {
      theoryUrl = url;
      continue;
    }

    const m = label.match(/^№\s*(\d+)\s*(ДЗ)?$/i);
    if (!m) continue;
    const number = parseInt(m[1], 10);
    const isHomework = !!m[2];

    if (!items.has(number)) {
      items.set(number, { number, mainUrl: '', homeworkUrl: '' });
    }
    const item = items.get(number);
    if (isHomework) item.homeworkUrl = url;
    else item.mainUrl = url;
  }

  const sorted = Array.from(items.values()).sort((a, b) => a.number - b.number);
  return { theoryUrl, items: sorted };
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Не найден файл ${SRC}`);
    process.exit(1);
  }
  const md = fs.readFileSync(SRC, 'utf8');
  const data = parse(md);

  if (!fs.existsSync(path.dirname(OUT))) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
  }
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.writeFileSync(
    OUT_JS,
    'window.DATA_19 = ' + JSON.stringify(data, null, 2) + ';\n',
    'utf8'
  );

  const total = data.items.length;
  const withMain = data.items.filter(i => i.mainUrl).length;
  const withHw = data.items.filter(i => i.homeworkUrl).length;
  const withAny = data.items.filter(i => i.mainUrl || i.homeworkUrl).length;
  console.log(`Сгенерирован ${path.relative(ROOT, OUT)}`);
  console.log(`Всего задач: ${total}`);
  console.log(`С разбором: ${withMain}`);
  console.log(`С ДЗ: ${withHw}`);
  console.log(`Хотя бы одно видео: ${withAny}`);
  console.log(`Теория: ${data.theoryUrl ? 'есть' : 'нет'}`);
}

main();
