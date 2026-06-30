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

Eutekne e MySolution non offrono feed RSS, quindi `scripts/fetch-authenticated.mjs` usa [Playwright](https://playwright.dev) per: aprire un browser headless, fare login con le tue credenziali, andare sulla pagina delle notizie ed estrarne i contenuti.

⚠️ **Verifica prima i termini di servizio** di questi fornitori riguardo l'accesso automatizzato con le tue credenziali: è una responsabilità tua, non dello script.

**1. Credenziali — mai in chat o nel repository.** Vanno solo in **GitHub Actions Secrets** (Settings → Secrets and variables → Actions → New repository secret):

| Secret | Valore |
|---|---|
| `EUTEKNE_USERNAME` | la tua username/email Eutekne |
| `EUTEKNE_PASSWORD` | la tua password Eutekne |
| `MYSOLUTION_USERNAME` | la tua username/email MySolution |
| `MYSOLUTION_PASSWORD` | la tua password MySolution |

La Action (`daily-update.yml`) le passa già come variabili d'ambiente allo script.

**2. Selettori CSS — da verificare tu, perché queste pagine sono dietro login e non posso ispezionarle.** Il file `config/authenticated-sources.json` contiene, per ciascuna fonte, dei segnaposto tipo `.PLACEHOLDER_news_item` che vanno sostituiti con i selettori reali. Per trovarli:

1. Accedi al portale nel browser normalmente.
2. Apri gli Strumenti per sviluppatori (F12) → tab "Elements"/"Ispeziona".
3. Sulla **pagina di login**, clicca sul campo username, password e sul pulsante di accesso: nel pannello a destra trovi l'attributo `id` o `class` di ciascuno → usali per `usernameSelector`, `passwordSelector`, `submitSelector` (es. `#txtUsername` o `.login-btn`). Annota anche l'URL esatto della pagina di login → `loginUrl`.
4. Sulla **pagina con l'elenco delle notizie** (dopo il login), trova l'URL → `newsUrl`. Poi ispeziona un singolo elemento della lista: il contenitore di ogni notizia → `itemSelector`; al suo interno, il titolo → `titleSelector`; il link (di solito un `<a>`) → `linkSelector`; la data → `dateSelector`; un eventuale sommario → `summarySelector`.
5. Se preferisci, copia qui in chat l'HTML di queste due pagine (login + elenco notizie, anche solo un frammento con un paio di notizie) e te li compilo io.

Senza selettori corretti lo script salta semplicemente quella fonte (loggando un avviso), senza bloccare le altre.

**Se il login richiede verifica aggiuntiva** (2FA, captcha, conferma via email) in futuro, lo scraping automatico smetterebbe di funzionare e andrebbe rivisto.

## Pubblicazione su GitHub Pages

1. Nelle impostazioni del repository, abilita GitHub Pages con sorgente "GitHub Actions".
2. La action gira ogni giorno alle 05:00 UTC; puoi anche lanciarla manualmente da "Actions" > "Aggiornamento quotidiano rassegna" > "Run workflow".

## Esportazione HTML

Il pulsante "Esporta HTML" nella dashboard genera un file `.html` autonomo con lo snapshot dei dati correnti, scaricabile e condivisibile senza bisogno di server.
