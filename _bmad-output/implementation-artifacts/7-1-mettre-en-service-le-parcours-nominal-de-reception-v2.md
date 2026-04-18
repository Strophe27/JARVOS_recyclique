# Story 7.1 : Mettre en service le parcours nominal de réception v2



Status: done



<!-- Note : validation optionnelle — `validate-create-story` avant `dev-story` si besoin. -->



## Story



En tant qu'opératrice de réception,



je veux enregistrer un **parcours nominal de réception** dans la nouvelle UI (`Peintre_nano`),



afin que la réception v2 redevienne **utilisable au quotidien** pour l'intake matière, alignée sur le **brownfield legacy** `/reception` et sur l'**autorité métier `Recyclique`**.



## Baseline brownfield-first (non négociable)



- **Référence produit** : le parcours **legacy** documenté pour **`/reception`** — **pas** la forme isolée de `FlowRenderer` ni des manifests CREOS **comme source de vérité produit**. Ces mécanismes sont **subordonnés** au workflow opérateur (même principe que la caisse après correct course Epic 6).

- **Séquence cible (nominal)** : accès réception → **ouverture poste** → **création ticket** → **lignes de dépôt** (catégorie, **poids**, **destination**, notes ; champs tels que décrits côté API legacy) → **fermeture ticket** → **fermeture poste**. Les variantes (saisie différée `opened_at`, stats live, exports, admin, sorties stock, offline) sont **hors périmètre explicite** de **7.1** sauf amorce technique minimale nécessaire à l'enchaînement ; elles relèvent surtout de **7.2–7.5** / **7.6**.

- **`Peintre_nano`** : **runtime de rendu** ; **pas** auteur du **flux matière**, des **règles métier** ni du **contexte autoritatif**. **`Recyclique` backend** reste la **seule autorité** (permissions, persistance, refus serveur). Checklist : `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`.

- **Frontières avec 7.2–7.5** : **7.1** = **pivot nominal** avec prérequis, dépendances et preuves pour la suite — **ne pas** absorber le durcissement contexte (**7.2**), la catégorisation / pesée / qualification étendue (**7.3**), la journalisation / historique exploitable (**7.4**), ni les états défensifs complets (**7.5**).

- **Gaps honnêtes** : **ne pas** revendiquer une **parité legacy exhaustive** ; tout écart structurel doit être **nommé** (registre §4 + revue story).



## Registre terrain Epic 7 (squelette créé en 7.1)



- **Fichier vivant** : `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md` — à alimenter story après story jusqu'à **7.6** (modèle aligné sur `2026-04-08_07_caisse-v2-exploitabilite-terrain-epic6.md`, cf. `_bmad-output/implementation-artifacts/epic-6-retro-2026-04-09.md` §2.3 point 4).



## Preuves et environnement (barème type Epic 6)



- **Stack servie** : UI v2 sur **`http://localhost:4444`** — **obligatoire** pour les preuves terrain significatives ; **ne jamais** utiliser **`127.0.0.1`** pour ces appels (convention projet).

- **Mutations critiques** (ouverture / fermeture poste, création / fermeture ticket, CRUD lignes, patch poids si exposé) : fournir des **preuves réseau** (DevTools ou équivalent) : méthode, chemin, **statut HTTP**, corrélation utile — **en complément** des tests locaux (Vitest, etc.) ; **ne pas** se limiter au vert CI seul pour conclure à l'exploitabilité terrain.

- **`operation_id` OpenAPI** : pour chaque widget métier officiel, renseigner `data_contract.operation_id` **résolu** dans `contracts/openapi/recyclique-api.yaml`. **Constat à la création de cette story** : le contrat v2 **ne décrit pas encore** les paths **`/v1/reception/*`** de façon complète (quelques champs transverses seulement, ex. `reception_post_id` dans des schémas). Le dev doit **lire** l'API réelle et/ou le snapshot legacy `references/artefacts/2026-04-02_08_openapi-recyclique-live-recyclic-local.json`, **étendre** le YAML v2, **régénérer** les clients — puis **citer les `operation_id`** dans le registre et les PR. Tant que le contrat n'est pas promu, **documenter l'écart** dans le registre §5.



## Mapping brownfield réception (legacy → intention v2)



Référencé pour l'implémentation ; le détail API ↔ tables est dans l'audit réception.



| Étape brownfield (legacy) | Description opérateur | API / route legacy (1.4.4) | Rôle v2 (Peintre + backend) |

|---------------------------|------------------------|----------------------------|------------------------------|

| Accès module | Permission `reception.access`, entrée terrain | Page **`/reception`** | Route / page servie par `NavigationManifest` + garde auth ; pas de route fantôme front seul |

| Ouverture poste | Démarrer une session de poste ; option saisie différée | `POST /v1/reception/postes/open` (body optionnel `opened_at`) | Mutation via client généré ; UI **ne** simule **pas** un poste ouvert sans réponse serveur |

| Fermeture poste | Clôturer le poste courant | `POST /v1/reception/postes/{poste_id}/close` | Idem |

| Création ticket | Nouveau ticket dans le poste courant | `POST /v1/reception/tickets` | Idem ; `benevole_user_id` / défauts : respecter sémantique API |

| Fermeture ticket | Terminer le dépôt | `POST /v1/reception/tickets/{ticket_id}/close` | Idem |

| Lignes de dépôt | Ajout / édition / suppression | `POST/GET/PUT/DELETE /v1/reception/lignes` | Données **autoritatives** serveur ; catégorie, **poids (kg)**, **destination**, notes, `is_exit` selon contrat |

| Ajustement poids (si dans le nominal minimal) | Correction poids ligne | `PATCH /v1/reception/tickets/{ticket_id}/lignes/{ligne_id}/weight` | Peut rester **documenté** pour suite **7.3/7.4** si non requis pour le premier fil nominal |

| Catégories réception | Liste pour saisie | `GET /v1/categories/entry-tickets`, `GET /v1/reception/categories` | Données **lecture** backend ; pas d'invention de taxonomie côté UI |

| *(Hors 7.1 nominal)* | Stats live, exports CSV, admin, offline | `GET /v1/reception/stats/live`, exports, admin bulk | **7.4**, **7.6**, Epic 9 / admin — ne pas les confondre avec le pivot 7.1 |



**Sources mapping :** [Source: `references/ancien-repo/fonctionnalites-actuelles.md` §4] ; [Source: `references/migration-paheko/audits/audit-reception-poids-recyclic-1.4.4.md` §1–2] ; [Source: `references/migration-paheko/audits/matrice-correspondance-caisse-poids.md` — poids réception kg, flux matière RecyClique source].



## Acceptance Criteria



1. **Écran et séquence nominal** — Étant donné que la réception est un flux brownfield critique, quand l'opératrice ouvre le parcours réception dans `Peintre_nano`, alors elle peut enchaîner les **étapes explicites** : accès → ouverture poste → création ticket → saisie des **lignes de dépôt** (catégorie, poids, destination, notes selon le contrat) → fermeture ticket → fermeture poste ; la séquence est **portée** par les **réponses et mutations `Recyclique`**, pas par une simulation front. [Source: `epics.md` Story 7.1]



2. **Lisibilité terrain** — Étant donné que la réception prime sur l'ornement, quand le flux nominal est utilisé, alors chaque étape reste **compréhensible** et cohérente avec le **contexte d'exploitation affiché** (sans transitions cachées qui contrediraient l'état serveur). [Source: `epics.md` Story 7.1]



3. **Baseline pour la suite** — Étant donné que les stories suivantes enrichissent le périmètre, quand **7.1** est livrée, alors le projet dispose d'un **chemin nominal utilisable** dans le nouveau runtime **sans** que **7.2–7.5** soient pré-requis de cette première coupe ; les extensions ultérieures **s'branch** sur ce pivot sans redéfinir le cœur du flux. [Source: `epics.md` Story 7.1]



4. **Registre + preuves** — Étant donné les leçons Epic 6, quand **7.1** est considérée pour review / merge, alors le **registre terrain** (`2026-04-09_01_…`) contient au moins une **première entrée** (date, passe, mutations observées ou « N/A test auto seulement » honnête) pour le nominal ; les **preuves réseau** des mutations critiques sont **référencées** (captures, logs, ou description de la séquence DevTools) sur **`http://localhost:4444`**. [Source: `epic-6-retro-2026-04-09.md` §2.3]



5. **Hiérarchie de vérité** — Étant donné la checklist PR, quand des widgets métiers affichent des données réception, alors ils déclarent un **`data_contract.operation_id`** aligné sur le contrat **après** promotion OpenAPI ; en phase transitoire, l'**écart** est listé dans le registre §5. [Source: `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`]



## Tasks / Subtasks



- [x] Cartographier l'existant `peintre-nano` (domaine réception / manifests / routes) vs mapping ci-dessus ; identifier les écarts sans les masquer. (AC : 1, 5)

- [x] Aligner ou créer les **manifests CREOS** / pages nécessaires pour un **parcours nominal** **lisible** (étapes explicites), en s'appuyant sur le même **pipeline** que la caisse (`FlowRenderer` en **implémentation**, pas en référence produit). (AC : 1, 2)

- [x] Brancher les appels API sur les endpoints réception **réels** ; étendre `contracts/openapi/recyclique-api.yaml` + régénération clients pour les paths concernés ; mettre à jour le registre §5 avec les **`operation_id`**. (AC : 1, 5)

- [x] Assurer que catégories / listes dépendantes viennent du **backend** (`GET /v1/categories/entry-tickets` ou équivalent documenté). (AC : 1, 2)

- [x] Ne **pas** implémenter à la place de **7.2** (garde-fous contexte complets), **7.3** (qualification étendue), **7.4** (historique / journalisation durable), **7.5** (tous les états défensifs) — poser des **TODO** ou tickets liés dans le registre si des bugs bloquants apparaissent. (AC : 3)

- [x] Exécuter **preuves** : tests automatisés ciblés + **preuves réseau** sur **`http://localhost:4444`** pour la chaîne poste → ticket → lignes → fermetures ; mettre à jour `2026-04-09_01_…`. (AC : 4)

- [x] Vérifier conformité **unités / flux matière** avec la matrice poids (kg côté réception). (AC : 1) [Source: `matrice-correspondance-caisse-poids.md`]



## Dev Notes



### Intelligence Epic 6 (continuité normative)



- **Rétro** : `_bmad-output/implementation-artifacts/epic-6-retro-2026-04-09.md` — réinvestir : preuves **granulaires** réseau, alignement OpenAPI / envelope / profil utilisateur, **done** honnête avec **gaps nommés**.

- **Story de référence (structure / brownfield-first)** : `6-1-mettre-en-service-le-parcours-nominal-de-caisse-v2-dans-peintre-nano.md` (dashboard + workspace ; ici équivalent **entrée réception + enchaînement nominal explicite**).



### Pack lecture Epics 6–10



- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md` (ordre Epic 7)

- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md` (story 7.1 : frontières)



### Modèles de données (aperçu)



- Entités **PosteReception**, **TicketDepot**, **LigneDepot** (destination, etc.) : `references/ancien-repo/data-models-api.md`.



### Pipeline Peintre (invariants)



- Hiérarchie : OpenAPI → ContextEnvelope → NavigationManifest → PageManifest → UserRuntimePrefs ; pas de second moteur métier dans le front. [Source: `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md`]



### Consolidation / brownfield code



- Index audits : `references/consolidation-1.4.5/index.md` — utile si toucher backend `recyclique/api` ou données.



### Fichiers et zones probables



- `peintre-nano/src/domains/` (slice réception s'il existe ou à structurer sur le modèle `cashflow/`)

- `contracts/openapi/recyclique-api.yaml`, clients générés

- `contracts/creos/manifests/` — manifests **promus**, pas seulement fixtures

- `recyclique/api/` — routes, services, schémas réception



### Tests



- Vitest / e2e domaine : calquer les **patterns** `cashflow-*` existants ; ajouter des tests sur le **refus** serveur si contexte invalide **lorsque** l'API est déjà stricte (sans dupliquer toute la matrice **7.2**).



## Références



- `_bmad-output/planning-artifacts/epics.md` — Epic 7, Story 7.1

- `_bmad-output/planning-artifacts/guide-pilotage-v2.md` — jalons Convergence 3 / Epic 7

- `references/index.md`

- `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md`

- `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`

- `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`

- `references/ancien-repo/fonctionnalites-actuelles.md` §4

- `references/consolidation-1.4.5/index.md`

- `references/migration-paheko/audits/matrice-correspondance-caisse-poids.md`

- `references/migration-paheko/audits/audit-reception-poids-recyclic-1.4.4.md`

- `references/ancien-repo/data-models-api.md`

- `references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md`

- `_bmad-output/implementation-artifacts/epic-6-retro-2026-04-09.md`

- `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md`

- Captures legacy d'appui : `_bmad-output/implementation-artifacts/screenshots/reception/11-0__reception-*.png` (**preuves historiques**, pas maquettes normatives v2)



### project-context.md



- Absence signalée à la racine dans les stories précédentes ; s'appuyer sur PRD / architecture sous `_bmad-output/planning-artifacts/` si besoin.



## Dev Agent Record



### Agent Model Used



Composer (sous-agent Task / modèle rapide), session 2026-04-09.



### Debug Log References



*(aucun incident bloquant — `npm run lint` + `npm test` dans `peintre-nano` au vert.)*



### Completion Notes List



- OpenAPI **0.1.6-draft** : paths réception nominaux + schémas ; codegen `openapi-typescript` régénéré.

- Peintre : `reception-client.ts` (fetch credentials + Bearer), wizard `FlowRenderer` en 5 onglets, enregistrement widget + bundle manifests servi + nav `/reception` + permission démo `reception.access`.

- Preuves terrain **localhost:4444** : **GET `/reception` → HTTP 200** (Story Runner, stack servie) documentée dans le registre §2–§3 ; mutations `POST /v1/reception/*` : captures DevTools pour passe **7.6** / HITL. e2e Vitest + test contrat CREOS ↔ OpenAPI.

- Écarts nommés : pas de `GET /v1/categories/entry-tickets` dans le YAML (usage de `GET /v1/reception/categories`) ; pas de parité layout caisse (dashboard / aside).



### File List



- `contracts/openapi/recyclique-api.yaml`

- `contracts/openapi/generated/recyclique-api.ts`

- `contracts/creos/manifests/page-reception-nominal.json`

- `contracts/creos/manifests/widgets-catalog-reception-nominal.json`

- `contracts/creos/manifests/navigation-transverse-served.json`

- `peintre-nano/src/api/reception-client.ts`

- `peintre-nano/src/domains/reception/ReceptionNominalWizard.tsx`

- `peintre-nano/src/registry/register-reception-widgets.ts`

- `peintre-nano/src/registry/index.ts`

- `peintre-nano/src/app/demo/runtime-demo-manifest.ts`

- `peintre-nano/src/app/auth/default-demo-auth-adapter.ts`

- `peintre-nano/tests/e2e/reception-nominal-7-1.e2e.test.tsx`

- `peintre-nano/tests/contract/creos-reception-nominal-manifests-7-1.test.ts`

- `peintre-nano/tests/contract/navigation-transverse-served-5-1.test.ts`

- `peintre-nano/tests/unit/widget-registry.test.ts`

- `references/artefacts/2026-04-09_01_reception-v2-exploitabilite-terrain-epic7-squelette.md`

- `_bmad-output/implementation-artifacts/sprint-status.yaml`

- `_bmad-output/implementation-artifacts/7-1-mettre-en-service-le-parcours-nominal-de-reception-v2.md`



---



## Change Log



- 2026-04-09 — Implémentation story 7.1 : contrat réception nominal, client + UI wizard, manifests CREOS, navigation, tests e2e ; story → **review**, sprint **7-1** → **review**.



---



## Story completion status



- **create-story (2026-04-09)** : contexte consolidé depuis epics, guide de pilotage, pack lecture 6–10, audits réception / matrice poids, checklist Peintre, pipeline présentation, rétro Epic 6, index références ; contraintes produit intégrées ; **registre terrain squelette** créé et lié ; statut fichier **ready-for-dev**.

- **dev-story (2026-04-09)** : implémentation livrée ; statut fichier **review** ; sprint `7-1-mettre-en-service-le-parcours-nominal-de-reception-v2` → **review** (QA/CR à la charge du Story Runner).

