# Story 25.12 : Audit code — Redis auxiliaire seulement pour async Paheko (AR12, ADR 25-3)

Status: done

**Story key :** `25-12-audit-code-ar12-redis-auxiliaire-async-paheko`  
**Epic :** 25 — phase 2 (impl)  
**Implementation artifact :** `_bmad-output/implementation-artifacts/25-12-audit-code-ar12-redis-auxiliaire-async-paheko.md`

## Dépendances (prérequis)

- **ADR 25-3** — **acceptée** (métadonnées YAML `status: accepted` dans l’ADR) : outbox durable **PostgreSQL**, **Redis uniquement auxiliaire** (buffering / dispatch / rate limiting), jamais autorité durable ni source de vérité métier pour l’async Paheko. Fichier : `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md`.
- **AR12** (epics.md) : « `Redis` reste auxiliaire et n'est jamais l'autorite durable ni la source de verite metier. » — à croiser avec l’audit **chemin async Paheko** uniquement (pas un audit générique de tout usage Redis du dépôt sans qualification).
- **25.6** — **done** : levée gel process documentée (conditions d’exécution DS hors `25-*`).
- **Chaîne canonique** : `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md` (référentiel → journal → snapshot → builder → **outbox PostgreSQL**).
- Graphe machine : `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml` — **25-12** `depends_on` : **25-6** ; parallèle possible serré avec **25-7** si ressource dédiée (note DAG).
- **Spec 25.4** (socle multisite) — croiser si besoin pour ne pas confondre projection / mapping / outbox : `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md`.

## Contraintes livrables (brief Story Runner)

- **Livrables** : document d’**audit** + **pointeurs code** + **risques** ; ne **pas rouvrir l’ADR** sauf **incohérence bloquante** documentée (sinon issues / note d’escalade).
- **Hors scope** : **big bang** trajectoire **hybride** (refonte massive de la chaîne async) **sans nouvel ADR** explicite — l’audit peut recommander des phases ou des mesures, pas livrer la refonte ici.

## Story (BDD)

As a backend steward,  
I want a documented audit proving Redis stays auxiliary for the Paheko async path per **AR12** and accepted ADR **25-3**,  
So that grep-only theatre does not pass as compliance.

## Acceptance criteria

Source normative : `_bmad-output/planning-artifacts/epics.md` — **Story 25.12** (texte en anglais, aligné avec l’epic).

**Given** ADR **25-3** is `accepted` and **AR12** forbids durable competing truth in Redis for Paheko accounting  
**When** this story is delivered  
**Then** a report lists Redis touchpoints with allowed versus forbidden patterns and opens tracked issues for any deviation found  
**And** the DoD includes at least one runtime-oriented recommendation (test, canary checklist, or staging probe) beyond plain repository grep  
**And** a hybrid « big bang » rewrite of the async chain stays out of scope unless a new ADR says otherwise

### Interprétation exécutable (livrables minimaux)

- **Périmètre « async Paheko »** : tout ce qui participe au **transport / état / supervision** des écritures vers Paheko après la chaîne canonique jusqu’à l’outbox (modèles `PahekoOutbox*`, processeur outbox, workers/cron, endpoints admin outbox, corrélations). Les usages Redis **hors** ce périmètre (ex. step-up, activité session) doivent être **explicitement classés** « hors chemin comptable async Paheko » pour éviter les faux positifs — tout en vérifiant qu’ils ne contredisent pas AR12 pour la **comptabilité Paheko** (libellé epic : *Paheko accounting*).
- **Rapport d’audit** (markdown daté sous `_bmad-output/implementation-artifacts/` ou `references/artefacts/`) :
  - Tableau ou liste **touchpoints Redis** (fichiers / modules / appels) avec colonne **allowed** vs **forbidden** au sens **ADR 25-3** (Redis = auxiliaire, pas file durable de vérité ; pas de remplacement de l’outbox SQL).
  - **Pointeurs code** : chemins repo réels (pas seulement `grep` sans lecture).
  - **Écarts** : pour chaque écart suspect, **issue trackée** (ticket / lien interne dépôt / entrée backlog numérotée) avec propriétaire suggéré ou « équipe backend ».
- **Au-delà du grep** : au moins **une** recommandation **runtime** parmi :
  - scénario de **test** d’intégration ou e2e ciblant l’absence de dépendance Redis pour la vérité outbox ; ou
  - **checklist canary** (déploiement) ; ou
  - **probe staging** (script / requête / métrique à observer sur un env de test).

## Definition of Done

- [x] Document d’audit publié avec chemins absolus ou relatifs repo vers **ADR 25-3**, **AR12**, **chaîne canonique**.
- [x] Section **allowed / forbidden** pour les touchpoints Redis **qualifiés** (async Paheko vs hors périmètre explicitement nommé).
- [x] **Issues** ouvrables pour tout écart matériel par rapport à l’ADR / AR12 (aucun écart : rien à ouvrir).
- [x] **Une** reco **runtime** (test / canary / probe) documentée — pas seulement inventaire statique.
- [x] Mention explicite **hors scope** : pas de big bang hybride sans nouvel ADR.
- [x] Revue : cohérence avec l’implémentation outbox actuelle (**PostgreSQL** comme durable pour les items outbox).

## Tasks / Subtasks

- [x] Cartographier **ADR 25-3** + **AR12** + section **Conséquences / Option C** de l’ADR (Redis auxiliaire autorisé sous quelles conditions) → critères d’audit vérifiables (AC: **Given** / **Then**)
- [x] Inventorier le **chemin async Paheko** dans le code : `paheko_outbox_processor`, `paheko_outbox_service`, modèles `PahekoOutboxItem`, endpoints `admin_paheko_outbox`, builder/mapping — confirmer **absence de persistance de vérité métier dans Redis** pour cet axe (AC: **Then**)
- [x] Passer en revue **tous** les imports / usages `redis` / `get_redis()` : classifier **dans périmètre async Paheko** vs **autre** (step-up, activité, etc.) avec justification courte (AC: **Then** allowed/forbidden)
- [x] Rédiger le **rapport** (allowed/forbidden + risques + pointeurs fichiers) ; ouvrir ou lister **issues** pour écarts (AC: **Then**)
- [x] Ajouter **au moins une** reco **runtime** (pytest ciblé, checklist canary, ou probe staging) — référencer comment l’exécuter (AC: **And** DoD runtime)
- [x] Valider **hors scope** big bang hybride sans ADR (AC: dernier **And**)

## Dev Notes

### Ancres code (point de départ — non exhaustif)

- Outbox Paheko (durable SQL) : `recyclique/api/src/recyclic_api/services/paheko_outbox_processor.py`, `paheko_outbox_service.py`, `recyclic_api/models/paheko_outbox.py`, `recyclic_api/api/api_v1/endpoints/admin_paheko_outbox.py`.
- Client Redis global : `recyclique/api/src/recyclic_api/core/redis.py` (`get_redis()`).
- Usages Redis **typiquement hors** chemin outbox Paheko (à confirmer à l’audit) : `recyclique/api/src/recyclic_api/core/step_up.py` (rate limit / lockout PIN), tests activité `test_user_statuses.py` — **documenter la classification** pour la conformité AR12 « Paheko accounting ».

### Risques / anti-patterns

- Conclure depuis un **grep seul** sans lien causal avec l’outbox : **insuffisant** (l’AC exige DoD runtime).
- Mélanger **NFR général Redis** et **AR12 sur la compta / async Paheko** sans séparer les périmètres.
- Proposer un **remplacement** de l’outbox par Redis ou une **double vérité** : contredit ADR **25-3** — doit devenir **issue** + escalade, pas une implémentation dans cette story.

### Testing / gates (rappel parent)

- **Pytest ciblé** si le livrable touche du code (ici story **prioritairement documentaire** ; si correction mineure : tests ciblés obligatoires).
- **`git status`** propre en fin de branche / livraison.

### Project Structure Notes

- Backend : `recyclique/api/src/recyclic_api/`.
- Artefacts BMAD : `_bmad-output/implementation-artifacts/`, `_bmad-output/planning-artifacts/architecture/`.

### References

- `_bmad-output/planning-artifacts/epics.md` — **Story 25.12** ; **AR12** (lignes ~172, ~366)
- `_bmad-output/planning-artifacts/architecture/2026-04-20-adr-async-paheko-outbox-durable-redis-auxiliaire-ou-trajectoire-hybride.md` (**ADR 25-3**)
- `_bmad-output/planning-artifacts/architecture/cash-accounting-paheko-canonical-chain.md`
- `_bmad-output/planning-artifacts/architecture/2026-04-20-spec-socle-multisite-permissions-invariants-poste-kiosque-projection-recyclique-paheko.md` (**spec 25.4** — croisement si besoin)
- `_bmad-output/planning-artifacts/architecture/epic-25-phase2-dag-2026-04-21.yaml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Trace Epic 25 — ADR

| Élément | Valeur |
|--------|--------|
| Nouvelle ADR structurante requise ? | **ADR N/A** — story d’**audit** sous **ADR 25-3** déjà **acceptée** ; rouvrir l’ADR seulement si **incohérence bloquante** (sinon issues / rapport). |
| Justification | Le livrable est **documentaire** (rapport + issues) ; pas de changement d’architecture sauf correction mineure de traçabilité approuvée hors scope nominal. |

## Alignement sprint / YAML

- Post–**Story Runner** (2026-04-20) : `sprint-status.yaml` : clé `25-12-audit-code-ar12-redis-auxiliaire-async-paheko` → **`done`** (trace fin de run en tête de fichier) ; **epic-25** inchangé **`in-progress`**.
- Prochaine story pilotée phase 2 : **`25-13`** (ou parallèle DAG) selon **Epic Runner**.

## Dev Agent Record

### Agent Model Used

Composer (agent Task / bmad-dev-story)

### Debug Log References

_(n/a — livraison documentaire + garde-fou pytest)_

### Completion Notes List

- Rapport d’audit AR12 / ADR 25-3 daté : `2026-04-20-audit-ar12-redis-auxiliaire-chemin-async-paheko-story-25-12.md` ; aucun écart matériel sur le périmètre async Paheko qualifié ; pytest ciblé exécuté avec succès.

### File List

- `_bmad-output/implementation-artifacts/2026-04-20-audit-ar12-redis-auxiliaire-chemin-async-paheko-story-25-12.md`
- `_bmad-output/implementation-artifacts/25-12-audit-code-ar12-redis-auxiliaire-async-paheko.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/tests/test-summary-story-25-12-doc-qa.md`
- `recyclique/api/tests/test_story_25_12_ar12_paheko_async_path_no_redis.py`

## Change Log

- **2026-04-20** — DS : audit AR12 / ADR 25-3 (chemin async Paheko), garde-fou pytest, story → **review**, sprint-status → **review**, typo « livrabes » corrigée.
- **2026-04-20** — **post-CR1** (`cr_loop=1`) : `_REL_PATHS` inclut `services/scheduler_service.py` ; docstring heuristique `_FORBIDDEN` ; commentaires sprint-status §25 / Epic 25 alignés **`25-12` review** ; phrases audit + test-summary ; trace `last_updated` epic-25.
- **2026-04-20** — **Story Runner fin** : après **CR2 APPROVE**, story et `development_status` → **`done`**.
