import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const NEWS_PATH = path.join(ROOT, 'data', 'news.json');
const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

const MESI_IT = {
  gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
  luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11
};

function parseDate(text) {
  if (!text) return null;
  const numeric = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (numeric) {
    const [, day, month, year] = numeric;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString();
  }
  const italian = text.toLowerCase().match(/(\d{1,2})\s+([a-zà]+)\s+(\d{4})/);
  if (italian) {
    const [, day, monthName, year] = italian;
    const month = MESI_IT[monthName];
    if (month !== undefined) return new Date(Date.UTC(Number(year), month, Number(day))).toISOString();
  }
  return null;
}

async function loadSources() {
  const raw = await readFile(path.join(ROOT, 'config', 'scraped-sources.json'), 'utf-8');
  return JSON.parse(raw);
}

async function scrapeSource(source, browser) {
  const page = await browser.newPage();
  try {
    await page.goto(source.newsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (source.waitForSelector) {
      await page.waitForSelector(source.waitForSelector, { timeout: 15000 }).catch(() => {});
    }

    const items = await page.$$eval(
      source.itemSelector,
      (els, sel) => els.map((el) => {
        const titleEl = sel.titleSelector ? el.querySelector(sel.titleSelector) : el;
        const linkEl = sel.linkSelector ? el.querySelector(sel.linkSelector) : el;
        const dateEl = sel.dateSelector ? el.querySelector(sel.dateSelector) : null;
        const summaryEl = sel.summarySelector ? el.querySelector(sel.summarySelector) : null;
        return {
          title: titleEl ? titleEl.textContent.trim() : '',
          link: linkEl ? linkEl.href || linkEl.getAttribute('href') || '' : '',
          dateText: dateEl ? dateEl.textContent.trim() : '',
          summary: summaryEl ? summaryEl.textContent.trim() : ''
        };
      }),
      {
        titleSelector: source.titleSelector,
        linkSelector: source.linkSelector,
        dateSelector: source.dateSelector,
        summarySelector: source.summarySelector
      }
    );

    return items
      .filter((item) => item.title)
      .map((item) => ({
        category: source.category,
        source: source.name,
        title: item.title,
        link: item.link,
        date: parseDate(item.dateText) || item.dateText || null,
        summary: item.summary.slice(0, 400)
      }));
  } catch (err) {
    console.error(`[WARN] Errore scraping "${source.name}": ${err.message}`);
    return [];
  } finally {
    await page.close();
  }
}

function dedupe(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = item.link || `${item.category}|${item.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

async function main() {
  const sources = await loadSources();
  const news = JSON.parse(await readFile(NEWS_PATH, 'utf-8'));

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  let scraped = [];
  try {
    for (const source of sources) {
      const items = await scrapeSource(source, browser);
      scraped.push(...items);
    }
  } finally {
    await browser.close();
  }

  for (const item of scraped) {
    if (!news.items[item.category]) news.items[item.category] = [];
    news.items[item.category].push(item);
  }

  for (const category of Object.keys(news.items)) {
    news.items[category] = dedupe(news.items[category]).sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
  }

  news.generatedAt = new Date().toISOString();

  await writeFile(NEWS_PATH, JSON.stringify(news, null, 2), 'utf-8');
  console.log(`Aggiunti ${scraped.length} aggiornamenti da fonti scraping pubblico.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
