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

- **Eutekne**: richiede un abbonamento. Inserisci l'URL del feed RSS riservato (disponibile nell'area abbonati) nel campo `url` della voce "Eutekne (richiede abbonamento)" per ciascuna categoria di interesse. Se Eutekne richiede autenticazione via cookie/token invece di un RSS pubblico, lo script andrà esteso con un fetch autenticato (fornire le credenziali a parte, mai nel repository).
- Altri segnaposto (Confedilizia, OIC, Ministero del Lavoro, ecc.) vanno completati con gli URL RSS reali una volta verificati, perché alcuni enti pubblicano comunicati senza un feed RSS standard e potrebbe servire uno scraper dedicato.

**Importante**: gli URL RSS inclusi di default sono indicativi e vanno verificati/aggiornati, perché molti enti pubblici italiani non offrono feed RSS stabili o li cambiano nel tempo.

## Pubblicazione su GitHub Pages

1. Nelle impostazioni del repository, abilita GitHub Pages con sorgente "GitHub Actions".
2. La action gira ogni giorno alle 05:00 UTC; puoi anche lanciarla manualmente da "Actions" > "Aggiornamento quotidiano rassegna" > "Run workflow".

## Esportazione HTML

Il pulsante "Esporta HTML" nella dashboard genera un file `.html` autonomo con lo snapshot dei dati correnti, scaricabile e condivisibile senza bisogno di server.
