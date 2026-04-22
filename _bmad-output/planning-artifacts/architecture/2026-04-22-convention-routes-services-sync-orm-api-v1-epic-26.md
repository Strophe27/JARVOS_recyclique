# Convention : routes / services `def` vs `async` avec ORM SQLAlchemy synchrone (API v1, Epic 26)

**Statut :** noté de travail (aligné audit brownfield 2026-04-19, F2 / §5.5)  
**Périmètre :** `recyclique/api`, **`sqlalchemy.orm.Session`** et accès **synchrones** (`query`, `commit`, `refresh`, etc.) — **sans** `AsyncSession` ni migration async DB (hors scope sauf **ADR** dédié).

## Règle par défaut (Option A — pilote **categories** livré en story 26-3)

- **Handlers** : utiliser **`def`** lorsque le corps n’exécute que du travail **bloquant** sur `Session` synchrone (et des appels de services **synchrones** sur ce même modèle).
- **Services** : utiliser **`def`** pour les méthodes qui ne font qu’accéder à l’ORM de façon **synchrone**.

**Comportement FastAPI / Starlette :** une route **`def`** est exécutée dans le **pool de threads** du serveur, ce qui convient au code bloquant. Ce n’est **pas** du parallélisme event-loop async : ne pas utiliser `async def` par « habitude » si tout le code est bloquant (pas de bénéfice I/O asynchrone).

## Exceptions nommées (Option B)

Conserver **`async def`** seulement lorsqu’il existe un **`await` réel** (ex. **`UploadFile.read()`**, appels HTTP async, **vrai** I/O non bloquant, ou exigence du framework). **Documenter** l’exception par un **commentaire bref** sur la route (ex. 26.3 : `POST /categories/import/analyze` — `await file.read()`).

**Streaming :** un endpoint qui retourne `StreamingResponse` peut rester en **`def`** si la génération est synchrone ; l’`async` n’est requis ici que si la chaîne de production du flux implique des `await`.

## Hors scope (Option C)

Migration vers **`AsyncSession`**, moteur async, ou requêtes vraiment **async** : **hors** convention Epic 26 sans **ADR** et extension d’epic (risque gouvernance DB).

## Autres remarques

- **Paheko / outbox (Epic 25)** : l’[ADR async Paheko / Redis auxiliaire](./2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md) concerne **I/O de sync** et l’**outbox** — ne pas la confondre avec la présente convention sur **`Session` ORM** sous FastAPI.
- **Revue de PR** : vérifier l’absence d’`async` **ornemental** sur des chemins purement `Session` sync (motif cible de F2) ; les exceptions **Option B** doivent être **visibles** (commentaire ou pointeur vers ce document).

**Réf. complémentaire :** [Tests — rappel PR](../../../recyclique/api/tests/README.md#convention-def-vs-async-orm-synchrone-epic-26).
