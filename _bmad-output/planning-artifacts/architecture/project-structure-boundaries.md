# Project Structure & Boundaries

## Structural Decision Update

Decision structurante :
- `Peintre_nano` est le **nouveau frontend Recyclique v2** ;
- il nait dans ce repo ;
- il integre nativement le runtime applicatif necessaire : routing, configuration, chargement de modules, flows, templates, integration auth/session ;
- la couche de routage/habillage est **interne a `Peintre_nano`**, pas un repo ou package separe a ce stade ;
- `Peintre_nano` doit rester agnostique du contenu metier et de la structure informationnelle ; l'arborescence des routes, la navigation et les affichages structurels viennent du commanditaire via contrats ;
- il est concu pour etre **extractible plus tard** dans un repo dedie ;
- aucun conteneur applicatif separe hors `peintre-nano/` n'est requis a ce stade.

Decision de nommage backend :
- le backend metier principal est nomme **`recyclique`** ;
- il porte l'API, les contextes, permissions, sync, historique, audit et integrations.

Decision de stack de deploiement :
- `Paheko` fait partie de la stack cible de deploiement ;
- son code source de reference peut rester hors coeur du repo produit actif ;
- mais son service doit etre branche explicitement dans l'architecture Docker/deploiement et dans les frontieres d'integration.

## Organisation de developpement parallele (Piste A / Piste B)

Decision d'execution (Correct Course + cadrage co-architecte 2026-04-01) :

- **Piste A — `Peintre_nano` (frontend / moteur UI)** : peut progresser **sans dependance au backend reel** en s'appuyant sur **donnees mockées**, types derives ou stubs, client API centralise pret, `ContextEnvelope` **cote UI** (provider, convention de fraicheur `MAX_CONTEXT_AGE_MS`), validation des manifests CREOS, feature toggles, `FlowRenderer`, raccourcis. Les hooks de domaine consomment des mocks jusqu'a la **Convergence 1**.

- **Piste B — `Recyclique` (backend)** : progresse en **autonomie** : audit API 1.4.4, stabilisation donnees, OpenAPI draft, `ContextEnvelope` construit et valide cote serveur, sync/quarantaine, matrice de permissions par endpoint. Livrable contractuel reviewable : `contracts/openapi/recyclique-api.yaml` avec **`operationId` stables**.

**Points de convergence** (jalons produit, alignes sur la sequence de la decision directrice, pas sur les « phases Peintre » du concept architectural — celles-ci decrivent la **maturite du moteur** sur plusieurs versions, pas un calendrier sprint) :

1. **Convergence 1 — contrat d'interface** : OpenAPI draft + spec `ContextEnvelope` backend ; le frontend **genere les types**, branche les hooks sur le **client reel** (sans changer les composants widgets).
2. **Convergence 2 — bandeau live** : premiere preuve **bout-en-bout** (backend reel, manifest, slot `shell.bandeau.live`, polling, fallback, `correlation_id`). **Gate** : si cette chaine ne tient pas, corriger avant d'elargir (decision directrice).
3. **Convergence 3 — flows terrain critiques** : caisse et reception avec donnees reelles, raccourcis, widgets `critical: true` / blocage `DATA_STALE` ou sensibles, visibilite sync comptable.

Apres validation du bandeau (Convergence 2), les pistes peuvent **re-diverger** (enrichissement flows UI vs. sync et integrations backend).

**Liaison manifest OpenAPI** : les widgets portent optionnellement `data_contract.operation_id` qui **doit** correspondre a un `operationId` du fichier OpenAPI reviewable — voir `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`.

## Complete Project Directory Structure
```text
JARVOS_recyclique/
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml
├── docker-compose.staging.yml
├── docker-compose.prod.yml
├── package.json
├── _bmad-output/
├── references/
│   ├── ancien-repo/
│   ├── paheko/
│   │   ├── index.md
│   │   └── repo/                   # reference/source de travail Paheko, pas coeur applicatif v2
│   └── ...
├── .github/
│   └── workflows/
│       ├── ci-recyclique.yml
│       ├── ci-peintre-nano.yml
│       ├── ci-contracts.yml
│       └── ci-e2e.yml
├── contracts/
│   ├── openapi/
│   │   ├── recyclique-api.yaml      # draft reviewable — writer Recyclique ; operationId stables (Piste B)
│   │   ├── source/
│   │   ├── generated/
│   │   └── diff-baseline/
│   ├── creos/
│   │   ├── schemas/
│   │   ├── manifests/              # `NavigationManifest` + `PageManifest`
│   │   ├── examples/
│   │   └── validators/
│   └── README.md
├── peintre-nano/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/
│   │   └── assets/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   ├── providers/
│   │   │   ├── routing/
│   │   │   ├── auth/
│   │   │   ├── context/
│   │   │   ├── layouts/
│   │   │   ├── templates/
│   │   │   ├── guards/
│   │   │   ├── errors/
│   │   │   └── loading/
│   │   ├── registry/
│   │   ├── slots/
│   │   ├── widgets/
│   │   ├── flows/
│   │   ├── runtime/
│   │   ├── validation/
│   │   ├── generated/
│   │   │   ├── openapi/
│   │   │   └── creos/
│   │   ├── domains/
│   │   │   ├── bandeau-live/
│   │   │   ├── cashflow/
│   │   │   ├── reception/
│   │   │   ├── eco-organismes/
│   │   │   ├── adherents/
│   │   │   └── admin-config/
│   │   ├── migration/
│   │   │   ├── mantine-adapters/   # P1 ADR : couche adaptation Mantine v8 ; pas socle de composition Peintre_nano — references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md
│   │   │   ├── legacy-screen-parity/
│   │   │   └── ui-bridges/
│   │   ├── runtime-overrides/
│   │   ├── styles/
│   │   └── types/
│   ├── tests/
│   │   ├── unit/
│   │   ├── contract/
│   │   ├── integration/
│   │   └── e2e/
│   └── README.md
├── frontend-legacy/
│   ├── package.json
│   ├── src/
│   └── README.md                  # frontend historique en extinction progressive, a peupler depuis le brownfield existant
├── bot/
│   ├── README.md                  # optionnel ; archive/restauration depuis l'historique si besoin, hors coeur v2 actif
│   └── src/
├── recyclique/
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── requirements-migrations.txt
│   ├── alembic.ini
│   ├── alembic/
│   ├── src/
│   │   └── recyclic_api/
│   │       ├── main.py
│   │       ├── api/
│   │       │   ├── api_v1/
│   │       │   │   ├── api.py
│   │       │   │   └── endpoints/
│   │       │   │       ├── auth/
│   │       │   │       ├── users/
│   │       │   │       ├── sites/
│   │       │   │       ├── cashflow/
│   │       │   │       ├── reception/
│   │       │   │       ├── eco_organismes/
│   │       │   │       ├── adherents/
│   │       │   │       ├── settings/
│   │       │   │       ├── sync/
│   │       │   │       ├── monitoring/
│   │       │   │       └── admin/
│   │       ├── core/
│   │       │   ├── config.py
│   │       │   ├── database.py
│   │       │   ├── auth.py
│   │       │   ├── permissions.py
│   │       │   ├── context.py
│   │       │   └── observability.py
│   │       ├── models/
│   │       ├── schemas/
│   │       ├── services/
│   │       ├── repositories/
│   │       ├── events/
│   │       ├── outbox/
│   │       ├── integrations/
│   │       │   ├── paheko/
│   │       │   ├── helloasso/
│   │       │   └── email/
│   │       ├── manifests/         # runtime cache/assembly seulement ; source reviewable dans `contracts/creos/manifests/`
│   │       └── utils/
│   ├── tests/
│   │   ├── unit/
│   │   ├── contract/
│   │   ├── integration/
│   │   ├── api/
│   │   └── fixtures/
│   └── README.md
├── infra/
│   ├── docker/
│   │   ├── recyclique/
│   │   ├── peintre-nano/
│   │   ├── paheko/
│   │   ├── postgres/
│   │   └── redis/
│   ├── compose/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── prod/
│   └── README.md
├── tests/
│   ├── contracts/
│   │   ├── openapi/
│   │   └── creos/
│   ├── integration/
│   ├── e2e/
│   ├── fixtures/
│   ├── smoke/
│   └── utils/
├── scripts/
│   ├── codegen/
│   ├── contracts/
│   ├── manifests/
│   ├── dev/
│   ├── migration/
│   └── ci/
└── docs/
    ├── architecture/
    ├── runbooks/
    ├── migration/
    ├── contracts/
    └── qa/
```

## Architectural Boundaries

**Frontend Boundary:**
- `peintre-nano/` est le frontend Recyclique v2.
- Il porte a la fois :
  - runtime de composition ;
  - resolution runtime des routes ;
  - templates/layouts ;
  - chargement des modules ;
  - flows declaratifs ;
  - integration auth/session ;
  - domaines UI migres.
- Il agit comme moteur d'affichage / telecran : il rend, organise et personnalise l'experience, mais n'est pas l'auteur metier de la structure informationnelle.
- Il reste concu pour extraction future vers un repo dedie.

**Backend Boundary:**
- `recyclique/` est le backend metier principal.
- Il reste l'autorite de verite sur auth, permissions, contextes, sync, historique, audit et integrations.

**API Boundaries:**
- `recyclique/` expose la surface backend versionnee via `OpenAPI` ; le fichier reviewable nominal est `contracts/openapi/recyclique-api.yaml`, **aligne** sur la sortie `contracts/openapi/generated/` par le pipeline CI (voir `core-architectural-decisions.md` — chaine unique, pas d'edition manuelle parallele au code).
- Les routes historiques peuvent coexister pendant la transition, mais les nouvelles surfaces v2 doivent suivre la gouvernance contractuelle fixee dans ce document.
- Les integrations externes (`Paheko`, `HelloAsso`, email) restent derriere le backend, jamais branchees directement au frontend.
- `recyclique/` reste aussi le commanditaire de la structure informationnelle de `Recyclique` v2 : pages disponibles, navigation, arborescence de routes, raccourcis structurels, contraintes de contexte et permissions associees.

**Paheko Boundary:**
- `Paheko` est un systeme externe branche a la stack de deploiement.
- Sa reference de code/documentation peut vivre sous `references/paheko/repo/`.
- Son integration metier active vit dans `recyclique/.../integrations/paheko/`.
- Son service runtime doit etre explicite dans `infra/docker/` et les compose files.
- `references/paheko/` est une reference documentaire et technique uniquement ; aucun import runtime ne doit viser `references/`.

**Data Boundaries:**
- `PostgreSQL` reste la source de verite transactionnelle de `recyclique`.
- `Redis` reste une couche technique auxiliaire, jamais une autorite metier.
- `contracts/creos/` est la source reviewable canonique des schemas et manifests ; le backend les sert, les resolve ou les met en cache, mais ne cree pas une seconde source concurrente.
- `contracts/openapi/generated/` est la reference CI des artefacts generes (diff / gate) ; `recyclique-api.yaml` en est le miroir reviewable du **meme** snapshot ; `peintre-nano/src/generated/` n'est qu'une copie/consommation derivee alimentee par la chaine d'outillage.
- Les contrats de navigation et de structure informationnelle font partie des artefacts commanditaires reviewables ; `Peintre_nano` peut les interpreter et les completer uniquement par des etats runtime non metier (preferences UI, cache de presentation, etats de chargement, onboarding), mais pas en redefinir seul le sens metier.
- Le `ContextEnvelope` est fourni par `recyclique` via les contrats de donnees backend ; les preferences purement runtime utilisateur restent cote `Peintre_nano` dans un espace non autoritatif.
- Le schema canonique de `ContextEnvelope` releve de `OpenAPI` ; `UserRuntimePrefs` reste local par defaut, sauf endpoint backend explicite dedie et non autoritatif sur le metier.

## Requirements to Structure Mapping

**Feature / FR Mapping:**
- `bandeau live`
  - frontend : `peintre-nano/src/domains/bandeau-live/`
  - backend : `recyclique/.../monitoring/` + `manifests/` pour l'assemblage runtime ; la source reviewable reste dans `contracts/creos/manifests/`
- `cashflow`
  - frontend : `peintre-nano/src/domains/cashflow/`
  - backend : `recyclique/.../cashflow/`
- `reception`
  - frontend : `peintre-nano/src/domains/reception/`
  - backend : `recyclique/.../reception/`
- `eco-organismes`
  - frontend : `peintre-nano/src/domains/eco-organismes/`
  - backend : `recyclique/.../eco_organismes/`
- `adherents`
  - frontend : `peintre-nano/src/domains/adherents/`
  - backend : `recyclique/.../adherents/`
- `admin-config`
  - frontend : `peintre-nano/src/domains/admin-config/`
  - backend : `recyclique/.../settings/` + `admin/`
- `sync Paheko / reprise / reconciliation`
  - backend : `recyclique/.../sync/`, `outbox/`, `integrations/paheko/`
  - frontend : etats de sync exposes dans `peintre-nano/src/domains/admin-config/` et dans les domaines critiques concernes

**Cross-Cutting Concerns:**
- modules de code frontend :
  - `peintre-nano/src/domains/*` = boundaries de livraison et d'implementation pour ce produit, pas source canonique de la structure informationnelle
- auth / permissions / contextes :
  - frontend : `peintre-nano/src/app/auth/`, `context/`, `guards/`
  - backend : `recyclique/.../core/`
- contrats :
  - `contracts/openapi/`
  - `contracts/creos/`
- observabilite :
  - backend : `recyclique/.../core/`
  - frontend : `peintre-nano/src/app/errors/`, `loading/`

## Integration Points

**Internal Communication:**
- `recyclique` expose les contrats backend via `OpenAPI`
- `contracts/creos/` porte la source canonique des manifests `CREOS`, puis la chaine de build/deploiement les rend disponibles au backend et au frontend
- `recyclique` publie la structure informationnelle commanditaire de `Recyclique` v2 sous forme de `NavigationManifest` et `PageManifest`
- `recyclique` fournit aussi le `ContextEnvelope` necessaire a la resolution des affichages
- `peintre-nano` charge ces contrats, valide la navigation/structure proposee par le commanditaire, puis construit l'interface
- `recyclique/.../manifests/` n'est qu'un espace d'assemblage/runtime derive des contrats versionnes ; il n'est jamais edite a la main comme source de verite.

**External Integrations:**
- `Paheko` : service de stack + integration backend dediee
- `HelloAsso` : integration backend dediee
- email : integration backend dediee

**Data Flow:**
1. `recyclique` produit API + etats metier/sync
2. `contracts/` porte les artefacts contractuels reviewables, y compris `NavigationManifest` et `PageManifest`
3. `recyclique` fournit le `ContextEnvelope` de l'operateur et du contexte actif
4. `peintre-nano` charge types generes + manifests + structure de navigation
5. `peintre-nano` valide, compose et rend selon contexte et preferences runtime locales
6. les mutations repartent vers `recyclique`
7. `recyclique` synchronise ensuite avec `Paheko`

## File Organization Patterns

**Configuration Files:**
- configs par proprietaire clair : `recyclique`, `peintre-nano`, `infra`, `contracts`

**Source Organization:**
- `peintre-nano` = frontend v2
- `frontend-legacy` = front historique
- `recyclique` = backend metier
- `contracts` = source contractuelle reviewable
- `infra` = runtime stack / docker / compose

**Test Organization:**
- tests locaux dans chaque grand bloc
- tests transverses dans `tests/`

**Asset Organization:**
- assets frontend v2 dans `peintre-nano/public/`
- pas d'assets globaux sans ownership

## Development Workflow Integration

**Development Server Structure:**
- `recyclique` tourne comme backend metier
- `peintre-nano` tourne comme frontend v2
- `frontend-legacy` peut coexister transitoirement
- `Paheko` est present dans la stack de dev quand necessaire pour l'integration reelle

**Build Process Structure:**
- build separe `recyclique`
- build separe `peintre-nano`
- validation `contracts/` avant integration complete

**Deployment Structure:**
- stack cible : `recyclique` + `peintre-nano` + `paheko` + `postgres` + `redis`
- extinction progressive de `frontend-legacy`

## Handoff to Epics and Stories

Le document est suffisamment stable pour preparer les epics/stories si les premiers lots couvrent explicitement :
- la chaine canonique `recyclique -> OpenAPI -> contracts/openapi/generated -> codegen frontend` ;
- le mecanisme de partage d'identifiants/enums entre `OpenAPI` et `CREOS` ;
- le contrat commanditaire de navigation / arborescence / raccourcis structurels fourni a `Peintre_nano` ;
- la forme minimale des quatre artefacts `NavigationManifest` / `PageManifest` / `ContextEnvelope` / `UserRuntimePrefs` ;
- la spec detaillee du profil minimal dans `navigation-structure-contract.md` ;
- la spec de mapping metier `Recyclique` <-> `Paheko` pour sync, reconciliation et reprise ;
- le slice vertical initial `bandeau live`, puis `cashflow` et `reception`.

Risques residuels a transformer en stories :
- verification du niveau exact de refactor backend acceptable par domaine brownfield ;
- definition operationnelle des overrides runtime de manifests ;
- criteres d'extinction definitifs de `frontend-legacy`.
