# Story 16.4 : Contractualiser les exports bulk et les stats réception sensibles avant tout slice UI associé

Status: done

**Story key :** `16-4-contractualiser-les-exports-bulk-et-les-stats-reception-sensibles-avant-tout-slice-ui-associe`  
**Epic :** 16 — Déverrouiller les contrats, permissions et garde-fous admin avant portage UI (rail **K** — fondation 15.6, package `2026-04-12_05`)

<!-- Ultimate context engine analysis completed — story CS bmad-create-story 2026-04-12 -->

## Story

As a team sequencing admin migration safely,  
I want exports, bulk actions, and permissive reception stats treated as backend and contract work first,  
So that future UI epics do not hide unresolved authority or audit debt inside reusable components.

## Objectif

Fermer côté **OpenAPI**, **backend**, **permissions**, **audit** et **documentation sécurité** les surfaces **classe B** (15.5 §7) concernant :

1. Les **exports bulk** admin rapports (`reports.py`).
2. Les **statistiques réception** actuellement **trop permissives** au regard des écrans admin legacy (15.2 : écart UI vs API).

Aucun livrable Peintre (JSX, manifests CREOS, widgets) dans cette story.

## Acceptance Criteria (BDD — source `epics.md` Epic 16, Story 16.4)

1. **Given** exports and bulk actions are explicitly called out as sensitive in Epic 15  
   **When** this story is completed  
   **Then** each retained export or bulk capability has a named contract, permission, and audit expectation  
   **And** unresolved items remain blocked for UI rather than silently folded into a generic admin console

### Traduction opérationnelle (mesurable pour `dev-story`)

- Chaque endpoint listé en § **Périmètre technique nommé** possède dans `contracts/openapi/recyclique-api.yaml` : `operationId` stable, schémas requête/réponse (ou `422` documenté), `security` aligné sur le code FastAPI, et description mentionnant au minimum **rôle requis**, **contrainte de contexte** (site / cross-site si applicable), **audit attendu** (événement ou `log_admin_access` / équivalent).

- Les handlers `stats` réception passent de `get_current_user` à une autorité **explicite** cohérente avec l'usage admin (15.2 : `require_role_strict([ADMIN, SUPER_ADMIN])` ou décision **tracée** avec justification sécurité + note OpenAPI si exception métier légitime pour un rôle non admin — **sans** laisser « tout utilisateur authentifié » par défaut si la story conclut au verrouillage admin).

- Les `POST` **export-bulk** ont une attente documentée + code pour **idempotence** et/ou **step-up** là où le risque (fuite de masse, charge) l'exige — en réutilisant le modèle Epic 2.4 / 16.3 (`verify_step_up_pin_header`, `recyclic_api/core/step_up.py`) ou une **ADR courte** dans les Dev Notes si une opération reste hors PIN avec risques acceptés nommés.

- **Tests** : pytest couvrant refus `403` / `401` pour un utilisateur authentifié **non** autorisé sur les stats réception (après durcissement) et sur les bulk exports ; au moins un test de contrat ou schéma OpenAPI si le pipeline du repo le supporte déjà (sinon tâche explicite « aligner avec le gate existant »).

## Hors périmètre / anti-dérive (non négociable)

- **Interdit** : toute story ou PR qui ajoute ou modifie une **page Peintre**, un **slice** admin observable, un **`PageManifest`**, un **`NavigationManifest`**, un **widget CREOS** ou du **JSX** sous `peintre-nano/` pour consommer ces endpoints **tant que la présente story n'est pas close** (statut `done` après DS → gates → QA → CR).

- **Interdit** : utiliser cette story pour « préparer » le client généré ou des hooks UI ; seuls les contrats, le backend, la doc sécurité et les tests backend sont dans le périmètre.

- **Hors scope** : fermeture **G-OA-03** (`users`), familles **16.1–16.3** déjà couvertes ailleurs, portage Epic **17–19** sur réception admin tant que les exports/stats sensibles de cette story restent ouverts — renvoi **correct course** si un gap nouveau apparaît.

- Les **exports non bulk** (ex. `GET /admin/reports/cash-sessions/...`, jetons de téléchargement) peuvent être **mentionnés** pour cohérence OpenAPI mais ne sont pas l'objectif principal sauf si nécessaire pour débloquer la description des bulk (décision tracée dans les Dev Notes).

## Périmètre technique nommé (obligatoire — alignement artefact 15.2)

**Endpoints à contractualiser (liste canonique pour OpenAPI + authz + tests) :**

- `POST /admin/reports/cash-sessions/export-bulk`
- `POST /admin/reports/reception-tickets/export-bulk`
- `GET /stats/reception/summary`
- `GET /stats/reception/by-category`
- `GET /reception/stats/live` (legacy / deprecated si encore exposé)
- `GET /stats/live`

### Exports bulk (backend `reports.py`, préfixe API `/v1`)

- `POST /admin/reports/cash-sessions/export-bulk` — bulk export sessions caisse ; aujourd'hui **absent** de l'OpenAPI canon (15.2 §1 tableau `SessionManager`, §3 surfaces sensibles).

- `POST /admin/reports/reception-tickets/export-bulk` — bulk export tickets réception ; **absent** OpenAPI (15.2 §1 `ReceptionSessionManager`, §3).

### Stats réception / live — permissivité vs UI admin (15.2 §1, §2)

| Endpoint | Comportement actuel (à vérifier dans le code) | Écart 15.2 |
|----------|-----------------------------------------------|------------|
| `GET /stats/reception/summary` | `Depends(get_current_user)` dans `stats.py` | API plus permissive que route `/admin/reception-stats` (adminOnly) |
| `GET /stats/reception/by-category` | idem | idem |
| `GET /reception/stats/live` | route dépréciée vers `GET /stats/live` (voir `reception.py`) | Absent / partiel OpenAPI |
| `GET /stats/live` | `require_role_strict([ADMIN, SUPER_ADMIN])` dans `stats.py` | Déjà admin ; à **contractualiser** si manquant OpenAPI |

Référence cartographie : `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` (tableaux §1–§3).

### Classement produit / séquence

- **Classe B** : « détails exports bulk, stats réception permissives » — portage UI bloqué tant que non contractualisé ([Source: `references/artefacts/2026-04-12_03_recommandation-architecture-admin-peintre-nano-15-5.md` §7 tableau B]).

- **Rail K avant U** : exports CSV / bulk réception et caisse — traiter en **K** avant **U** ; preuve fichier + contrat ([Source: `references/artefacts/2026-04-12_05_package-fondation-passe-analyse-epics-admin-15-6.md` §3 rail K, §5 HITL]).

## Tasks / Subtasks

- [x] **T1 — Inventaire code ↔ contrat** (AC : BDD Then/And)  
  - [x] Lire `recyclique/api/src/recyclic_api/api/api_v1/endpoints/reports.py` (routes `export-bulk`, journalisation existante, `_ensure_session_access`).  
  - [x] Lire `recyclique/api/src/recyclic_api/api/api_v1/endpoints/stats.py` (réception summary/by-category, `/live`).  
  - [x] Lire `recyclique/api/src/recyclic_api/api/api_v1/endpoints/reception.py` (deprecated `/stats/live` si encore exposé).  
  - [x] Vérifier montage routeurs dans `recyclique/api/src/recyclic_api/api/api_v1/api.py` (préfixes `/admin/reports`, `/stats`, `/reception`).

- [x] **T2 — OpenAPI** (`contracts/openapi/recyclique-api.yaml`)  
  - [x] Ajouter ou compléter les paths pour les deux `POST …/export-bulk` avec `operationId` stables, `security`, schémas corps/réponse, erreurs (`401/403/422/429`).  
  - [x] Documenter `GET /stats/reception/summary`, `GET /stats/reception/by-category`, `GET /stats/live`, et le chemin legacy `GET /reception/stats/live` (deprecated) si toujours exposé — cohérent avec le code après durcissement permissions.

- [x] **T3 — Permissions backend**  
  - [x] Aligner `get_reception_summary` et `get_reception_by_category` sur `require_role_strict([ADMIN, SUPER_ADMIN])` **ou** produire une décision écrite (risque métier, rôle `RECEPTION`/`CAISSIER`, etc.) avec mise à jour matrice/gap — pas de statu quo implicite.  
  - [x] Vérifier cohérence **cross-site** pour les agrégats (alignement avec `_ensure_session_access` côté rapports si filtres `site_id`).

- [x] **T4 — Audit & opérations sensibles**  
  - [x] Pour chaque `export-bulk` : tracer `log_admin_access` / `log_system_action` / type d'audit existant ; compléter si trou manquant.  
  - [x] Évaluer **step-up** + `Idempotency-Key` pour les POST bulk (référence `cash_sessions.close`, `db_export` post-16.3).

- [x] **T5 — Documentation sécurité**  
  - [x] Courte note (fichier existant du repo ou section README backend) listant les endpoints, rôles, et risque de fuite de données — lien vers 15.2 (artefacts `references/` **et** story d'implémentation **15.2** ci-dessous).

- [x] **T6 — Tests**  
  - [x] Pytest : utilisateur authentifié **sans** rôle admin ne peut plus appeler les stats réception si T3 durcit en admin-only.  
  - [x] Pytest : bulk exports refusés pour rôles non autorisés ; cas nominal admin documenté.

## Dev Notes

### Chemins backend probables

| Fichier | Rôle |
|---------|------|
| `recyclique/api/src/recyclic_api/api/api_v1/endpoints/reports.py` | Liste rapports, téléchargements, **`export-bulk` caisse et réception** |
| `recyclique/api/src/recyclic_api/api/api_v1/endpoints/stats.py` | **`/stats/reception/*`**, **`/stats/live`** |
| `recyclique/api/src/recyclic_api/api/api_v1/endpoints/reception.py` | **`/reception/stats/live`** (déprécié), tickets, tokens download |
| `recyclique/api/src/recyclic_api/api/api_v1/api.py` | Inclusion routeurs |
| `contracts/openapi/recyclique-api.yaml` | Contrat canonique |
| `recyclique/api/src/recyclic_api/core/auth.py` | `get_current_user`, `require_role_strict`, … |
| `recyclique/api/src/recyclic_api/core/step_up.py` | Constantes step-up / idempotence |
| `recyclique/api/src/recyclic_api/schemas/stats.py` | Schémas réponse stats |

### Patterns à réutiliser (continuité Epic 16)

- Story **16.3** : extension **G-OA-01**, step-up, audit sur surfaces sensibles — même exigence de **traçabilité** pour les bulk (voir `_bmad-output/implementation-artifacts/16-3-encadrer-settings-et-les-surfaces-super-admin-par-step-up-et-audit-explicites.md`).

### Critères de done mesurables (checklist exécuteur)

- [x] OpenAPI : les **deux** POST export-bulk + les GET stats réception/live concernés sont décrits et **génération** client (si gate CI) sans régression.  
- [x] Backend : permissions **alignées** avec la décision documentée (plus d'écart silencieux « tout user authentifié » sur les agrégats réception si la story opte pour le verrouillage admin).  
- [x] Audit : chaque export bulk laisse une **preuve** exploitable (log structuré ou audit DB selon conventions du module).  
- [x] Tests pytest verts sur les chemins modifiés.  
- [x] Aucun fichier sous `peintre-nano/src` modifié pour cette story.

### Project Structure Notes

- Mono-repo **Recyclique** : API sous `recyclique/api/` ; contrats à la racine `contracts/openapi/`.  
- Respecter les conventions d'import et de router existantes (ne pas créer de second `APIRouter` sans alignement `api.py`).

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 16, Story 16.4 (AC BDD)]  
- Story BMAD **15.2** : `_bmad-output/implementation-artifacts/15-2-cartographier-les-dependances-api-permissions-et-contextes-de-ladmin-legacy.md` (cartographie API / permissions / contextes — croiser avec l'artefact `references/` ci-dessous).  
- Story BMAD **15.5** : `_bmad-output/implementation-artifacts/15-5-produire-la-recommandation-darchitecture-pour-un-admin-peintre-nano-mutualise.md` (reco architecture admin / classe B).  
- Story BMAD **15.6** : `_bmad-output/implementation-artifacts/15-6-preparer-la-passe-danalyse-approfondie-et-le-decoupage-des-futurs-epics-de-portage-admin.md` (rail K, fondation epics admin).  
- [Source: `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` — §1 routes, §2 décalage réception-stats, §3 bulk]  
- [Source: `references/artefacts/2026-04-12_03_recommandation-architecture-admin-peintre-nano-15-5.md` — §4 règle 4 surfaces sensibles, §7 classe B]  
- [Source: `references/artefacts/2026-04-12_05_package-fondation-passe-analyse-epics-admin-15-6.md` — §3 rail K, §5 exports avant U]  
- [Source: `peintre-nano/docs/03-contrats-creos-et-donnees.md` — cadre CREOS pour **après** fermeture contrat ; pas d'implémentation dans cette story]

### Architecture compliance

- Chaîne cible documentée 15.5 : **OpenAPI** (autorité) → ContextEnvelope → manifests → runtime ; cette story ne livre que la **première couche** pour les endpoints nommés.

### Testing requirements

- Framework : **pytest** (tests API existants dans le repo — réutiliser fixtures auth / rôles si présentes).  
- Vérifier **429** / rate limit si les handlers `@limiter` restent actifs après changement de dépendance d'auth.  
- Si le repo possède un gate **OpenAPI diff** ou tests de snapshot du YAML, les mettre à jour dans le même lot.

### Questions ouvertes (à trancher en DS, pas bloquant CS)

- Faut-il un rôle **non admin** (ex. opérateur réception) avec accès **lecture seule** agrégats limités au **site** courant ? Si oui, spécifier dans OpenAPI + `ContextEnvelope` plutôt que rouvrir « tout authentifié ».

## Dev Agent Record

### Agent Model Used

Task subagent — bmad-create-story (CS) — 2026-04-12

### Debug Log References

### Completion Notes List

- Story générée en mode **create** ; statut fichier **ready-for-dev** ; `sprint-status.yaml` : clé 16-4 passée **backlog → ready-for-dev**.  
- Revue **VS** (checklist `bmad-create-story`) : tableaux Markdown compactés, liste canonique des six endpoints, références explicites aux stories d'implémentation **15.2 / 15.5 / 15.6**, correction lien 16.3.
- **DS 2026-04-12** : stats réception (`summary`, `by-category`) en **admin-only** + `log_admin_access` ; `GET /stats/live` et `GET /reception/stats/live` avec audit ; bulk exports avec **PIN step-up** (`reports.cash_sessions.export_bulk`, `reports.reception_tickets.export_bulk`) + **Idempotency-Key** obligatoire ; OpenAPI + `npm run generate` ; README API ; tests (headers bulk, 403 USER, 403 sans jeton strict).

- **2026-04-12 (Epic Runner)** : gates pytest ciblés bulk/stats verts ; clôture **review → done** avec 16.1/16.3 (fermeture lot rail **K**).

### File List

- `_bmad-output/implementation-artifacts/16-4-contractualiser-les-exports-bulk-et-les-stats-reception-sensibles-avant-tout-slice-ui-associe.md` (ce fichier)  
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (mise à jour statut 16-4)
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/reports.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/stats.py`
- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/reception.py`
- `recyclique/api/src/recyclic_api/core/step_up.py`
- `recyclique/api/README.md`
- `recyclique/api/tests/conftest.py`
- `recyclique/api/tests/bulk_sensitive_headers.py`
- `recyclique/api/tests/test_bulk_export_cash_sessions.py`
- `recyclique/api/tests/test_bulk_export_reception_tickets.py`
- `recyclique/api/tests/api/test_stats_endpoints.py`
- `contracts/openapi/recyclique-api.yaml`
- `contracts/openapi/generated/recyclique-api.ts` (régénéré)
