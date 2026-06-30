# Rassegna Professionale Quotidiana

Dashboard statica con gli aggiornamenti quotidiani su: fiscale, contabile, consulenza del lavoro, condominio, contenzioso, crisi d'impresa.

## Come funziona

1. `scripts/fetch-news.mjs` legge le fonti RSS pubbliche definite in `config/sources.json`, le unisce e salva tutto in `data/news.json`.
2. `scripts/fetch-authenticated.mjs` fa login con Playwright sulle fonti a pagamento definite in `config/authenticated-sources.json` (Eutekne, MySolution, che non offrono RSS) e aggiunge i risultati a `data/news.json`.
3. `index.html` legge `data/news.json` e mostra la dashboard interattiva (filtri per categoria, ricerca, esportazione di uno snapshot HTML autonomo).
4. Una GitHub Action (`.github/workflows/daily-update.yml`) esegue entrambi gli script ogni mattina, committa i nuovi dati e pubblica il sito su GitHub Pages.

## Setup

```bash
npm install
npx playwright install --with-deps chromium   # solo se usi le fonti autenticate
npm run fetch         # genera data/news.json dalle fonti RSS
npm run fetch:auth    # aggiunge le fonti autenticate (richiede le credenziali, vedi sotto)
# oppure: npm run fetch:all   # esegue entrambi in sequenza
```

Poi apri `index.html` in un browser (o servilo con un server statico) per vedere la dashboard.

## Configurare le fonti

Modifica `config/sources.json`. Ogni categoria è una lista di `{ "name": ..., "url": ... }`.
Le voci con `url` vuoto sono segnaposto da completare:

- Alcuni segnaposto (Normattiva, Confedilizia, OIC, Ministero del Lavoro, ecc.) vanno completati con gli URL RSS reali una volta verificati, perché alcuni enti pubblicano comunicati senza un feed RSS standard e potrebbe servire uno scraper dedicato.

**Importante**: gli URL RSS inclusi di default sono indicativi e vanno verificati/aggiornati, perché molti enti pubblici italiani non offrono feed RSS stabili o li cambiano nel tempo.

### Fonti con abbonamento (Eutekne, MySolution): scraping autenticato

`scripts/fetch-authenticated.mjs` usa [Playwright](https://playwright.dev) per fare login con le tue credenziali e leggere le notizie dall'area riservata.

⚠️ **Verifica prima i termini di servizio** di questi fornitori riguardo l'accesso automatizzato con le tue credenziali: è una responsabilità tua, non dello script.

**Credenziali — mai in chat o nel repository.** Vanno solo in **GitHub Actions Secrets** (Settings → Secrets and variables → Actions → New repository secret):

| Secret | Valore |
|---|---|
| `MYSOLUTION_USERNAME` | la tua username/email MySolution |
| `MYSOLUTION_PASSWORD` | la tua password MySolution |
| `EUTEKNE_USERNAME` | la tua username/email Eutekne (per quando sarà completata, vedi sotto) |
| `EUTEKNE_PASSWORD` | la tua password Eutekne |

La Action (`daily-update.yml`) le passa già come variabili d'ambiente allo script.

**Stato per fonte:**

- **MySolution (Fisco + Lavoro)**: configurazione completa in `config/authenticated-sources.json`, basata sull'HTML reale che hai fornito. Il login è una finestra modale (non una pagina separata): lo script la apre via JavaScript, compila utente/password (`#formModalLoginformUsername` / `#formModalLoginformPasswrd`) e clicca "Accedi". Le notizie vengono lette dalle card `.card-news-mini` / `.card-news-main` di `/fisco/` e `/lavoro/`. Da verificare al primo run reale (in GitHub Actions, non in questo sandbox che non ha accesso di rete a questi domini).
- **Eutekne**: configurazione completa in `config/authenticated-sources.json`, basata sull'HTML reale ispezionato dal vivo (la pagina di login è renderizzata via JavaScript, non presente nell'HTML statico). Lo script naviga su `/Public/Login.aspx`, compila utente/password (`input[name=username]` / `input[name=password]`) e clicca il link "ACCEDI ORA" (`a.o-btn-prosegui`). Le notizie vengono lette dalla colonna "La redazione consiglia" della pagina Area Utente (`.pos-primopiano1 .item`). Ho anche aggiunto il suo **feed RSS pubblico** (`https://www.eutekne.it/rss.ashx`) in `config/sources.json` come fonte aggiuntiva senza login. Da verificare al primo run reale in GitHub Actions.

**Se vuoi correggere/estendere i selettori tu stesso**, ogni voce di `config/authenticated-sources.json` ha: `loginUrl`, `usernameSelector`/`passwordSelector`/`submitSelector` per il form di login, `newsUrl` per la pagina con l'elenco, e `itemSelector`/`titleSelector`/`linkSelector`/`dateSelector`/`summarySelector` per ogni notizia (trovabili ispezionando la pagina con F12 → Elements).

Senza selettori corretti lo script salta semplicemente quella fonte (loggando un avviso), senza bloccare le altre.

**Se il login richiede verifica aggiuntiva** (2FA, captcha, conferma via email) in futuro, lo scraping automatico smetterebbe di funzionare e andrebbe rivisto.

## Pubblicazione su GitHub Pages

1. Nelle impostazioni del repository, abilita GitHub Pages con sorgente "GitHub Actions".
2. La action gira ogni giorno alle 05:00 UTC; puoi anche lanciarla manualmente da "Actions" > "Aggiornamento quotidiano rassegna" > "Run workflow".

## Esportazione HTML

Il pulsante "Esporta HTML" nella dashboard genera un file `.html` autonomo con lo snapshot dei dati correnti, scaricabile e condivisibile senza bisogno di server.
