---
description: Salva su file missione, decisioni, percorsi e prossimi passi PRIMA di una compattazione del contesto, così nulla va perso quando la cronologia viene riassunta.
argument-hint: [nota opzionale da includere nel checkpoint]
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Bash(date:*)
---

# Smart Compact — preservazione del contesto pre-compattazione

Timestamp corrente (usa questo, non stimarlo): !`date "+%Y-%m-%d %H:%M:%S %Z"`

Nota facoltativa fornita dall'utente: $ARGUMENTS

Esegui le due fasi seguenti, in ordine. Non lanciare tu stesso `/compact`: un comando
personalizzato non può invocarlo. Limitati a preparare il terreno e dirlo alla fine.

## FASE 1 — Persisti prima su file

1. Verifica se `.claude/session-memory.md` esiste già (usa Glob/Read).
   - Se esiste, leggilo per intero PRIMA di toccarlo: non va mai sovrascritto alla cieca.
     Ciò che è ancora valido resta, ciò che è superato si aggiorna.
   - Se non esiste, crealo da zero con la struttura sotto.

2. Scrivi/aggiorna `.claude/session-memory.md` con ESATTAMENTE queste sezioni:

   - **Ultimo checkpoint** — il timestamp riportato sopra.
   - **Missione** — su cosa stiamo lavorando e soprattutto PERCHÉ. L'obiettivo di fondo,
     non solo il task immediato.
   - **Decisioni chiave** — ogni decisione presa con la sua motivazione. Il "perché"
     conta più del "cosa": serve a evitare che in futuro si rimetta in discussione
     qualcosa di già risolto.
   - **File rilevanti** — percorsi COMPLETI, non nomi generici, con una riga che spiega
     il ruolo di ciascuno.
   - **Impedimenti e domande aperte** — cosa blocca, cosa attende una risposta esterna,
     cosa resta da decidere.
   - **Prossima azione** — una sola, concreta e operativa. Non "continuare il lavoro"
     ma "modificare la funzione X in Y per gestire il caso Z".

## FASE 2 — Riassunto in chat

Dopo aver scritto il file, produci in chat un riassunto strutturato con:

1. **Missione attuale** — obiettivo e prossimo passo.
2. **Decisioni prese e perché.**
3. **Percorsi critici dei file** — percorsi completi.
4. **Stato del compito** — completato / in corso / in attesa / bloccato.
5. **Istruzioni di ripresa** — 2-3 frasi rivolte al "Claude futuro" di questa sessione,
   sufficienti da sole a far ripartire il lavoro senza rileggere tutta la cronologia.
   Es.: "Riprendi da [file]: X è implementato ma non testato. Prima di procedere
   verifica [condizione]. Non toccare [cosa] perché [motivo]."

## Nota finale

Ricorda esplicitamente all'utente che `/compact` va lanciato manualmente subito dopo, e
che per recuperare il contesto in futuro basta referenziare `@.claude/session-memory.md`.
