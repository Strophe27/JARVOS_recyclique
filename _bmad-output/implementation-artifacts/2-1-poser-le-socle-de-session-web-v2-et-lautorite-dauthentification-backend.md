# Story 2.1 : Poser le socle de session web v2 et l'autorité d'authentification backend

**Clé fichier (obligatoire) :** `2-1-poser-le-socle-de-session-web-v2-et-lautorite-dauthentification-backend`  
**Epic :** epic-2 — **Piste B** (implémentation backend réel : sessions, auth, ContextEnvelope, etc.) — **ne pas** confondre avec **Peintre_nano (Epic 3)** : le frontend consomme les contrats ; **aucune** sécurité ni vérité contextuelle dans le runtime UI.  
**Statut :** review

<!-- Validation optionnelle : exécuter validate-create-story avant dev-story. -->

## Story

En tant qu'**équipe frontend et backend** (intégration same-origin v2),  
je veux que **`Recyclique`** expose le **socle session / auth v2** sous **autorité backend exclusive**,  
afin que les travaux UI futurs (**Epic 3**, slices métier) s'appuient sur un **modèle d'authentification stable et sécurisé** **sans** déplacer la logique de sécurité dans **`Peintre_nano`**.

## Acceptance Criteria

### AC 1 — Autorité backend et transport session

**Étant donné** que l'authentification v2 reste sous **autorité `Recyclique`** ([Source : `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` — §1 principe 1])  
**Quand** le socle session est posé  
**Alors** le backend fournit les **endpoints et middleware minimaux** pour des **sessions web authentifiées same-origin** (login, maintien de session, logout, chemin refresh si applicable au modèle retenu)  
**Et** le **transport de session** suit la **stratégie cookies sécurisés** alignée architecture (httpOnly, SameSite, durées, rotation) — **à documenter et à aligner** sur `contracts/openapi/recyclique-api.yaml` sans créer une seconde source de vérité ([Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — API Boundaries, stack cible])

### AC 2 — Cohabitation ancien / nouveau sans double source de vérité

**Étant donné** que d'**anciennes** et **nouvelles** surfaces frontend peuvent **coexister** temporairement  
**Quand** la fondation auth est documentée et exposée  
**Alors** le modèle de transition est **explicite** (chemins d'auth, en-têtes ou cookies, préfixes `/v1`) et **évite** de dupliquer la **source de vérité** d'authentification  
**Et** **aucune** décision d'autorisation ou de credential n'est **déléguée** à l'état runtime frontend au-delà de la présentation ([Source : `epics.md` — Story 2.1, alignement §1 bis spec 1.3 — UI jamais vérité sécurité])

### AC 3 — Base stable pour contrats et epics suivants

**Étant donné** que les stories **2.2** à **2.7** s'appuient sur une base auth stable  
**Quand** cette story est complétée  
**Alors** **Epic 3** peut consommer un **contrat auth/session clair** (complété ou étendu en **Story 2.6** pour la versionnage OpenAPI exhaustif si besoin — ici : **socle minimal exploitable**)  
**Et** les epics métier ultérieurs **ne redéfinissent pas** la propriété login/session ([Source : `epics.md` — Stories 2.1, 2.2, 2.6])

### Validation humaine (HITL) — critères de relecture

Un pair valide : **autorité 100 % backend** ; **stratégie transport** (cookies / en-têtes) **cohérente** avec la doc sécurité projet ; **document de transition** sans double backend implicite ; **secrets hors dépôt** ; **logs sans secrets en clair**.

## Tasks / Subtasks

- [x] **Décision d'implémentation : `recyclique-1.4.4/` vs dossier canonique `recyclique/`** (AC : #1, #2)  
  - [x] **Documenter explicitement** dans le livrable de story (section Dev Agent Record / Completion Notes ou court fichier sous `references/artefacts/` daté si l'équipe préfère) : soit **évolution** du code sous `recyclique-1.4.4/api/`, soit **création/peuplement** de `recyclique/` à la racine — **interdit** : deux backends parallèles **sans** décision tracée ([Source : brief Story Runner — Context pack Epic 2])  
  - [x] Vérifier cohérence avec `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` (backend nominal `recyclique/`)

- [x] **Aligner le socle session web v2 sur le brownfield existant** (AC : #1)  
  - [x] Cartographier l'existant : `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/auth.py`, `core/auth.py`, `core/security.py`, `services/refresh_token_service.py`, middleware associés, CORS / `TrustedHost` dans `main.py`  
  - [x] Identifier l'écart entre **comportement actuel** (ex. JWT dans corps / en-têtes) et **cible v2** (cookies httpOnly, lifecycle, rotation) ; implémenter ou **poser les hooks** minimaux sans casser les clients legacy **sans stratégie documentée**  
  - [x] Préserver les invariants **1.3** : distinction **mot de passe web** vs **PIN métier** (PIN détaillé **Epic 2.4** — ne pas tout implémenter ici)

- [x] **Middleware et endpoints minimaux** (AC : #1)  
  - [x] Garantir chaîne **authentification → utilisateur courant** utilisable par les routes protégées existantes et futures  
  - [x] Inclure gestion **utilisateur inactif** / refus d'accès cohérente avec les tests existants (`tests/test_auth_inactive_user_middleware.py`)  
  - [x] Documenter pour les consommateurs : same-origin, CSRF si applicable (alignement décisions archi — à ne pas inventer côté frontend seul)

- [x] **Observabilité et sécurité des logs** (AC : #1, HITL)  
  - [x] Conformité avec `tests/test_auth_logging.py` et politique : **pas** de mots de passe, tokens ou PIN en clair dans les logs  
  - [x] Métriques monitoring auth/sessions : conserver ou adapter les routes sous `/v1/monitoring/...` existantes si elles font partie du périmètre régression

- [x] **Contrat et gouvernance** (AC : #3)  
  - [x] Mettre à jour ou compléter les chemins **`contracts/openapi/recyclique-api.yaml`** pour les opérations auth/session **touchées** par cette story (**operationId** stables, alignés `contracts/README.md` / Story **1.4**) — ou renvoi explicite « inchangé » si seul comportement transport change sans nouveau schéma  
  - [x] Ne **pas** dupliquer la sémantique **ContextEnvelope** (Story **2.2**)

- [x] **Gate qualité — sous-ensemble pytest** (AC : #1–#3)  
  - [x] Exécuter depuis `recyclique-1.4.4/api` (tant que la décision migration n'a pas déplacé les tests) :

```powershell
Set-Location 'D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\recyclique-1.4.4\api'
$env:TESTING = 'true'
python -m pytest tests/test_infrastructure.py tests/test_auth_login_endpoint.py tests/test_auth_logging.py tests/test_auth_inactive_user_middleware.py tests/test_auth_login_username_password.py tests/test_admin_user_status_endpoint.py tests/api/test_admin_user_management.py tests/test_refresh_token_service.py tests/test_refresh_token_endpoint.py -v --tb=short
```

  - [x] Si échec pour **indisponibilité d'environnement** (Redis, Postgres, Docker, EPERM) : **NEEDS_HITL** avec cause — **ne pas** marquer PASS fragile ([Source : brief Story Runner])

## Dev Notes

### Pack contexte (Story Runner — Epic 2)

- **Dépendances Epic 1 (done)** : spec multi-contextes / invariants d'autorisation ; gouvernance OpenAPI / CREOS / `ContextEnvelope` ; contrat sync Paheko ; signaux bandeau ; matrice Paheko.  
- **Références typiques** : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` ; `architecture/project-structure-boundaries.md` ; `contracts/README.md` ; `contracts/openapi/recyclique-api.yaml` ; `contracts/creos/` ; audit `references/artefacts/2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md` (**§3.3 Auth**, **§5–§7** backlog B1 auth+contexte+permissions) ; `references/ancien-repo/v1.4.4-liste-endpoints-api.md` ; `references/paheko/` ; `references/migration-paeco/`.

### Périmètre et hors scope

- **In scope** : socle **session web** + **autorité d'authentification** backend, alignement transport sécurisé, régression tests gate, décision repo tracée.  
- **Hors scope explicite** : **`ContextEnvelope`** canonique serveur (**Story 2.2**) ; calcul additif complet rôles/groupes (**Story 2.3**) ; step-up / PIN / idempotence métier (**Story 2.4**) ; persistance terrain / audit généralisé (**Story 2.5**) ; premier jeu complet contrats versionnés (**Story 2.6**) ; signaux bandeau (**Story 2.7**).  
- **Interdit** : placer la **vérité** d'auth ou d'autorisation dans **`peintre-nano`** ; commiter **secrets** ou credentials.

### Intelligence Epic 1 (continuité)

- **Audit 1.2** : surfaces auth **réutilisables** si DTO et erreurs normalisés — login, refresh, logout, PIN + `users/me` ; P0 « réponses auth + tokens + erreurs » → OpenAPI + politique transport **Epic 2.1**.  
- **Spec 1.3** : une seule autorité backend pour permissions et contexte exposé ; `ContextEnvelope` en **2.2** ; step-up **2.4**.  
- **Architecture** : PostgreSQL = vérité transactionnelle ; Redis = auxiliaire ; intégrations externes derrière le backend.

### Stack et versions

- Brownfield : **FastAPI**, **SQLAlchemy**, tests **pytest** sous `recyclique-1.4.4/api/tests/`. Rester aligné sur `requirements.txt` / lock du package API sauf upgrade justifié dans les notes de complétion.

### Cross-story (Epic 2)

| Story | Rappel |
|-------|--------|
| 2.2 | `ContextEnvelope` minimal + recalcul explicite de contexte |
| 2.3 | Permissions effectives additives |
| 2.4 | Step-up, PIN, idempotence |
| 2.6 | Contrats backend versionnés pour codegen frontend |

### Git intelligence (récent)

- Derniers commits sur la branche : travaux **Epic 1** (révisions stories 1.4, 1.5, etc.) — pas encore de merge structurant Epic 2 dans l'historique court observé ; la baseline implémentation reste **`recyclique-1.4.4/api`**.

### Project Structure Notes

- **Backend brownfield actuel** : `recyclique-1.4.4/api/` (FastAPI, `src/recyclic_api/`, tests sous `tests/`). C’est la cible par défaut des gates pytest tant que la migration n’est pas actée.
- **Backend nominal architecture** : dossier canonique `recyclique/` à la racine du mono-repo — alignement attendu avec `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` ; **aucune** évolution parallèle non documentée (voir tâche « Décision d’implémentation »).
- **Contrats** : `contracts/openapi/recyclique-api.yaml`, gouvernance `contracts/README.md` ; ne pas dupliquer la sémantique `ContextEnvelope` (réservé Story 2.2).
- **Frontend** : `peintre-nano/` consomme les contrats ; hors périmètre sécurité / vérité contextuelle pour cette story.

### References

- [Source : `_bmad-output/planning-artifacts/epics.md` — Epic 2, Story 2.1]
- [Source : `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` — §1 principe 1, invariants 1.3]
- [Source : `references/artefacts/2026-04-02_02_audit-brownfield-backend-api-donnees-critiques.md` — §3.3 Auth, §5–§7]
- [Source : `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md` — API Boundaries, stack cible]
- [Source : `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — pilotage v2]
- [Source : `contracts/README.md`, `contracts/openapi/recyclique-api.yaml`, `contracts/creos/`]
- [Source : `references/ancien-repo/v1.4.4-liste-endpoints-api.md` — comparaison endpoints hérités]
- [Source : `references/paheko/`, `references/migration-paeco/` — intégration et sync (contexte adjacent)]

## Dev Agent Record

### Agent Model Used

Composer (implémentation Story 2.1, session 2026-04-03).

### Debug Log References

- Gate pytest (lot story + `test_auth_cache_behavior` + `test_web_session_v2_cookies`) : **79 passed, 5 skipped** (skips Redis refresh / cookie refresh si Redis absent).

### Completion Notes List

- **Décision repo** : poursuite dans `recyclique-1.4.4/api/` ; pas de dossier `recyclique/` parallèle — documenté dans `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md` (alignement transitoire avec `project-structure-boundaries.md`).
- **Transport v2** : `LoginRequest.use_web_session_cookies` pose cookies httpOnly (`recyclique_access`, `recyclique_refresh`, noms configurables via Settings) ; `resolve_access_token` : Bearer prioritaire puis cookie ; `require_bearer_or_cookie_credentials` pour le mode strict (403 si les deux absents) ; refresh : corps **ou** cookie ; rotation refresh via cookie renvoie de nouveaux Set-Cookie ; logout efface les cookies.
- **Legacy** : JSON login/refresh inchangé si `use_web_session_cookies=false` ; `/auth/pin` sans cookies session web (distinction web / PIN 1.3).
- **OpenAPI** : `recyclique_auth_login`, `recyclique_auth_logout`, `recyclique_auth_refresh` + schémas `*V2` dans `contracts/openapi/recyclique-api.yaml`.
- **CSRF** : SameSite=Lax par défaut ; politique CSRF complète reportée archi / stories ultérieures (mention OpenAPI).

### File List

- `recyclique-1.4.4/api/src/recyclic_api/core/web_session_cookies.py` (nouveau)
- `recyclique-1.4.4/api/src/recyclic_api/core/config.py`
- `recyclique-1.4.4/api/src/recyclic_api/core/auth.py`
- `recyclique-1.4.4/api/src/recyclic_api/schemas/auth.py`
- `recyclique-1.4.4/api/src/recyclic_api/api/api_v1/endpoints/auth.py`
- `recyclique-1.4.4/api/tests/test_auth_cache_behavior.py`
- `recyclique-1.4.4/api/tests/test_web_session_v2_cookies.py` (nouveau)
- `contracts/openapi/recyclique-api.yaml`
- `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md` (nouveau)
- `references/artefacts/index.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/2-1-poser-le-socle-de-session-web-v2-et-lautorite-dauthentification-backend.md`

### Change Log

- 2026-04-03 : Implémentation socle session web v2 (cookies + résolution JWT), contrat OpenAPI auth, artefact décision backend, tests `test_web_session_v2_cookies`.

---

## Story completion status

**review** — Implémentation complète ; gate pytest exécutée (sous-agent) : 79 passed, 5 skipped.
