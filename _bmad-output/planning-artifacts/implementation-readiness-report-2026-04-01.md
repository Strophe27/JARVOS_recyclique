---
reportVersion: "1.1.0"
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
readinessRefreshNote: "Suite au choix [C] utilisateur — revalidation apres correctifs de cap (correct courses BMAD) et epics/stories a jour (2026-04-01)."
filesIncluded:
  prd:
    - _bmad-output/planning-artifacts/prd.md
  architecture:
    - _bmad-output/planning-artifacts/architecture/index.md
    - _bmad-output/planning-artifacts/architecture/core-architectural-decisions.md
    - _bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md
    - _bmad-output/planning-artifacts/architecture/navigation-structure-contract.md
    - _bmad-output/planning-artifacts/architecture/project-context-analysis.md
    - _bmad-output/planning-artifacts/architecture/project-structure-boundaries.md
    - _bmad-output/planning-artifacts/architecture/starter-template-evaluation.md
    - _bmad-output/planning-artifacts/architecture/architecture-validation-results.md
    - _bmad-output/planning-artifacts/architecture/architecture-workflow-completion.md
  epics:
    - _bmad-output/planning-artifacts/epics.md
  ux:
    - UX-DR1 a UX-DR16 dans epics.md ; pas de livrable UX séparé sous planning-artifacts
---

# Implementation Readiness Assessment Report

**Date:** 2026-04-01
**Project:** JARVOS_recyclique
**Version du rapport :** 1.1.0 (post-QA `qa-agent`, pipeline Full)

**Définition unique du statut READY (à appliquer partout dans ce document) :** **READY** signifie que les **artefacts de planification** (PRD actif, architecture shardée sous `planning-artifacts/architecture/`, `epics.md` avec stories et cartes de couverture) sont **suffisamment alignés** pour **démarrer l'exécution** des premières stories du sequencing BMAD. **Exclut explicitement :** code déjà en production, **go / no-go opérationnel** global (CI, déploiement, preuves terrain), et la **fermeture intégrale** des points PRD §16 **avant** le fil des stories — ces éléments sont des **jalons d'exécution** suivis dans le backlog (Epic 1, 8, 10, etc.).

Les sections `##` ci-dessous sont numérotées **Étape 1 à 6** pour correspondre au `stepsCompleted` du frontmatter.

## Étape 1 — Document Discovery

### Documents retenus pour l'évaluation

#### PRD
- `_bmad-output/planning-artifacts/prd.md`

#### Architecture
- **Source de vérité :** uniquement le dossier shardé `_bmad-output/planning-artifacts/architecture/` (fichiers listés dans le frontmatter ci-dessus).
- **`archive/architecture.md` :** archive historique — **pas** une variante concurrente du dossier `architecture/` ; pas de doublon à arbitrer pour la readiness.

#### Epics et Stories
- `_bmad-output/planning-artifacts/epics.md` inclut la carte des epics, les stories numérotées (ex. Story 1.1 …) avec critères d'acceptation, et les cartes de couverture FR/NFR/AR/UX.

#### UX
- Pas de fichier `*ux*.md` dédié sous `planning-artifacts`.
- Exigences **UX-DR1 à UX-DR16** et **UX Coverage Map** dans `epics.md` ; cohérence avec PRD §4–§10 et architecture (navigation, `ContextEnvelope`, ADR P1/P2).

### Points de clarification
- Architecture active = dossier `architecture/` seul ; archive exclue par convention.
- Deux **correctifs de cap** (*correct courses* BMAD) et `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-01.md` ont mis à jour le cadrage (Piste A/B, `data_contract`, ADR P1/P2) — cette passe readiness intègre ces artefacts.

## Étape 2 — PRD Analysis

### Source et méthode
- **`prd.md`** lu intégralement pour cette passe : parties croisées explicitement avec l'inventaire — **§3–5** (rôles système, invariants, double flux), **§7** (périmètre fonctionnel, config admin / P2), **§8–10** (CREOS, parcours, matrice fallback / `WidgetDataState`), **§11–12** (NFR, dépendances, séquence), **§14–16** (gouvernance contractuelle, verrous).
- L'inventaire numéroté ci-dessous est **reproduit** depuis la section **Requirements Inventory** de `epics.md` (FR1–FR73, NFR1–NFR28, AR1–AR46). Ce choix **ne remplace pas** la lecture PRD ci-dessus : il garantit que le rapport et le backlog partagent la **même numérotation et libellés** pour la traçabilité.
- **Anti-circularité :** la matrice **Étape 3** vérifie la **cohérence interne** inventaire FR ↔ **FR Coverage Map** dans `epics.md` (chaque FR1–FR73 a une ligne). Elle ne constitue pas une **preuve indépendante** PRD↔code ; une vérification outillée (diff ou checklist hors epics) reste recommandée avant toute **implémentation large** au sens **FR73** / PRD §14.5.

### Functional Requirements

FR1: La v2 repart des logiques metier critiques de `recyclique-1.4.4` (brownfield), sans refonte from scratch comme hypothese de depart.
FR2: Les flux terrain prioritaires `cashflow` et `reception flow` conservent les memes bases metier que la base existante.
FR3: `Recyclique` porte les workflows terrain, la logique metier, les contrats backend, le calcul des permissions et des contextes, la resilience operationnelle, la zone tampon de synchronisation, la verite principale du flux matiere, l'historique exploitable et les manifests `CREOS` de ses modules metier.
FR4: `Paheko` porte la verite comptable officielle du flux financier, les classifications et contraintes comptables sur son perimetre, et l'autorite finale pour la comptabilite.
FR5: L'integration avec `Paheko` suit une approche API-first ; un plugin minimal n'est autorise que si l'API officielle ne couvre pas le besoin ; l'ecriture SQL transactionnelle n'est pas le chemin nominal.
FR6: `Peintre_nano` porte le shell UI, le registre de modules, les slots, le catalogue de widgets, le rendu de flows declaratifs, les raccourcis et actions declaratives, les fallbacks visuels et l'application des droits et contextes pour l'affichage.
FR7: `Peintre_nano` ne connait pas le metier `Recyclique` et consomme uniquement les manifests `CREOS` et les informations de contexte/permissions fournies par `Recyclique`.
FR8: L'adaptateur de canal web assure le rendu concret du shell, des slots et des widgets, les fallbacks visuels et les comportements d'affichage lies au canal, sans remonter de logique metier dans `Peintre_nano`.
FR9: `CREOS` fournit la grammaire commune des manifests, actions, widgets, flows et etats minimaux, ainsi que la base contractuelle partagee entre `Recyclique` et `Peintre_nano`.
FR10: Toute l'UI v2 passe par `Peintre_nano`.
FR11: Le systeme stabilise et utilise les contextes minimaux `site`, `caisse`, `session`, `poste de reception`, `role`, `groupe`, `permissions` et `PIN`.
FR12: En cas d'ambiguite ou d'incompletude du contexte, le systeme applique rechargement ou recalcul explicite, mode degrade ou restreint explicite, et revalidation si necessaire ; la securite prime sur la fluidite.
FR13: Lors d'un changement de contexte sensible, l'ensemble du contexte est recharge ou recalcule explicitement.
FR14: Chaque role possede une cle technique stable et un libelle personnalisable par ressourcerie ; les groupes servent a regrouper les utilisateurs pour l'affectation de permissions ; un utilisateur peut appartenir a plusieurs groupes.
FR15: En v2, le calcul des droits est additif : les permissions effectives sont l'union des permissions accordees par les roles et groupes associes.
FR16: Les libelles affiches dans l'UI ne font jamais foi pour la securite ; seules les cles techniques et les permissions calculees par `Recyclique` font autorite.
FR17: Un module n'est considere comme modulaire a l'etat final que si la chaine complete existe : contrat metier, recepteur backend, contrat UI, runtime frontend, permissions et contexte, fallback, audit et feedback.
FR18: Face a des contrats invalides, widgets non rendables ou flows incomplets, le systeme produit un fallback visible ou un blocage selon la criticite, une journalisation, un retour d'information exploitable, et la possibilite de correction et de nouvelle tentative.
FR19: Pour les elements critiques terrain, le systeme fournit un fallback explicite lorsque la securite metier reste garantie, et un blocage clair lorsque la securite metier ou comptable n'est plus garantie.
FR20: Aucune vue, widget ou slot ne doit laisser fuiter des donnees d'un site, d'une caisse ou d'un operateur vers un autre contexte.
FR21: Les vues globales admin ou super-admin imposent une selection explicite du contexte ou du perimetre, une tracabilite de l'acces et du perimetre consulte, l'absence de cache silencieux inter-contexte et l'impossibilite d'executer une action sensible hors du contexte explicitement valide.
FR22: La donnee v2 supporte l'execution quotidienne, l'historicisation, le rejeu, l'analyse et les correlations futures, avec tracabilite des mappings sensibles et de leurs changements.
FR23: Les donnees terrain sont enregistrees d'abord dans `Recyclique` ; la synchronisation vers `Paheko` peut etre reportee ; seules certaines actions critiques finales peuvent etre bloquees si la sync n'est pas a jour.
FR24: Tout ecart persistant de sync entre dans un etat explicite parmi `a_reessayer`, `en_quarantaine`, `resolu`, `rejete`.
FR25: Le passage en quarantaine est obligatoire en cas d'echec persistant, d'incoherence comptable detectee ou d'absence de correspondance comptable requise.
FR26: La levee de quarantaine est tracee et reservee a un responsable de ressourcerie ou un super-admin selon le workflow retenu.
FR27: Toute levee de quarantaine ou resolution manuelle laisse une trace d'audit avec auteur, date, contexte et motif.
FR28: Le support doit pouvoir s'appuyer sur un identifiant de correlation inter-systemes pour suivre un flux de bout en bout.
FR29: `Recyclique` est autorite pour le flux matiere : poids, quantites, categories, sous-categories, classifications officielles pour les declarations, avec mappings eco-organismes.
FR30: La v2 articule le flux financier et le flux matiere sans les confondre et permet fonctionnement quotidien, reconciliation, historique, futures lectures analytiques et declarations eco-organismes.
FR31: Chaque ressourcerie peut adapter la terminologie et la structure des roles a son fonctionnement.
FR32: Le systeme permet des roles definissables par ressourcerie, des libelles personnalisables et des groupes simples pour l'affectation des permissions.
FR33: Chaque role et chaque groupe possede une cle technique stable distincte du libelle affiche.
FR34: `Recyclique` calcule les droits a partir de roles definis par la ressourcerie, pas uniquement d'un jeu predefini.
FR35: Les libelles personnalises sont propages dans l'UI via les contextes de rendu `Peintre_nano`.
FR36: L'isolation multi-sites s'applique aussi aux roles et groupes.
FR37: `Peintre_nano` fournit en capacites minimales v2 : shell, slots nommes, widgets avec contrat de props, activation/desactivation de modules, contrats d'affichage, actions et raccourcis declaratifs, flows simples, fallback, journalisation et gestion des droits/contextes au rendu.
FR38: Les modules metier obligatoires en v2 sont `cashflow`, `reception flow`, `bandeau live`, `declaration eco-organismes`, `adherents / vie associative minimale`, `synchronisation Paheko`, `integration HelloAsso` et `config admin simple`.
FR39: La v2 livre un contrat de synchronisation couvrant au minimum sessions de caisse et cloture, ecritures comptables, politique de reconciliation, granularite du push, idempotence et retry, gestion des rejets, reprise apres incident et statut final d'une operation cote `Recyclique` et cote `Paheko`.
FR40: La hierarchie technique d'integration `Paheko` est : API officielle en priorite, plugin minimal si besoin, SQL reserve a l'analyse, au controle ou a l'administration.
FR41: La v2 supporte la granularite `ressourcerie -> site -> caisse -> session -> poste de reception` avec verrouillage des regles d'isolation, habilitations, comportement multi-caisses, identifiants, numerotation, horodatage, evenements de cloture et mapping vers les emplacements `Paheko`.
FR42: Si la correspondance site/caisse/emplacement `Paheko` est absente ou invalide, l'operation terrain reste enregistree dans `Recyclique`, l'etat non syncable est visible, et aucune ecriture silencieuse de substitution n'est autorisee.
FR43: Le schema de deploiement cible est une instance `Paheko` par ressourcerie, avec projection de plusieurs sites et caisses `Recyclique` dans le modele `Paheko`.
FR44: La config admin simple permet activation/desactivation, ordre de certains blocs, variantes simples d'affichage et aide ou overlay de raccourcis ; les reglages sensibles restent reserves au niveau super-admin/expert avec forte tracabilite.
FR45: Les manifests et contributions UI supportes en v2 sont versionnes et livres avec le build comme source primaire ; la configuration runtime n'agit que sur activation, ordre, variantes simples et parametres prevus.
FR46: L'integration `HelloAsso` minimum v2 permet d'ingerer ou rapprocher les informations utiles au parcours adherents / vie associative minimale, d'eviter les doublons silencieux, de journaliser les echecs et de permettre une reprise manuelle encadree.
FR47: Le niveau exact d'integration `HelloAsso` en v2 est tranche par une etude d'architecture comparant au minimum l'API directe `HelloAsso` et l'usage ou l'adaptation du plugin existant cote `Paheko`, en privilegiant simplicite, maintenabilite et compatibilite avec les parcours adherents et la gouvernance `Recyclique` / `Paheko`.
FR48: Le produit supporte le profil `CREOS` minimal avec objets obligatoires `ModuleManifest`, `SlotDefinition`, `WidgetDeclaration` et `ModuleAction`.
FR49: Le produit supporte les regles minimales `ModulePermissions` et `SlotConstraints`.
FR50: Le produit supporte les etats minimaux `ACTIVE`, `INACTIVE` et `ERROR`.
FR51: Le produit supporte les evenements minimaux `ModuleActivatedEvent`, `ModuleDeactivatedEvent` et `SlotContentChangedEvent`.
FR52: Le produit supporte les commandes minimales `ACTIVATE_MODULE`, `DEACTIVATE_MODULE` et `REGISTER_WIDGET`.
FR53: `Recyclique` publie la structure informationnelle commanditaire via des contrats versionnes comprenant au minimum `NavigationManifest`, `PageManifest` et `ContextEnvelope` derive du backend ; `Peintre_nano` charge, valide, fusionne selon des regles deterministes, puis rend ces contrats sans en devenir l'auteur metier.
FR54: Les routes symboliques, actions, pages et contrats UI restent traces a une source versionnee coherente avec les contrats backend ; `Peintre_nano` ne resout les routes actives, la navigation et la composition de page qu'a partir de cette source commanditaire, sans jamais inventer une route metier, une entree de navigation ou une structure metier absente du contrat ; toute collision ou incoherence non arbitree est detectee et rejetee avant activation.
FR55: Le parcours `cashflow` couvre scan ou recherche produit, saisie prix, mode de paiement et emission ticket, avec fluidite clavier, contexte garanti, blocage si contexte incomplet, validations metier et comptables avant cloture, journalisation complete et persistance locale si `Paheko` est indisponible.
FR56: Le `reception flow` couvre contexte garanti, categorisation, pesee, qualification, journalisation des entrees, lien avec le flux matiere et gestion des fallbacks et blocages sur les memes principes que le `cashflow`.
FR57: La cloture de session ou de caisse couvre controle des totaux, reconciliation avec la zone tampon, declenchement de la sync vers `Paheko` si besoin, blocage possible sur ecart critique et journalisation/historisation.
FR58: Le `bandeau live` est le premier module qui doit prouver la chaine complete contrat backend -> manifest `CREOS` -> registre `Peintre_nano` -> slot -> rendu -> fallback, avec activation/desactivation via config admin.
FR59: Le module `declaration eco-organismes` reste agnostique des categories boutique, utilise des categories internes libres avec mapping vers les categories officielles par eco-organisme, croise flux matiere et flux financier, conserve la tracabilite du mapping, permet une lecture par periode et perimetre, et impose la configurabilite des mappings au niveau super-admin.
FR60: Le module `adherents / vie associative minimale` couvre creation et consultation des adherents, suivi minimum de l'etat d'adhesion, rapprochement minimum avec `HelloAsso`, droits et contextes coherents avec le modele roles/groupes.
FR61: En cas de widget non rendable, le systeme produit un fallback visible et une journalisation.
FR62: En cas de module non critique en echec, l'erreur est isolee et le reste de l'ecran reste intact.
FR63: En cas de flow invalide ou incomplet, le systeme bloque le flow concerne, revient a un mode simple si possible et fournit un feedback explicite.
FR64: En cas de contexte ambigu ou incomplet, le systeme passe en mode restreint ou degrade explicite sans supposition silencieuse.
FR65: Une action sensible impose un controle supplementaire de type confirmation, PIN ou revalidation de role.
FR66: Si la sync `Paheko` est indisponible, l'enregistrement se fait dans `Recyclique` avec retry ulterieur sans blocage terrain par defaut.
FR67: En cas d'ecart de sync persistant, le systeme signale l'ecart, passe en quarantaine et impose une resolution tracee par un role habilite.
FR68: En cas de conflit entre securite et fluidite, la securite l'emporte.
FR69: Le systeme permet le blocage selectif des actions critiques finales uniquement lorsque la securite metier ou comptable n'est plus garantissable autrement.
FR70: Les cas nominaux de cloture et d'ecart critique produisent des statuts explicites attendus, incluant autorisation locale avec sync differee, blocage et quarantaine, ou autorisation reservee aux roles habilites avec audit.
FR71: La politique minimale PIN v2 impose un PIN distinct des autres secrets, jamais en clair dans les logs, usages traces, blocage temporaire apres plusieurs erreurs, parametres editables par super-admin, exposition possible via un editeur integre leger cote super-admin, et reinitialisation reservee a un role habilite.
FR72: L'authentification et les permissions sont sous autorite `Recyclique` ; l'affichage dans `Peintre_nano` ne vaut jamais autorisation effective et toute action sensible est revalidee cote `Recyclique`.
FR73: Avant implementation large des modules v2, la gouvernance contractuelle est consideree comme close : emplacement canonique des schemas defini, regles de versionnement `OpenAPI`/`CREOS` fixees, politique de breaking changes explicite, schemas minimaux publies et validation CI minimale en place.

### NonFunctional Requirements

NFR1: Les donnees sont toujours enregistrees dans `Recyclique`, meme si `Paheko` est indisponible.
NFR2: Une zone tampon durable avec retry et reprise apres incident soutient la synchronisation.
NFR3: Le terrain continue de fonctionner sans dependre d'une disponibilite externe immediate.
NFR4: Zero fuite de contexte entre sites, caisses, sessions et operateurs.
NFR5: Les manifests `CREOS` sont livres avec le build comme source primaire.
NFR6: Les actions sensibles sont journalisees avec resultat, auteur, moment et contexte.
NFR7: Les fallbacks, blocages et degradations sont journalises.
NFR8: Les erreurs et retours de feedback restent exploitables pour support et administration.
NFR9: Les flux sensibles et comptables restent comprehensibles et rejouables apres coup.
NFR10: Les journaux critiques incluent au minimum `correlation_id`, identifiants de contexte, identifiant operateur, type d'operation, etat, motif d'echec ou de blocage, avec masquage des donnees sensibles inutiles.
NFR11: Le `cashflow` reste fluide au clavier, sans latence perceptible sur scan, saisie et paiement.
NFR12: Le shell `Peintre_nano` n'introduit pas de penalite de rendu visible sur les flows terrain critiques.
NFR13: La v2 peut fonctionner avec un bundle commun ; le lazy loading par module est reporte a une phase ulterieure.
NFR14: L'installation est documentee et reproductible sur l'environnement cible.
NFR15: Le socle reste lisible et suffisamment propre pour une ouverture communautaire.
NFR16: Le coeur du produit ne depend pas d'un service proprietaire pour fonctionner.
NFR17: La matrice des environnements officiellement supportes est publiee avant release candidate v2.
NFR18: Une seule installation officielle est supportee en v2, sur `Debian`, environnement de reference du projet.
NFR19: Le modele de donnees supporte l'articulation des flux financier et matiere.
NFR20: L'historisation est suffisante pour rejeu, analyse et correlations futures.
NFR21: Les donnees restent exploitables au niveau des totaux et des operations detaillees.
NFR22: Les mappings sensibles super-admin sont historises.
NFR23: La base de donnees reste assez propre pour de futurs usages analytiques.
NFR24: Les manifests `CREOS` suivent un versionnement `SemVer` aligne avec les conventions `JARVOS`.
NFR25: `OpenAPI` est versionne separement mais de maniere coordonnee avec `CREOS`.
NFR26: Chaque manifest expose explicitement un numero de compatibilite avec l'API et la version `Peintre_nano`.
NFR27: La politique de signalement et de propagation des breaking changes est definie pour ne pas casser le rendu sur les instances deployees.
NFR28: Un manifest valide en schema ne doit pas casser le rendu React ; cela doit etre verifie par outillage et CI.

### Additional Requirements

AR1: Starter technique a noter pour le socle frontend : `Peintre_nano` est un frontend v2 greenfield initialise en `React + TypeScript + Vite`, dans le meme depot, tandis que le backend reste brownfield.
AR2: `CSS Grid` est obligatoire comme moteur global de layout du frontend v2.
AR3: La stack CSS/styling de `Peintre_nano` est **fermee** (**ADR P1**) : CSS Modules, `tokens.css`, Mantine v8 comme bibliotheque de composants ; interdits et details dans `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` et `references/peintre/2026-04-01_instruction-cursor-p1-p2.md`. Le role de `Zustand` reste limite a l'etat UI ephemere/local (AR26).
AR4: Le packaging initial de `Peintre_nano` reste interne au depot ; l'extraction future vers un repo dedie doit etre preparee sans etre un prerequis immediat.
AR5: La separation logique `api / frontend` est ciblee ; une coexistence ancien front / nouveau front n'est toleree qu'a titre transitoire avec criteres d'extinction explicites.
AR6: L'environnement officiel cible est `Debian`, avec un coeur open source sans dependance proprietaire pour le fonctionnement nominal.
AR7: La stack cible articule `recyclique`, `peintre-nano`, `paheko`, `postgres` et `redis`, avec `Paheko` present dans la stack de deploiement de reference.
AR8: `Paheko` est integre uniquement cote backend, avec une specification explicite de mapping metier `Recyclique <-> Paheko`.
AR9: Une matrice `operation metier -> API officielle / plugin minimal / SQL hors flux transactionnel / hors scope` ainsi qu'une liste des manques API reels doivent etre produites avant tout arbitrage plugin significatif.
AR10: `HelloAsso` est dans le perimetre v2 mais ne doit pas bloquer l'installation minimale du coeur ; les secrets et connecteurs doivent etre cadres explicitement.
AR11: Le backend cible repose sur `FastAPI`, `SQLAlchemy 2.x` et `Alembic`, avec outbox durable `PostgreSQL` pour la sync `at-least-once` et handlers idempotents ; cette concretisation architecturale precise le PRD, dans lequel un mecanisme de queue/outbox interne n'etait donne qu'a titre d'exemple.
AR12: `Redis` reste auxiliaire et n'est jamais l'autorite durable ni la source de verite metier.
AR13: L'ordre d'implementation impose un lot de socle v2 (`Peintre_nano`, contrats, codegen, runtime minimal, auth/session cliente) puis la preuve `bandeau live` comme premier slice vertical contractuel avant l'extension aux gros flows.
AR14: La migration des ecrans n'intervient qu'apres stabilisation minimale des contrats backend et des contextes de rendu du domaine.
AR15: Les composants `Mantine` restent confines a une couche d'adaptation / migration (`migration/mantine-adapters/`) ; ils ne deviennent pas la structure racine de `Peintre_nano` ni ne portent la logique metier. Cadrage : ADR P1.
AR16: Les sessions web v2 ciblent un mode `same-origin` avec cookies securises `httpOnly`, rotation geree cote backend, et protection `CSRF` si des cookies sont utilises pour les mutations.
AR17: Les logs structures et le header canonique `X-Correlation-ID` doivent etre propages sur les flux critiques.
AR18: Les workflows CI minimums couvrent `recyclique`, `peintre-nano`, les contrats et l'e2e, avec lint/tests, generation + diff `OpenAPI`, validation des schemas/manifests `CREOS` et smoke tests de rendu des modules critiques.
AR19: `Recyclique` est le writer canonique du schema `OpenAPI` ; le chemin de generation est unique, versionne et non edite a la main.
AR20: La chaine `Recyclique -> OpenAPI -> contrats generes -> codegen frontend` doit etre couverte tres tot dans le backlog.
AR21: Les contrats JSON backend restent en `snake_case`, les dates en `ISO 8601`, et l'enveloppe d'erreur doit rester stable avec `code`, `detail`, `retryable`, `state` et `correlation_id`.
AR22: Les routes brownfield sont gelees jusqu'a strategie de transition explicite ; les nouvelles surfaces v2 suivent des conventions versionnees.
AR23: `Recyclique` reste l'autorite d'authentification, permissions, contextes et validations sensibles ; l'UI ne fait jamais foi, et `Peintre_nano` doit consommer un adaptateur auth/session explicite sans logique metier implicite.
AR24: Les mutations sensibles doivent supporter un mecanisme de type `Idempotency-Key`, et le step-up security (`PIN`, confirmation, revalidation) doit etre cadre par domaine.
AR25: Le rate limiting cote backend doit etre maintenu sur les surfaces sensibles.
AR26: `Zustand` est limite a de l'etat UI ephemere/local et ne doit jamais devenir la verite des permissions, contextes, sync ou flows metier.
AR27: `OpenAPI` couvre les contrats backend, DTO, erreurs et actions ; `CREOS` couvre manifests UI, slots, widgets et flows, sans dupliquer la verite metier.
AR28: Un mecanisme partage d'enums et d'identifiants entre `OpenAPI` et `CREOS` doit etre concretise dans les stories de socle.
AR29: La source reviewable `CREOS` vit dans `contracts/creos/` ; `peintre-nano/src/generated/` reste une copie derivee, jamais une seconde source de verite.
AR30: Un registre unique de routes `Peintre_nano` fusionne les contributions modules ; les manifests peuvent declarer des routes candidates, mais les collisions provoquent un echec de validation sauf arbitrage documente.
AR31: Les widgets doivent exposer des props serialisables et un contrat verifiable avant activation.
AR32: Les echecs de manifest ou de contrat doivent etre visibles et non silencieux.
AR33: Les integrations externes hors `Paheko` et `HelloAsso`, notamment email, passent egalement par le backend `Recyclique` et non par des integrations directes du frontend.
AR34: Les objets `PageTemplate`, `ZoneRole` et `LayoutComposition` peuvent etre prepares conceptuellement en v2 mais ne doivent pas devenir des prerequis generaux du socle minimal.
AR35: Les niveaux de test couvrent unitaire, contrat, integration et e2e ; les violations de patterns doivent etre traitees comme des violations d'architecture.
AR36: Les dependances encore a formaliser ou verifier pour la mise en oeuvre incluent : audit backend/API/donnees, retro-engineering `Paheko`, specification multi-contextes, formalisation des schemas `CREOS`, contrat socle de sync, pipeline de validation des contrats et strategie de coexistence/migration brownfield.
AR37: Les stories devront aussi couvrir les gates de validation produit menant a la beta interne et a la v2 vendable, afin que les criteres de sortie du PRD soient traçables dans le backlog.
AR38: Les sujets explicitement hors scope initial ou non prerequis v2 ne doivent pas reapparaitre implicitement dans le backlog de socle, notamment personnalisation riche, editeur convivial de flows, pilotage agentique riche, interfaces analytiques avancees, bus `CREOS` obligatoire et chargement dynamique de manifests tiers hors build.
AR39: La hierarchie de verite doit etre explicite et respectee : `OpenAPI` > `ContextEnvelope` > `NavigationManifest` > `PageManifest` > `UserRuntimePrefs`.
AR40: La Story 0 du socle `Peintre_nano` doit poser explicitement les quatre artefacts minimaux `NavigationManifest`, `PageManifest`, `ContextEnvelope` et `UserRuntimePrefs`.
AR41: `Peintre_nano` reste moteur d'affichage/runtime agnostique et n'est jamais auteur metier de la navigation, des pages ou de la structure informationnelle.
AR42: Le schema canonique de `ContextEnvelope` vit dans `OpenAPI`, tandis que son instance runtime est resolue et consommee au frontend sans devenir une seconde source de verite.
AR43: `UserRuntimePrefs` reste local par defaut, hors verite metier, hors calcul de permissions/navigation, avec persistence backend seulement via endpoint explicite dedie.
AR44: Le `bandeau live` doit pouvoir tenir compte des horaires d'ouverture reels, des caisses a ouvertures decalees et des cas particuliers, afin de ne pas afficher un etat d'exploitation trompeur.
AR45: La persistance des **surcharges** de **configuration admin simple** (activation/desactivation modules ou blocs, ordre, variantes simples, parametres prevus par le build dans ce perimetre) est en **PostgreSQL** (**ADR P2**) ; fusion deterministe avec les defaults des manifests build ; pas de fichier JSON sur disque en **production** pour cette couche ; tracabilite auteur/date/motif. Reference : `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` et instruction associee. Hors ce perimetre, les reglages super-admin/expert suivent le PRD (fichiers structures ou base selon domaine).
AR46: **Developpement parallele** Piste A (`Peintre_nano`, mocks autorises pour le moteur UI jusqu'a Convergence 1) et Piste B (`Recyclique`, OpenAPI + backend autonome) avec **jalons de convergence** documentes dans `architecture/project-structure-boundaries.md` et le Sprint Change Proposal 2026-04-01 ; extension manifest **`data_contract`** et liaison **`operation_id`** ↔ OpenAPI selon `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md` et `contracts/creos/schemas/`.

### PRD Completeness Assessment
- Le PRD reste la référence produit. Les **livrabilités ouvertes** listées en **§12 / §16** (contrat sync, spec multi-contextes, schémas CREOS formels, etc.) ne sont **pas** toutes closes sur papier : elles sont **pilotées** par des stories (Epic 1, 8, 10, …). Cela **n'empêche pas** de démarrer Epic 1 ; cela signifie qu'il reste du **travail documentaire et contractuel** traçable dans le backlog.
- Les ajouts récents (**ADR P1/P2**, **instruction contrats données**, schémas sous `contracts/`) sont reflétés dans le PRD et `epics.md`.

## Étape 3 — Epic Coverage Validation

**Périmètre de cette étape :** la matrice ci-dessous couvre **uniquement les FR**. Les **NFR** et **AR** disposent de cartes dédiées dans `epics.md` (**NFR Coverage Map**, **Additional Requirements Coverage Map**) — non recopiées ici pour limiter la taille du rapport.

### Coverage Matrix (FR1–FR73)

| FR | Couverture (epics) | Statut |
| -- | ------------------- | ------ |
| FR1 | Epic 2 | Couvert |
| FR2 | Epic 6 et Epic 7 | Couvert |
| FR3 | Epic 2 | Couvert |
| FR4 | Epic 8 | Couvert |
| FR5 | Epic 1 | Couvert |
| FR6 | Epic 3 | Couvert |
| FR7 | Epic 3 | Couvert |
| FR8 | Epic 3 | Couvert |
| FR9 | Epic 3 | Couvert |
| FR10 | Epic 3, Epic 4, Epic 5, Epic 6, Epic 7, Epic 8, Epic 9 | Couvert |
| FR11 | Epic 1 et Epic 2 | Couvert |
| FR12 | Epic 2 | Couvert |
| FR13 | Epic 2 | Couvert |
| FR14 | Epic 2 | Couvert |
| FR15 | Epic 2 | Couvert |
| FR16 | Epic 2 | Couvert |
| FR17 | Epic 4 | Couvert |
| FR18 | Epic 4 | Couvert |
| FR19 | Epic 4 | Couvert |
| FR20 | Epic 1 et Epic 2 | Couvert |
| FR21 | Epic 5 | Couvert |
| FR22 | Epic 1 et Epic 2 | Couvert |
| FR23 | Epic 2 | Couvert |
| FR24 | Epic 8 | Couvert |
| FR25 | Epic 8 | Couvert |
| FR26 | Epic 8 | Couvert |
| FR27 | Epic 8 | Couvert |
| FR28 | Epic 8 | Couvert |
| FR29 | Epic 7 | Couvert |
| FR30 | Epic 6, Epic 7, Epic 8, Epic 9 | Couvert |
| FR31 | Epic 2 | Couvert |
| FR32 | Epic 2 | Couvert |
| FR33 | Epic 2 | Couvert |
| FR34 | Epic 2 | Couvert |
| FR35 | Epic 5 | Couvert |
| FR36 | Epic 1 | Couvert |
| FR37 | Epic 3 | Couvert |
| FR38 | Epic 4, Epic 6, Epic 7, Epic 8, Epic 9, Epic 10 | Couvert |
| FR39 | Epic 8 | Couvert |
| FR40 | Epic 1 | Couvert |
| FR41 | Epic 1 | Couvert |
| FR42 | Epic 8 | Couvert |
| FR43 | Epic 8 | Couvert |
| FR44 | Epic 9 | Couvert |
| FR45 | Epic 3 | Couvert |
| FR46 | Epic 9 | Couvert |
| FR47 | Epic 9 | Couvert |
| FR48 | Epic 3 | Couvert |
| FR49 | Epic 3 | Couvert |
| FR50 | Epic 3 | Couvert |
| FR51 | Epic 3 | Couvert |
| FR52 | Epic 3 | Couvert |
| FR53 | Epic 2 et Epic 3 | Couvert |
| FR54 | Epic 1 et Epic 3 | Couvert |
| FR55 | Epic 6 | Couvert |
| FR56 | Epic 7 | Couvert |
| FR57 | Epic 6 et Epic 8 | Couvert |
| FR58 | Epic 4 | Couvert |
| FR59 | Epic 9 | Couvert |
| FR60 | Epic 9 | Couvert |
| FR61 | Epic 4 | Couvert |
| FR62 | Epic 4 | Couvert |
| FR63 | Epic 4 | Couvert |
| FR64 | Epic 2 | Couvert |
| FR65 | Epic 2 | Couvert |
| FR66 | Epic 8 | Couvert |
| FR67 | Epic 8 | Couvert |
| FR68 | Epic 2 | Couvert |
| FR69 | Epic 8 | Couvert |
| FR70 | Epic 8 | Couvert |
| FR71 | Epic 2 | Couvert |
| FR72 | Epic 2 | Couvert |
| FR73 | Epic 1 et Epic 10 | Couvert |

### Missing FR Coverage
- **Cohérence inventaire ↔ carte :** chaque **FR1–FR73** de l'inventaire possède une entrée correspondante dans la **FR Coverage Map** de `epics.md` (pas de trou ni de doublon de numéro dans cette double liste).

### Coverage Statistics
- Total FR (inventaire) : **73**
- FR cartographiés : **73**
- **Couverture (inventaire ↔ FR Coverage Map dans epics) : 100 %**

## Étape 4 — UX Alignment Assessment

### UX Document Status
- Pas de document UX autonome ; **UX-DR1–UX-DR16** dans `epics.md` + exigences UX dans le PRD.

### Alignment Issues
- Alignement **PRD ↔ epics (UX-DR)** ↔ **architecture** (navigation commanditaire, `UserRuntimePrefs`, ADR P1, bandeau live / horaires) : **cohérent** sur les points vérifiés.
- **Références architecture utiles (traçabilité) :** `navigation-structure-contract.md`, `implementation-patterns-consistency-rules.md` (dossier `architecture/`) — complètent les UX-DR côté shell et contrats d'affichage.
- **Warning mineur :** l'UX reste **distribuée** (PRD, epics, architecture) — maintenir la traçabilité lors de l'implémentation.

### Warnings
- Pas d'artefact UX unique ; acceptable si les stories conservent les liens UX-DR.

## Étape 5 — Epic Quality Review

### Critical Violations
- **Aucune** du type « absence totale de stories » : `epics.md` contient des stories détaillées avec critères **Given/When/Then** (ou équivalent) sur l'ensemble des epics 1–10.

### Major Issues
- Plusieurs epics **1, 3, 4, 10** restent **fortement structurels** (prérequis, socle UI, preuve modulaire, industrialisation) : acceptable pour un **brownfield + greenfield UI**, mais le libellé epic reste orienté capacité technique plus que bénéfice utilisateur final — à surveiller en revue de sprint.
- **Dépendances séquentielles** entre epics (notes de sequencing) : intentionnelles ; pas d'équivalent « epic N+1 requis pour finir epic N » au niveau story sans que ce soit documenté.

### Minor Concerns
- **Story Preparation Gates** (nommer routes/`PageManifest` avant exécution) : bonne pratique mais à appliquer systématiquement.
- Taille du fichier `epics.md` : risque de dérive ; les changements futurs devraient rester traçables (PRD + architecture shardée).

### Recommendations
- Continuer à **valider chaque story** en DoR (indépendance, AC testables, pas de dépendance avant non livrée).
- Garder **OpenAPI / CREOS / contracts/** comme source reviewable au fil des stories Epic 1–2–3.

## Étape 6 — Summary and Recommendations

### Overall Readiness Status
**READY** (selon la **définition en tête de document**) — pour **démarrer l'exécution des stories** du sequencing BMAD, avec correctifs de cap intégrés. Les exigences **FR73** / **PRD §14.5** (gouvernance contractuelle avant **implémentation large**) sont des **gates** : interprétation opérationnelle retenue ici — **avant** de basculer massivement sur les **modules métier lourds** (à partir d’**Epic 6–9** et au-delà), les livrables de **Story 1.4** (et jalons associés Epic 1 / Epic 10 pour CI) doivent être **effectivement** en place ; le socle **Epic 1–5** reste la zone de **fermeture progressive** de ces gates, pas une zone exempte de contrat.

### Critical Issues Requiring Immediate Action
- **Aucun écart bloquant** identifié pour **ouvrir Epic 1** (stories présentes, cartes FR cohérentes, alignement UX/ADR documenté).
- **Lacunes PRD résiduelles** (§16, parties de §12) : **suivies** dans le backlog ; ne bloquent pas le démarrage du socle mais **bloquent** une **implémentation large** sans les gates ci-dessus.

### Risques résiduels (hors périmètre « readiness planification » mais à ne pas sous-estimer en go/no-go global)
| Axe | Risque | Suivi suggéré |
|-----|--------|----------------|
| Contrats | Schémas `contracts/` / OpenAPI encore en maturation | Stories 1.4, 2.x, `sprint-status.yaml` |
| CI / qualité | NFR28 / FR73 partiellement outillés au début | Epic 10, AR18 |
| Terrain | Preuves caisse / réception / sync réelles | Convergences 2–3, Epic 6–8 |
| Cadence | Dérive PRD ↔ epics si `epics.md` édité sans PRD | Revue à chaque **correctif de cap** |

### Recommended Next Steps
1. Enchaîner avec **sprint-status** / **dev-story** sur la première story du sequencing validé.
2. Vérifier que **`contracts/`** et la génération OpenAPI suivent les stories **1.4**, **2.x**, **3.x**.
3. Après jalon **bandeau live** (Epic 4), contrôler la **Convergence 2** (Piste A/B) comme gate décision directrice.

### Final Note
Évaluation **regénérée** après **[C]** et **passe QA** (`qa-agent`, doc + PRD + arch, pipeline Full). L’ancienne conclusion « NEEDS WORK » (absence de stories) est **obsolète**. **7** sections d’étapes passées en revue ; **reportVersion** 1.1.0.

---

## Addendum — Alignement ADR Peintre P1 / P2 (2026-04-01, post-QA)

**Contexte :** après **correctifs de cap** (*correct course* BMAD) et une passe QA, les artefacts suivants ont été alignés sur `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md` et l'instruction Cursor associée :

- **PRD** : bloc « Stack Peintre_nano (figée) », clarification **P2** en §7.1 (config admin simple vs super-admin), règle de **priorité** P1/P2 (ADR > corps PRD sur ces points).
- **Architecture active** (`_bmad-output/planning-artifacts/architecture/*.md`) : plus de formulation « stack ouverte » ou « provisoire » pour P1 ; **P2** reflétée dans `core-architectural-decisions.md` ; chemins `migration/mantine-adapters/`.
- **Epics** : **AR3**, **AR15**, **AR45** (P2 / PostgreSQL / traçabilité) ; stories et **AR46** (`data_contract`, Piste A/B, Sprint Change Proposal).
- **Archive** `archive/architecture.md` : bannière historique — **non utilisée** comme source d'architecture courante.

**Readiness (mise à jour 2026-04-01) :** la cohérence **PRD / architecture / epics** avec **P1** et **P2** est documentée. Le présent rapport **lève** la réserve « absence de stories détaillées » de la version précédente. Le statut **READY** et ses exclusions sont **définis une seule fois** en tête de ce fichier (version **1.1.0**) — l’addendum ne fait que les **réaffirmer** pour l’angle ADR.
