# Story 2.2 : Implémenter le `ContextEnvelope` backend minimal et le recalcul explicite de contexte

**Clé fichier (obligatoire) :** `2-2-implementer-le-contextenvelope-backend-minimal-et-le-recalcul-explicite-de-contexte`  
**Epic :** epic-2 — **Piste B** (implémentation backend réel : `ContextEnvelope`, permissions, contextes) — **ne pas** déplacer la **vérité contextuelle** dans **Peintre_nano (Epic 3)** : le frontend ne fait qu'afficher / demander ; **Recyclique** calcule et impose.  
**Statut :** done

<!-- Validation optionnelle : exécuter validate-create-story avant dev-story. -->

## Story

En tant que **runtime UI composé** (et consommateurs contrats v2),  
je veux que **`Recyclique`** expose un **`ContextEnvelope` canonique** et un comportement de **rafraîchissement / recalcul explicite** du contexte actif,  
afin que le client ne rende que ce qui est **valide** pour le **site, caisse, session, poste et opérateur** courants, **sans** inférence silencieuse.

## Acceptance Criteria

### AC 1 — Contrat minimal et schéma gouverné

**Étant donné** que la hiérarchie de vérité v2 exige un **contexte détenu par le backend** ([Source : `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` — §1 principe 1, §7 ; `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` — §1 AR39])  
**Quand** le **`ContextEnvelope` minimal** est implémenté  
**Alors** il expose les **champs canoniques** de contexte (identifiants site / caisse / session caisse / poste réception selon le modèle 1.3), l'**état runtime** attendu pour l'UI (`ok` / `degraded` / `forbidden` ou équivalent **figé dans OpenAPI** — spec **§4.2**), et les **permissions effectives** ou leur emplacement contractuel **aligné** sur ce que la story autorise comme « minimal » (voir **découpage avec Story 2.3** ci-dessous)  
**Et** le **schéma et les opérations HTTP** sont publiés via le chemin **reviewable** `contracts/openapi/recyclique-api.yaml` avec des **`operationId` stables** et cohérents `contracts/README.md` / politique **B4** (pas de second fichier source parallèle sans lien OpenAPI)

### AC 2 — Recalcul explicite ; pas de bascule « surprise »

**Étant donné** qu'un changement de contexte **sensible** ne doit **jamais** être implicite ([Source : spec 1.3 — §4.0, §4.1 tableau bascules, FR12–FR13 `epics.md`])  
**Quand** l'utilisateur ou le système provoque un changement de **site, caisse, session caisse ou poste de réception** (ou invalidation équivalente côté serveur)  
**Alors** le backend **recalcule** l'enveloppe côté serveur (login, refresh, **endpoint dédié** de rafraîchissement contexte — spec **§4.2**, à figer en OpenAPI dans cette story ou extension documentée)  
**Et** le client **ne construit pas** l'enveloppe à partir de manifests ou de libellés ; il **consomme** la réponse serveur

### AC 3 — Contexte ambigu ou incomplet → état restreint explicite

**Étant donné** qu'un contexte **ambigu** ou **incomplet** ne doit pas produire une supposition silencieuse ([Source : spec 1.3 — §4.0 fin, FR64 ; AC Story 2.2 `epics.md`])  
**Quand** les prérequis d'exploitation ne sont pas réunis (ex. site non choisi, session douteuse, incohérence détectée — **à préciser dans l'implémentation** selon brownfield)  
**Alors** la réponse porte un état **`degraded`** ou **`forbidden`** (noms **exactement** ceux du contrat OpenAPI) avec une **sémantique documentée** : ce qui reste autorisé vs bloqué **côté serveur**  
**Et** **aucune** expansion silencieuse des droits ou du périmètre métier

### AC 4 — Continuité epics UI sans modèle parallèle

**Étant donné** que **Epic 3** et **Epic 5** doivent s'appuyer sur **une seule** charge utile de contexte autoritaire  
**Quand** cette story est livrée  
**Alors** les consommateurs peuvent s'appuyer sur le **contrat publié** (types générés ultérieurement — **Story 2.6** pour le versionnage / codegen complet si besoin)  
**Et** les epics ultérieurs **n'inventent pas** un second modèle de contexte métier côté frontend ([Source : `epics.md` — Story 2.2 dernier bloc AC])

### Validation humaine (HITL) — critères de relecture

Un pair valide : **autorité serveur** sur le contenu de l'enveloppe ; **pas de fuite** inter-site / inter-contexte ; **OpenAPI** à jour ; **secrets** absents des livrables ; **logs** sans données sensibles ; alignement **§3** isolation (spec 1.3).

## Tasks / Subtasks

- [x] **Cartographier l'existant brownfield vs cible `ContextEnvelope`** (AC : #1, #2)  
  - [x] Relire `GET /v1/users/me`, `GET /v1/users/me/permissions`, modèle `User` (ex. `site_id`), routes caisses / sessions / postes réception déjà présentes — [Source : `references/artefacts/2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md` — §3.1–3.5, backlog B1]  
  - [x] Identifier ce qui est **déjà** exposé vs ce qui doit entrer dans **un** schéma `ContextEnvelope` (agrégation vs nouvel endpoint — **choix à documenter** dans les notes de complétion)

- [x] **Définir / compléter les schémas OpenAPI** (AC : #1)  
  - [x] Étendre ou introduire dans `contracts/openapi/recyclique-api.yaml` le schéma **`ContextEnvelope`** (et sous-objets si nécessaire), en réutilisant / reliant `ExploitationContextIds` si pertinent — fichier YAML actuel : commentaire « ContextEnvelope lorsque exposé » sous `ExploitationContextIds`  
  - [x] Ajouter ou mettre à jour les **`operationId`** pour : émission / rafraîchissement de l'enveloppe (ex. `GET` dédié ou évolution contrôlée d'une route existante) — **sans casser** les références existantes sans politique **B4**

- [x] **Implémenter le calcul serveur minimal** dans `recyclique/api/` (AC : #1–#3)  
  - [x] Service ou couche dédiée (ex. sous `core/` ou `services/`) qui **agrège** contexte + indicateur d'état (`ok` / `degraded` / `forbidden`) + **placeholder ou jeu minimal** de `permissionKeys` si le calcul additif complet est reporté à **Story 2.3** — **expliciter** dans le code / story completion ce qui est **minimal** vs reporté  
  - [x] Respecter **Story 2.1** : résolution JWT **Bearer ou cookie** via `get_current_user` / `resolve_access_token` — pas de contournement auth

- [x] **Recalcul explicite** (AC : #2)  
  - [x] Après opérations de **changement de contexte** métier (sélection site, ouverture / clôture session, etc.), garantir que la **prochaine** lecture de l'enveloppe reflète l'état serveur ; implémenter ou brancher l'**endpoint de rafraîchissement** mentionné spec **§4.2**  
  - [x] Éviter les mises à jour **silencieuses** qui contrediraient §4.0 (message / statut explicite côté payload si le serveur invalide un contexte)

- [x] **États dégradés** (AC : #3)  
  - [x] Mapper les cas d'ambiguïté aux enums / champs du contrat ; documenter dans OpenAPI (`description`) la sémantique minimale livrée dans cette story

- [x] **Tests** (AC : #1–#4)  
  - [x] Tests pytest ciblés (nouveau fichier ou extension) : enveloppe **cohérente** pour un utilisateur de test ; cas **degraded** / **forbidden** minimal ; pas de régression sur `/users/me` et permissions si routes modifiées

- [x] **Gate qualité — sous-ensemble pytest aligné Story 2.1 / `run_tests.sh`** (AC : tous)  
  - [x] Exécuter depuis `recyclique/api` :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api'
$env:TESTING = 'true'
python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py -v --tb=short
```

  - [x] Si échec pour **indisponibilité d'environnement** (Redis, Postgres, Docker, EPERM) : **NEEDS_HITL** avec cause — ne pas marquer PASS fragile ([Source : brief Story Runner]) — *N/A sur gate locale 2026-04-03 (succès).*

## Dev Notes

### Découpage avec Story 2.3 (permissions additives complètes)

- **Story 2.2** : **enveloppe** canonique, **recalcul explicite**, **états** `ok` / `degraded` / `forbidden`, exposition **contractuelle** ; le **calcul additif complet** rôles + groupes + union stable est **Story 2.3** (`epics.md` Story 2.3).  
- Si cette story ne livre qu'un **sous-ensemble** de `permissionKeys`, le comportement doit être **documenté** (OpenAPI + notes dev) pour éviter que le client suppose l'union finale avant 2.3.

### Pack contexte (Story Runner — Epic 2)

- **Dépendances Epic 1 (done)** : spec multi-contextes ; gouvernance OpenAPI / CREOS ; `contracts/openapi/recyclique-api.yaml` ; contrat sync / signaux (contexte adjacent).  
- **Décision backend** : package vivant sous **`recyclique/api/`** (story 2.2b) — [Source : `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md`].  
- **Références** : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` ; `architecture/project-structure-boundaries.md` ; `contracts/README.md` ; `contracts/creos/` ; code `recyclique/api/` ; `references/paheko/` ; `references/ancien-repo/` si utile.

### Périmètre et hors scope

- **In scope** : `ContextEnvelope` **minimal** serveur, recalcul / rafraîchissement **explicite**, états dégradés **explicites**, OpenAPI reviewable, tests ciblés, gate pytest liste 2.1.  
- **Hors scope explicite** : calcul additif **complet** et modèle groupes/roles **exhaustif** (**Story 2.3**) ; step-up / PIN / idempotence métier (**Story 2.4**) ; persistance audit généralisée (**Story 2.5**) ; bundle contrats versionnés / codegen (**Story 2.6**) ; signaux **`bandeau live`** (**Story 2.7**).  
- **Interdit** : faire de **Peintre_nano** la source de vérité du contexte métier ; commiter des **credentials**.

### Intelligence Story 2.1 (continuité)

- **Session web v2** : cookies httpOnly optionnels (`use_web_session_cookies`) ; `resolve_access_token` : **Bearer prioritaire**, puis cookie ; `get_current_user` inchangé pour les dépendances.  
- **Fichiers touchés récemment (référence)** : `core/auth.py`, `core/web_session_cookies.py`, `core/config.py`, `schemas/auth.py`, `endpoints/auth.py`, `contracts/openapi/recyclique-api.yaml`.  
- **Endpoint existant utile** : `GET /v1/users/me/permissions` appelle `get_user_permissions` — **point d'ancrage** ou **refactor** vers enveloppe unifiée selon design retenu.

### Stack et versions

- **FastAPI**, **SQLAlchemy**, **pytest** sous `recyclique/api/tests/`. Rester aligné sur les dépendances du package API.

### Cross-story (Epic 2)

| Story | Rappel |
|-------|--------|
| 2.1 | Socle session / auth — **fait** (référence transport JWT + cookies) |
| 2.3 | Union permissions rôles + groupes, clés stables |
| 2.6 | Versionnage / codegen contrats |

### Project Structure Notes

- **Backend actif** : `recyclique/api/` (dossier canonique post–story 2.2b).  
- **Contrat canonique** : `contracts/openapi/recyclique-api.yaml` — **writer** Recyclique (AR19).  
- **Frontend** : `peintre-nano/` consomme ; **mocks** alignés schéma jusqu'à Convergence 1 — pas de duplication de vérité.

### Synthèse create-story (CS) — 2026-04-03

- **Primauté** : `_bmad-output/planning-artifacts/epics.md` (Epic 2, Story 2.2) + `sprint-status.yaml` ; pack Epic 2 du Story Runner intégré en tête de fichier et en « Pack contexte ».
- **Sprint** : clé `2-2-…` est en **`review`** — la mise à jour create-story *backlog → ready-for-dev* (workflow étape 6) **ne s'applique pas** tant que la story n'est pas replanifiée en backlog ; le fichier sert à la fois de **spec contexte dev** et de **trace d'implémentation**.
- **Alignement gate CI / `run_tests.sh`** : le script `recyclique/api/run_tests.sh` inclut `tests/test_context_envelope.py` (aligné gate Story Runner 2.2 / 2.2b).
- **`project-context.md`** : aucun fichier `project-context.md` repéré à la racine du dépôt lors du passage CS (optionnel ; si créé plus tard, référencer ici le chemin).

### References

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.2]
- [Source : `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` — §2 entités, §3 isolation, §4 bascule / recalcul / degraded, §5 permissions]
- [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` — §1 AR39, ContextEnvelope dans OpenAPI]
- [Source : `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md`]
- [Source : `contracts/openapi/recyclique-api.yaml` — `ExploitationContextIds`, schémas auth v2]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`]
- [Source : `references/artefacts/2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md`]

## Dev Agent Record

### Agent Model Used

Composer (agent dev BMAD / Cursor)

### Debug Log References

- Schéma pilote SQLite : table `cash_registers` absente → `noload(CashSession.register)` pour éviter le JOIN imposé par `lazy="joined"`.
- Table `poste_reception` parfois absente → lecture poste conditionnelle via `inspect(bind).has_table(...)`.

### Completion Notes List

- **Endpoints** : `GET /v1/users/me/context` (`recyclique_users_getContextEnvelope`) et `POST /v1/users/me/context/refresh` (`recyclique_users_refreshContextEnvelope`) — auth inchangée (`get_current_user`, Bearer ou cookie 2.1).
- **Agrégat** : rechargement utilisateur en base, session caisse ouverte la plus récente (`operator_id`), poste réception ouvert si table présente, `permission_keys` via `get_user_permissions` existant (minimal Story 2.2 ; union exhaustive Story 2.3).
- **États** : `ok` | `degraded` | `forbidden` (OpenAPI + Pydantic) ; `forbidden` si `REJECTED` ; `degraded` si pas `ACTIVE`, site absent, ou session caisse sur autre site que `user.site_id` ; `restriction_message` explicite.
- **OpenAPI** : schémas `ContextRuntimeState`, `ContextEnvelope`, paths documentés dans `contracts/openapi/recyclique-api.yaml`.
- **Tests** : `tests/test_context_envelope.py` (6) ; gate Story 2.1 : 75 passed, 4 skipped (2026-04-03).

### File List

- `contracts/openapi/recyclique-api.yaml`
- `recyclique/api/src/recyclic_api/schemas/context_envelope.py`
- `recyclique/api/src/recyclic_api/services/context_envelope_service.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/users.py`
- `recyclique/api/tests/test_context_envelope.py`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-2-implementer-le-contextenvelope-backend-minimal-et-le-recalcul-explicite-de-contexte.md`

### Change Log

- 2026-04-03 : Story 2.2 — ContextEnvelope minimal, endpoints context + refresh, OpenAPI, tests, sprint → review.
- 2026-04-03 : Reprise Story Runner (resume_at CR) — CR + gate pytest PASS, sprint → **done**.

---

## Story completion status

**done** — Revue de code (bmad-code-review) et gate pytest Story 2.1 + `tests/test_context_envelope.py` : **89 passed** (2026-04-03, exécution unique ; éviter deux pytest concurrents sur la même base SQLite locale).
