---
adr_id: ADR-ASYNC-PAHEKO-2026-04-20
status: accepted
date: 2026-04-20
accepted_date: 2026-04-20
deciders: Strophe (produit / pilotage), alignement architecture BMAD Epic 25
consulted: >-
  prd.md canonique, PRD vision kiosques 2026-04-19, recherche alignement brownfield 2026-04-19,
  sprint-change-proposal gel Epic 25, cash-accounting-paheko-canonical-chain.md, epics.md AR11/AR12
---

# ADR 2026-04-20 — Async Paheko : outbox durable PostgreSQL, Redis auxiliaire (ou trajectoire hybride)
 
**Statut :** Accepté — *métadonnée YAML : `status: accepted`* (2026-04-20)  
**Date :** 2026-04-20  
**Story :** 25.3 — « Fermer l’ADR async `Paheko` (outbox durable, Redis auxiliaire ou trajectoire hybride) » (source : `_bmad-output/planning-artifacts/epics.md`)  
**Décisions d’architecture traceables :** **AR11**, **AR12** (source : `_bmad-output/planning-artifacts/epics.md`)  
**Docs sources à citer (AC story 25.3) :**
- `_bmad-output/planning-artifacts/prd.md`
- `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`
- `_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md`
 
---
 
## Contexte
 
Le PRD canonique (`_bmad-output/planning-artifacts/prd.md`) formalise déjà une posture **terrain d’abord** et une synchronisation `Paheko` **asynchrone**, avec une mention explicite que le chemin nominal documenté dans le dépôt est une **outbox transactionnelle durable** et que la formulation « file Redis » du PRD vision 2026-04-19 reste **non canonique** tant qu’une ADR de sync n’est pas approuvée.
 
Le PRD vision (`references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`) impose un wording plus prescriptif : « Toute écriture vers Paheko passe par une file d’attente résiliente (Redis) », tout en reconnaissant l’existence d’une outbox SQL dans le brownfield et en demandant une **ADR** de convergence.
 
Le rapport de recherche technique (`_bmad-output/planning-artifacts/research/technical-alignement-brownfield-prd-recyclique-multisite-permissions-research-2026-04-19.md`) confirme l’écart « outbox SQL (repo) vs job Redis (PRD vision) » et recommande une **ADR** plutôt qu’une implémentation « au fil de l’eau » en stories.
 
Le correct course de pilotage (`_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-19-pause-backlog-priorite-socle-prd-kiosque.md`) gèle l’exécution hors Epic 25 et explicite que les ADR structurantes (dont async `Paheko`) doivent être fermées avant d’encoder des vérités concurrentes dans des stories.
 
Enfin, la chaîne comptable canonique active (`_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`) fixe le pipeline d’autorité « **référentiel → journal → snapshot → builder → outbox** » et impose déjà :
- **batch outbox idempotent par session** (unité canonique de sync) ;
- **corrélation** de batch ;
- **idempotence** et déduplication ;
- **quarantaine** et reprise.
 
---
 
## Problème
 
Nous avons une tension de gouvernance et d’implémentation :
 
- Le PRD vision parle d’une **file Redis** comme mécanisme de résilience async Paheko.
- Le canon brownfield et l’architecture active reposent sur une **outbox durable PostgreSQL** (atomicité avec le métier), avec une posture **at-least-once + idempotence**.
 
Sans décision explicite :
- les futures stories risquent d’encoder **deux sources de vérité** (« Redis = file durable » vs « outbox SQL = vérité durable ») ;
- la chaîne canonique `référentiel → journal → snapshot → builder → outbox` risque d’être contournée (double-write, succès partiels non traçables, pertes de corrélation) ;
- l’ops (retries, backpressure, runbooks) devient ambiguë, donc fragile en production.
 
---
 
## Options
 
### Option A — Outbox PostgreSQL seule (transactionnelle, durable) + worker
 
**Principe :** persister les items outbox en base PostgreSQL **dans la même transaction** que les changements métier, puis traiter via un worker (polling/lock/batch), avec sémantique **at-least-once** et handlers **idempotents**.
 
**Alignement :**
- Conforme à **AR11** (`_bmad-output/planning-artifacts/epics.md`) : « outbox durable `PostgreSQL` pour la sync `at-least-once` et handlers idempotents ».
- Compatible **AR12** (`_bmad-output/planning-artifacts/epics.md`) : Redis non requis.
- Réconcilie directement la chaîne canonique (`.../cash-accounting-paheko-canonical-chain.md`) : l’outbox est l’étape 5 et reste **l’unité de transport résiliente** du lot de session.
 
**Risques / limites :**
- nécessité d’un worker fiable (déploiement, supervision, montée en charge) ;
- backlog/outbox qui grossit si `Paheko` est indisponible (à gérer par métriques + ops).
 
### Option B — Redis comme file durable principale (remplacement de l’outbox)
 
**Principe :** pousser des jobs en Redis (ou Stream) comme vérité d’async, et traiter par worker Redis ; la base ne conserve pas la file (ou seulement pour audit).
 
**Avantages :**
- sémantique « queue » familière, latence potentiellement plus faible, fan-out possible.
 
**Incompatibilités :**
- Contredit **AR12** (`_bmad-output/planning-artifacts/epics.md`) : « `Redis` reste auxiliaire et n’est jamais l’autorité durable ni la source de vérité métier ».
- Introduit un risque de **double-write** (métier en PostgreSQL + job en Redis) sans 2PC ; on doit alors soit accepter des trous, soit introduire une stratégie de réparation plus complexe.
 
**Conclusion :** option **rejetée** comme mécanisme canonique tant que AR12 est en vigueur.
 
### Option C — Trajectoire hybride : outbox PostgreSQL canonique + Redis auxiliaire (buffer/dispatch)
 
**Principe :**
- l’outbox PostgreSQL reste **la seule source durable** et transactionnelle (canon) ;
- Redis peut être ajouté **ultérieurement** comme couche **auxiliaire** (ex. buffering, rate limiting, dispatch vers workers, optimisation de polling), sans devenir une autorité.
 
**Avantages :**
- respecte **AR11/AR12** ;
- permet d’améliorer l’exploitation (réduction de polling, meilleure réactivité) sans remettre en cause l’atomicité ;
- garde la chaîne canonique intacte et explicable.
 
**Risques / limites :**
- complexité supplémentaire si ajouté trop tôt (deux mécanismes à opérer) ;
- exige une discipline stricte : Redis **ne doit jamais** devenir une « seconde vérité » ni masquer des états outbox (quarantaine, succès partiel, etc.).
 
---
 
## Décision
 
**Décision retenue (canon) : Option A, avec ouverture contrôlée vers Option C.**
 
- Le mécanisme canonique d’async `Paheko` est une **outbox transactionnelle durable PostgreSQL** avec livraison **at-least-once** et traitement **idempotent**.
- `Redis` peut exister (ou être ajouté) **uniquement** comme **couche auxiliaire** (buffering/dispatch/rate limiting), mais **n’est jamais** :
  - la source de vérité durable,
  - l’autorité sur l’état d’une opération,
  - un remplacement de la persistance outbox.
 
Cette décision est une application directe des règles :
- **AR11** : « outbox durable `PostgreSQL` … sync `at-least-once` … handlers idempotents » (`_bmad-output/planning-artifacts/epics.md`)
- **AR12** : « `Redis` reste auxiliaire et n’est jamais l’autorité durable » (`_bmad-output/planning-artifacts/epics.md`)
 
---
 
## Conséquences
 
- **Autorité de vérité** : l’état d’une opération syncable vers `Paheko` est porté par la base (outbox + états) et réconciliable (quarantaine, reprise).
- **Atomicité** : création d’un item outbox et changement métier restent dans une même transaction PostgreSQL.
- **Résilience** : en cas d’indisponibilité `Paheko`, le backlog outbox augmente mais ne casse pas la vérité terrain ; l’ops doit traiter backlog/âge/erreurs.
- **Scalabilité** : l’optimisation via Redis (Option C) reste possible, mais uniquement après avoir prouvé que l’outbox seule ne suffit pas (mesures, runbook, SLO internes).
 
---
 
## Plan migration / wording PRD
 
### Wording recommandé pour réconcilier PRD canon et PRD vision
 
Objectif : éviter d’imposer « Redis = file durable » comme vérité concurrente.
 
- Dans `references/vision-projet/2026-04-19_prd-recyclique-architecture-permissions-multisite-kiosques-bmad.md`, remplacer le NFR « file Redis » par une formulation du type :
  - **« Toute écriture vers Paheko passe par un mécanisme asynchrone résilient basé sur une outbox durable transactionnelle (PostgreSQL) avec retries, observabilité et idempotence. Redis peut être utilisé comme couche auxiliaire de dispatch/buffering, sans être une autorité durable. »**
 
- Dans `_bmad-output/planning-artifacts/prd.md`, conserver la formulation existante « outbox transactionnelle durable canonique » et ajouter (si besoin) une note de convergence indiquant que le wording « file Redis » du PRD vision est désormais interprété comme **couche auxiliaire** et non comme source de vérité.
 
### Migration technique (si Redis auxiliaire est ajouté plus tard)
 
- **Phase 0 (canon actuel)** : outbox PostgreSQL + worker (polling/batch) + quarantaine.
- **Phase 1 (optionnelle)** : Redis comme accélérateur (ex. signal « nouvel item outbox », buffering, rate limit) sans changer la persistance.
- **Phase 2 (optionnelle)** : optimisation de traitement (sharding, partitioning outbox, tuning DB) avant toute idée de « remplacement ».
 
---
 
## Observabilité / idempotence / retries / ops
 
### Observabilité minimale (obligatoire)
 
- **Métriques** (au minimum) :
  - taille du backlog outbox (global + par type) ;
  - âge du plus ancien item « pending » ;
  - taux de succès/échec par handler ;
  - nombre d’items en **quarantaine** et temps moyen de sortie de quarantaine ;
  - nombre de déduplications par **idempotency_key**.
 
- **Logs structurés** :
  - `correlation_id` de bout en bout (session/batch) ;
  - `idempotency_key` ;
  - identifiants de contexte (site/caisse/session) quand pertinent (conformément à `_bmad-output/planning-artifacts/prd.md`, §11.3 « Tracabilité et audit »).
 
### Idempotence
 
- Toute opération syncable vers `Paheko` doit être **idempotente** côté Recyclique :
  - déduplication via `idempotency_key` en outbox ;
  - handlers capables de « reprocess » sans double effet.
 
### Retries et quarantaine
 
- Politique de retry : **backoff** et limite, puis **quarantaine** après échecs persistants.
- La quarantaine est un **état explicite** opérable (pas un log), cohérent avec :
  - `_bmad-output/planning-artifacts/prd.md` (gouvernance d’écarts sync : `a_reessayer`, `en_quarantaine`, etc.)
  - `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` (séparation transport / reprise / états).
 
### Ops / runbooks
 
- Runbook minimal : « backlog qui monte », « Paheko down », « item poison », « succès partiel batch session », « reprise quarantaine ».
- Toute intégration Redis éventuelle doit avoir un runbook séparé **qui ne déplace pas** l’autorité hors PostgreSQL.
 
---
 
## Réconciliation explicite avec la chaîne canonique caisse/compta/Paheko
 
Cette ADR **ne modifie pas** la chaîne canonique active (`_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`) :
 
1. Référentiel des moyens de paiement  
2. Journal détaillé des transactions de paiement  
3. Snapshot comptable figé de session  
4. Builder d’écritures `Paheko`  
5. **Outbox `Paheko` (durable PostgreSQL)**  
 
Points de réconciliation imposés :
- **Batch idempotent par session** : l’unité canonique de sync reste « 1 batch outbox idempotent par session clôturée ».
- **Corrélation** : `correlation_id` de batch commun propagé logs + outbox + appels Paheko.
- **Succès partiel / reprise** : l’état et la traçabilité restent en base ; Redis ne peut pas masquer/absorber ces états.
- **Quarantaine** : état durable et opérable, non remplaçable par un simple « DLQ Redis ».
 
---
 
## Documents normatifs (ce qui reste vrai) et invariants « ne change pas »
 
### Restent normatifs (explicitement référencés par le PRD canon)
 
- `_bmad-output/planning-artifacts/prd.md` (PRD canon v2 ; gouvernance « file Redis non canonique tant qu’ADR non close » ; exigences tracabilité/idempotence/quarantaine).
- `_bmad-output/planning-artifacts/epics.md` (AR11/AR12 ; découpage Epic 25 et story 25.3).
- `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` (chaîne canonique et unité de sync par session ; l’outbox comme étape finale du pipeline).
- `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md` (ADR Paheko — décisions de transport/sync et garde-fous, sans contredire AR11/AR12).
- `_bmad-output/planning-artifacts/architecture/` (dossier « architecture BMAD active » cité comme référentiel d’alignement par `_bmad-output/planning-artifacts/prd.md`).
 
### Ne change pas (jusqu’à implémentation future explicite)
 
- La source durable de sync `Paheko` reste PostgreSQL (outbox).
- La sémantique de livraison reste **at-least-once** avec idempotence backend.
- La quarantaine reste un état durable et opérable (pas un simple « message perdu »).
- Le lot de session (batch) reste l’unité canonique de synchronisation comptable.
 
---
 
## Stories et changements sensibles (ADR **acceptée** — référence post-approbation)
 
Cette ADR est **acceptée** (voir frontmatter). Les **changements suivants** restent **NEEDS_HITL / non ready-for-dev** s’ils imposent ou changent le **mécanisme** async Paheko **en contradiction** avec cette norme (et non plus « parce que l’ADR n’est pas approuvée ») :
 
- Toute story qui introduit `Redis` comme **file durable** ou « source de vérité » pour les écritures `Paheko` (contradiction AR12).
- Toute story qui change la sémantique de livraison (ex. passage de at-least-once à exactly-once « supposé », ou suppression de la quarantaine durable).
- Toute story qui modifie l’unité canonique (ex. « ticket par ticket » au lieu de « lot de session ») ou qui casse la corrélation/batch.
- Toute story Epic 25+ ou PRD vision qui décrit explicitement « job Redis » comme mécanisme canonique (ex. wording type « création site déclenche un job Redis ») **sans** la réinterprétation « Redis auxiliaire ».
 
**Non bloqué (si et seulement si conforme à cette ADR) :**
- Stories qui ajoutent/étendent des handlers outbox, améliorent l’observabilité, durcissent idempotence/retries, ou ajoutent des runbooks, tant qu’elles gardent PostgreSQL comme autorité durable.
 
