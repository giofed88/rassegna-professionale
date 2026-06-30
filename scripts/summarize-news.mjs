import Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const NEWS_PATH = path.join(ROOT, 'data', 'news.json');

const CATEGORY_LABELS = {
  fiscale: 'Fiscale e tributario',
  contabile: 'Contabilità e bilancio',
  lavoro: 'Lavoro e previdenza',
  condominio: 'Condominio e proprietà',
  contenzioso: 'Contenzioso e giurisprudenza',
  crisi_impresa: "Crisi d'impresa e procedure concorsuali"
};

const MAX_ITEMS_PER_CATEGORY = 8;
const HOURS_LOOKBACK = 48;

function recentItems(items) {
  const cutoff = Date.now() - HOURS_LOOKBACK * 60 * 60 * 1000;
  const recent = items.filter((it) => it.date && new Date(it.date).getTime() >= cutoff);
  return (recent.length >= 2 ? recent : items).slice(0, MAX_ITEMS_PER_CATEGORY);
}

async function enrichCategory(client, category, items) {
  const label = CATEGORY_LABELS[category] || category;
  const payload = items.map((it, i) => ({
    id: i,
    title: it.title,
    source: it.source,
    summary: it.summary || ''
  }));

  const prompt = `Sei un esperto di diritto italiano e professioni contabili/fiscali.
Ti fornisco ${payload.length} notizie recenti dalla categoria "${label}".
Per ciascuna restituisci un oggetto JSON con:
- "id": numero identificativo (uguale all'input)
- "synth": stringa di 2-3 frasi in italiano che spieghi il contenuto e la rilevanza pratica per commercialisti e consulenti
- "relevant": true solo per la notizia più importante (al massimo 1 per categoria)
- "deep": presente solo se relevant=true, paragrafo di 5-7 frasi che approfondisce gli aspetti tecnici e operativi più utili (termini, adempimenti, riferimenti normativi, impatto pratico)

Rispondi SOLO con un array JSON valido, senza markdown né testo aggiuntivo.

Notizie:
${JSON.stringify(payload, null, 2)}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = message.content[0]?.text?.trim() ?? '[]';
  let enriched;
  try {
    enriched = JSON.parse(text);
  } catch {
    // Try to extract JSON array if wrapped in extra text
    const match = text.match(/\[[\s\S]*\]/);
    enriched = match ? JSON.parse(match[0]) : [];
  }

  return enriched;
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('[INFO] ANTHROPIC_API_KEY non impostata, passaggio di sintesi saltato.');
    process.exit(0);
  }

  const client = new Anthropic({ apiKey });
  const news = JSON.parse(await readFile(NEWS_PATH, 'utf-8'));

  let totalEnriched = 0;

  for (const [category, items] of Object.entries(news.items)) {
    if (!items || items.length === 0) continue;

    const subset = recentItems(items);
    if (subset.length === 0) continue;

    try {
      const enriched = await enrichCategory(client, category, subset);
      const enrichedMap = new Map(enriched.map((e) => [e.id, e]));

      for (let i = 0; i < subset.length; i++) {
        const e = enrichedMap.get(i);
        if (!e) continue;
        const originalIndex = items.indexOf(subset[i]);
        if (originalIndex === -1) continue;
        if (e.synth) news.items[category][originalIndex].synth = e.synth;
        if (e.relevant) news.items[category][originalIndex].relevant = true;
        if (e.deep) news.items[category][originalIndex].deep = e.deep;
        totalEnriched++;
      }

      console.log(`[OK] ${category}: ${subset.length} notizie elaborate.`);
    } catch (err) {
      console.error(`[WARN] Errore sintesi categoria "${category}": ${err.message}`);
    }
  }

  news.summarizedAt = new Date().toISOString();
  await writeFile(NEWS_PATH, JSON.stringify(news, null, 2), 'utf-8');
  console.log(`Sintesi completata: ${totalEnriched} notizie arricchite.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
