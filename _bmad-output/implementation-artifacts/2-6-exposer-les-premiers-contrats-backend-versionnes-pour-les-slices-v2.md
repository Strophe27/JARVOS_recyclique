# Story 2.6 : Exposer les premiers contrats backend versionnés pour les slices v2

**Clé fichier (obligatoire) :** `2-6-exposer-les-premiers-contrats-backend-versionnes-pour-les-slices-v2`  
**Epic :** epic-2 — **Piste B** (contrats OpenAPI reviewables, codegen Peintre_nano)  
**Statut :** done

<!-- Validation optionnelle : exécuter validate-create-story (VS) avant dev-story. -->

## Story

En tant qu'**équipe frontend pilotée par les contrats**,  
je veux que **`Recyclique`** expose les **premières surfaces OpenAPI versionnées** nécessaires au **runtime v2** (auth/session, `ContextEnvelope`, enveloppe d'erreur stable, **états opérationnels** minimaux),  
afin que **`Peintre_nano`** puisse consommer des **types générés** et des **charges utiles alignées sémantiquement** sur le backend **sans** recopie manuelle ad hoc.

## Acceptance Criteria

### AC 1 — Schémas minimaux reviewables dans le writer canonique

**Étant donné** que le backend est le **writer canonique** d'`OpenAPI` ([Source : `epics.md` — Story 2.6 ; `contracts/README.md` ; AR19])  
**Quand** les premières surfaces v2 sont **figées pour codegen**  
**Alors** `contracts/openapi/recyclique-api.yaml` documente de façon **explicite et réutilisable** (composants `schemas` + réponses référencées) au minimum :

- **Auth / session v2** : `LoginRequestV2`, `LoginResponseV2`, `RefreshTokenRequestV2`, `RefreshTokenResponseV2`, `AuthUserV2` (déjà présents — **valider complétude** vs implémentation réelle : champs obligatoires, nullabilité, cookies vs JSON).
- **`ContextEnvelope`** et dépendances directes : `ContextRuntimeState`, `ExploitationContextIds`, `permission_keys`, `computed_at`, `restriction_message` (alignement Stories **2.2** / **2.3**).
- **Enveloppe d'erreur stable** : schéma unique (ex. `RecycliqueApiError` ou nom équivalent) avec les champs **AR21** : `code`, `detail`, `retryable`, `state`, `correlation_id` (types et sémantique documentés ; `snake_case` JSON).
- **États opérationnels précoces** utiles aux slices (hors livraison complète Epic **2.7**) : au minimum les enums / objets **déjà** dans le YAML et **garantis stables** pour le client — ex. `ContextRuntimeState`, `SyncStateCore` ; si `ExploitationLiveSnapshot` reste un stub documentaire, **clarifier** dans la description OpenAPI ce qui est **contrat gelé** vs **placeholder Epic 2.7** (éviter que le codegen propage une sémantique ambiguë).

**Et** les conventions **dates ISO 8601**, **propriétés JSON en snake_case**, et **`additionalProperties: false`** là où le projet impose des objets clos (cohérent avec l'existant dans le fichier).

### AC 2 — Versionnement et détectabilité du drift

**Étant donné** que `info.version` est aujourd'hui `0.0.0-draft` ([Source : `recyclique-api.yaml`])  
**Quand** cette story est livrée  
**Alors** la **politique de version draft** est **explicitée** dans `contracts/README.md` ou en en-tête du YAML (semver draft : incrément **minor** pour ajouts rétro-compatibles de champs optionnels ; **major** ou procédure **B4** pour breaking).  
**Et** toute **rupture** d'`operationId` ou de schéma public suit **B4** : mise à jour des références (`data_contract.operation_id`, tests, doc) **ou** ligne dans le **journal des renommages** `contracts/README.md` ([Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` — §0.1 B4]).

### AC 3 — Chemin gouverné vers le codegen (sans doublon manuel)

**Étant donné** que le frontend doit utiliser **une source outillée** ([Source : `epics.md` — Story 2.6 ; AR20])  
**Quand** le contrat est prêt pour **Peintre_nano**  
**Alors** le dépôt documente **le chemin d'artefact** : entrée = `contracts/openapi/recyclique-api.yaml` ; sortie cible = `contracts/openapi/generated/` (création au besoin) **ou** équivalent documenté dans `peintre-nano/` **sans** dupliquer les DTO à la main.  
**Et** si un **script** (npm/pnpm ou Python) est ajouté pour générer les types TS, il est **minimal**, **reproductible**, et référencé depuis `contracts/README.md` ou `peintre-nano/README.md` (un seul endroit d'entrée pour l'équipe).

**Note borne story :** brancher la **CI diff** OpenAPI (Epic **10**) n'est **pas** requis ici ; en revanche, la story doit **faciliter** un futur gate (fichier YAML stable, générateur documenté).

### AC 4 — Cohérence implémentation FastAPI ↔ YAML reviewable

**Étant donné** que le YAML est **reviewable** et que le code peut diverger ([Source : en-tête `recyclique-api.yaml` — génération depuis FastAPI])  
**Quand** les schémas d'erreur et les réponses clés sont ajoutés ou resserrés  
**Alors** l'implémentation sous `recyclique/api/` **reflète** les mêmes formes pour les chemins v2 concernés (handlers, `HTTPException` / exception handlers, réponses Pydantic) **ou** le YAML est ajusté pour refléter la vérité **avec justification** dans les Dev Notes.  
**Et** les tests existants ou nouveaux (ex. `tests/test_openapi_validation.py`, `tests/test_context_envelope.py`, auth) **restent verts** ; ajouter des cas ciblés si l'enveloppe d'erreur devient normative.

### AC 5 — Hors scope explicite

**Étant donné** que la **Story 2.7** porte les **signaux bandeau live**  
**Quand** cette story est exécutée  
**Alors** **ne pas** implémenter la **logique métier complète** de `GET /v2/exploitation/live-snapshot` : seulement **stabiliser** les types/contrats **partagés** (AC 1) et la **documentation** des champs encore « à figer » en 2.7.  
**Et** **ne pas** modifier les manifests CREOS reviewables au-delà de ce qui est **strictement** nécessaire pour aligner `data_contract.operation_id` si une opération est **ajoutée ou renommée** (politique D8 / B4).

## Tasks / Subtasks

- [x] **Cartographier l'existant OpenAPI + runtime** (AC : #1, #4)  
  - [x] Lire `contracts/openapi/recyclique-api.yaml` en entier ; recenser schémas auth, contexte, erreurs manquantes, réponses `4xx/5xx` non typées.  
  - [x] Comparer avec `app.openapi()` / handlers dans `recyclique/api/src/recyclic_api/` (`main.py`, endpoints `auth`, `users`, exception handlers).

- [x] **Définir et publier `RecycliqueApiError` (nom final à figer)** (AC : #1, #4)  
  - [x] Ajouter le schéma dans `components/schemas` ; référencer dans les réponses d'erreur des opérations **v2 prioritaires** (auth, context, refresh) au minimum.  
  - [x] Aligner le handler d'erreur FastAPI pour émettre `correlation_id` (lien `X-Request-Id` / `request.state.request_id`, story **2.4** / **2.5**).

- [x] **Resserrer les types « états opérationnels » documentaires** (AC : #1, #5)  
  - [x] Documenter dans les `description` OpenAPI la distinction **contrat stable** vs **à compléter en 2.7** pour `ExploitationLiveSnapshot` et sous-objets.  
  - [x] Geler ou enumérer explicitement les chaînes critiques déjà utilisées côté client mock (si applicable).

- [x] **Versionnement + README** (AC : #2)  
  - [x] Mettre à jour `contracts/README.md` : règle semver draft, lien vers générateur, mention du journal B4 si renommage.  
  - [x] Ajuster `info.version` si pertinent (ex. `0.1.0-draft` après premier lot codegen-ready).

- [x] **Codegen Peintre_nano** (AC : #3)  
  - [x] Ajouter script + répertoire `contracts/openapi/generated/` (gitignore partiel si artefacts volumineux — **documenter** le choix).  
  - [x] Première génération TS **minimale** (types uniquement) consommée ou prête à être importée par `peintre-nano` (chemin d'import documenté).

- [x] **Tests** (AC : #4)  
  - [x] Étendre / ajuster `tests/test_openapi_validation.py` (erreur, context) ; garder cohérence préfixe chemins (`/v1` vs `/api/v1` — voir note gate story **2.5**).  
  - [x] Gate pytest Epic 2 : reprendre la liste story **2.5** et **ajouter** tout nouveau test créé pour cette story.

- [x] **Gate qualité — pytest aligné Epic 2** (AC : #4)  
  - [x] Exécuter depuis `recyclique/api` (ajuster si le gate parent impose un sur-ensemble) :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique\api'
$env:TESTING = 'true'
python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py tests/test_context_envelope.py tests/test_monorepo_backend_layout.py tests/test_user_permissions.py tests/test_effective_permissions.py tests/test_groups_and_permissions.py tests/api/test_pin_endpoints.py tests/test_pin_management.py tests/test_step_up_cash_session_close.py tests/test_audit_story_25.py tests/test_cash_session_close_arch04.py tests/test_openapi_validation.py -v --tb=short
```

  - [x] Si échec pour **indisponibilité d'environnement** : **NEEDS_HITL** avec cause. Si échec connu **PIN / préfixe URL** : documenter sous-ensemble vert comme en story **2.5** sans prétendre un PASS global fragile. _(Gate exécuté : 174 passed, 3 skipped — préfixes PIN corrigés.)_

## Dev Notes

### Portée story (annexe Story Runner)

Contrats versionnés **minimaux** : auth, `ContextEnvelope`, erreurs, états opérationnels ; **source unique** pour codegen **Peintre_nano** ; alignement **`contracts/README`** et politique **B4**.

### Découpage avec stories voisines

| Story | Rôle |
|-------|------|
| **2.5** | Audit, corrélation, pas de fuite secrets — **réutiliser** `correlation_id` dans l'enveloppe d'erreur. |
| **2.7** | Signaux **bandeau live** — sémantique riche et agrégats ; **2.6** prépare **types / stabilité**, pas la vérité terrain live. |
| **Epic 3** | Runtime Peintre — **consommateur** des types générés ; **Convergence 1** : hooks réels + contrat aligné. |
| **Epic 10** | CI diff OpenAPI / validation manifests — **préparer** sans tout implémenter. |

### Fichiers et zones probables

- `contracts/openapi/recyclique-api.yaml` — **writer reviewable principal**  
- `contracts/README.md` — gouvernance, semver draft, B4, chemin codegen  
- `recyclique/api/src/recyclic_api/main.py` — exception handlers, forme JSON erreurs  
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/auth.py`, `users.py` — réponses et schémas alignés  
- `recyclique/api/tests/test_openapi_validation.py`, `tests/test_context_envelope.py`  
- `peintre-nano/package.json` ou script racine — **optionnel** hook `generate:api-types`  
- `contracts/openapi/generated/` — **sortie codegen** (si créé)

### Références normatives

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.6 ; FR53, FR73, AR19–AR21, AR20]  
- [Source : `contracts/README.md` — tableau zones, B4, journal `operationId`]  
- [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` — B4, D7, D8, semver]  
- [Source : `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md` — `data_contract.operation_id` ↔ `operationId`]  
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — Piste B, emplacement contrats]  
- Story **2.5** — `_bmad-output/implementation-artifacts/2-5-stabiliser-la-persistance-terrain-locale-laudit-et-les-journaux-critiques.md` (gate pytest, corrélation, note URL tests)

### Intelligence story 2.5 (continuité)

- **`request_id` / `X-Request-Id`** : l'enveloppe d'erreur doit permettre au frontend et au support de corréler avec les logs sans exposer de données sensibles.  
- **Tests PIN / préfixe** : même vigilance que **2.4** / **2.5** sur les chemins `/api/v1` vs `/v1` dans les clients de test.

### Anti-patterns à éviter

- **Dupliquer** des interfaces TypeScript **à la main** dans `peintre-nano` pour des champs déjà décrits dans OpenAPI (hors adaptateurs très locaux).  
- **Renommer** un `operationId` **sans** mise à jour des références manifestes / journal B4.  
- **Mélanger** camelCase et snake_case dans les schémas **publics** backend (AR21).  
- **Étendre** `ExploitationLiveSnapshot` avec de la sémantique métier **non** validée alors que **2.7** est le bon conteneur.

### Conformité architecture

- **Recyclique** = autorité des **contrats HTTP** exposés au client v2 ; **Peintre_nano** = consommateur.  
- **CREOS** : pas de duplication de la vérité métier dans les schémas OpenAPI au-delà des DTO nécessaires au transport.

### Structure projet (post 2.2b)

- Backend vivant : **`recyclique/api/`** ; Docker **`recyclic-local`** via `recyclique-1.4.4/docker-compose.yml` (contexte `../recyclique/api`).

## Dev Agent Record

### Agent Model Used

Composer (implémentation DS story 2.6).

### Debug Log References

- Handler `HTTPException` : enregistrer `starlette.exceptions.HTTPException` (les 404 route utilisent cette classe, pas `fastapi.exceptions.HTTPException`).
- Erreurs métier `detail` dict `{code, message}` : mapper vers champs enveloppe `code` + `detail` (step-up, idempotence).

### Completion Notes List

- OpenAPI `0.1.0-draft` : schéma `RecycliqueApiError`, réponses erreur typées sur auth / context / permissions / cash-session close / live-snapshot 503 ; `ExploitationLiveSnapshot` clarifié (gelé vs 2.7).
- Backend : enveloppe AR21 sur toutes les `HTTPException` Starlette + validation 422 ; `correlation_id` aligné middleware 2.5.
- Codegen : `contracts/openapi/package.json` + `generated/recyclique-api.ts` ; `node_modules/` ignoré.
- Tests PIN : chemins via `settings.API_V1_STR` ; `PUT /me/pin` : exiger `current_password` si PIN déjà défini (alignement tests / sécurité).

### File List

- `contracts/openapi/recyclique-api.yaml`
- `contracts/README.md`
- `contracts/openapi/package.json`
- `contracts/openapi/package-lock.json`
- `contracts/openapi/.gitignore`
- `contracts/openapi/generated/recyclique-api.ts`
- `peintre-nano/README.md`
- `recyclique/api/src/recyclic_api/main.py`
- `recyclique/api/src/recyclic_api/schemas/recyclique_api_error.py`
- `recyclique/api/src/recyclic_api/schemas/pin.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/users.py`
- `recyclique/api/tests/test_openapi_validation.py`
- `recyclique/api/tests/test_step_up_cash_session_close.py`
- `recyclique/api/tests/api/test_pin_endpoints.py`
- `recyclique/api/tests/test_pin_management.py`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-04-03 : Story 2.6 — contrats versionnés, enveloppe erreur, codegen TS, tests gate Epic 2 verts.

---

**Note de complétion create-story (CS)** : story dérivée de `epics.md` Story 2.6, annexe Story Runner (contrats versionnés, codegen Peintre_nano, README, B4), état actuel `recyclique-api.yaml`, AR19–AR21, continuité **2.5** (corrélation, gates pytest), bornage **2.7**.
