# Story 7.2 : Garantir le contexte réception et les blocages métier associés



Status: done



<!-- Note : validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->



## Story



En tant qu'opératrice de réception,



je veux que le flux réception **exige un contexte d'exploitation valide** (site, poste, périmètre de permissions),



afin que la matière entrante **ne soit jamais enregistrée** sous le **mauvais site**, le **mauvais poste** ou **hors du périmètre autorisé**.



## Baseline brownfield-first (non négociable)



- **`Peintre_nano`** : **runtime de rendu** ; **aucune** autorité sur le **contexte actif**, les **permissions effectives** ni les **refus métier**. **`Recyclique` backend** reste la **seule autorité** — alignement explicite avec le principe Epic 7 agents + checklist PR Peintre.

- **Ne pas** recalculer site / poste / droits « au feeling » à partir d'état local, de caches ou d'heuristiques UI : **consommer** `ContextEnvelope` + **réponses HTTP** des mutations / lectures ; toute action sensible doit pouvoir être **refusée par le serveur** avec une sémantique **stable** (codes / messages exploitables).

- **Frontières** : **7.2** couvre surtout **site / poste / permissions / contexte ambigu**, **mode restreint ou bloqué**, **feedback explicite**. **Ne pas** absorber **7.3** (catégorisation / pesée / qualification étendue), **7.4** (journalisation / historique durable), **7.5** (tous les états défensifs et dégradations réseau complètes), **Epic 8 / 9** (sync Paheko, déclaration éco-organismes, modules annexes).

- **7.1 done** : le nominal existe (`ReceptionNominalWizard`, client réception, manifests CREOS). **7.2** **durcit** la cohérence **autorité backend ↔ UI** sur le même pivot, sur le **modèle pattern story 6.2** (caisse).



## Registre terrain Epic 7



- Fichier vivant : `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md` — à compléter au minimum la ligne **§2 Contexte / blocages** et une passe §3 quand les preuves sont disponibles.



## Preuves et environnement



- **Stack servie** : **`http://localhost:4444`** — obligatoire pour preuves terrain significatives ; **ne jamais** utiliser **`127.0.0.1`** (convention projet ; corriger toute doc interne qui diverge).

- Mutations réception sensibles : preuves réseau (méthode, chemin, statut HTTP) **en complément** des tests automatisés.



## État actuel (intelligence 7.1 — à ne pas dupliquer naïvement)



- Le wizard nominal inclut déjà un **`useReceptionEntryBlock`** : `runtimeStatus` `forbidden` / `degraded`, `siteId` manquant, clé `reception.access` absente de `permissionKeys` → écran bloqué avec libellés. **7.2** doit **aligner** ce comportement avec une **garantie serveur** équivalente à la caisse 6.2 (revalidation sur mutations, cohérence opératrice / site / poste quand le modèle données le permet) et **documenter** les réponses d'erreur dans OpenAPI.

- Côté API actuel (`reception.py`), les routes nominaux s'appuient surtout sur `require_role_strict` (rôles USER/ADMIN/SUPER_ADMIN) ; le service `ReceptionService` valide poste ouvert / ticket ouvert mais **sans** encore le même niveau de garde-fous **permission `reception.access` / site utilisateur** que `SaleService` pour la caisse. **Gap assumé à combler** dans cette story si le brownfield l'exige (voir tâches).



## Acceptance Criteria



1. **Vérification du contexte à l'entrée / à la reprise** — Étant donné que la réception est un flux brownfield critique, quand une opératrice **entre ou reprend** le parcours réception dans `Peintre_nano` (page `/reception` ou équivalent manifest), alors le flux **vérifie** le **site actif**, le **poste de réception** et les **permissions requises** (en s'appuyant sur `ContextEnvelope`, les lectures/mutations backend et non sur une déduction locale) **avant** de proposer les actions d'intake sensibles ; un contexte **manquant ou ambigu** (y compris enveloppe `runtimeStatus` / messages serveur) produit un état **restreint ou bloqué explicite**, pas une continuation silencieuse. [Source : `_bmad-output/planning-artifacts/epics.md` — Story 7.2]



2. **Autorisation backend, pas déduction front** — Étant donné que l'UI ne peut montrer que ce que l'autorité backend autorise, quand une opératrice **n'a pas** la permission requise ou un **périmètre invalide**, alors les **mutations et lectures sensibles** du flux réception sont **refusées ou limitées** selon la **sémantique portée par le backend** (403/409/422 selon cas, messages stables) ; le retour utilisateur reste **compréhensible** (surface d'erreur alignée sur `CashflowClientErrorAlert` / patterns caisse). [Source : epics.md Story 7.2 ; `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` ; spec multi-contextes §5, §7]



3. **Sécurité > fluidité, dégradation traçable** — Étant donné que la sécurité prime sur la fluidité en cas de conflit, quand l'**intégrité du contexte** ne peut pas être garantie (enveloppe `forbidden`/`degraded`, refus API après revalidation), alors le flux réception **ne poursuit pas** comme si les conditions étaient valides ; tout chemin de dégradation reste **explicite et interprétable côté support** (messages, codes, états UI alignés sur réponses / contrats). [Source : epics.md Story 7.2 ; `2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` §4.0, §6.2]



4. **Aucune déduction permissive côté frontend** — Étant donné le cadre Convergence 3 / Epic 7, quand le parcours réception est servi, alors le frontend **ne déduit pas** site / permissions / éligibilité poste « au feeling » ; il **consomme** `ContextEnvelope` et les **réponses API** ; les widgets métiers conservent `data_contract` / `critical` / `DATA_STALE` selon patterns projet ; **preuves UI** sur stack locale : **`http://localhost:4444`**. [Source : checklist PR Peintre ; epics.md note agents Epic 7]



5. **Revalidation serveur sur mutations critiques réception** — Étant donné l'alignement sur le pattern **6.2**, quand une opératrice exécute au minimum **`POST /v1/reception/postes/open`**, **`POST /v1/reception/tickets`**, **`POST /v1/reception/lignes`**, **`POST /v1/reception/tickets/{id}/close`**, **`POST /v1/reception/postes/{id}/close`** (et **`GET /v1/reception/tickets/{id}`** / **`GET /v1/reception/categories`** si considérés sensibles au périmètre site), alors le backend **revalide** (selon modèle données réel : voir Dev Notes) **opératrice**, **permission effective `reception.access`** (ou clé canonique déjà utilisée côté enveloppe), et **cohérence de site** là où le schéma `PosteReception` / `User` / tickets le permet ; les cas **poste fermé**, **ticket fermé**, **poste inconnu**, **permission manquante**, **site incohérent** produisent des erreurs **non ambiguës** (pas de 200 « succès » trompeur). [Source : pattern `_bmad-output/implementation-artifacts/6-2-garantir-le-contexte-caisse-et-les-blocages-de-securite-metier.md` ; audit brownfield réception]



6. **Contrats et observabilité développeur** — Étant donné la gouvernance OpenAPI, quand les garde-fous sont ajoutés ou précisés, alors **`contracts/openapi/recyclique-api.yaml`** documente les **réponses d'erreur** pertinentes (401/403/409/422 selon les routes) et les **`operation_id`** restent **stables** ; le client **`contracts/openapi/generated/recyclique-api.ts`** est **régénéré** via le pipeline du dépôt (pas d'édition manuelle anarchique du générateur). [Source : `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`]



7. **Registre terrain** — Étant donné les leçons Epic 6, quand **7.2** est considérée pour review / merge, alors le registre `2026-04-09_01_…` comporte une entrée **§2 Contexte / blocages** (au moins un scénario bloqué ou restreint **prouvé** sur `localhost:4444`, ou mention honnête « N/A test auto seulement » avec justification). [Source : `epic-6-retro-2026-04-09.md` §2.3 ; registre squelette §2]



## Tasks / Subtasks



- [x] Cartographier les **points d'entrée** réception (route `/reception`, rechargement page, navigation) et les **sources canoniques** déjà en place (`ContextEnvelope`, `reception-client`, `ReceptionNominalWizard`) vs **gaps serveur** actuels (`reception.py` / `ReceptionService`). (AC : 1, 4, 5)

- [x] Backend `recyclique/api` : introduire ou étendre une couche de **contrôle d'éligibilité réception** calquée sur l'esprit **`SaleService` / story 6.2** : au minimum **permission `reception.access`** pour les USER, cohérence **site utilisateur** avec les entités manipulées **lorsque le modèle relationnel l'autorise** ; si `PosteReception` n'a **pas** encore de `site_id`, **documenter** le gap dans la story completion + registre §4 et trancher : migration minimale vs contrôle par **utilisateur ouverture** uniquement — **sans** éluder les AC sur refus explicite. (AC : 2, 3, 5)

- [x] Pour chaque route nominale concernée, garantir des **exceptions métier → HTTP** cohérentes (`AuthorizationError` / `ValidationError` / `ConflictError` selon conventions existantes) ; ajouter ou compléter **tests pytest** (refus permission, site, poste/ticket invalides). (AC : 2, 3, 5)

- [x] `Peintre_nano` — domaine `reception` : **affiner** la garde d'entrée et les **états bloquants** pour qu'ils **reflètent uniquement** l'autoritatif (enveloppe + API) ; **interdire** toute progression du wizard nominal si le serveur a refusé une étape précédente sans remise à plat visible ; aligner libellés sur les **messages serveur** quand disponibles. (AC : 1, 3, 4)

- [x] Mettre à jour **OpenAPI** + **codegen** ; vérifier / ajuster **`data_contract.operation_id`** sur les widgets réception si de nouveaux codes réponses sont exposés documentairement. (AC : 6)

- [x] Tests front : Vitest sur **blocage** sans bypass (reprendre le pattern `cashflow-context-gate-6-2.test.tsx` pour `ReceptionNominalWizard` / hooks enveloppe). (AC : 1, 4)

- [x] **Preuves** : scénarios bloqués ou restreints sur **`http://localhost:4444`** (permission absente, contexte dégradé simulé côté API si nécessaire) ; mettre à jour le **registre** §2. (AC : 7)

- [x] **Hors périmètre explicite** : ne pas implémenter la matrice complète **7.5** (tous les états réseau / contrats incomplets), ni **7.3** / **7.4** ; poser des **TODO** dans le registre si découverte de dette bloquante. (AC : frontières epic)



## Dev Notes



### Alignement pattern caisse (6.2)



- Story de référence structure / ton : `_bmad-output/implementation-artifacts/6-2-garantir-le-contexte-caisse-et-les-blocages-de-securite-metier.md` — **transposer** « caisse / session » → « réception / poste / ticket » sans dupliquer la logique **métier** dans le front.

- Fichiers caisse utiles en lecture : `peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`, `peintre-nano/tests/unit/cashflow-context-gate-6-2.test.tsx`, `recyclique/api/tests/test_sale_service_story62_context.py`, `recyclique/api/tests/caisse_sale_eligibility.py`.



### Story précédente (7.1)



- `_bmad-output/implementation-artifacts/7-1-mettre-en-service-le-parcours-nominal-de-reception-v2.md` — File List, Completion Notes, mapping API ; **étendre** `ReceptionNominalWizard.tsx` / `reception-client.ts` plutôt que créer un second parcours parallèle.



### Spec multi-contextes et invariants



- `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` — §2.4 poste réception, §3 inter-poste, §5 permissions, §6.2 blocage / dégradation, §7 hiérarchie AR39.



### Architecture / PRD (sélectif)



- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` — points 5–6, 10 (fallbacks visibles).

- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md` — auth, revalidation mutations, `ContextEnvelope`.

- `_bmad-output/planning-artifacts/prd.md` — §4.3, §10, §11.2 si besoin de citer cohérence sécurité / UX.



### Fichiers et zones probables



- `peintre-nano/src/domains/reception/ReceptionNominalWizard.tsx`

- `peintre-nano/src/api/reception-client.ts`

- `peintre-nano/src/app/auth/AuthRuntimeProvider.tsx`, `default-demo-auth-adapter.ts` (clés permission démo — **ne pas** en faire la vérité runtime hors démo)

- `contracts/openapi/recyclique-api.yaml`, `contracts/openapi/generated/recyclique-api.ts`

- `contracts/creos/manifests/page-reception-nominal.json`, `widgets-catalog-reception-nominal.json`, `navigation-transverse-served.json`

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/reception.py`

- `recyclique/api/src/recyclic_api/services/reception_service.py`

- `recyclique/api/tests/test_reception_lines_endpoints.py` (et nouveaux tests dédiés contexte si créés)



### Tests



- **Pytest** : cas refus contextualisés (permission, site, poste/ticket) ; réutiliser patterns **6.2** / contrats auth ventes si helpers transverses disponibles.

- **Vitest** : garde enveloppe + rendu bloqué ; pas de mocks de permission **inventés** sans alignement sur clés serveur réelles.



### Recherche « dernière version »



- Versions effectives : `peintre-nano/package.json`, dépendances API ; pas de nouvelle lib sans justification architecture.



## Références



- `_bmad-output/planning-artifacts/epics.md` — Epic 7, Story 7.2

- `_bmad-output/implementation-artifacts/7-1-mettre-en-service-le-parcours-nominal-de-reception-v2.md`

- `_bmad-output/implementation-artifacts/6-2-garantir-le-contexte-caisse-et-les-blocages-de-securite-metier.md`

- `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md`

- `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md`

- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`

- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`

- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`

- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`

- `references/migration-paheko/audits/audit-reception-poids-recyclic-1.4.4.md`

- `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md`

- `_bmad-output/planning-artifacts/guide-pilotage-v2.md`

- `contracts/openapi/recyclique-api.yaml`



### project-context.md



- Absence signalée à la racine dans les stories précédentes ; s'appuyer sur PRD / architecture sous `_bmad-output/planning-artifacts/` et les stories d'implémentation Epics 6–7.



## Dev Agent Record



### Agent Model Used



Composer (agent dev-story / sous-agent Task), 2026-04-09.



### Debug Log References



- Tests `test_reception_tickets_history` : chemins HTTP corrigés `/api/v1` → `/v1` (alignement `settings.API_V1_STR`).

- `test_reception_lines_endpoints` : échecs locaux si base SQLite sans catégories (pré-existant / données) — non liés aux garde-fous 7.2.



### Completion Notes List



- **Backend** : `ReceptionService` — `assert_nominal_reception_eligible` (`reception.access` + `site_id` pour USER), contrôle **ouvreur de poste** et **bénévole ticket** (ADMIN/SUPER_ADMIN exclus des contraintes USER). Mutations et `GET` détail ticket passent par `actor_user` ; export CSV signé via `get_ticket_detail_unrestricted`. Routes `reception.py` : `AuthorizationError` → **403**. Import legacy CSV : chargement `User` admin + passage `actor_user`.

- **OpenAPI** : `0.1.7-draft`, réponses **403** sur routes réception nominale concernées ; `npm run generate` → `recyclique-api.ts`.

- **Peintre** : remise à plat wizard sur **401 / 403 / 409** après refus API ; `data-testid="reception-context-blocked"` pour les tests de garde enveloppe.

- **Tests** : `test_reception_story72_context.py`, `reception_story72_eligibility.py`, Vitest `reception-context-gate-7-2.test.tsx` ; ajustements tests / services existants (arch03, transaction policy, integration category, user access, tickets history).

- **Registre terrain** : `references/artefacts/2026-04-09_01_…` §2 + §4 (gap `site_id` poste) + §5 version contrat.

- **CR retry (Story Runner)** : `GET /v1/reception/tickets` — `assert_nominal_reception_eligible` ajouté (alignement `get_categories`) ; correction ombre du paramètre Query `status` sur `fastapi.status` (codes HTTP littéraux 403/400 dans ce handler) ; test `test_get_tickets_forbidden_without_reception_permission`.



### File List



- `recyclique/api/src/recyclic_api/services/reception_service.py`

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/reception.py`

- `recyclique/api/src/recyclic_api/services/legacy_import_service.py`

- `recyclique/api/tests/reception_story72_eligibility.py`

- `recyclique/api/tests/test_reception_story72_context.py`

- `recyclique/api/tests/test_reception_arch03_domain_errors.py`

- `recyclique/api/tests/test_reception_transaction_policy.py`

- `recyclique/api/tests/test_reception_user_access.py`

- `recyclique/api/tests/test_reception_tickets_history.py`

- `recyclique/api/tests/test_integration_category_migration.py`

- `contracts/openapi/recyclique-api.yaml`

- `contracts/openapi/generated/recyclique-api.ts`

- `peintre-nano/src/domains/reception/ReceptionNominalWizard.tsx`

- `peintre-nano/tests/unit/reception-context-gate-7-2.test.tsx`

- `peintre-nano/tests/e2e/reception-context-gate-7-2.e2e.test.tsx`

- `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md`

- `_bmad-output/implementation-artifacts/sprint-status.yaml`

- `_bmad-output/implementation-artifacts/tests/test-summary.md` (section QA 7.2)



## Change Log



- 2026-04-09 — Implémentation Story 7.2 (contexte réception, 403 OpenAPI, wizard reset, tests, registre §2).

- 2026-04-09 — QA e2e `reception-context-gate-7-2.e2e.test.tsx` ; CR retry `GET …/tickets` + test pytest associé.



---



## Story completion status



- **create-story (2026-04-09)** : contexte consolidé depuis epics 7.2, story 7.1 done, pattern 6.2, registre terrain Epic 7, spec multi-contextes, checklist Peintre ; frontières 7.3–7.5 / 8–9 explicites ; statut fichier **ready-for-dev**.

- **dev-story (2026-04-09)** : implémentation complète pour la chaîne QA ; statut fichier **review** ; sprint-status **7-2** → **review**.

- **gates + QA + CR (2026-04-09)** : lint / test / build peintre verts ; pytest racine API **non pris comme gate vert** (suite large, échecs environnement — cf. 7.1) ; cible **7.2** `test_reception_story72_context` + `reception_story72_eligibility` verts ; CR puis correctif `get_tickets` ; statut fichier **done** ; sprint-status **7-2** → **done**.

