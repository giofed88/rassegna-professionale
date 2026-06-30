import Parser from 'rss-parser';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CATEGORY_LABELS = {
  fiscale: 'Fiscale',
  contabile: 'Contabile',
  lavoro: 'Consulenza del Lavoro',
  condominio: 'Condominio',
  contenzioso: 'Contenzioso',
  crisi_impresa: "Crisi d'Impresa"
};

const parser = new Parser();
const FEED_TIMEOUT_MS = 15000;

async function loadSources() {
  const raw = await readFile(path.join(ROOT, 'config', 'sources.json'), 'utf-8');
  return JSON.parse(raw);
}

function resolveUrl(rawUrl) {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('$')) {
    const envVar = rawUrl.slice(1);
    const resolved = process.env[envVar];
    if (!resolved) {
      console.warn(`[INFO] Variabile d'ambiente ${envVar} non impostata: fonte saltata.`);
      return '';
    }
    return resolved;
  }
  return rawUrl;
}

async function fetchFeed(source, category) {
  const url = resolveUrl(source.url);
  if (!url) return [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
    let xml;
    try {
      const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      xml = await res.text();
    } finally {
      clearTimeout(timeoutId);
    }
    const feed = await parser.parseString(xml);
    return (feed.items || []).map((item) => ({
      category,
      source: source.name,
      title: item.title?.trim() || '(senza titolo)',
      link: item.link || '',
      date: item.isoDate || item.pubDate || null,
      summary: (item.contentSnippet || item.summary || '').trim().slice(0, 400)
    }));
  } catch (err) {
    console.error(`[WARN] Errore nel feed "${source.name}" (${url}): ${err.message}`);
    return [];
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
  const allResults = [];

  for (const [category, feedList] of Object.entries(sources)) {
    const results = await Promise.all(feedList.map((s) => fetchFeed(s, category)));
    allResults.push(...results.flat());
  }

  const deduped = dedupe(allResults).sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  const grouped = {};
  for (const key of Object.keys(CATEGORY_LABELS)) grouped[key] = [];
  for (const item of deduped) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    categories: CATEGORY_LABELS,
    items: grouped
  };

  await mkdir(path.join(ROOT, 'data'), { recursive: true });
  await writeFile(
    path.join(ROOT, 'data', 'news.json'),
    JSON.stringify(output, null, 2),
    'utf-8'
  );

  const total = deduped.length;
  console.log(`Salvati ${total} aggiornamenti in data/news.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
