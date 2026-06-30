# Rassegna Professionale Quotidiana

Dashboard statica con gli aggiornamenti quotidiani su: fiscale, contabile, consulenza del lavoro, condominio, contenzioso, crisi d'impresa.

## Come funziona

1. `scripts/fetch-news.mjs` legge le fonti RSS definite in `config/sources.json`, le unisce e salva tutto in `data/news.json`.
2. `index.html` legge `data/news.json` e mostra la dashboard interattiva (filtri per categoria, ricerca, esportazione di uno snapshot HTML autonomo).
3. Una GitHub Action (`.github/workflows/daily-update.yml`) esegue lo script ogni mattina, committa i nuovi dati e pubblica il sito su GitHub Pages.

## Setup

```bash
npm install
npm run fetch    # genera data/news.json
```

Poi apri `index.html` in un browser (o servilo con un server statico) per vedere la dashboard.

## Configurare le fonti

Modifica `config/sources.json`. Ogni categoria è una lista di `{ "name": ..., "url": ... }`.
Le voci con `url` vuoto sono segnaposto da completare:

- Alcuni segnaposto (Normattiva, Confedilizia, OIC, Ministero del Lavoro, ecc.) vanno completati con gli URL RSS reali una volta verificati, perché alcuni enti pubblicano comunicati senza un feed RSS standard e potrebbe servire uno scraper dedicato.

**Importante**: gli URL RSS inclusi di default sono indicativi e vanno verificati/aggiornati, perché molti enti pubblici italiani non offrono feed RSS stabili o li cambiano nel tempo.

### Fonti con abbonamento (Eutekne, MySolution): come fornire le credenziali in sicurezza

**Non condividere mai username e password in chat o nel codice del repository.** Lo script supporta fonti autenticate tramite **GitHub Actions Secrets**, variabili cifrate che solo la pipeline può leggere.

In `config/sources.json` queste fonti hanno già un placeholder tipo `"$EUTEKNE_RSS_URL"`: lo script, in fase di esecuzione, sostituisce quel valore con il contenuto della variabile d'ambiente `EUTEKNE_RSS_URL`.

**Passaggi da fare tu (una volta sola):**

1. Accedi alla tua area abbonati su Eutekne / MySolution e cerca una funzione "RSS", "Feed", "Notifiche" o "Esporta feed" — molti portali professionali generano un URL RSS personale che include un token di accesso (es. `https://www.eutekne.it/feed?token=abc123`). Quell'URL, da solo, è equivalente a una password: chi lo possiede può leggere il feed.
2. Se trovi quell'URL, vai nel repository GitHub → **Settings → Secrets and variables → Actions → New repository secret** e crea:
   - `EUTEKNE_RSS_URL` con l'URL completo del feed Eutekne
   - `MYSOLUTION_FISCO_RSS_URL` con l'URL del feed MySolution Fisco
   - `MYSOLUTION_LAVORO_RSS_URL` con l'URL del feed MySolution Lavoro
3. La Action (`daily-update.yml`) è già configurata per leggere questi secrets e passarli allo script.

**Se questi servizi non offrono un feed RSS con token**, ma solo un login classico (utente/password) dietro form HTML, l'integrazione richiede un meccanismo diverso (es. uno script di scraping autenticato con Playwright che salva la sessione), più fragile e da valutare anche rispetto ai termini di servizio del fornitore — fammi sapere se è questo il caso e cosa trovi nell'area abbonati, così adatto lo script di conseguenza.

## Pubblicazione su GitHub Pages

1. Nelle impostazioni del repository, abilita GitHub Pages con sorgente "GitHub Actions".
2. La action gira ogni giorno alle 05:00 UTC; puoi anche lanciarla manualmente da "Actions" > "Aggiornamento quotidiano rassegna" > "Run workflow".

## Esportazione HTML

Il pulsante "Esporta HTML" nella dashboard genera un file `.html` autonomo con lo snapshot dei dati correnti, scaricabile e condivisibile senza bisogno di server.
