# Gouvernance contractuelle — OpenAPI, CREOS, ContextEnvelope (AR39 / AR19)

**Date :** 2026-04-02  
**Story BMAD :** Epic 1 — `1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope`  
**Piste :** B (contrats et prérequis backend) — **sans confusion** avec Peintre_nano / Epic 3.  
**Documents liés :** `2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` (Story 1.3), `contracts/README.md`, `contracts/creos/schemas/README.md`, `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`, `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`.

---

## Traçabilité Acceptance Criteria → sections

| Bloc Given / When / Then (Story 1.4) | Sections qui répondent |
|--------------------------------------|-------------------------|
| Propriétaire autoritaire, emplacement canonique, frontière d’usage pour OpenAPI, ContextEnvelope, NavigationManifest, PageManifest, UserRuntimePrefs ; hiérarchie de vérité | §1, §2 |
| Versionnement, drift, artefacts générés = copies dérivées ; enums / identifiants / clés permission qui descendent du backend vers l’UI | §3, §4 |
| `recyclique-api.yaml` reviewable, `operationId` stables, `data_contract.operation_id` ; extension CREOS `widget-declaration.schema.json` | §2.1, §2.2, §5 |
| Runtime Peintre_nano borné (valider, fusionner, filtrer, rejeter, rendu) ; interdiction d’inventer routes / permissions / pages métier hors contrats | §6 |

---

## 1. Hiérarchie de vérité AR39

**Ordre strict (du plus autoritaire au moins normatif pour la sémantique métier et l’API) :**

`OpenAPI` **>** `ContextEnvelope` **>** `NavigationManifest` **>** `PageManifest` **>** `UserRuntimePrefs`

| Niveau | Rôle | Propriétaire autoritaire | Emplacement canonique (état repo) | Normatif vs dérivé |
|--------|------|---------------------------|-----------------------------------|---------------------|
| **OpenAPI** | Surface HTTP reviewable v2 ; contrat des opérations, schémas exposés, **`operationId` stables** servant de clé d’appel et de corrélation codegen / CI. | **Recyclique** (équipe / writer Piste B). | `contracts/openapi/recyclique-api.yaml` | **Normatif** pour tout ce qui est « quelles opérations existent » et « comment les nommer ». |
| **ContextEnvelope** | Projection runtime du **contexte d’exploitation** (site, caisse, session, droits effectifs, signaux de fraîcheur, etc.) telle que **décidée par le backend**. | **Recyclique** (calcul, persistance, exposition API — stories Epic 2). | Contrat : schémas / réponses OpenAPI (à détailler dans le YAML au fil des stories) ; **pas** un second fichier « source » parallèle sans lien OpenAPI. Côté UI : consommation **dérivée** (provider, cache TTL — voir `project-structure-boundaries.md`). | **Normatif** côté serveur ; **dérivé** côté client (projection autorisée, jamais réécriture de la vérité sécurité). |
| **NavigationManifest** | Arbre de navigation commanditaire (routes exposées opérateur, structure transverse). | **Produit / commanditaire** (définition métier), validé en revue avec **Recyclique** pour cohérence permissions. | **Aujourd’hui :** exemples et démo dans `peintre-nano/public/manifests/`, `peintre-nano/src/fixtures/manifests/`. **Cible :** lots reviewables sous `contracts/creos/manifests/` quand le repo accueillera des manifests partagés (non requis pour valider le runtime tant que documenté). | **Normatif** une fois publié comme lot reviewable dans `contracts/` ; **dérivé / mock** tant qu’il vit uniquement dans Peintre_nano sans doublon reviewable. |
| **PageManifest** | Composition de page (slots, widgets, props) pour un écran donné. | Idem NavigationManifest. | Idem (même distinction peintre-nano vs `contracts/creos/manifests/`). | Idem. |
| **UserRuntimePrefs** | Préférences **locales non métier** (densité, thème, derniers choix UI non sécurité). | Utilisateur / poste ; **bornage** Story 3.5. | Comportement runtime Peintre_nano (stockage local / state) — **pas** dans OpenAPI comme source de vérité métier. | **Dernier** dans la hiérarchie : ne **contredit** jamais OpenAPI, ContextEnvelope ni les manifests commanditaires. |

**Règle d’or :** aucun artefact « en aval » ne crée de **nouvelle** vérité métier (route, permission, page métier) absente des contrats **amont** correspondants.

---

## 2. Frontières OpenAPI vs CREOS

### 2.1 OpenAPI (AR19)

- **Writer canonique :** **Recyclique**. Le fichier `contracts/openapi/recyclique-api.yaml` est la **source reviewable** unique (versionnée) pour la surface API v2 en cours de définition (draft évolutif).
- **Évolution :** ajout d’opérations et de schémas par PR ; **ne pas casser** les `operationId` déjà publiés dans des manifests ou clients sans migration explicite (deprecation, alias documenté, ou major semver si politique produit l’exige).
- **Codegen :** lorsque le pipeline existe, les artefacts sous `contracts/openapi/generated/` et `peintre-nano/src/generated/openapi/` sont des **copies dérivées** — jamais éditées à la main pour « corriger » le contrat ; toute correction passe par le YAML reviewable puis regénération.
- **Lien CREOS :** toute référence `data_contract.operation_id` dans les schémas / manifests reviewables **doit** pointer vers un `operationId` présent dans `recyclique-api.yaml` (règle de filet **CI Epic 10** lorsque `paths` n’est plus vide).

### 2.2 CREOS (`contracts/creos/`)

- **Périmètre :** schémas JSON reviewables décrivant le **catalogue** de widgets, états de données UI, et extensions de composition — **pas** l’implémentation HTTP.
- **Fichier pivot extension données :** `contracts/creos/schemas/widget-declaration.schema.json` formalise notamment `data_contract` avec :
  - `operation_id` : **référence obligatoire** à un `operationId` OpenAPI stable ;
  - `source` : domaine métier ; convention d’alignement avec les **tags** OpenAPI (voir `contracts/README.md`) ;
  - champs `endpoint_hint`, `refresh`, `critical`, sources secondaires, etc. (détail dans le schéma et l’instruction contrats données).
- **Distinction :** la déclaration CREOS **n’est pas** la ligne de placement dans un `PageManifest` (slots) — voir `contracts/creos/schemas/README.md`.

---

## 3. Versionnement, revue, drift

- **Contrats reviewables** (`recyclique-api.yaml`, schémas CREOS, manifests sous `contracts/` lorsqu’ils existent) : changements **tracés par PR** ; relecture pair / architecte selon gravité.
- **Semantic versioning** : le champ `info.version` du OpenAPI (et versions de bundles contrats) suit une politique **semver** ou **draft** explicite (ex. `0.x` draft) ; toute rupture d’`operationId` ou de schéma public = version majeure ou étape de migration documentée.
- **Détection de dérive (drift)** : intention **Epic 10** — comparer codegen / clients générés au YAML canonique ; valider que chaque `data_contract.operation_id` reviewable existe dans l’OpenAPI ; valider manifests CREOS contre schémas. La **mise en œuvre CI** hors périmètre strict Story 1.4 ; la **règle** est posée ici.
- **Artefacts générés** : toujours **dérivés** ; en cas de divergence, le YAML / schémas sous `contracts/` font foi.

---

## 4. Flux enums, identifiants, clés de permission

- **Ordre de vérité :** définitions **backend** (OpenAPI `components.schemas`, enums serveur, tables / règles de calcul des permissions) **puis** propagation vers **manifests** et **runtime UI** (affichage, filtrage, libellés).
- **Permissions :** conformément à la spec **1.3**, le **calcul effectif** est **backend** ; l’UI et les manifests **reflètent** et **demandent** — ils ne sont **pas** source de vérité sécurité. Les **clés stables** de permission sont celles **contrôlées et documentées** côté Recyclique et référencées dans les contrats (OpenAPI / conventions d’en-têtes ou champs de `ContextEnvelope` selon les stories 2.x).
- **Enums partagés** : publiés ou générés depuis le **même** contrat (OpenAPI ou schéma partagé versionné) pour éviter les jeux de valeurs parallèles.

---

## 5. Synthèse des artefacts par type

| Artefact | Frontière principale | Rappel |
|----------|----------------------|--------|
| OpenAPI | HTTP + modèles exposés | `operationId` = clé stable pour clients et `data_contract.operation_id` |
| ContextEnvelope | Donnée contextuelle serveur | Spécifié dans les réponses / schémas OpenAPI ; UI = projection |
| CREOS schemas | Structure déclarative UI | `widget-declaration.schema.json` = extension `data_contract` documentée |
| NavigationManifest / PageManifest | Navigation et composition | Reviewable sous `contracts/creos/manifests/` à terme ; sinon exemples peintre-nano = dérivés |
| UserRuntimePrefs | Préférences locales | Hors périmètre métier autoritaire ; dernier dans AR39 |

---

## 6. Peintre_nano (Epic 3) — runtime borné

**Autorisé :** valider (schémas / ingest), fusionner des contrats reçus, filtrer l’affichage selon le contexte, **rejeter** explicitement les entrées invalides, **rendre** la UI déclarative, appliquer fallbacks documentés (stories 3.2–3.6).

**Interdit :** créer en runtime des **routes métier**, des **permissions** ou des **pages** absentes des contrats **commanditaires** (manifests reviewables ou, jusqu’à Convergence 1, jeux d’exemple cohérents explicitement non normatifs). Les **types TypeScript** et **fixtures** dans `peintre-nano` sont **dérivés** ou **mocks** jusqu’à branchement du client réel et des contrats partagés (Convergence 1).

---

## 7. Données sensibles

Aucun secret, token, identifiant personnel réel ou credential ne doit être commité dans les contrats ou cette gouvernance. Les exemples restent **synthétiques**.
