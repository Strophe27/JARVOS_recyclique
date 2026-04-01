---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-JARVOS_recyclique-2026-03-31.md
  - references/vision-projet/2026-03-31_decision-directrice-v2.md
  - .cursor/plans/cadrage-v2-global_c2cc7c6d.plan.md
  - .cursor/plans/separation-peintre-recyclique_4777808d.plan.md
  - .cursor/plans/profil-creos-minimal_6cf1006d.plan.md
  - references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-31-195824.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-04-01'
project_name: 'JARVOS_recyclique'
user_name: 'Strophe'
date: '2026-04-01'
---

# Architecture Decision Document

_Ce document se construit de maniere collaborative, etape par etape. Les sections sont ajoutees au fil des decisions architecturales._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

Le perimetre fonctionnel confirme pour `JARVOS_recyclique` v2 est celui d'une evolution brownfield de `recyclique-1.4.4`, sans refonte from scratch. Les capacites coeur a supporter des la v2 sont :
- `cashflow` comme preuve terrain critique ;
- `reception flow` comme preuve terrain critique ;
- `synchronisation Paheko` avec reprise et reconciliation ;
- `bandeau live` comme preuve modulaire legere mais complete ;
- `declaration eco-organismes` comme premier grand module metier ;
- `adherents / vie associative minimale` comme preuve metier complementaire ;
- `integration HelloAsso` dans un perimetre minimum maintenable ;
- `config admin simple` pour piloter activation, ordre et variantes simples de blocs/modules.

Nuance structurante deja visible dans les sources :
- brownfield = noyau metier, API, donnees, continuites terrain et historique ;
- le frontend v2 `Peintre_nano` = greenfield controle, sans que cela transforme la v2 en refonte produit complete.

Ordre de preuve et de structuration deja visible dans les sources actives, **apres** les prerequis structurants du PRD (audit backend/API/donnees, retro-engineering `Paheko`, spec multi-contextes, contrat socle sync, gouvernance `CREOS`, runtime `Peintre_nano` minimal) :
- la chaine modulaire doit d'abord etre prouvee en petit via `bandeau live` ;
- les flows `cashflow` et `reception flow` servent ensuite de preuves terrain critiques ;
- `declaration eco-organismes` valide le socle sur un vrai grand module metier ;
- `adherents / vie associative minimale` apporte une preuve metier complementaire ;
- les epics et stories ne sont pas encore detailles ici, l'architecture doit donc preparer ce decoupage sans le presupposer.

Architecturalement, ces exigences impliquent une chaine complete et coherente :
- contrats backend cote `Recyclique` ;
- contrats UI declaratifs via `CREOS` ;
- runtime de composition cote `Peintre_nano` ;
- adaptation de rendu via le canal web ;
- calcul des permissions et des contextes cote `Recyclique` ;
- application au rendu cote `Peintre_nano` ;
- revalidation serveur pour les actions sensibles ;
- fallbacks, blocages et journalisation sur toute la chaine.

**Non-Functional Requirements:**

Les exigences non fonctionnelles dominantes sont structurantes et non optionnelles :
- fiabilite terrain sur les parcours critiques ;
- justesse comptable avec `Paheko` comme autorite finale du flux financier ;
- resilience par enregistrement local dans `Recyclique`, retry et sync reportable ;
- zero fuite de contexte entre `site`, `caisse`, `session`, `poste`, `role`, `groupe` et operateur ;
- securite avec revalidation cote backend, PIN pour actions sensibles et journalisation exploitable ;
- explicabilite des erreurs, blocages, fallbacks et quarantaines ;
- historicisation, rejeu et analyse future des donnees ;
- performance minimale compatible terrain : fluidite clavier du `cashflow` et absence de penalite visible apportee par le frontend compose `Peintre_nano` ;
- donnees exploitables au grain des totaux et des operations detaillees ;
- installabilite reproductible en environnement officiel `Debian` ;
- ouverture open source sans dependance proprietaire au fonctionnement de base.

Le projet doit en outre articuler explicitement deux flux distincts :
- flux financier : `Paheko` = verite comptable finale ; `Recyclique` = terrain + zone tampon + synchronisation ;
- flux matiere : `Recyclique` = verite principale.

Ces NFRs orientent directement l'architecture vers un modele fortement contractuel, tracable et defensif, avec separation claire des responsabilites entre metier, comptabilite, moteur UI et adaptation de canal, sans jamais confondre ces deux flux.

**Scale & Complexity:**

Le projet releve d'une complexite elevee car il combine :
- brownfield critique avec conservation de flows metier existants ;
- integration externe comptable structurante ;
- moteur UI compose integral pour toute la v2, mais avec un profil de capacites volontairement minimal au depart ;
- modularite reelle exigee de bout en bout ;
- contraintes multi-contextes et multi-sites ;
- gouvernance contractuelle `OpenAPI` / `CREOS` ;
- exigences d'audit, de reprise et de resilience.

- Domaine principal : application web full-stack brownfield avec backend metier, UI composee et integration comptable
- Niveau de complexite : eleve
- Frontieres architecturales deja visibles: noyau metier, auth/permissions, gestion de contexte, journal/audit, moteur sync, quarantaine/reconciliation, contrats API, manifests `CREOS`, runtime `Peintre_nano`, adaptateur React, config admin, modules metier prioritaires

### Technical Constraints & Dependencies

Decisions de cadrage deja verrouillees par les documents d'entree :
- posture brownfield stricte a partir de `recyclique-1.4.4` ;
- toute l'UI v2 doit passer par `Peintre_nano` ;
- `Recyclique` reste l'autorite metier, des permissions et des contextes ;
- `Paheko` reste l'autorite comptable officielle ;
- integration `Paheko` en priorite API-first ;
- plugin Paheko minimal autorise seulement si l'API officielle ne suffit pas ;
- SQL non autorise comme chemin transactionnel nominal ;
- `CREOS` doit rester minimal, documentaire, versionnable et validable, aligne sur la grammaire JARVOS avec transport documentaire en v2 ;
- `Peintre_nano` et `CREOS` demarrent avec un profil minimal initial : cadre applicatif (routage, habillage), slots, widgets, actions declaratives, raccourcis declaratifs, flows simples, fallbacks et journalisation ;
- packaging initial de `Peintre_nano` comme package/workspace interne, extraction future seulement si les contrats deviennent suffisamment stables ;
- parametres critiques et mappings sensibles reserves au niveau super-admin/expert avec forte tracabilite ;
- environnement officiel cible : `Debian`.

Contraintes de perimetre deja explicites :
- aucun livrable UX separe n'est charge ici ; les implications UI/UX proviennent du PRD et des documents `Peintre_nano` / `CREOS` ;
- `HelloAsso` est bien dans le perimetre v2, mais ne doit pas devenir une dependance bloquante pour l'installation minimale du coeur produit ;
- les capacites riches hors socle initial (edition conviviale de flows, personnalisation avancee, analytics riches, pilotage agentique) restent hors noyau v2.

Dependances structurantes encore a produire ou a verifier :
- audit backend/API/donnees ;
- retro-engineering `Paheko` sur donnees reelles ;
- specification multi-contextes/multi-caisses ;
- formalisation des schemas `CREOS` ;
- definition du contrat socle de sync et reconciliation ;
- pipeline de validation des contrats (`OpenAPI`, schemas `CREOS`, smoke tests de rendu) ;
- strategie de coexistence et de migration brownfield depuis `recyclique-1.4.4` ;
- cadrage des dependances externes et secrets d'integration pour `HelloAsso` et les futurs connecteurs.

### Cross-Cutting Concerns Identified

Preoccupations transverses affectant plusieurs composants :
- isolation stricte des contextes ;
- calcul et propagation securisee des permissions ;
- strategie fallback / blocage / retry selon criticite ;
- auditabilite et correlation inter-systemes ;
- gouvernance des contrats `OpenAPI` / `CREOS` ;
- resilience de sync et gestion de quarantaine ;
- coherence des flows critiques entre backend, runtime UI et comptabilite ;
- preuve de la chaine modulaire complete via `bandeau live` avant extension a plus grande echelle ;
- migration brownfield sans casse des habitudes terrain essentielles ;
- modularite prouvee par une chaine complete, pas par simple decoupage visuel.

## Starter Template Evaluation

### Primary Technology Domain

Application web full-stack brownfield, avec backend metier et API separes du frontend, et un futur moteur UI compose interne (`Peintre_nano`) a integrer progressivement sans refonte from scratch du produit.

La stack existante observee dans `recyclique-1.4.4` est :
- frontend : `React` + `Vite` + `react-router-dom` + `Mantine` + `Zustand` ;
- backend : `FastAPI` + `SQLAlchemy` + `Alembic` + `Redis` ;
- orchestration Docker separee `api` / `frontend`, ce qui reste compatible avec la cible `Recyclique` / `Peintre_nano`.

Lecture revisee apres approfondissement :
- le **backend** reste un brownfield de reference, mais avec refontes selectives possibles sur flux, contrats, donnees et sync ;
- le **frontend v2 `Peintre_nano`** ne doit pas reutiliser le frontend existant comme fondation architecturale ;
- le frontend existant devient surtout une **matiere de migration** pour recopier les ecrans, workflows et comportements metier a preserver ;
- la cible `Peintre_nano` impose un substrat nativement compatible avec `CSS Grid`, templates de page, slots, widgets, flows declaratifs, et futures capacites d'edition graphique / resize / adaptation dynamique.

### Starter Options Considered

**Option A - Conserver le frontend actuel comme fondation principale et le refactorer progressivement**

Avantages :
- forte reutilisation apparente ;
- confort court terme ;
- migration ecran par ecran possible sans rupture immediate.

Limites :
- le frontend actuel n'a pas ete concu comme moteur de composition ;
- risque d'empiler `Peintre_nano` comme une couche supplementaire sur une SPA metier existante ;
- compatibilite structurelle faible avec `CSS Grid` comme moteur global, templates semantiques, zone roles, variants et futur editeur de flows/layout ;
- forte probabilite de dette cachee et de compromis durables.

Verdict :
- utile comme reference de migration ;
- mauvais socle architectural pour la v2 composee.

**Option B - Refaire tout le produit frontend + backend from scratch**

Avantages :
- coherence maximale du socle ;
- grande liberte de redecoupe ;
- architecture neuve potentiellement tres propre.

Limites :
- contredit la ligne directrice brownfield ;
- jette une partie de la valeur metier, des habitudes terrain, des contrats implicites et de l'historique utile ;
- risque delivery trop eleve pour la v2.

Verdict :
- trop risquee pour ce projet.

**Option C - Backend brownfield avec refontes selectives pilotees par contrats + frontend `Peintre_nano` greenfield + migration progressive des ecrans**

Avantages :
- respecte la valeur metier, les flux critiques et les acquis backend ;
- permet de repartir proprement a zero pour le frontend v2 `Peintre_nano` ;
- aligne naturellement la fondation frontend avec `Peintre_nano`, `CREOS`, `CSS Grid`, templates, flows et evolution future vers edition graphique et adaptation dynamique ;
- traite l'ancien frontend comme reference de migration plutot que comme contrainte structurelle ;
- permet de migrer les ecrans seulement quand leurs contrats backend sont suffisamment stabilises.

Limites :
- demande une strategie explicite de migration ;
- impose de poser tres tot une couche contractuelle fiable entre backend et frontend ;
- interdit de compter sur l'ancien frontend comme fondation v2, sauf pour la continuite terrain a court terme.

Verdict :
- meilleur compromis entre vision cible et prudence brownfield.

### Comparative Analysis Matrix

| Option | Description | Alignement vision Peintre | Risque delivery v2 | Reutilisation existant | Compatibilite future edition / resize / dynamique | Verdict |
|--------|-------------|---------------------------|--------------------|------------------------|-----------------------------------------------|---------|
| A | Frontend existant comme fondation principale | Faible | Moyen en apparence, eleve en vrai | Elevee | Faible | Mauvais choix structurel |
| B | From scratch complet frontend + backend | Moyen | Tres eleve | Faible | Elevee | Trop risque |
| C | Backend brownfield pilote par contrats + `Peintre_nano` greenfield + migration progressive | Tres fort | Maitrisable | Bonne cote metier, sans package moteur separe | Tres forte | Meilleur choix |

### Selected Starter: Brownfield baseline + targeted frontend scaffold for `Peintre_nano`

**Rationale for Selection:**

Le bon choix n'est pas un starter externe de projet complet, mais :
- conserver le produit et le backend existants comme base brownfield ;
- autoriser des refontes selectives backend sur les flux, modeles et sync, tant qu'elles restent pilotees par une surface contractuelle stable ;
- creer un nouveau frontend v2 dans le depot, structure autour de `Peintre_nano` ;
- utiliser le frontend historique uniquement comme reference de migration des ecrans et comportements ;
- poser des le depart un socle compatible avec la suite : `CSS Grid`, templates, slots, widgets, flows simples, separation layout global / layout interne, et ouverture future vers variants, `container queries`, `subgrid`, editeur graphique et IA.

Le frontend v2 ne doit donc pas dependre directement des details internes de base de donnees ou de services instables. Il doit dependre d'une couche de contrats suffisamment claire :
- endpoints cibles ;
- DTOs / schemas de reponse ;
- contextes de rendu et permissions ;
- auth/session et regles de revalidation ;
- erreurs metier ;
- etats de sync utiles a l'UI ;
- pagination, filtres et recherche quand ils sont requis par le domaine ;
- idempotence et contraintes des actions sensibles ;
- uploads, exports et traitements asynchrones quand ils existent ;
- contrats `CREOS`.

La migration progressive des ecrans ne commence qu'apres pose de cette couche contractuelle minimale. Un domaine peut etre considere comme **suffisamment stable** pour migration lorsque :
- ses DTOs et erreurs sont explicitement nommes et coherents ;
- ses contextes et permissions utiles au rendu sont fixes a un niveau exploitable ;
- ses breaking changes sont rendus visibles et maitrisables ;
- le frontend peut generer ou consommer ses types et schemas sans dependre des details internes du backend.

Cela evite de reparer ou remodeler le frontend brownfield juste pour devoir le refaire ensuite.

**Initialization Command:**

```bash
npm create vite@latest peintre-nano -- --template react-ts
```

Commande a adapter a la structure cible du depot, idealement dans le dossier dedie `peintre-nano/` plutot qu'en nouveau projet autonome a la racine.
Ce bootstrap ne suffit pas a lui seul : la phase de scaffold doit aussi fixer explicitement l'alignement ou la divergence vis-a-vis des briques frontend existantes (`Mantine`, `Zustand`).

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- `TypeScript` + `React` pour le nouveau frontend v2 `Peintre_nano` ;
- conservation du backend `FastAPI` comme socle serveur/metier de reference.

**Styling Solution:**
- le starter ne decide pas la peau CSS finale ;
- la decision structurante est deja prise ailleurs : `CSS Grid` comme moteur de layout global de `Peintre_nano` ;
- le choix Tailwind / CSS Modules / autre reste une decision d'implementation, pas d'architecture.
- pour la phase de migration, une decision explicite doit etre prise avant reproduction massive des ecrans : soit reutiliser provisoirement `Mantine` comme kit de widgets/adaptation, soit definir un autre kit UI cible avec regles claires de transition.

**Build Tooling:**
- `Vite` reste le meilleur scaffold cible pour un frontend interne moderne ;
- tres bon alignement avec l'existant et faible friction pour un workspace `Peintre_nano`.

**Testing Framework:**
- le starter n'est pas suffisant a lui seul ;
- la cible doit rester coherente avec l'outillage deja present : `Vitest`, `Playwright`, tests backend Python, et futur pipeline de validation des contrats.

**Code Organization:**
- le nouveau frontend v2 doit vivre dans `peintre-nano/`, distinct du frontend brownfield ;
- les composants et ecrans historiques deviennent une source de migration, pas la fondation du runtime v2.
- l'usage de `Zustand` dans `Peintre_nano` ne doit pas etre presume par heritage : il doit etre soit repris explicitement pour certains besoins de runtime, soit remplace par une autre approche documentee.

**Development Experience:**
- demarrage rapide ;
- faible friction d'integration ;
- bonne compatibilite avec un frontend compose minimal en React/TypeScript ;
- meilleur compromis pour lancer `Peintre_nano` sans regenerer le produit complet.

### Decision Refinement

La decision de socle frontend/backend retenue est :
- `Recyclique` backend/API/donnees : **brownfield avec refontes selectives pilotees par contrats** ;
- `Peintre_nano` frontend v2 : **greenfield** ;
- frontend historique : **reference de migration** ;
- migration des ecrans : **progressive et post-contracts**, pas immediate.

### Transition Runtime and Coexistence

Pendant la transition, une coexistence temporaire des deux fronts peut etre necessaire, mais elle doit rester :
- explicite ;
- limitee dans le temps ;
- pilotee par routes, domaines ou feature flags clairement identifies.

Regles de transition :
- l'ancien frontend ne doit plus recevoir de nouveaux investissements structurants ;
- il ne sert qu'a la continuite terrain des zones non encore migrees ;
- `Peintre_nano` porte uniquement les routes ou domaines deja branches ;
- la logique metier critique doit converger vers les contrats backend, pas vers deux implementations UI rivales ;
- un domaine sort du frontend historique lorsqu'il est disponible dans `Peintre_nano` avec contrats stables, contexte correct et couverture de validation suffisante.

### Note

La bonne lecture implementation n'est pas "creer une nouvelle application complete", mais plutot :
- **Story 0 / scaffold** : creer ou structurer `peintre-nano/` comme frontend v2 a partir du socle `Vite` cible ;
- **stories suivantes** : etablir la couche contractuelle minimale des flows prioritaires ;
- prouver `Peintre_nano` sur un premier cas simple (`bandeau live`) ;
- puis migrer les premiers ecrans metier seulement quand leurs contrats backend sont suffisamment stables.

### Handoff to Step 4

Pour l'etape suivante, les decisions deja acquises sont :
- backend brownfield pilote par contrats ;
- `Peintre_nano` frontend v2 greenfield ;
- `Peintre_nano` comme socle UI integral de la v2 ;
- `CREOS` minimal documentaire ;
- `CSS Grid` comme moteur de layout global.

Restent a trancher plus finement dans les decisions architecturales :
- la strategie concrete de contrats `OpenAPI` / `CREOS` ;
- les regles de coexistence runtime et de sortie de l'ancien frontend ;
- la gouvernance de versionnement et des breaking changes ;
- les premiers domaines a verrouiller pour migration et preuve de chaine.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- `Recyclique` conserve `PostgreSQL` comme source de verite transactionnelle principale pour le metier, les contextes, l'historique, l'audit et les etats de synchronisation.
- `Redis` n'est pas une source de verite metier ; il reste un support auxiliaire (cache, coordination, acceleration technique eventuelle), tandis que les etats durables de sync, quarantaine et reprise restent tracables cote `Recyclique`.
- Le contrat d'interface entre backend et frontend repose sur deux surfaces distinctes et coordonnees :
  - `OpenAPI` pour les contrats backend/DTO/erreurs/actions ;
  - `CREOS` pour les manifests UI, slots, widgets, flows et etats declaratifs.
- Le frontend v2 `Peintre_nano` est construit en `React` + `TypeScript` + `Vite`, avec `CSS Grid` comme moteur de layout global.
- Les permissions, contextes, validations sensibles et decisions de securite restent sous autorite backend `Recyclique`.
- La migration d'un domaine UI n'est autorisee qu'apres stabilisation minimale de ses contrats backend et de ses contextes de rendu.

**Important Decisions (Shape Architecture):**
- Le backend brownfield peut etre refactore selectivement tant que les contrats exposes a `Peintre_nano` restent explicites, testables et maitrises.
- Le frontend historique reste deployable de maniere transitoire uniquement comme support de continuite terrain, jamais comme socle d'architecture cible.
- La coexistence v1/v2 doit etre bornee par routes/domaines/feature flags et par des criteres d'extinction explicites.
- Les schemas `CREOS` et les manifests supportes par la v2 sont versionnes dans le repo et valides en CI ; la base ne porte que des overrides scopes et tracables (activation, ordre, variantes, parametres autorises), jamais une seconde source de verite libre.
- `Mantine` et `Zustand` ne sont pas reconduits par inertie :
  - `Mantine` est autorise provisoirement comme couche de widgets/adaptation pour accelerer la migration des ecrans, mais aucun nouveau composant metier structurant ne doit dependre durablement de lui hors de cette couche de transition ;
  - `Zustand` ne doit etre utilise dans `Peintre_nano` que pour de l'etat UI ephemere ou runtime local ; il est exclu comme source de verite metier, permissions, contextes ou machine d'etat transverse des flows.
- La gouvernance des breaking changes doit etre explicite avant migration large : versionnement des contrats, visibilite des changements, et compatibilite minimale entre backend, `Peintre_nano` et modules.

**Deferred Decisions (Post-socle v2):**
- adoption ou non d'un nouveau design system complet remplacant `Mantine` ;
- `container queries`, `subgrid`, variants avances et auto-adaptation poussee ;
- editeur graphique de layout/flows ;
- composition assistee par IA (`Peintre_mini`) ;
- optimisation avancee du bundling, lazy-loading par module, et runtime enrichi.

### Data Architecture

- Base transactionnelle principale : `PostgreSQL`
  - Decision : conserver PostgreSQL comme base metier centrale pour `Recyclique`.
  - Rationale : continuite brownfield, robustesse transactionnelle, auditabilite, compatibilite avec SQLAlchemy/Alembic, bonne base pour flux financiers et matiere articules.
  - Version de reference d'implementation : ligne brownfield existante d'abord ; une montee vers `PostgreSQL 18.x` est une decision d'infrastructure separee, non prerequise au socle v2.

- ORM / migrations :
  - Decision : conserver `SQLAlchemy 2.x` et `Alembic`.
  - Pin brownfield actuel : `SQLAlchemy 2.0.23` dans le repo ; paysage stable recent situe : `2.0.48`.
  - Rationale : coherence brownfield, capacite de refonte selective, et faible cout de continuite.

- Modelisation de donnees :
  - Decision : autoriser la refonte selective des modeles et flux backend, mais stabiliser d'abord les DTOs et contrats consommes par `Peintre_nano`.
  - Rationale : eviter que le frontend v2 depende des details internes de table, colonnes ou services en cours de refactor.

- Sync / quarantaine / reprise :
  - Decision : les etats durables de synchronisation, quarantaine, resolution et audit vivent dans `Recyclique` persistant, avec un modele `at-least-once` et des handlers idempotents.
  - Detail : une outbox durable cote `PostgreSQL` porte les operations a synchroniser, leurs cles d'idempotence, leur etat (`a_reessayer`, `en_quarantaine`, `resolu`, `rejete`) et leur correlation inter-systemes ; `Redis` peut aider a la coordination technique mais n'est jamais l'autorite.
  - Rationale : la resilience metier et la tracabilite exigent une persistance explicable, rejouable et resistant aux relectures/doubles emissions.

- Settings / manifests :
  - Decision : les schemas `CREOS` et manifests supportes en v2 sont versionnes dans le repo et valides par CI ; la base ou la configuration runtime ne peut porter que des overrides scopes et traçables relies a un identifiant/revision de manifest.
  - Rationale : proteger la coherence `OpenAPI` / `CREOS` / runtime, la reproductibilite des deploiements et l'absence de double verite.

### Authentication & Security

- Autorite d'authentification / autorisation :
  - Decision : `Recyclique` reste l'autorite d'auth, permissions et contextes.
  - Rationale : coherence avec le PRD et impossibilite de deleguer la securite au seul frontend.

- Transport de session :
  - Decision : cible v2 par defaut = session web same-origin avec cookies securises `httpOnly`, rotation de session/refresh geree cote backend, et protection `CSRF` si des cookies sont utilises pour les mutations.
  - Rationale : meilleure compatibilite avec une coexistence old/new front sous meme origine et moindre exposition des secrets au runtime UI.

- Modele d'autorisation :
  - Decision : permissions additives calculees cote backend a partir de roles, groupes et contexte, avec cles techniques stables et labels UI non autoritatifs, isoles par site/perimetre.
  - Rationale : alignement PRD, simplicite de socle v2, labels UI jamais autorite de securite.

- Controle des actions sensibles :
  - Decision : toute action sensible est revalidee cote backend ; `Peintre_nano` peut masquer ou restreindre l'UI, mais ne decide jamais seul. Les mutations sensibles doivent porter une cle d'idempotence ou un identifiant de requete exploitable, et les actions step-up utilisent PIN/confirmation selon le domaine.
  - Rationale : l'affichage n'est pas une autorisation, et la protection doit couvrir a la fois rejeu, double soumission et validation humaine.

- PIN / validations sensibles :
  - Decision : conserver un modele de PIN distinct avec settings gouvernes cote super-admin et usages traces.
  - Rationale : alignement direct avec les invariants de securite du PRD.

### API & Communication Patterns

- Pattern d'API :
  - Decision : REST + `OpenAPI` comme contrat backend principal.
  - Rationale : brownfield existant, interop claire, codegen possible vers frontend.

- Contrat frontend :
  - Decision : generation de types et clients frontend a partir de `OpenAPI` par un chemin outille unique valide en CI.
  - Decision : l'application backend `recyclique` reste le writer canonique du schema `OpenAPI`, puis la generation publie l'artefact reviewable dans `contracts/openapi/generated/`, reference unique de CI et de codegen frontend.
  - Decision : le schema canonique de `ContextEnvelope` vit dans `OpenAPI` comme contrat backend versionne ; toute representation secondaire eventuelle doit en etre derivee, jamais redefinie parallelement.
  - Rationale : eviter la derive DTO "a la main" et rendre le drift contractuel visible.

- Contrat UI :
  - Decision : `CREOS` reste distinct d'`OpenAPI`, sans duplication de la verite metier ; les identifiants metier, permissions, enums et references utilises par `CREOS` doivent provenir ou etre derives d'une source contractuelle partagee, pas redefinis localement.
  - Decision : le mecanisme minimal retenu est un paquet d'artefacts generes partageant enums et identifiants stables depuis `OpenAPI`, puis references par `CREOS` via cles canoniques plutot que recopie locale.
  - Decision : la structure informationnelle commanditaire (arborescence des routes, navigation, pages disponibles, raccourcis structurels, organisation metier des affichages) est fournie par l'application commanditaire, ici `recyclique`, via des contrats versionnes ; `Peintre_nano` l'interprete mais n'en devient pas l'auteur metier.
  - Rationale : `OpenAPI` decrit l'API metier ; `CREOS` decrit la composition UI et ses structures declaratives.

- Contrat minimal de structure informationnelle commanditaire :
  - Decision : le socle v2 distingue quatre artefacts minimaux :
    - `NavigationManifest` pour l'arborescence, les routes, les entrees de navigation, l'ordre, la visibilite et les raccourcis structurels ;
    - `PageManifest` pour la composition declarative d'une route : template, zones, widgets, actions declaratives et flows simples ;
    - `ContextEnvelope` pour le contexte actif fourni par le backend : site, caisse, session, poste, role, groupe, permissions calculees et etats utiles a l'affichage ;
    - `UserRuntimePrefs` pour les preferences utilisateur non metier : densite, variantes secondaires, onboarding, raccourcis personnels, etat local d'affichage.
  - Decision : `NavigationManifest` et `PageManifest` relevent du commanditaire et sont versionnes comme contrats reviewables ; `ContextEnvelope` releve du backend via contrats de donnees ; `UserRuntimePrefs` peut etre enrichi cote `Peintre_nano`, sans devenir une source de verite metier.
  - Decision : par defaut, `UserRuntimePrefs` reste local a `Peintre_nano` (memoire runtime et persistance locale documentee) ; toute persistence cote backend exige un endpoint explicite dedie, hors `CREOS`, hors verite metier et hors calcul de permissions/navigation.
  - Decision : la hierarchie de verite est la suivante :
    - `OpenAPI` pour les donnees, permissions, actions et etats metier ;
    - `ContextEnvelope` pour le contexte actif ;
    - `NavigationManifest` pour la structure informationnelle ;
    - `PageManifest` pour la composition declarative d'un ecran ;
    - `UserRuntimePrefs` pour la personnalisation locale.
  - Rationale : garder l'esprit JARVOS et `CREOS` : structure explicite, contexte serveur autoritatif, composition declarative, personnalisation runtime sans magie metier embarquee dans le moteur.

- Erreurs / etats de sync :
  - Decision : standardiser les erreurs metier et les etats utiles a l'UI (`a_reessayer`, `en_quarantaine`, `resolu`, `rejete`, etc.) dans les contrats backend, avec codes stables, structure d'erreur unique et distinction claire entre semantique HTTP et semantique metier.
  - Rationale : permettre une UI defensive, explicable et coherente sans couplage fragile a des messages libres.

- Compatibilite et breaking changes :
  - Decision : toute evolution cassante des contrats doit etre explicitement signalee, versionnee et testee avant migration d'ecran ; la CI doit comparer les schemas exposes, signaler les drifts et bloquer les breaking changes non approuves.
  - Rationale : la migration progressive depend d'une stabilite mesurable des surfaces contractuelles.

### Frontend Architecture

- Frontend applicatif :
  - Decision : `Peintre_nano` est le frontend v2 en `React` + `TypeScript` + `Vite`.
  - Pin brownfield actuel : `React 18.2.x` dans le frontend historique ; paysage recent situe : `React 19.2.x`.
  - Note de transition : cette version recente sert de cible potentielle pour `Peintre_nano` et doit etre confirmee en Story 0 vis-a-vis du repo reel et de la compatibilite des briques de migration.
  - Rationale : continuite de stack, faible friction, bonne base pour `Peintre_nano`.

- Layout global :
  - Decision : `CSS Grid` obligatoire pour `Peintre_nano` et les templates de page.
  - Rationale : prerequis structurel pour templates, zones nommees, compositions futures et edition graphique.

- Kit UI de transition :
  - Decision provisoire : reutilisation de `Mantine 8.x` autorisee pendant la phase de migration si cela accelere la recopie des ecrans, mais sans le laisser dicter l'architecture de `Peintre_nano`.
  - Version de paysage verifiee : `Mantine 8.3.18` stable recente.
  - Rationale : reduire le cout de migration sans confondre kit de composants et socle architectural.

- State management :
  - Decision provisoire : pas de reconduction automatique de `Zustand` comme standard de `Peintre_nano` ; usage cible uniquement si besoin runtime identifie.
  - Version de paysage verifiee : `Zustand 5.0.12` stable recente.
  - Rationale : eviter d'heriter par inertie d'un modele de state global inapproprie au frontend compose.

- Coexistence old/new front :
  - Decision : coexistence temporaire explicite sous une meme origine logique, avec routage maitre cote frontend v2/proxy et bascule par routes/domaines/feature flags ; les routes servies comme v2 doivent passer par `Peintre_nano`.
  - Rationale : eviter a la fois le big bang, la duplication des sessions/cookies et la double maintenance illimitee.

- Rendu des widgets et registre :
  - Decision : tout widget enregistre dans `Peintre_nano` doit exposer un contrat verifiable et des props serialisables ; la composition interne complexe reste possible, mais n'est pas exposee comme verite de catalogue.
  - Rationale : proteger la compatibilite future de `CREOS`, de l'edition graphique et de la composition assistee.

- Routing frontend / manifests :
  - Decision : `Peintre_nano` reste l'autorite de resolution runtime finale des routes, layouts et activations d'affichage, mais la source de verite structurelle des routes et de la navigation vient du commanditaire via contrats versionnes.
  - Decision : les manifests peuvent declarer des routes candidates, layouts et raccourcis structurels, mais uniquement comme expression d'un contrat commanditaire ; `Peintre_nano` valide, fusionne et rejette les collisions sans redefinir seul la structure metier de navigation.
  - Decision : la resolution runtime n'a pas le droit de creer une route metier, une entree de navigation ou un raccourci structurel absents du contrat commanditaire ; elle applique seulement des regles deterministes documentees de validation, priorite, filtrage par contexte et rejet des doublons.
  - Rationale : eviter a la fois une double verite du routage et un couplage de la structure informationnelle au moteur d'affichage.

- Premier jalon UI :
  - Decision : prouver `Peintre_nano` avec `bandeau live` avant les gros flows.
  - Rationale : validation de la chaine modulaire complete a cout limite.

### Infrastructure & Deployment

- Topologie de deploiement :
  - Decision : conserver la separation logique `api` / `frontend`, avec possibilite temporaire d'un double front pendant la migration.
  - Rationale : coherence avec le brownfield reel et transition controlee.

- Nommage de la structure cible :
  - Decision : `peintre-nano/` designe a ce stade le frontend Recyclique v2 tout entier, tout en restant structure de facon extractible vers un futur repo dedie.
  - Rationale : garder un vocabulaire simple maintenant sans perdre l'extractibilite future.

- Plateforme cible :
  - Decision : `Debian` reste l'environnement officiel de reference.
  - Rationale : deja verrouille au PRD.

- Containers :
  - Decision : la coexistence peut impliquer un ancien frontend et `Peintre_nano` en parallele, mais cette dualite doit etre traitee comme une phase transitoire, pas comme une architecture permanente.
  - Rationale : reduire le risque sans institutionnaliser la dette.

- CI/CD :
  - Decision : la CI doit valider au minimum lint/tests, generation et diff `OpenAPI`, validation des schemas/manifests `CREOS`, et un smoke test de rendu de `Peintre_nano` sur les modules critiques.
  - Rationale : rendre la gouvernance contractuelle executable, pas seulement declarative.

- Observabilite :
  - Decision : logs structures, `correlation_id`, et mesures minimales de sante/sync sont obligatoires sur les flows critiques et la coexistence old/new front.
  - Rationale : la migration et la sync exigent une lecture operable des incidents et des parcours.

- Scalabilite :
  - Decision : le socle v2 vise d'abord la fiabilite et la clarte plutot que le scale horizontal aggressif ; toute optimisation d'echelle reste subordonnee a la stabilite contractuelle et terrain.
  - Rationale : alignement avec la priorite produit et evitement de premature optimisation.

- Rate limiting :
  - Decision : conserver un rate limiting cote backend sur les surfaces sensibles, aligne sur la continuite brownfield, avec ajustements ulterieurs selon les nouveaux flux exposes.
  - Rationale : la securite et l'exploitation ne doivent pas regresser pendant la transition.

### Decision Impact Analysis

**Implementation Sequence:**
1. Story 0 : creer `peintre-nano/` et son runtime minimal, en parallele d'un premier contrat vertical stub sur un domaine simple.
2. Stabiliser les premiers contrats backend reels sur les domaines prioritaires.
3. Poser le niveau minimal de gouvernance `OpenAPI` / `CREOS` requis pour un slice vertical valide en CI.
4. Implementer et documenter le mode de coexistence runtime ancien front / `Peintre_nano` (proxy, routes, flags, criteres d'extinction).
5. Prouver `bandeau live`.
6. Migrer ensuite les premiers domaines critiques (`cashflow`, `reception`) lorsque leurs contrats sont suffisamment stables.

**Cross-Component Dependencies:**
- Les choix backend influencent le frontend via les contrats, pas via les tables internes.
- Les choix UI (`CSS Grid`, `Peintre_nano`, slots, flows) influencent la migration, pas les invariants metier ni la structure informationnelle commanditaire.
- La gouvernance des contrats conditionne la vitesse de migration.
- La strategie de coexistence conditionne la securite de livraison.

### Handoff to Step 5

Objectif du Step 5 : transformer ces decisions en patterns d'implementation et regles de coherence exploitables par plusieurs agents sans divergence.

Pour l'etape suivante, les decisions deja acquises sont :
- `PostgreSQL` comme source de verite transactionnelle ;
- outbox durable et sync `at-least-once` avec handlers idempotents ;
- `OpenAPI` + `CREOS` comme surfaces contractuelles distinctes et gouvernees ;
- `Peintre_nano` `React` + `TypeScript` + `Vite` avec `CSS Grid` ;
- coexistence old/new front sous controle de `Peintre_nano`/proxy et extinction progressive de l'ancien frontend.

Restent a transformer en patterns d'implementation :
- le profil de generation des clients/types `OpenAPI` ;
- la forme concrete des manifests `CREOS` et de leurs overrides runtime ;
- le pattern de routing/merge des routes modules ;
- les patterns de gestion d'etat UI local vs flow state machine ;
- les conventions de validation CI et de smoke tests de `Peintre_nano` ;
- les conventions de nommage multi-agents (API, fichiers, manifests, routes) ;
- les formats transverses a figer (`dates JSON`, structures d'erreur, organisation des tests) ;
- les invariants d'idempotence et de cle de requete sur les mutations sensibles ;
- l'usage obligatoire de `correlation_id` et des champs minimaux d'observabilite sur les flux critiques.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
10 zones ou plusieurs agents pourraient diverger et produire du code incompatible :
- nommage API / DTO / routes ;
- frontiere `OpenAPI` / `CREOS` ;
- fusion des routes coeur / modules ;
- stockage et overrides des manifests ;
- contrats de widgets et props serialisables ;
- etat UI local vs etat metier vs etat de flow ;
- formats d'erreur, dates et etats de sync ;
- idempotence des mutations sensibles ;
- emplacement des tests et type de validation attendu ;
- coexistence old front / `Peintre_nano`.

### Naming Patterns

**Database Naming Conventions:**
- Nouvelles tables et nouvelles colonnes en `snake_case`.
- Cle primaire standard pour les nouvelles entites : `id`.
- Cles etrangeres nouvelles : `{entity}_id`.
- Classes ORM en `PascalCase`, objets SQL en `snake_case`.
- Index et contraintes suivent des prefixes deterministes :
  - `idx_{table}_{column}`
  - `uq_{table}_{column}`
  - `fk_{table}_{ref_table}`
- Les ecarts legacy brownfield sont toleres s'ils sont documentes et encapsules ; on n'ouvre pas de chantier de renommage SQL global uniquement pour "nettoyer".

**API Naming Conventions:**
- Nouveaux endpoints v2 en noms pluriels : `/users`, `/cash-sessions`, `/sync-events`.
- Segments d'URL en `kebab-case`.
- Parametres de route semantiques : `{user_id}`, `{cash_session_id}`, pas `{id}` si ambigu.
- Query params en `snake_case`.
- Headers techniques documentes explicitement ; pas de headers ad hoc inventes par feature.
- Les paths historiques brownfield sont geles jusqu'a migration explicite ; on ne cree pas de double convention implicite en renommant des routes existantes sans strategie de transition/versionnement.

**Code Naming Conventions:**
- Composants React : `PascalCase`
- Fichiers composants React : `PascalCase.tsx`
- Fichiers TS non composants : `kebab-case.ts`
- Modules Python : `snake_case.py`
- Fonctions/variables TS : `camelCase`
- Fonctions/variables Python : `snake_case`
- IDs techniques (`slot`, `widget`, `event`, `manifest`, `route key`) en minuscules stables ; les labels d'affichage ne servent jamais d'identifiants.

### Structure Patterns

**Project Organization:**
- Le backend reste organise par domaine et couches contractuelles, pas par dossiers "misc" ou "utils" attrape-tout.
- `Peintre_nano` est a ce stade le frontend v2 lui-meme ; l'extraction future du moteur restera possible mais n'impose pas encore une separation physique `packages/` / `apps/`.
- Le frontend historique est une source de migration, pas une cible structurelle.
- Les clients/types `OpenAPI`, schemas `CREOS`, manifests et overrides runtime vivent dans des emplacements dedies et reviewables.
- Les artefacts generes vivent dans des dossiers explicites (par exemple `generated/` ou `contracts/generated/`) et ne sont jamais modifies a la main.
- `Peintre_nano` garde un registre central de routes modules ; les manifests peuvent proposer des routes, mais la fusion et l'activation passent toujours par ce registre.
- Mapping des quatre artefacts minimaux :
  - `NavigationManifest` et `PageManifest` = contrats commanditaires reviewables ;
  - `ContextEnvelope` = contrat backend de contexte actif ;
  - `UserRuntimePrefs` = preferences runtime locales non autoritatives ;
  - aucun de ces artefacts ne doit etre remplace par un state global frontend ad hoc.

**File Structure Patterns:**
- Tests unitaires co-localises quand ils valident une logique locale pure.
- Tests de contrats, integration et e2e dans des emplacements dedies par couche.
- Les overrides runtime ne doivent jamais masquer silencieusement un manifest versionne.
- Les assets et configurations ont un proprietaire explicite (`Peintre_nano`, module, domaine), jamais un depot global sans responsabilite.
- Les composants de transition `Mantine` restent confines a une couche d'adaptation ou de migration ; ils ne deviennent pas la structure racine de `Peintre_nano`.

### Format Patterns

**API Response Formats:**
- Les succes suivent des contrats explicites et stables par endpoint ; pas de wrappers improvises differents selon les dossiers.
- Les erreurs utilisent une enveloppe stable contenant au minimum :
  - `code`
  - `detail`
  - `retryable`
  - `state`
  - `correlation_id`
- Les etats de sync/quarantaine sont enumes et non derives de texte libre.
- Semantique HTTP et semantique metier doivent etre coherentes mais distinctes.
- Pour les endpoints de flux critiques, `correlation_id` et `state` sont obligatoires, meme si `state` vaut explicitement `not_applicable`.
- Le mapping minimal attendu est stable :
  - validation metier -> `422`
  - auth/permission -> `401/403`
  - conflit de mutation / idempotence -> `409`
  - echec externe retryable -> `502/503/504`
  - quarantaine / blocage metier -> statut HTTP documente + `state` metier explicite
- Si `retryable = true`, le contrat doit indiquer comment reessayer (`Retry-After` ou champ equivalent documente).

**Data Exchange Formats:**
- JSON en `snake_case` cote backend et contrats publics, sauf couche de traduction explicite.
- Les schemas `OpenAPI` exposent les proprietes en `snake_case`.
- Les types/clients generes pour le frontend conservent cette forme ou passent par un mapper unique documente ; toute transformation manuelle dispersee est interdite.
- Dates/heures en ISO 8601.
- Booleens en vrais `true/false`.
- Nullabilite explicite dans les schemas.
- Un endpoint ne change pas librement entre objet singleton et tableau selon le contexte.

### Communication Patterns

**Event System Patterns:**
- Les couches sont distinguees explicitement :
  - evenements de domaine et de sync persistants ;
  - evenements/logs d'observabilite ;
  - evenements UI/runtime internes a `Peintre_nano`.
- Les evenements nommes de facon stable et semantique, en minuscules scopees.
- Chaque payload d'evenement critique contient au minimum :
  - type/version
  - identifiant(s) d'entite ou d'operation
  - identifiants de contexte utiles
  - `correlation_id`
- Le modele d'execution async est `at-least-once` ; les handlers doivent etre idempotents.
- `CREOS`, backend et sync ne doivent pas inventer trois vocabulaires differents pour le meme fait metier.
- La propagation HTTP accepte et propage un header canonique `X-Correlation-ID`; ce header est rejoue dans les logs et les erreurs des flux critiques.

**State Management Patterns:**
- La verite metier vit dans les contrats backend, pas dans un store frontend.
- L'etat global de `Peintre_nano` reste borne a des besoins runtime UI.
- L'etat d'un flow est distinct de l'etat UI generique.
- `Zustand` est autorise pour etat UI ephemere/local, interdit comme autorite sur permissions, contextes, sync ou decisions metier.
- Les flows suivent d'abord des `FlowDefinition` declaratives `CREOS` interpretees par `Peintre_nano` ; si un moteur local est necessaire, il doit etre unique par frontend et ne pas creer une seconde verite du flow.
- `UserRuntimePrefs` peut vivre dans un store/frontend local ou une persistance locale documentee ; `ContextEnvelope`, navigation structurelle et permissions n'y vivent jamais comme source de verite.

### Process Patterns

**Error Handling Patterns:**
- Logs techniques et messages utilisateur sont deux sorties distinctes.
- Chaque mutation critique doit distinguer :
  - echec de validation
  - echec d'autorisation
  - echec externe retryable
  - etat bloque/quarantaine
- Un probleme de contrat ou de manifest doit echouer visiblement, pas degrader en comportement implicite.
- Les mutations sensibles utilisent un header `Idempotency-Key` documente ; un identifiant client de requete complementaire peut etre ajoute pour la trace, mais ne remplace pas la cle d'idempotence.

**Loading State Patterns:**
- Les flags de loading sont nommes par intention : `isLoading`, `isSubmitting`, `isSyncing`, etc.
- Local par defaut ; global uniquement si coordination au niveau de `Peintre_nano` est requise.
- Les operations longues exposent un statut explicite, pas seulement un spinner.
- Les etats de sync affiches doivent provenir des contrats backend, jamais d'une inference frontend.

### Enforcement Guidelines

**All AI Agents MUST:**
- Traiter `OpenAPI` comme autorite des contrats backend et `CREOS` comme autorite des contrats de composition UI.
- Eviter toute seconde source de verite pour manifests, routes, permissions ou etats de sync.
- Utiliser des cles d'idempotence ou identifiants de requete sur les mutations sensibles.
- Propager `correlation_id` sur les flows critiques.
- Garder la verite metier hors du state frontend.
- Ajouter ou mettre a jour les tests au bon niveau de risque : unitaire, contrat, integration ou e2e.
- Ne pas reinvestir structurellement dans le frontend historique comme cible v2.
- Ne pas introduire de nouveaux composants metier racine dependants durablement de `Mantine` hors de la couche de migration.

**Pattern Enforcement:**
- La CI valide au minimum :
  - generation/diff `OpenAPI`
  - validation des schemas/manifests `CREOS`
  - smoke test de rendu de `Peintre_nano` pour les modules critiques
  - visibilite des drifts contractuels
- Le chemin de generation `OpenAPI` doit etre unique, versionne et non edite a la main ; tout drift breaking non approuve echoue en CI.
- Le merge des routes modules passe par un registre unique de `Peintre_nano` ; les routes coeur ont priorite, et toute collision entre modules ou avec le coeur echoue par defaut a la validation tant qu'un arbitrage explicite n'a pas ete documente.
- La resolution runtime ne peut ni creer une route metier absente du contrat commanditaire, ni rendre visible une entree de navigation interdite par le contexte/les permissions ; l'affichage effectif est l'intersection contrat commanditaire x contexte serveur.
- Les violations de patterns sont traitees comme violations d'architecture, pas comme preferences de style.
- Source primaire des patterns : ce document d'architecture. Les regles derivees ne peuvent que le specialiser, jamais le contredire.
- Toute exception ou evolution durable doit etre documentee ici puis relayee dans les regles derivees du projet ; une PR ne doit pas "creer" sa propre convention locale.

### Pattern Examples

**Good Examples:**
- Un endpoint expose `cash_session_id`, `sync_state` et `correlation_id` dans un schema documente, puis `Peintre_nano` consomme des types generes depuis `OpenAPI`.
- Un manifest `CREOS` reference un `widget_type` stable et un `route_key` sans redefinir localement les enums metier du backend.
- Une mutation sensible porte une cle d'idempotence et retourne une erreur typee retryable ou un etat de quarantaine.
- Un widget enregistre dans `Peintre_nano` expose un contrat serialisable verifiable avant activation.
- Un composant de migration vit sous une couche adapteur UI clairement identifiee, tandis que la racine `Peintre_nano` reste independante du kit `Mantine`.
- Un ecran affiche `isSyncing` a partir d'un etat backend documente, pas a partir d'un spinner local sans statut metier.

**Anti-Patterns:**
- Ecrire a la main des DTOs frontend qui divergent du contrat `OpenAPI`.
- Laisser un manifest transporter une verite metier locale ou des permissions redefinies.
- Enregistrer un widget avec des props non serialisables ou sans schema exploitable.
- Stocker durablement une decision metier ou une autorisation seulement dans un store frontend.
- Laisser deux systemes de routes revendiquer silencieusement le meme path.
- Continuer a faire des investissements structurants dans l'ancien frontend "en attendant".
- Multiplier des mappers `snake_case` -> `camelCase` locaux selon les composants.
- Laisser un flow critique fonctionner sur une combinaison de flags UI sans definition de flow explicite.

### Step 6 Status

Etape 6 terminee : la structure cible est definie ci-dessous. La suite du workflow BMAD releve maintenant de la validation finale et de la preparation des epics/stories.

## Project Structure & Boundaries

### Structural Decision Update

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

### Complete Project Directory Structure
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
│   │   │   ├── mantine-adapters/
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

### Architectural Boundaries

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
- `recyclique/` expose la surface backend versionnee via `OpenAPI`.
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
- `contracts/openapi/generated/` est la reference CI des artefacts generes ; `peintre-nano/src/generated/` n'est qu'une copie/consommation derivee alimentee par la chaine d'outillage.
- Les contrats de navigation et de structure informationnelle font partie des artefacts commanditaires reviewables ; `Peintre_nano` peut les interpreter et les completer uniquement par des etats runtime non metier (preferences UI, cache de presentation, etats de chargement, onboarding), mais pas en redefinir seul le sens metier.
- Le `ContextEnvelope` est fourni par `recyclique` via les contrats de donnees backend ; les preferences purement runtime utilisateur restent cote `Peintre_nano` dans un espace non autoritatif.
- Le schema canonique de `ContextEnvelope` releve de `OpenAPI` ; `UserRuntimePrefs` reste local par defaut, sauf endpoint backend explicite dedie et non autoritatif sur le metier.

### Requirements to Structure Mapping

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

### Integration Points

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

### File Organization Patterns

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

### Development Workflow Integration

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

### Handoff to Epics and Stories

Le document est suffisamment stable pour preparer les epics/stories si les premiers lots couvrent explicitement :
- la chaine canonique `recyclique -> OpenAPI -> contracts/openapi/generated -> codegen frontend` ;
- le mecanisme de partage d'identifiants/enums entre `OpenAPI` et `CREOS` ;
- le contrat commanditaire de navigation / arborescence / raccourcis structurels fourni a `Peintre_nano` ;
- la forme minimale des quatre artefacts `NavigationManifest` / `PageManifest` / `ContextEnvelope` / `UserRuntimePrefs` ;
- la spec detaillee du profil minimal dans `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md` ;
- la spec de mapping metier `Recyclique` <-> `Paheko` pour sync, reconciliation et reprise ;
- le slice vertical initial `bandeau live`, puis `cashflow` et `reception`.

Risques residuels a transformer en stories :
- verification du niveau exact de refactor backend acceptable par domaine brownfield ;
- definition operationnelle des overrides runtime de manifests ;
- criteres d'extinction definitifs de `frontend-legacy`.

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**
- Les choix backend brownfield, frontend `Peintre_nano` greenfield, gouvernance `OpenAPI` + `CREOS`, et integration `Paheko` API-first sont compatibles entre eux.
- Les technologies retenues (`FastAPI`, `SQLAlchemy`, `PostgreSQL`, `Redis`, `React`, `TypeScript`, `Vite`) restent coherentes avec le brownfield observe et la cible v2.
- Aucun conflit majeur non resolu n'a ete detecte entre decisions d'infrastructure, de contrats, de sync, de securite et de structure projet.

**Pattern Consistency:**
- Les patterns d'implementation soutiennent correctement les decisions : nommage, erreurs, `correlation_id`, idempotence, gouvernance des contrats, gestion des manifests et registre de routes.
- Les exemples et anti-patterns couvrent les principaux points de divergence possibles entre agents.
- Les regles d'enforcement CI rendent les patterns executables, pas seulement declaratifs.

**Structure Alignment:**
- La structure `peintre-nano/`, `recyclique/`, `contracts/`, `infra/` et `tests/` supporte les frontieres architecturales annoncees.
- Les points d'integration (`Paheko`, `HelloAsso`, email), les frontieres data, et le flux `recyclique -> contracts -> peintre-nano -> recyclique -> Paheko` sont suffisamment explicites pour guider l'implementation.
- Les quelques nuances de vocabulaire restantes relevent de la redaction, pas d'une contradiction architecturale.

### Requirements Coverage Validation

**Epic / Feature Coverage:**
- En l'absence d'epics detaillees dans ce document, les fonctionnalites prioritaires sont bien couvertes par les decisions et le mapping structurel : `bandeau live`, `cashflow`, `reception`, `eco-organismes`, `adherents`, `admin-config`, sync `Paheko`.

**Functional Requirements Coverage:**
- Chaque exigence fonctionnelle majeure trouve un support architectural explicite dans les sections decisions, structure, patterns ou integration points.
- Les exigences transverses de multi-contextes, permissions, reprise/sync et coexistence old/new front sont traitees par des decisions dediees.

**Non-Functional Requirements Coverage:**
- Les exigences de fiabilite terrain, justesse comptable, securite, observabilite, resilience, performance minimale, installabilite `Debian` et ouverture open source sont adressees architecturalement.
- Les exigences de traçabilite, rejeu et audit sont prises en charge par `Recyclique`, l'outbox durable et les patterns d'observabilite.

### Implementation Readiness Validation

**Decision Completeness:**
- Les decisions critiques sont documentees a un niveau suffisant pour lancer les stories de socle et les premiers slices verticaux.
- Les versions et pins utiles sont donnes quand ils eclairent la transition brownfield sans surfiger trop tot les choix d'implementation.

**Structure Completeness:**
- L'arborescence cible est assez precise pour orienter plusieurs agents sans inventer les frontieres principales.
- Les zones encore a produire sont explicitement nommees comme stories ou dependances structurantes, et non laissees implicites.
- La source de verite des quatre artefacts minimaux est maintenant explicitee ; le profil minimal et les exemples vivent dans `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md`, tandis que les schemas canoniques et validations executables restent a produire en implementation.

**Pattern Completeness:**
- Les points de conflit inter-agents sont identifies.
- Les conventions de nommage, formats, communication et process sont suffisamment detaillees pour une implementation coherente.

### Gap Analysis Results

**Critical Gaps:**
- Aucun gap critique bloquant n'a ete detecte a ce stade pour poursuivre vers les epics/stories.

**Important Gaps:**
- Les premiers lots devront explicitement couvrir la chaine canonique `recyclique -> OpenAPI -> contracts/openapi/generated -> codegen frontend`.
- Le mecanisme de partage des enums / identifiants entre `OpenAPI` et `CREOS` devra etre concretise dans les stories de socle.
- La spec de mapping metier `Recyclique` <-> `Paheko` devra etre produite comme livrable explicite de preparation implementation.
- La mise en oeuvre minimale des quatre artefacts `NavigationManifest` / `PageManifest` / `ContextEnvelope` / `UserRuntimePrefs` devra etre couverte par les stories de socle.
- La spec compagnon `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md` fixe deja le profil minimal ; il reste a le traduire en schemas canoniques et validations executables.

**Nice-to-Have Gaps:**
- Harmonisation documentaire future de quelques formulations heritagees des steps precedents.
- Precision ulterieure des scripts/outils exacts de codegen et des criteres d'extinction de `frontend-legacy`.

### Validation Issues Addressed

- Les contradictions initiales entre moteur/package/shell separe et `Peintre_nano` frontend unique ont ete resolues.
- La source canonique des manifests `CREOS`, la chaine `OpenAPI`, la place de `Paheko` et les frontieres data/API ont ete clarifiees pendant les revisions precedentes.
- La formalisation du contrat commanditaire de structure informationnelle charge par `Peintre_nano` est maintenant explicite dans l'architecture.
- Aucun probleme critique ouvert ne subsiste apres cette validation.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** high
- Reserve : ce niveau de confiance vaut pour l'architecture ; la phase implementation doit encore traduire la spec compagnon en schemas canoniques et validations executables sur un slice `bandeau live`.

**Key Strengths:**
- separation claire des autorites `Recyclique` / `Paheko` / `Peintre_nano` ;
- gouvernance contractuelle explicite `OpenAPI` / `CREOS` ;
- patterns anti-derive multi-agents solides ;
- structure cible suffisamment precise pour lancer la suite BMAD.

**Areas for Future Enhancement:**
- detail operationnel des stories de socle contrats / sync / contextes ;
- schemas canoniques et validation executable de `NavigationManifest` / `PageManifest` / `ContextEnvelope` / `UserRuntimePrefs` a partir de la spec compagnon ;
- formalisation du mapping metier `Paheko` ;
- criteres definitifs de sortie du frontend legacy.

### Implementation Handoff

**AI Agent Guidelines:**

- Suivre les decisions et patterns de ce document comme source d'architecture.
- Respecter strictement les frontieres `recyclique` / `peintre-nano` / `contracts/` / integrations externes.
- Ne pas introduire de seconde source de verite pour contrats, routes, manifests ou etats de sync.

**First Implementation Priority:**
- Story 0 : poser `peintre-nano/`, s'appuyer sur `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md` pour implementer la version minimale des artefacts `NavigationManifest` / `PageManifest` / `ContextEnvelope` / `UserRuntimePrefs`, puis prouver un premier slice vertical contractuel avec `bandeau live` avant `cashflow` et `reception`.

## Architecture Workflow Completion

Nous avons maintenant un document d'architecture complet, valide et exploitable pour `JARVOS_recyclique` v2.

Le travail accompli dans ce workflow couvre :
- le cadrage du contexte, des contraintes et des exigences critiques ;
- les decisions d'architecture coeur pour `Recyclique`, `Peintre_nano`, `Paheko`, `OpenAPI` et `CREOS` ;
- les patterns d'implementation et de gouvernance anti-derive pour plusieurs agents ;
- la structure cible du projet et les frontieres de responsabilite ;
- la validation finale de coherence et de readiness implementation.

Le document peut maintenant servir de source de verite technique pour la suite de la phase build.
