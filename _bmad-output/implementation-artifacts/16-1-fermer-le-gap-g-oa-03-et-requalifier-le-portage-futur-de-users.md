# Story 16.1 : Fermer le gap G-OA-03 et requalifier le portage futur de `users`



Status: done



**Story key :** `16-1-fermer-le-gap-g-oa-03-et-requalifier-le-portage-futur-de-users`  

**Epic :** 16 — Déverrouiller les contrats, permissions et garde-fous admin avant portage UI (rail **K**)



## Story



As a contract-first admin migration team,  

I want the blocking gap **G-OA-03** closed and traced in backend and OpenAPI,  

So that the future slice `users` can move from **partiellement B** (réserve 15.5, alignement 15.6 rail K) vers **portageable** sans reconstitution métier côté front.



## Objectif



Corriger la faille d'autorité sur **`GET /v1/users`** et **`GET /v1/users/{user_id}`** : aujourd'hui les handlers `get_users` / `get_user` dans `users.py` n'exposent pas d'authentification ni de garde admin dans la signature FastAPI (`Depends`), ce qui contredit le modèle d'autorité documenté en 15.2 (**G-OA-03**, gravité bloquante sécurité). Aligner le comportement réel, le contrat OpenAPI canon et les preuves (tests ou équivalent) pour débloquer la trajectoire **Epic 21** (liste users CREOS) sans scope UI dans cette story.



## Périmètre (ferme)



- **Inclus :** backend Recyclique (`recyclique/api/...`), dépendances FastAPI (`Depends(...)`) cohérentes avec `recyclique_api.core.auth` (ex. chaîne auth + rôle admin comme sur les routes `admin_users_*`), schémas / tags / `operationId` / `security` dans **`contracts/openapi/recyclique-api.yaml`**, preuves automatisées ou checklist de preuve explicite, régénération artefact OpenAPI si le dépôt impose un pas de génération (ex. `contracts/openapi/package.json` → `npm run generate` dans ce package).

- **Hors scope (explicite) :**

  - UI Peintre finale, manifests CREOS finaux, navigation admin observable.

  - Arbitrage produit, mélange rail **U** / **P** avec ce chantier **K**.

  - Correction du bug client **`reset-pin`** sans préfixe `/v1` (15.2 §5 / tableau écran users) — **nommé pour éviter le scope creep** ; traitement réservé à une story dédiée ou au legacy front, **sauf** si un brief épique ultérieur l'impose explicitement.

  - Autres gaps 15.2 (G-OA-01, G-OA-02, stats réception, etc.) — hors 16.1.

  - `POST /v1/users` et autres verbes sur `/users` : ne sont **pas** l'objet de G-OA-03 ; ne les refactoriser que si nécessaire pour cohérence technique minimale (à documenter en note de PR si tel était le cas).



## Livrables



1. **`get_users`** et **`get_user`** : signature avec auth explicite et **autorité admin** alignée sur l'usage legacy `/admin/users` (preuve : même famille de deps que les lectures admin utilisateurs ailleurs, p. ex. `admin_users_read.py` avec `require_admin_role`).

2. **OpenAPI** : chemins documentés pour les deux GET, réponses d'erreur attendues (401 non authentifié, 403 non admin si applicable), `security` cohérent avec le reste du fichier (Bearer / cookie selon conventions existantes des endpoints `/v1/users/me/*`).

3. **Preuves** : tests API (pytest) ou, à défaut, liste de preuves manuelles **reproductibles** référencées dans le dossier story / PR (à compléter en DS).

4. **Référence G-OA-03** : dans la PR ou un court commentaire OpenAPI, lien textuel vers la section 4 du livrable 15.2 (clôture traçable du gap).



## Acceptance Criteria



**Given** G-OA-03 identifie `GET /v1/users` et `GET /v1/users/{id}` sans `Depends(get_current_user)` (ni équivalent chaîné) dans la signature  

**When** la story est livrée  

**Then** les deux routes exigent une session authentifiée **et** une autorisation **admin** (ADMIN ou SUPER_ADMIN) explicite via `Depends`, sans s'appuyer sur une protection « accidentelle » en aval  

**And** un appel non authentifié reçoit **401** (ou le code projet équivalent documenté)  

**And** un utilisateur authentifié non admin ne peut pas lister ni lire le détail arbitraire des utilisateurs (**403** ou politique équivalente documentée)



**Given** le contrat canon `contracts/openapi/recyclique-api.yaml`  

**When** on inspecte les opérations équivalentes aux deux GET  

**Then** les paths, méthodes, schémas de réponse et **securityRequirements** reflètent l'auth réelle  

**And** les `operationId` sont stables et nommés de façon à servir les futurs manifests (pas de collision avec d'autres `operationId` du fichier)



**Given** la réserve 15.5 sur la famille `users` (réserve 2 — G-OA-03) et le seed rail K en 15.6  

**When** G-OA-03 est clos  

**Then** la matrice / backlog peut qualifier la future slice `users` comme **non bloquée par cette faille** pour le portage contract-driven (Epic 17 / 21), sans livrer de slice UI dans 16.1



**Given** le pipeline contrats du mono-repo  

**When** le YAML OpenAPI est modifié  

**Then** toute étape de régénération attendue (ex. types TS sous `contracts/openapi/`) est exécutée ou explicitement listée comme tâche restante avec propriétaire



## Tasks / Subtasks



- [x] Cartographier l'état actuel : `users.py` (`get_users` ~L147, `get_user` ~L153), montage `api_v1` (`api.py`, `prefix="/users"`).

- [x] Choisir la deps canonique (ex. `require_admin_role`) et l'appliquer aux **deux** GET ; vérifier l'absence de régression pour les appels legacy admin authentifiés.

- [x] Ajouter / mettre à jour les entrées OpenAPI pour `GET /v1/users` et `GET /v1/users/{user_id}` (paramètres `skip`/`limit`, `user_id`, codes 401/403/404).

- [x] Ajouter ou étendre les tests pytest (auth négative + positif admin) ciblant ces routes.

- [x] Régénérer les artefacts dérivés du contrat si applicable ; vérifier cohérence `npm` / CI locale selon `contracts/openapi/package.json`.

- [x] Mettre à jour la trace « fermeture G-OA-03 » (commentaire PR ou note courte) pour liaison avec 15.2 §4.



## Garde-fous (dev)



- Ne pas déplacer les routes vers `/v1/admin/...` dans cette story sans décision d'architecture explicite : le périmètre est **autorité** et **contrat**, pas refonte d'URL.

- Rester aligné sur **ContextEnvelope** uniquement comme contexte architectural (pas d'implémentation CREOS ici).

- Ne pas étendre le correctif à tout le module `users.py` au-delà des deux GET sauf si un écart de sécurité identique est prouvé dans le même fichier et accepté par le pilotage.



## QA / preuves



- Tests automatisés verts sur le package API concerné, ou document d'équivalence de preuve pour reprise en DS.

- Revue statique : les deux routes apparaissent dans OpenAPI avec `security` non vide.



## Références



- `_bmad-output/planning-artifacts/epics.md` — Epic 16, Story 16.1

- `references/artefacts/2026-04-12_01_cartographie-api-permissions-contextes-admin-legacy-15-2.md` — §3 (l. ~83), §4 **G-OA-03** (l. ~93)

- `references/artefacts/2026-04-12_05_package-fondation-passe-analyse-epics-admin-15-6.md` — §3 rail **K**, §4 seed 1 (G-OA-03)

- `references/artefacts/2026-04-12_03_recommandation-architecture-admin-peintre-nano-15-5.md` — classement A/B/C, **§11 Revue (CR) — Réserve 2** (`users` / G-OA-03)

- `references/artefacts/2026-04-12_01_inventaire-surfaces-admin-legacy-15-1.md` — périmètre écran `/admin/users` (contexte migration)

- `contracts/openapi/recyclique-api.yaml`

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/users.py`

- `recyclique/api/src/recyclic_api/api/api_v1/api.py` (inclusion router `users`)

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/admin_users_read.py` (modèle de deps admin lecture utilisateurs)



## Pointers code (état au moment de la CS)



- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/users.py` : `get_users` et `get_user` sans garde auth (lignes ~146–160) — cible principale G-OA-03.

- Montage : `recyclique/api/src/recyclic_api/api/api_v1/api.py` — `include_router(users, prefix="/users", ...)`.

- Contrat : `contracts/openapi/recyclique-api.yaml` — aujourd'hui surtout `/v1/users/me/*` ; les GET collection/détail à ajouter ou compléter.



## Dev Agent Record



### Agent Model Used



Story Runner BMAD (reprise `resume_at: DS`) — implémentation parent + gates + QA pytest + revue synthétique.



### Completion Notes List



- Story créée en **ready-for-dev** ; fermeture G-OA-03 et requalification « users » portageable **sans** livrable UI.

- **DS** : `get_users` / `get_user` protégés par `Depends(require_admin_role)` (même famille que `admin_users_read.py`).

- **OpenAPI** : `GET /v1/users/` et `GET /v1/users/{user_id}` + schéma `UserV1Response` ; traçabilité **G-OA-03** → livrable 15.2 §4 dans les descriptions.

- **Preuves** : `tests/test_users_g_oa_03.py` ; ajustements tests existants (admin Bearer) ; gates pytest + `npm run generate` verts.

- **2026-04-12 (Epic Runner)** : gate pytest ciblé `tests/test_users_g_oa_03.py` vert ; clôture **review → done** (sprint-status + fichier story).



### File List



- `_bmad-output/implementation-artifacts/16-1-fermer-le-gap-g-oa-03-et-requalifier-le-portage-futur-de-users.md`

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/users.py`

- `contracts/openapi/recyclique-api.yaml`

- `contracts/openapi/generated/recyclique-api.ts`

- `recyclique/api/tests/test_users_g_oa_03.py`

- `recyclique/api/tests/api/test_admin_user_management.py`

- `recyclique/api/tests/test_user_profile_endpoints.py`

- `recyclique/api/tests/test_user_profile_persistence.py`

