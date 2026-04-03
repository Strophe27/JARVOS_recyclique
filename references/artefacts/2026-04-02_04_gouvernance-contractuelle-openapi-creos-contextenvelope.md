# Gouvernance contractuelle — OpenAPI, CREOS, ContextEnvelope (AR39 / AR19)

**Date :** 2026-04-02  
**Dernière mise à jour :** 2026-04-02 — **HITL terrain** (Strophe) : élicitations A–G intégrées ; décisions opérationnelles solo-développeur ; périmètre reviewable vs démo ; politique `operationId` ; CI / drift ; jalon promotion manifests.  
**Story BMAD :** Epic 1 — `1-4-fermer-la-gouvernance-contractuelle-openapi-creos-contextenvelope`  
**Piste :** B (contrats et prérequis backend) — **sans confusion** avec Peintre_nano / Epic 3.  
**Ordre de lecture (agents) :** **Story 1.3** avant ce document — `references/artefacts/2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` (sémantique, PIN, step-up, invariants ; le « quoi »). **1.4** (ce fichier) formalise le « comment » reviewable (`contracts/`, drift, `operationId`). Puis `contracts/README.md`.  
**Documents liés :** `2026-04-02_03_spec-multi-contextes-invariants-autorisation-v2.md` (Story 1.3), `contracts/README.md`, `contracts/creos/schemas/README.md`, `_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`, `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md`. **État projet :** [references/ou-on-en-est.md](../ou-on-en-est.md) (entrée 2026-04-02 Piste B).

---

## 0. Décisions HITL terrain (2026-04-02)

Synthèse des choix validés avec le porteur produit / développement (session d’élicitation post-livraison). Elles **complètent** les sections normatives ci-dessous sans les remplacer.

### 0.1 Tableau exécutif

| Zone | Décision |
|------|----------|
| **A — Revue manifests / PR contrats** | Validation développement et **relecture des PR** touchant `contracts/` : **Strophe** tant que le dépôt est en **équipe réduite / solo**. **Réviser** cette règle lors d’une **ouverture du code** ou de l’arrivée de contributeurs externes (relecture obligatoire nommée). |
| **B3 — Évolution OpenAPI** | Enrichir `recyclique-api.yaml` **au fil des stories** ; **ne pas** tout figer d’un coup — cohérent avec un `info.version` draft (`0.x`). |
| **B4 — Renommage `operationId`** | **Phase draft (`0.x`)** : renommage **autorisé** ; **interdit en silence** — dans la **même PR** (ou série de commits liés) : mettre à jour **toutes** les références (`data_contract.operation_id`, tests contrat, doc) **ou** inscrire le renommage dans un **CHANGELOG contrats** (ex. section en tête de `contracts/README.md` ou fichier `contracts/CHANGELOG.md` si créé). **Après stabilisation** (post-draft) : **dépréciation** (ancien id conservé une durée + alias documenté) ou **semver majeur** OpenAPI si rupture sans filet. |
| **C5–C6 — Manifests Peintre_nano vs `contracts/`** | Les exemples / démos **Epic 3** sous `peintre-nano/` restent **légitimes**. **Promotion** vers lots reviewables sous `contracts/creos/manifests/` (ou équivalent) : **dès le premier besoin** de manifest **partagé** hors seul package démo — en pratique au plus tard **Epic 4** (ex. bandeau live) ou dès qu’un **second consommateur** doit lire le même fichier. Ne pas créer de **nouvelle** vérité métier **uniquement** dans Peintre_nano sans ticket de promotion vers `contracts/` lorsque le périmètre devient officiel. |
| **D7 — `data_contract.operation_id`** | **Confirmé** comme **bon levier** : clé stable partagée entre schéma CREOS / manifests et `operationId` OpenAPI — base pour codegen et CI « référence résoluble ». |
| **D8 — v2 vs 1.4.4 figé** | La baseline **1.4.4** n’est **pas** le writer OpenAPI v2. **Périmètre reviewable / commanditaire** : tout `data_contract.operation_id` **doit** référencer un `operationId` **présent** dans `contracts/openapi/recyclique-api.yaml`. **Périmètre démo / mock** (fixtures Peintre_nano, non présentés comme contrat officiel) : peut référencer des ops **pas encore** dans le YAML **tant que** c’est **explicitement non normatif** (aligné §6). Lorsqu’un manifest est **promu** officiel, **compléter le YAML** dans la même foulée. |
| **E — Drift et CI** | **Règle d’abord** (ce document), **outillage Epic 10** ensuite. **Drift** = écart entre YAML canonique et artefacts générés / références `operation_id`. **Quand la CI de contrats existera** : **bloquer le merge** sur la branche principale (et de préférence partout tant que l’équipe est petite) si la CI détecte une dérive **sur les fichiers sous `contracts/`** ou sur les références reviewables. |
| **F11** | Confirmé : Peintre_nano **n’invente pas** routes / permissions / pages métier hors contrats commanditaires. |
| **F12** | Confirmé : types TS et fixtures Peintre_nano **dérivés ou mocks** jusqu’à **Convergence 1** (branchement réel client / codegen). |
| **G13–G14** | Pas de QA multi-fichiers obligatoire pour clore la story. **Multi-ressourcerie / modules tiers / admin centralisé** : pas d’extension normative urgente ; traiter par **artefact annexe daté** ou section future lorsqu’un **cas concret** apparaît (cf. §8). |

### 0.2 Rôle « produit / commanditaire » (rappel)

Tant que **Strophe** cumule arbitrage produit et implémentation Piste B, **produit** et **Recyclique writer** peuvent être **la même personne** pour la revue des manifests navigation/page ; la colonne §1 reste **valide** pour une équipe élargie ultérieure.

---

## Traçabilité Acceptance Criteria → sections

| Bloc Given / When / Then (Story 1.4) | Sections qui répondent |
|--------------------------------------|-------------------------|
| Décisions terrain HITL post-livraison | §0 |
| Propriétaire autoritaire, emplacement canonique, frontière d’usage pour OpenAPI, ContextEnvelope, NavigationManifest, PageManifest, UserRuntimePrefs ; hiérarchie de vérité | §1, §1 bis, §2 |
| Versionnement, drift, artefacts générés = copies dérivées ; enums / identifiants / clés permission qui descendent du backend vers l’UI | §3, §4 |
| Données sensibles dans les contrats | §7 |
| `recyclique-api.yaml` reviewable, `operationId` stables, `data_contract.operation_id` ; extension CREOS `widget-declaration.schema.json` | §2.1, §2.2, §2.3, §5 |
| Runtime Peintre_nano borné (valider, fusionner, filtrer, rejeter, rendu) ; interdiction d’inventer routes / permissions / pages métier hors contrats | §6 |
| Cadre extensions futures (multi-déploiement, tiers) | §8 |

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

## 1 bis. Promotion des manifests vers `contracts/`

- **Jalon par défaut** : dès qu’un manifest n’est plus **uniquement** une démo moteur mais un **slice produit partagé** — en pratique **Epic 4** (ex. bandeau live) ou toute story qui introduit un **second consommateur** du même fichier hors `peintre-nano`.
- **Action** : publier le lot sous `contracts/creos/manifests/` (ou chemin équivalent documenté) et **aligner** `recyclique-api.yaml` pour tout `operation_id` **reviewable** cité (cf. §2.3).
- **Epic 3 déjà livré** : pas de migration rétroactive obligatoire des seuls fichiers de démo ; appliquer la règle aux **nouveaux** périmètres « officiels ».

---

## 2. Frontières OpenAPI vs CREOS

### 2.1 OpenAPI (AR19)

- **Writer canonique :** **Recyclique**. Le fichier `contracts/openapi/recyclique-api.yaml` est la **source reviewable** unique (versionnée) pour la surface API v2 en cours de définition (draft évolutif).
- **Évolution incrémentale :** ajouter opérations et schémas **par stories** ; pas besoin de couvrir tout le backend dans une seule passe.
- **Stabilité des `operationId` :** ne pas **casser** les ids **déjà référencés** dans des manifests reviewables ou du codegen sans suivre la politique §0.1 **B4** (mise à jour des refs ou CHANGELOG en draft ; dépréciation / semver après stabilisation).
- **Codegen :** lorsque le pipeline existe, les artefacts sous `contracts/openapi/generated/` et `peintre-nano/src/generated/openapi/` sont des **copies dérivées** — jamais éditées à la main pour « corriger » le contrat ; toute correction passe par le YAML reviewable puis regénération.
- **Lien CREOS (reviewable) :** toute référence `data_contract.operation_id` dans un manifest ou schéma **reviewable** sous `contracts/` **doit** pointer vers un `operationId` **présent** dans `recyclique-api.yaml` (filet **CI Epic 10** lorsque la CI existe).

### 2.2 CREOS (`contracts/creos/`)

- **Périmètre :** schémas JSON reviewables décrivant le **catalogue** de widgets, états de données UI, et extensions de composition — **pas** l’implémentation HTTP.
- **Schéma JSON vs règle métier :** les fichiers sous `contracts/creos/schemas/` valident surtout la **forme** des documents ; la distinction **reviewable / commanditaire** vs **démo / mock** (quels `operation_id` sont tenus pour **obligatoirement** résolus dans `recyclique-api.yaml`) est **opérationnelle** — voir **§2.3** et **§0**.
- **Fichier pivot extension données :** `contracts/creos/schemas/widget-declaration.schema.json` formalise notamment `data_contract` avec :
  - `operation_id` : **référence obligatoire** à un `operationId` OpenAPI **pour tout artefact reviewable** (cf. §2.3 pour les exceptions démo) ;
  - `source` : domaine métier ; convention d’alignement avec les **tags** OpenAPI (voir `contracts/README.md`) ;
  - champs `endpoint_hint`, `refresh`, `critical`, sources secondaires, etc. (détail dans le schéma et l’instruction contrats données).
- **Distinction :** la déclaration CREOS **n’est pas** la ligne de placement dans un `PageManifest` (slots) — voir `contracts/creos/schemas/README.md`.

### 2.3 Périmètre reviewable vs démo (`data_contract`)

| Périmètre | Règle `operation_id` |
|-----------|-------------------------|
| **Reviewable / commanditaire** (fichiers sous `contracts/` destinés à être la vérité v2, ou manifests promus selon §1 bis) | **`operation_id` obligatoirement** présent dans `recyclique-api.yaml` — **aucune** référence « fantôme ». |
| **Démo / mock** (ex. `peintre-nano/src/fixtures/`, démos Epic 3, non tenus pour contrat officiel) | Peut référencer une opération **pas encore** dans le YAML **tant que** le jeu est **marqué non normatif** (documentation du dossier, story, ou commentaire manifeste) ; **interdit** de présenter ce jeu comme contrat de prod sans promotion §1 bis + complétion YAML. |

**Séparation v2 / 1.4.4 :** le writer OpenAPI v2 est **`recyclique-api.yaml`** ; la baseline **1.4.4** figée n’est **pas** étendue pour servir de filet aux manifests v2 reviewables.

---

## 3. Versionnement, revue, drift

- **Drift (dérive)** : écart entre le **YAML / schémas canoniques** sous `contracts/` d’une part, et d’autre part les **artefacts générés** (codegen, clients) ou les **`operation_id` reviewables** cités dans les manifests — tel que détectable par une future CI (**Epic 10**).
- **Revue des PR** touchant `contracts/` (OpenAPI, CREOS, manifests reviewables) : **Strophe** tant que l’équipe est réduite / solo — **réviser** lors d’ouverture du code ou de nouveaux mainteneurs (cf. §0).
- **Contrats reviewables** : changements **tracés par PR** ; relecture pair / architecte selon gravité lorsque l’équipe s’élargit.
- **Semantic versioning** : le champ `info.version` du OpenAPI (et versions de bundles contrats) suit une politique **semver** ou **draft** explicite (ex. `0.x` draft) ; toute rupture d’`operationId` ou de schéma public en phase stable = version majeure ou étape de migration documentée (cf. §0.1 **B4**).
- **Détection de dérive (drift)** : intention **Epic 10** — comparer codegen / clients générés au YAML canonique ; valider que chaque `data_contract.operation_id` **reviewable** existe dans l’OpenAPI ; valider manifests CREOS contre schémas. La **mise en œuvre CI** hors périmètre strict Story 1.4 ; la **règle** est posée ici. **Quand la CI existe** : **bloquer le merge** sur dérive contrats sur la branche principale (recommandation : même exigence sur les branches de travail tant que l’équipe est petite).
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

**Interdit :** créer en runtime des **routes métier**, des **permissions** ou des **pages** absentes des contrats **commanditaires** (manifests reviewables ou, jusqu’à Convergence 1, jeux d’exemple cohérents explicitement non normatifs). **Confirmé HITL (F11).**

**Types TypeScript et fixtures** dans `peintre-nano` : **dérivés** ou **mocks** jusqu’au **branchement réel** du client et des contrats partagés (**Convergence 1**). **Confirmé HITL (F12).**

---

## 7. Données sensibles

Aucun secret, token, identifiant personnel réel ou credential ne doit être commité dans les contrats ou cette gouvernance. Les exemples restent **synthétiques**.

---

## 8. Extensions futures (cadre minimal)

Sans sur-spécifier aujourd’hui : **multi-déploiement** (plusieurs instances Recyclique), **modules tiers**, **administration centralisée** ou **SaaS multi-tenant** doivent respecter les **mêmes** règles — **aucune** route, permission ou page métier injectée **sans** passer par les contrats reviewables (`OpenAPI` + manifests / CREOS selon le cas). Lorsqu’un besoin concret apparaît, consigner les arbitrages dans un **artefact daté** sous `references/artefacts/` ou une ADR plutôt que d’élargir implicitement ce document.
