import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const NEWS_PATH = path.join(ROOT, 'data', 'news.json');
const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

async function loadSources() {
  const raw = await readFile(path.join(ROOT, 'config', 'authenticated-sources.json'), 'utf-8');
  return JSON.parse(raw);
}

async function scrapeSource(source, browser) {
  const username = process.env[source.usernameEnv];
  const password = process.env[source.passwordEnv];
  if (!username || !password) {
    console.warn(`[INFO] Credenziali mancanti per "${source.name}" (${source.usernameEnv}/${source.passwordEnv}): fonte saltata.`);
    return [];
  }

  const page = await browser.newPage();
  try {
    await page.goto(source.loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.fill(source.usernameSelector, username);
    await page.fill(source.passwordSelector, password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
      page.click(source.submitSelector)
    ]);

    await page.goto(source.newsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (source.waitForSelector) {
      await page.waitForSelector(source.waitForSelector, { timeout: 15000 }).catch(() => {});
    }

    const items = await page.$$eval(
      source.itemSelector,
      (els, sel) => els.map((el) => {
        const titleEl = el.querySelector(sel.titleSelector);
        const linkEl = el.querySelector(sel.linkSelector) || titleEl;
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
        date: item.dateText || null,
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
  console.log(`Aggiunti ${scraped.length} aggiornamenti da fonti autenticate.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
