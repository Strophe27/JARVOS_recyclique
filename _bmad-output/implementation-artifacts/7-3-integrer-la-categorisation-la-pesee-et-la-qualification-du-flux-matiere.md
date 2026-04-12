# Story 7.3 : Intégrer la catégorisation, la pesée et la qualification du flux matière



Status: review



<!-- Note : validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->



## Story



En tant qu'opératrice de réception,



je veux **capturer les caractéristiques matière clés** pendant la réception (catégorie, poids / quantité, qualification d'entrée utile au processus),



afin que **`Recyclique` reste la source de vérité fiable** pour les quantités, les catégories et les informations d'intake associées — **sans** que le front invente une vérité matière absente du backend.



## Baseline brownfield-first (non négociable)



- **Séquence brownfield** : **poste** → **ticket** → **lignes** (catégorie, **poids (kg)**, **destination**, **notes**, et champs métier exposés par l'API : ex. **`is_exit`** selon contrat). Le front **expose** la séquence et les saisies ; le **backend** reste **autorité** (validation, persistance, refus, enums / référentiels).

- **`Peintre_nano`** : runtime de rendu ; **pas** auteur du flux matière ni des règles de qualification. Checklist : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`.

- **Ne pas absorber Epic 9** : pas d'UI ni de logique « déclaration éco-organismes », mappings compta déclaratifs, ou écrans réservés au module déclaration. La story se limite à **l'intake réception** et à des données **stockées de façon compatible** avec un reporting / déclaration **ultérieur** (Epic 9), **sans** les implémenter.

- **Ne pas dériver une vérité front** : listes de catégories, valeurs de **destination**, contraintes sur **poids** (min/max, obligatoire), **correction de poids**, édition / suppression de lignes — **uniquement** selon ce que le backend expose et renvoie (OpenAPI + réponses réelles). Pas de taxonomie ou de règles de poids inventées côté UI.

- **Frontières** : **7.1** (nominal) et **7.2** (contexte / blocages) sont **done**. **7.3** **enrichit** la couche **lignes / qualification matière** sur le même pivot (wizard + client + contrats). **Ne pas** absorber **7.4** (journalisation / historique exploitable dédié), **7.5** (matrice défensive complète), **Epic 8** (sync Paheko).



## Registre terrain Epic 7



- Fichier vivant : `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md` — **compléter au minimum le tableau §3** (catégories / pesée / qualification) avec preuves ou mentions honnêtes (tests / terrain `localhost:4444`) en fin de story.



## Preuves et environnement



- **Stack servie** : **`http://localhost:4444`** pour preuves terrain significatives ; **ne pas** utiliser **`127.0.0.1`** (convention projet).

- Mutations sur **lignes** (création, **mise à jour**, **PATCH poids**, **suppression** si dans le périmètre) : preuves réseau (méthode, chemin, statut HTTP) **en complément** des tests automatisés.



## État actuel (intelligence 7.1 / 7.2 — à étendre proprement)



- **Wizard** : `ReceptionNominalWizard.tsx` — enchaînement poste → ticket → **une** saisie de ligne via `postCreateReceptionLigne` avec catégorie (liste `getReceptionCategories`), poids kg, destination (enum **déjà** alignée côté client sur le contrat), notes. Pas encore forcément : **liste / édition** des lignes du ticket dans l'UI, **PATCH poids**, **PUT ligne**, **DELETE ligne**, **`is_exit`**, saisie différée `opened_at`, ni **toute** la « qualification » métier documentée legacy.

- **OpenAPI** (`recyclique-api.yaml`, ~0.1.7-draft) : paths nominaux 7.1/7.2 documentés ; le registre §5 cite explicitement comme **hors contrat v2** notamment : **`PATCH …/weight`**, **`PUT/DELETE` lignes**, **`GET /v1/reception/lignes`**, **`GET /v1/categories/entry-tickets`**. **7.3** doit **promouvoir** dans le YAML (et codegen) tout endpoint **réellement** utilisé par le front, avec **`operation_id`** stables et réponses d'erreur cohérentes (403/409/422 selon conventions existantes).

- **Audit legacy** : `references/migration-paheko/audits/audit-reception-poids-recyclic-1.4.4.md` — traçabilité **ligne** : `poids_kg`, `category_id`, `destination`, `notes`, `is_exit` ; **PATCH weight** ; **PUT** ligne. Servir de **référence produit** pour ce qui doit être **exploitable** en v2, dans la limite du périmètre story.



## Acceptance Criteria



1. **Capture catégorisation, pesée / quantité, qualification d'intake** — Étant donné que `Recyclique` est autoritatif sur le flux matière, quand l'opératrice saisit des données de réception, alors le flux **supporte** la capture de la **catégorisation** (référentiel backend), des informations de **poids ou quantité** alignées sur le modèle (**kg** côté ligne, cf. matrice poids / audit), et la **qualification** nécessaire au processus métier d'intake (**destination**, **notes**, et tout champ **déjà** prévu par l'API pour la ligne : ex. **`is_exit`** si le backend l'expose et l'accepte) ; ces données sont **persistées côté serveur** et **reflétées** dans l'UI après **relecture API** (détail ticket / liste lignes selon implémentation), sans état matière « inventé » côté front si le serveur ne le renvoie pas. **Vérification** : après au moins une mutation ligne pertinente, un `GET` ticket ou lignes du contrat montre les champs attendus cohérents avec l'UI. [Source : `_bmad-output/planning-artifacts/epics.md` — Story 7.3 ; `references/migration-paheko/audits/audit-reception-poids-recyclic-1.4.4.md` §1–2]



2. **Séparation catégorie interne vs downstream Epic 9** — Étant donné que les structures de catégories peuvent influencer des déclarations ultérieures, quand les choix de catégorisation sont effectués, alors le flux **enregistre** la catégorisation **métier interne** telle que portée par le backend **sans** la confondre avec un traitement comptable ou déclaratif ; l'UI **reste centrée intake** (pas d'écrans ou workflows « éco-organisme » / déclaration). [Source : `_bmad-output/planning-artifacts/epics.md` — Story 7.3]



3. **Séquence explicite et terrain** — Étant donné que les écrans réception doivent rester pratiques au poste, quand cette story est implémentée, alors la capture **ne se réduit pas** à un formulaire unique opaque qui masque le **workflow** (poste / ticket / lignes) ; les étapes utiles à la **gestion des lignes** (ajout, **visualisation**, et **corrections** autorisées par le backend) restent **lisibles**. [Source : `_bmad-output/planning-artifacts/epics.md` — Story 7.3]



4. **Contrats et pas de vérité front fantôme** — Étant donné la gouvernance OpenAPI, quand de nouveaux appels ou champs sont utilisés, alors **`contracts/openapi/recyclique-api.yaml`** les documente, les **`operation_id`** sont renseignés, **`contracts/openapi/generated/recyclique-api.ts`** est **régénéré** ; les widgets / client utilisent **`data_contract.operation_id`** (ou `secondary_sources`) alignés sur le YAML. Aucune liste de catégories ou règle de poids **purement** front sans équivalent API. [Source : `2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md` ; checklist PR Peintre]



5. **Cohérence avec garde-fous 7.2** — Étant donné que les mutations lignes restent sensibles, quand une opératrice **crée, modifie ou corrige le poids** d'une ligne, alors le backend **applique** les mêmes principes d'**éligibilité réception** qu'en 7.2 (permission `reception.access`, périmètre site / opérateur selon `ReceptionService`) ; les **403/409/422** restent **exploitables** en UI (réutiliser les patterns déjà présents sur le wizard réception : `CashflowClientErrorAlert`, reset / blocage si refus autoritatif — cf. 7.2). [Source : `_bmad-output/implementation-artifacts/7-2-garantir-le-contexte-reception-et-les-blocages-metier-associes.md` ; `recyclique/api/src/recyclic_api/services/reception_service.py`]



6. **Registre §3** — Étant donné les leçons Epic 6, quand **7.3** est considérée pour review / merge, alors le registre `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md` comporte une entrée **§3 Catégories / pesée / qualification** (scénario couvert + tests et/ou preuve `http://localhost:4444`, ou mention honnête des limites). [Source : `_bmad-output/implementation-artifacts/epic-6-retro-2026-04-09.md` §2.3]



## Tasks / Subtasks



- [x] Cartographier l'**écart** entre le wizard actuel (création ligne minimale) et l'**audit legacy** + champs `ReceptionLigne` / ticket detail en OpenAPI : **PATCH poids**, **PUT/DELETE** ligne, **`is_exit`**, liste paginée lignes si nécessaire à l'UX. (AC : 1, 4)

- [x] Backend `recyclique/api` : si des routes existent en 1.4.4 mais pas encore strictes sur l'**éligibilité 7.2**, **aligner** les handlers concernés sur `ReceptionService` (même esprit que create ligne) ; ajouter / compléter **tests pytest** (poids invalide, ticket fermé, permission). (AC : 1, 5)

- [x] **OpenAPI** : promouvoir les paths **effectivement** consommés par le front (**PATCH weight**, **PUT/DELETE** `/v1/reception/lignes/{id}` si retenus, etc.) ; documenter les réponses d'erreur ; **régénérer** le client TypeScript. (AC : 4)

- [x] `peintre-nano` — **étendre** `reception-client.ts` et `ReceptionNominalWizard.tsx` (ou sous-composants dédiés) : affichage des **lignes** du ticket courant (depuis `getTicketDetail` ou GET lignes si ajouté), **édition** / **suppression** tant que ticket ouvert selon API, **correction de poids** via **PATCH** si dans le périmètre ; champs **destination** / **is_exit** **uniquement** si typés dans le contrat (pas d'enum parallèle non synchronisé). (AC : 1, 2, 3, 4)

- [x] **CREOS** : mettre à jour `widgets-catalog-reception-nominal.json` (et manifest page si besoin) pour refléter les **`operation_id`** additionnels ou `secondary_sources`. (AC : 4)

- [x] Tests : **Vitest** (unit / e2e mockés) sur la **boucle** lignes + erreurs API ; **pytest** sur les routes touchées. (AC : 1, 5)

- [x] **Preuves** : mise à jour **registre §3** ; optionnellement captures réseau sur **`http://localhost:4444`** pour création + correction poids ou édition ligne. (AC : 6)

- [x] **Hors périmètre explicite** : stats live, exports CSV, admin bulk, saisie différée complète, offline, **Epic 9**, **7.4** / **7.5** complets — **TODO** dans le registre §4 si dette découverte. (AC : 2, frontières epic)



## Dev Notes



### Continuité 7.1 / 7.2



- Stories : `_bmad-output/implementation-artifacts/7-1-mettre-en-service-le-parcours-nominal-de-reception-v2.md`, `_bmad-output/implementation-artifacts/7-2-garantir-le-contexte-reception-et-les-blocages-metier-associes.md` — réutiliser **un seul** parcours wizard, **étendre** fichiers listés en File List 7.2 plutôt que dupliquer un second flux. **Ne pas** affaiblir les garde-fous 7.2 (`ContextEnvelope`, blocage sans permission, refus API) : toute nouvelle étape lignes reste derrière le même pivot contexte / autorité backend.



### Pack lecture Epics 6–10



- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`

- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`



### Poids et flux matière



- `references/migration-paheko/audits/audit-reception-poids-recyclic-1.4.4.md` — sections 1–3 (workflow, tableau API ↔ BDD, arbitrages poids / catégories).

- `references/migration-paheko/audits/matrice-correspondance-caisse-poids.md` — cohérence **kg** réception vs autres flux.



### Architecture / pipeline UI



- `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md` — pas de second moteur métier dans le front.

- `_bmad-output/planning-artifacts/architecture/core-architectural-decisions.md` — auth, contrats, erreurs.



### Fichiers et zones probables



- `peintre-nano/src/domains/reception/ReceptionNominalWizard.tsx`

- `peintre-nano/src/api/reception-client.ts`

- `contracts/openapi/recyclique-api.yaml`, `contracts/openapi/generated/recyclique-api.ts`

- `contracts/creos/manifests/widgets-catalog-reception-nominal.json`, `page-reception-nominal.json`

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/reception.py`

- `recyclique/api/src/recyclic_api/services/reception_service.py`

- `recyclique/api/tests/test_reception_lines_endpoints.py` et tests dédiés si créés



### Tests



- Calquer les patterns **e2e / unit** réception existants (`reception-nominal-7-1`, `reception-context-gate-7-2`) ; ajouter les cas **lignes multiples**, **refus** si ticket fermé, **PATCH poids** si exposé.



### Recherche « dernière version »



- Versions effectives : `peintre-nano/package.json` ; pas de nouvelle dépendance sans justification.



## Références



- `_bmad-output/planning-artifacts/epics.md` — Epic 7, Story 7.3

- `_bmad-output/implementation-artifacts/7-1-mettre-en-service-le-parcours-nominal-de-reception-v2.md`

- `_bmad-output/implementation-artifacts/7-2-garantir-le-contexte-reception-et-les-blocages-metier-associes.md`

- `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md`

- `references/migration-paheko/audits/audit-reception-poids-recyclic-1.4.4.md`

- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`

- `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`

- `references/ancien-repo/fonctionnalites-actuelles.md` §4

- `references/ancien-repo/data-models-api.md` — PosteReception, TicketDepot, LigneDepot

- `_bmad-output/planning-artifacts/guide-pilotage-v2.md`

- `contracts/openapi/recyclique-api.yaml`



### project-context.md



- Absence signalée à la racine dans les stories précédentes ; s'appuyer sur PRD / architecture sous `_bmad-output/planning-artifacts/` si besoin.



## Dev Agent Record



### Agent Model Used



Composer (agent dev-story / sous-agent Task Story Runner), 2026-04-09.



### Debug Log References



*(néant)*



### Completion Notes List



- OpenAPI **0.1.8-draft** : PUT/DELETE ligne, PATCH poids admin ; codegen `recyclique-api.ts` régénéré.

- Client Peintre : `putUpdateReceptionLigne`, `deleteReceptionLigne`, `patchReceptionLigneWeight` ; parsing ligne mutualisé.

- Wizard : `is_exit` + filtre destination (RECYCLAGE/DECHETERIE) côté UI aligné règle backend ; liste lignes avec édition/suppression si ticket ouvert ; bloc correction poids (PATCH) si ticket fermé ; init sélection admin au `refreshTicket` après clôture.

- Backend : `assert_nominal_reception_eligible` sur handler PATCH poids (cohérence pivot 7.2/7.3).

- Pytest : `test_patch_ligne_weight_admin_after_ticket_closed`, `test_patch_ligne_weight_forbidden_for_plain_user` (+ fixture `reception_user_client`). Exécution locale `test_reception_lines_endpoints.py` : dépend d'une DB avec catégories actives (sinon skip / échec environnement).

- Registre terrain Epic 7 §3 / §5 / §7 mis à jour (preuves automatisées + mention honnête localhost:4444).



### File List



- `contracts/openapi/recyclique-api.yaml`

- `contracts/openapi/generated/recyclique-api.ts`

- `contracts/creos/manifests/widgets-catalog-reception-nominal.json`

- `peintre-nano/src/api/reception-client.ts`

- `peintre-nano/src/domains/reception/ReceptionNominalWizard.tsx`

- `peintre-nano/tests/e2e/reception-lignes-7-3.e2e.test.tsx`

- `recyclique/api/src/recyclic_api/api/api_v1/endpoints/reception.py`

- `recyclique/api/tests/test_reception_lines_endpoints.py`

- `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md`

- `_bmad-output/implementation-artifacts/sprint-status.yaml`



## Change Log



- **2026-04-09** — Implémentation Story 7.3 (OpenAPI, Peintre, tests, registre §3) ; statut **review**.



---



## Story completion status



- **create-story (2026-04-09)** : contexte consolidé depuis `epics.md` Story 7.3, stories 7.1–7.2 done, registre terrain Epic 7, audit réception/poids, contraintes produit (brownfield-first, backend autorité, hors Epic 9, pas de vérité front sans API), état OpenAPI / wizard actuel ; checklist skill / template remplis ; statut fichier **ready-for-dev**.

- **validate (VS, 2026-04-09)** : chemins de sources normalisés dans les AC ; AC1 renforcé (relecture API + clause de vérification) ; AC5/AC6 chemins complets ; continuité 7.2 explicite (non-régression garde-fous).

- **dev-story (DS, 2026-04-09)** : implémentation 7.3 livrée ; fichier story **review** ; `sprint-status.yaml` → **review**.

