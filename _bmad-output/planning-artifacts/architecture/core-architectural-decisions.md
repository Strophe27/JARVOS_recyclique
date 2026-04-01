# Core Architectural Decisions

## Decision Priority Analysis

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
- Stack CSS / composants riches `Peintre_nano` : decision **fermee** (**ADR P1**, `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`) — **CSS Modules** pour le scoping, **design tokens** en variables CSS dans `tokens.css`, **Mantine v8** comme bibliotheque de composants (theming aligne sur les tokens) ; **interdits** : Tailwind, CSS-in-JS runtime, fichier utilitaires global, valeurs magiques hors tokens. Mantine est integree au catalogue ; le DSL `CREOS` ne nomme pas Mantine. La migration brownfield passe par une couche d'adaptation (`migration/mantine-adapters/`) ; aucun composant metier racine ne depend durablement de Mantine hors de cette couche.
- `Zustand` : uniquement pour etat UI ephemere ou runtime local ; exclu comme source de verite metier, permissions, contextes ou machine d'etat transverse des flows (voir aussi section Frontend).
- La gouvernance des breaking changes doit etre explicite avant migration large : versionnement des contrats, visibilite des changements, et compatibilite minimale entre backend, `Peintre_nano` et modules.

**Deferred Decisions (Post-socle v2):**
- evaluation eventuelle d'un design system complet remplacant ou encapsulant differemment `Mantine` une fois le socle stabilise (Mantine v8 reste le choix fige pour la phase courante — ADR P1) ;
- `container queries`, `subgrid`, variants avances et auto-adaptation poussee ;
- editeur graphique de layout/flows ;
- composition assistee par IA (`Peintre_mini`) ;
- optimisation avancee du bundling, lazy-loading par module, et runtime enrichi.

## Data Architecture

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
  - Decision **P2 (ADR)** : la configuration admin (modules actifs/inactifs, ordre de blocs, variantes simples, feature toggles dynamiques) est stockee en **PostgreSQL** (table dediee pour surcharges) ; defaults dans les manifests build ; pas de fichier JSON sur disque en production pour cette config dynamique ; traçabilite auteur/date. Voir `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`.
  - Rationale : proteger la coherence `OpenAPI` / `CREOS` / runtime, la reproductibilite des deploiements et l'absence de double verite.

## Authentication & Security

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

## API & Communication Patterns

- Pattern d'API :
  - Decision : REST + `OpenAPI` comme contrat backend principal.
  - Rationale : brownfield existant, interop claire, codegen possible vers frontend.

- Contrat frontend :
  - Decision : generation de types et clients frontend a partir de `OpenAPI` par un chemin outille unique valide en CI.
  - Decision : **Chaine OpenAPI unique (pas de double edition manuelle)** — ordre normatif :
    1. Le code `recyclique` (FastAPI + outillage) est la **seule** source executable de verite des operations.
    2. La CI genere / exporte l'artefact dans `contracts/openapi/generated/` ; c'est la **reference de diff** et de non-regression (comparaison entre commits).
    3. `contracts/openapi/recyclique-api.yaml` est le **fichier reviewable** pour humains, outils et liens documentaires : il doit etre **produit par le meme pipeline** (copie ou re-export du meme snapshot que `generated/`, au choix d'outillage documente) — **interdit** de le maintenir a la main en parallele du code comme seconde definition des endpoints.
    4. Le codegen `peintre-nano` consomme **exactement** ce snapshot (yaml reviewable ou chemin `generated/` explicite dans le script de build, un seul chemin par repo documente dans Epic 10 / CI).
  - Decision : chaque operation expose un `operationId` **stable**, reference par les manifests CREOS via `data_contract.operation_id` — voir `project-structure-boundaries.md` (Piste A/B) et `navigation-structure-contract.md`.
  - Decision : le schema canonique de `ContextEnvelope` vit dans `OpenAPI` comme contrat backend versionne ; toute representation secondaire eventuelle doit en etre derivee, jamais redefinie parallelement.
  - Decision (securite / donnees perimees) : le blocage UI lorsque `data_contract.critical: true` et donnees **stale** est **necessaire mais non suffisant** ; les **mutations sensibles** (paiement, cloture, ecritures comptables, actions irreversibles) doivent etre **revalidees cote `recyclique`** avec contexte / jeton / horodatage autoritatif : le backend **refuse** la mutation si le contexte est incoherent, perime ou non revalidable, **independamment** de l'etat affiche par `Peintre_nano`.
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

## Frontend Architecture

- Frontend applicatif :
  - Decision : `Peintre_nano` est le frontend v2 en `React` + `TypeScript` + `Vite`.
  - Pin brownfield actuel : `React 18.2.x` dans le frontend historique ; paysage recent situe : `React 19.2.x`.
  - Note de transition : cette version recente sert de cible potentielle pour `Peintre_nano` et doit etre confirmee en Story 0 vis-a-vis du repo reel et de la compatibilite des briques de migration.
  - Rationale : continuite de stack, faible friction, bonne base pour `Peintre_nano`.

- Layout global :
  - Decision : `CSS Grid` obligatoire pour `Peintre_nano` et les templates de page.
  - Rationale : prerequis structurel pour templates, zones nommees, compositions futures et edition graphique.

- Kit UI `Peintre_nano` (**ADR P1 — fermee**) :
  - `Mantine 8.x` comme bibliotheque de composants integree au catalogue ; point d'entree migration via `migration/mantine-adapters/` ; le cœur de composition (shell, registre, slots, `FlowRenderer`) reste independant du kit.
  - Version de paysage verifiee : `Mantine 8.3.18` stable recente.
  - Rationale : ADR P1 ; pas de Tailwind, pas de CSS-in-JS runtime, tokens dans `tokens.css`.

- State management :
  - `Zustand` : pas d'imposition par heritage ; usage uniquement si besoin runtime identifie, limite a l'etat UI ephemere/local (AR26 / epics).
  - Version de paysage verifiee : `Zustand 5.0.12` stable recente.
  - Rationale : eviter un state global inapproprie au frontend compose.

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

- Flows declaratives (`CREOS`) :
  - Decision : les parcours decrits par les `FlowDefinition` dans les manifests sont interpretes au runtime par le composant **`FlowRenderer`** au sein de `Peintre_nano` (meme nom que le PRD SS8 et le concept `references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md`).
  - Rationale : aligner vocabulaire architecture, PRD, vision et notes `references/peintre/` sans ambiguite sur le consommateur runtime des definitions declaratives.

## Infrastructure & Deployment

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

## Decision Impact Analysis

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

## Handoff to Step 5

Objectif du Step 5 : transformer ces decisions en patterns d'implementation et regles de coherence exploitables par plusieurs agents sans divergence.

Pour l'etape suivante, les decisions deja acquises sont :
- `PostgreSQL` comme source de verite transactionnelle ;
- outbox durable et sync `at-least-once` avec handlers idempotents ;
- `OpenAPI` + `CREOS` comme surfaces contractuelles distinctes et gouvernees ;
- `Peintre_nano` `React` + `TypeScript` + `Vite` avec `CSS Grid` ;
- **P1/P2 Peintre** : stack CSS (CSS Modules + `tokens.css` + Mantine v8) et surcharges admin en PostgreSQL — ADR `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` ;
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
