---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture/index.md
  - _bmad-output/planning-artifacts/architecture/navigation-structure-contract.md
  - _bmad-output/planning-artifacts/product-brief-JARVOS_recyclique-2026-03-31.md
  - references/vision-projet/2026-03-31_decision-directrice-v2.md
  - references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md
  - .cursor/plans/cadrage-v2-global_c2cc7c6d.plan.md
  - .cursor/plans/separation-peintre-recyclique_4777808d.plan.md
  - .cursor/plans/profil-creos-minimal_6cf1006d.plan.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-31-195824.md
  - references/peintre/index.md
  - references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md
  - references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md
  - references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md
  - references/peintre/2026-04-01_instruction-cursor-p1-p2.md
  - references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md
---

# JARVOS_recyclique - Epic Breakdown

## Overview

Ce document sert de support au workflow `bmad-create-epics-and-stories` pour `JARVOS_recyclique`.

Etat BMAD actuel :
- etape 1 preparee : inventaire des exigences extrait et consolide ;
- etape 2 preparee et structure d'epics approuvee en premiere passe ;
- en cas d'ecart entre documents, la source de verite reste `prd.md`, puis l'architecture active decoupee en sous-documents et les documents de cadrage explicitement listes en frontmatter.
- etape 3 preparee : les stories detaillees ont ete generees pour les 10 epics ;
- etape 4 preparee : validation finale effectuee sur la couverture, les dependances, la granularite des stories et la coherence inter-epics ;
- le workflow `bmad-create-epics-and-stories` est considere comme complet ; `epics.md` est pret pour la suite du flux BMAD.

### Developpement parallele Piste A / Piste B (cadrage 2026-04-01)

- **Piste A** (`Peintre_nano`) : socle UI, registre, slots, `FlowRenderer`, raccourcis, validation CREOS, toggles, hooks de domaine et `ContextEnvelope` **peuvent** s'implementer d'abord avec **mocks** et types/stubs — **sans** exiger des endpoints backend reels pour les stories de composition pure (Epic 3, partie « moteur »).
- **Piste B** (`Recyclique`) : audit API/donnees, OpenAPI, construction serveur du `ContextEnvelope`, sync, permissions — livrable reviewable `contracts/openapi/recyclique-api.yaml` avec `operationId` stables.
- **Convergence 1** : types generes depuis OpenAPI + hooks reels ; **Convergence 2** : **bandeau live** bout-en-bout (gate decision directrice) ; **Convergence 3** : flows caisse / reception critiques avec donnees reelles, `data_contract.critical` / blocage `DATA_STALE` ou sensibles.
- Les **phases Peintre** (0–3) du concept architectural decrivent la **maturite du moteur** sur plusieurs versions ; le **backlog et sprint-status** suivent la **sequence 1–9** de la decision directrice v2, pas ces phases comme calendrier sprint.

## Requirements Inventory

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

### UX Design Requirements

UX-DR1: L'interface doit rendre visible en permanence le contexte actif utile a l'operation en cours, au minimum `site`, `caisse`, `session`, `poste`, et tout etat de contexte bloquant ou restreignant l'action.
UX-DR2: Aucun changement de contexte sensible ne doit etre implicite ; toute bascule de `site`, `caisse`, `session` ou poste doit etre explicite, perceptible, et suivie d'un rechargement ou recalcul visible si necessaire.
UX-DR3: L'affichage structurel et les autorisations visibles doivent rester coherents avec l'intersection entre les manifests commanditaires (`NavigationManifest`, `PageManifest`) et le `ContextEnvelope` serveur ; `UserRuntimePrefs` ne peut ajuster que la presentation locale a l'interieur de ce perimetre, sans creer de route, page, permission ou visibilite metier supplementaire.
UX-DR4: Toute entree de navigation, page ou action indisponible pour cause de contexte ou de permissions doit suivre une regle UX uniforme : les entrees structurelles de navigation sont masquees par defaut si elles ne sont pas accessibles, tandis que les actions contextuelles d'un ecran deja visible sont affichees comme indisponibles lorsqu'un feedback explicatif est utile ; aucune page fantome, aucun trou silencieux de navigation.
UX-DR5: Les flows terrain critiques `cashflow` et `reception` doivent privilegier une interaction rapide, lisible et robuste au clavier, avec un nombre d'etapes limite, des zones d'action evidentes, et des retours immediats apres saisie ou validation.
UX-DR6: Les operations terrain frequentes ou urgentes doivent rester atteignables en peu d'actions, notamment les cas remontes du terrain comme ticket en attente, remboursement, don sans article, adhesion asso et actions sociales dediees, sous reserve des arbitrages metier et comptables du backlog.
UX-DR7: Toute action sensible ou irreversible doit exposer une confirmation, un controle supplementaire ou un blocage explicite adapte au domaine (`PIN`, confirmation, revalidation, refus motive), sans ambiguite pour l'operatrice.
UX-DR8: Les erreurs, fallbacks, degradations et blocages doivent etre visibles, comprehensibles et distincts selon leur nature : erreur locale, contrat invalide, contexte invalide, sync differee, quarantaine, rejet ou indisponibilite externe. L'UX doit s'appuyer sur les champs contractuels stables (`code`, `detail`, `retryable`, `state`, `correlation_id`) pour afficher des statuts coherents et exploitables.
UX-DR9: Lorsqu'une operation est acceptee localement mais non encore synchronisee avec `Paheko`, l'interface doit le signaler clairement sans alarmer inutilement le terrain, en distinguant l'enregistrement local, le retry ulterieur et les cas de blocage reel.
UX-DR10: Un widget, module ou manifest en echec ne doit pas degrader silencieusement l'ensemble de l'ecran ; l'UX doit isoler l'erreur si possible, afficher un fallback visible, et conserver le reste de l'ecran utilisable hors cas critiques.
UX-DR11: Les vues transverses `dashboard`, `bandeau live`, pages admin et super-admin doivent aider a comprendre rapidement l'etat d'exploitation, les alertes utiles, le perimetre consulte et les consequences des reglages sensibles, sans surcharger l'ecran de detail technique.
UX-DR12: Les reglages locaux de `UserRuntimePrefs` peuvent ajuster la densite, l'ouverture de panneaux, les raccourcis personnels ou l'onboarding, mais ne doivent jamais modifier la navigation structurelle, les permissions, le sens metier d'un ecran ou les validations backend.
UX-DR13: Les ecrans de parametres sensibles et d'ACL doivent expliciter qui peut agir, sur quel perimetre, et avec quel impact ; une fonctionnalite sensible ne doit pas etre parametree sans visibilite sur son scope role/utilisateur/contexte.
UX-DR14: Les modules critiques doivent rester lisibles et operables dans des conditions terrain imparfaites, avec etats de chargement explicites, absence de penalite visuelle excessive due au runtime compose, et priorite constante a la comprehension de l'action en cours.
UX-DR15: Le `bandeau live` doit presenter un etat d'exploitation coherent avec les horaires d'ouverture reels, les cas de caisses a ouvertures decalees et les cas particuliers ; l'UX ne doit pas laisser croire qu'une caisse est active "du jour" si sa fenetre d'ouverture parametree ne la rend pas effectivement ouverte.
UX-DR16: Les ecrans de correction de vente ou d'action sensible reservee a des roles eleves doivent rendre visible qu'une modification a eu lieu sous controle, avec au minimum un indicateur explicite sur l'operation corrigee et un acces reserve aux roles habilites a un resume exploitable du type de correction, de son auteur et de son horodatage.

### UX Coverage Map

UX-DR1: Epic 2, Epic 5, Epic 6, Epic 7 - Visibilite du contexte actif sur les ecrans transverses et flows critiques.
UX-DR2: Epic 2, Epic 5, Epic 6, Epic 7 - Changement de contexte sensible explicite et visible.
UX-DR3: Epic 3, Epic 5 - Coherence entre manifests commanditaires, `ContextEnvelope` et presentation runtime locale.
UX-DR4: Epic 3, Epic 5, Epic 6, Epic 7 - Politique uniforme de visibilite ou indisponibilite des entrees et actions.
UX-DR5: Epic 6, Epic 7 - Flows terrain rapides, lisibles et robustes au clavier.
UX-DR6: Epic 6, Epic 9 - Accessibilite operationnelle des cas terrain frequents sous arbitrage backlog.
UX-DR7: Epic 2, Epic 6, Epic 8 - Feedback explicite sur confirmations, blocages et controles sensibles.
UX-DR8: Epic 4, Epic 6, Epic 7, Epic 8 - Taxonomie visible des erreurs, fallbacks, degradations et blocages.
UX-DR9: Epic 6, Epic 8 - Distinction claire entre enregistrement local, sync differee et blocage reel.
UX-DR10: Epic 4, Epic 5, Epic 6, Epic 7 - Isolation d'erreur et fallback visible sans degradation silencieuse globale.
UX-DR11: Epic 4, Epic 5, Epic 9 - Lisibilite des vues transverses, live et admin sans surcharge.
UX-DR12: Epic 3, Epic 5 - `UserRuntimePrefs` borne a la personnalisation locale non metier.
UX-DR13: Epic 5, Epic 9 - Lisibilite du perimetre et de l'impact des parametres sensibles et ACL.
UX-DR14: Epic 3, Epic 6, Epic 7 - Operabilite terrain en conditions imparfaites et chargements explicites.
UX-DR15: Epic 4 - Cohherence UX du `bandeau live` avec les horaires d'ouverture reels, ouvertures decalees et cas particuliers.
UX-DR16: Epic 2, Epic 6 - Visibilite minimale des corrections sensibles sous controle et des traces associees.

### FR Coverage Map

FR1: Epic 2 - Backend brownfield stabilise comme noyau v2.
FR2: Epic 6 et Epic 7 - Flows terrain prioritaires `cashflow` et `reception flow` portes dans la v2.
FR3: Epic 2 - Autorite metier, contrats, permissions, contextes et resilience cote `Recyclique`.
FR4: Epic 8 - Articulation comptable officielle avec `Paheko`.
FR5: Epic 1 - Prerequis d'integration `Paheko` et arbitrages API/plugin/SQL.
FR6: Epic 3 - Runtime `Peintre_nano` et capacites coeur du moteur UI.
FR7: Epic 3 - Frontiere claire entre metier `Recyclique` et moteur UI.
FR8: Epic 3 - Adaptateur de canal web et rendu concret.
FR9: Epic 3 - Grammaire `CREOS` minimale partagee.
FR10: Epic 3, Epic 4, Epic 5, Epic 6, Epic 7, Epic 8, Epic 9 - Toute l'UI v2 passe par `Peintre_nano`, du socle aux ecrans et modules livres.
FR11: Epic 1 et Epic 2 - Stabilisation puis mise en oeuvre des contextes minimaux et de leur modele.
FR12: Epic 2 - Politique de recalcul, mode degrade et securite prioritaire.
FR13: Epic 2 - Rechargement explicite des changements de contexte sensibles.
FR14: Epic 2 - Modele roles/groupes/libelles personnalisables.
FR15: Epic 2 - Calcul additif des droits.
FR16: Epic 2 - Autorite des cles techniques et permissions calculees.
FR17: Epic 4 - Definition de la chaine modulaire complete a prouver.
FR18: Epic 4 - Fallback, blocage, journalisation et correction des contrats invalides.
FR19: Epic 4 - Regles de fallback ou blocage sur les elements critiques.
FR20: Epic 1 et Epic 2 - Zero fuite de contexte entre sites, caisses et operateurs, du cadrage a l'implementation.
FR21: Epic 5 - Vues globales admin/super-admin sous contraintes de contexte et de tracabilite.
FR22: Epic 1 et Epic 2 - Donnee exploitable, historisation, rejeu et tracabilite des mappings sensibles, du modele a la persistance operationnelle.
FR23: Epic 2 - Persistance locale d'abord et sync reportable.
FR24: Epic 8 - Etats explicites de synchronisation.
FR25: Epic 8 - Regles de quarantaine.
FR26: Epic 8 - Workflow de levee de quarantaine trace.
FR27: Epic 8 - Audit des resolutions manuelles.
FR28: Epic 8 - Correlation inter-systemes pour support et suivi.
FR29: Epic 7 - Verite `Recyclique` sur le flux matiere.
FR30: Epic 6, Epic 7, Epic 8, Epic 9 - Articulation exploitable des flux financier et matiere entre flows terrain, sync comptable et modules metier complementaires.
FR31: Epic 2 - Structure de roles adaptable par ressourcerie.
FR32: Epic 2 - Roles definissables, groupes simples et libelles personnalises.
FR33: Epic 2 - Cles techniques stables pour roles et groupes.
FR34: Epic 2 - Calcul des droits a partir de roles definis localement.
FR35: Epic 5 - Propagation des libelles personnalises dans l'UI recomposee.
FR36: Epic 1 - Isolation multi-sites appliquee aussi aux roles et groupes.
FR37: Epic 3 - Capacites minimales v2 du moteur `Peintre_nano`.
FR38: Epic 4, Epic 6, Epic 7, Epic 8, Epic 9, Epic 10 - Modules obligatoires v2 repartis entre preuve modulaire, flows critiques, sync, modules complementaires et validation finale de readiness.
FR39: Epic 8 - Contrat de synchronisation et reconciliation complet.
FR40: Epic 1 - Hierarchie technique d'integration `Paheko`.
FR41: Epic 1 - Validite de la structure multi-sites / multi-caisses / multi-postes et mappings associes.
FR42: Epic 8 - Gestion des correspondances `Paheko` absentes ou invalides.
FR43: Epic 8 - Schema de deploiement cible par ressourcerie.
FR44: Epic 9 - Config admin simple comme capacite v2 livrable.
FR45: Epic 3 - Versionnement et livraison build-time des manifests UI.
FR46: Epic 9 - Integration minimum `HelloAsso`.
FR47: Epic 9 - Etude d'architecture et arbitrage d'integration `HelloAsso`.
FR48: Epic 3 - Objets obligatoires du profil `CREOS` minimal.
FR49: Epic 3 - Regles minimales `CREOS`.
FR50: Epic 3 - Etats minimaux `CREOS`.
FR51: Epic 3 - Evenements minimaux `CREOS`.
FR52: Epic 3 - Commandes minimales `CREOS`.
FR53: Epic 2 et Epic 3 - Publication backend des artefacts commanditaires et consommation/runtime cote `Peintre_nano`.
FR54: Epic 1 et Epic 3 - Source versionnee unique, hierarchie de verite et gouvernance du routage.
FR55: Epic 6 - Parcours cashflow cible.
FR56: Epic 7 - Parcours reception cible.
FR57: Epic 6 et Epic 8 - Cloture de session cote caisse avec articulation vers la sync et la reconciliation comptable.
FR58: Epic 4 - `Bandeau live` comme premiere preuve verticale, avec activation/desactivation admin minimale a ce stade avant convergence ulterieure avec la `config admin simple` d'Epic 9.
FR59: Epic 9 - Module declaration eco-organismes avec mappings configurables et traces.
FR60: Epic 9 - Module adherents / vie associative minimale.
FR61: Epic 4 - Fallback visible pour widget non rendable.
FR62: Epic 4 - Isolation d'erreur pour module non critique.
FR63: Epic 4 - Blocage et mode simple sur flow invalide.
FR64: Epic 2 - Mode restreint explicite sur contexte ambigu ou incomplet.
FR65: Epic 2 - Step-up security pour actions sensibles.
FR66: Epic 8 - Non-blocage terrain par defaut si sync indisponible.
FR67: Epic 8 - Quarantaine et resolution tracee.
FR68: Epic 2 - Priorite de la securite sur la fluidite.
FR69: Epic 8 - Blocage selectif des actions critiques finales.
FR70: Epic 8 - Statuts explicites de cloture et d'ecart critique.
FR71: Epic 2 - Politique PIN v2 et son administration.
FR72: Epic 2 - Revalidation serveur de toute action sensible.
FR73: Epic 1 et Epic 10 - Exigence scindee en deux jalons : fermeture des prerequis de gouvernance contractuelle en Epic 1, puis mise en place effective des validations CI minimales en Epic 10.

### NFR Coverage Map

NFR1: Epic 2 et Epic 8 - Persistance locale `Recyclique` et resilience de synchronisation.
NFR2: Epic 2 et Epic 8 - Zone tampon, retry et reprise apres incident.
NFR3: Epic 2, Epic 6 et Epic 7 - Terrain utilisable sans dependance externe immediate sur les flows critiques.
NFR4: Epic 1 et Epic 2 - Zero fuite de contexte et validite du modele multi-contextes.
NFR5: Epic 3 - Manifests `CREOS` livres avec le build comme source primaire.
NFR6: Epic 2 et Epic 8 - Journalisation des actions sensibles et resolutions manuelles.
NFR7: Epic 4, Epic 6, Epic 7, Epic 8 - Journalisation des fallbacks, blocages et degradations.
NFR8: Epic 4, Epic 8, Epic 10 - Retours exploitables pour support et administration.
NFR9: Epic 8 - Rejeu et comprehensibilite des flux comptables sensibles.
NFR10: Epic 2 et Epic 8 - Schema minimal des journaux critiques et correlation inter-systemes.
NFR11: Epic 6 - Fluidite clavier de la caisse.
NFR12: Epic 3, Epic 5, Epic 6, Epic 7 - Absence de penalite de rendu visible du shell `Peintre_nano`.
NFR13: Epic 3 - Bundle commun acceptable au demarrage.
NFR14: Epic 10 - Installation documentee et reproductible.
NFR15: Epic 10 - Socle lisible et propre pour ouverture communautaire.
NFR16: Epic 10 - Absence de dependance proprietaire au coeur du produit.
NFR17: Epic 10 - Matrice d'environnements officiellement supportes.
NFR18: Epic 10 - Support officiel `Debian`.
NFR19: Epic 1 et Epic 8 - Modele de donnees articulant flux financier et flux matiere.
NFR20: Epic 1 et Epic 2 - Historicisation suffisante pour rejeu, analyse et correlations futures.
NFR21: Epic 6, Epic 7, Epic 8, Epic 10 - Exploitabilite des donnees au grain des totaux et des operations detaillees.
NFR22: Epic 1, Epic 2, Epic 9 - Historisation des mappings sensibles super-admin.
NFR23: Epic 1 et Epic 10 - Base assez propre pour usages analytiques futurs.
NFR24: Epic 1 et Epic 3 - Versionnement `SemVer` des manifests `CREOS`.
NFR25: Epic 1 et Epic 3 - Coordination du versionnement `OpenAPI` / `CREOS`.
NFR26: Epic 3 - Compatibilite explicite manifest/API/`Peintre_nano`.
NFR27: Epic 1 et Epic 10 - Politique de breaking changes et propagation de compatibilite.
NFR28: Epic 3 et Epic 10 - Validation outillee qu'un manifest valide ne casse pas le rendu React.

### Additional Requirements Coverage Map

AR1: Epic 3 - Bootstrap `Peintre_nano` en `React + TypeScript + Vite`.
AR2: Epic 3 et Epic 5 - `CSS Grid` comme moteur global de layout.
AR3: Epic 3 - Implementation sous **ADR P1** (CSS Modules, tokens, Mantine v8) ; `Zustand` selon AR26.
AR4: Epic 3 - Packaging interne initial de `Peintre_nano`.
AR5: Epic 3 et Epic 5 - Coexistence ancien front / nouveau front avec criteres d'extinction.
AR6: Epic 10 - Environnement officiel `Debian` et coeur open source.
AR7: Epic 8 et Epic 10 - Stack cible complete incluant `Paheko`.
AR8: Epic 1 et Epic 8 - Integration `Paheko` uniquement cote backend avec specification de mapping.
AR9: Epic 1 - Matrice operation -> API/plugin/SQL/hors scope et liste des gaps API.
AR10: Epic 9 - `HelloAsso` non bloquant pour l'installation minimale.
AR11: Epic 2 et Epic 8 - Outbox durable `PostgreSQL`, sync `at-least-once`, handlers idempotents.
AR12: Epic 2 et Epic 8 - `Redis` auxiliaire seulement.
AR13: Epic 3, Epic 4, Epic 5, Epic 6, Epic 7 - Ordre d'implementation socle -> preuve modulaire -> recomposition transverse -> gros flows.
AR14: Epic 5, Epic 6, Epic 7 - Migration des ecrans apres stabilisation minimale des contrats et contextes.
AR15: Epic 3 et Epic 5 - Couche d'adaptation Mantine conforme **ADR P1** (pas racine composition).
AR16: Epic 2 et Epic 3 - Sessions same-origin, cookies `httpOnly`, rotation backend, `CSRF`.
AR17: Epic 2, Epic 8, Epic 10 - Logs structures et `X-Correlation-ID`.
AR18: Epic 10 - Workflows CI minimums.
AR19: Epic 1 et Epic 2 - `Recyclique` writer canonique du schema `OpenAPI`.
AR20: Epic 3 et Epic 10 - Chaine `OpenAPI` -> codegen frontend couverte tres tot puis outillee.
AR21: Epic 2 et Epic 3 - Conventions JSON, dates et enveloppe d'erreur.
AR22: Epic 3 et Epic 5 - Gouvernance de transition des routes brownfield/v2.
AR23: Epic 2 et Epic 3 - Autorite auth/permissions `Recyclique` et adaptateur auth/session explicite cote `Peintre_nano`.
AR24: Epic 2, Epic 6, Epic 8 - `Idempotency-Key` et step-up security par domaine.
AR25: Epic 2 - Rate limiting sur surfaces sensibles.
AR26: Epic 3 - `Zustand` limite a l'etat UI ephemere.
AR27: Epic 1 et Epic 3 - Separation nette des contrats `OpenAPI` et `CREOS`.
AR28: Epic 1 et Epic 3 - Mecanisme partage d'enums et d'identifiants.
AR29: Epic 3 - Source reviewable `CREOS` et copie derivee seulement dans `src/generated`.
AR30: Epic 3 - Registre unique de routes `Peintre_nano` et rejection des collisions.
AR31: Epic 3 et Epic 5 - Widgets serialisables et contrats verifiables.
AR32: Epic 4 et Epic 5 - Echecs de manifest/contrat visibles et non silencieux.
AR33: Epic 5, Epic 9, Epic 10 - Integrations externes, notamment email, via backend `Recyclique`.
AR34: Epic 3 - `PageTemplate`, `ZoneRole`, `LayoutComposition` prepares mais non prerequis du socle minimal.
AR35: Epic 10 - Couverture unitaire, contrat, integration, e2e et enforcement des patterns d'architecture.
AR36: Epic 1 - Dependances encore a formaliser ou verifier avant implementation large.
AR37: Epic 10 - Gates beta interne et v2 vendable traçables dans le backlog.
AR38: Epic 3, Epic 5, Epic 10 - Hors-scope v2 a ne pas reinjecter implicitement dans le backlog de socle.
AR39: Epic 1 et Epic 3 - Hierarchie de verite explicite entre `OpenAPI`, `ContextEnvelope`, `NavigationManifest`, `PageManifest` et `UserRuntimePrefs`.
AR40: Epic 3 - Story 0 centree sur les quatre artefacts minimaux du socle `Peintre_nano`.
AR41: Epic 3 et Epic 5 - `Peintre_nano` borne a son role de runtime d'affichage agnostique.
AR42: Epic 2 et Epic 3 - `ContextEnvelope` canonique dans `OpenAPI`, puis consomme cote runtime sans seconde verite.
AR43: Epic 3 - `UserRuntimePrefs` borne a la personnalisation locale hors permissions/navigation.
AR44: Epic 4 avec prerequis Epic 1 et Epic 2 - `Bandeau live` coherent avec horaires reels, ouvertures decalees et cas particuliers.
AR45: Epic 9 (Story 9.6) et Epic 2 (API / persistance) - Surcharges config admin simple en PostgreSQL, fusion manifests build, tracabilite (**ADR P2**).
AR46: Voir **formulation complete** dans l'inventaire **Additional Requirements** (paragraphe AR46) ; **mapping epics** : 1, 2, 3, 4, 6, 7.

## Epic List

### Epic 1: Fermer les prerequis structurants et valider le modele de donnees multi-contextes
**Piste B.** L'equipe peut verrouiller les inconnues critiques du projet avant implementation large, avec livrables explicites : audit backend/API/donnees, retro `Paheko`, spec multi-contextes, validite des structures de donnees multi-sites/multi-caisses/multi-postes, continuite et integrite des donnees brownfield, contrat de sync/reconciliation, gouvernance `OpenAPI` / `CREOS`, hierarchie de verite, source canonique de `ContextEnvelope`, et formalisation des signaux de contexte/exploitation necessaires aux vues live (horaires reels, ouvertures decalees, cas particuliers) ainsi que la matrice d'arbitrage API/plugin/SQL. Inclut la **formalisation du fichier reviewable** `contracts/openapi/recyclique-api.yaml` (draft, `operationId` stables) en coherence avec la Story 1.4.
Pour `FR73`, cet epic ferme le cadrage, les schemas minimaux et la gouvernance ; la mise en place effective des validations CI minimales se termine ensuite en Epic 10.
**FRs covered:** FR5, FR11, FR20, FR22, FR36, FR40, FR41, FR54, FR73 (jalon gouvernance)

### Epic 2: Poser le socle backend brownfield v2
**Piste B.** L'equipe peut stabiliser `Recyclique` comme noyau d'autorite v2 pour l'authentification, les contextes, les permissions, la securite sensible, la persistance terrain, l'audit et les invariants metier, afin de fournir un backend fiable aux futurs modules. Cet epic porte aussi l'exposition backend minimale necessaire aux vues live et slices verticaux initiaux, notamment les signaux et contrats permettant au `bandeau live` de refleter les horaires reels, ouvertures decalees et cas particuliers formalises en Epic 1.
**FRs covered:** FR1, FR3, FR11, FR12, FR13, FR14, FR15, FR16, FR20, FR22, FR23, FR31, FR32, FR33, FR34, FR53, FR64, FR65, FR68, FR71, FR72

### Epic 3: Poser le socle frontend greenfield `Peintre_nano`
**Piste A** — le moteur UI et la composition peuvent etre valides avec **donnees mockées** et **stubs** de `ContextEnvelope` / session tant que la **Convergence 1** n'est pas livree ; aucune story de cet epic n'exige des **endpoints metier reels** pour la seule preuve du registre, des slots, du shell, des fallbacks ou des manifests minimaux. L'equipe peut mettre en service un runtime UI v2 minimal mais reel, avec `Peintre_nano`, `CREOS`, registre de routes, widgets, slots, contrat de rendu et adaptateur auth/session, afin que toute l'UI v2 puisse ensuite etre recomposee sur une base propre. Cet epic inclut explicitement la Story 0 de socle autour de quatre artefacts minimaux (`NavigationManifest`, `PageManifest`, `ContextEnvelope`, `UserRuntimePrefs`), une preuve d'affichage initiale (page blanche de shell, grille visible, premiers widgets/catalogue simples, rendu via manifest minimal, fallbacks visuels), et le respect strict du bornage commanditaire/runtime. L'affichage effectif doit rester l'intersection deterministe du contrat commanditaire, du `ContextEnvelope` (reel ou **mock coherent** avant convergence) et des `UserRuntimePrefs` non metier.
**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR37, FR45, FR48, FR49, FR50, FR51, FR52, FR53, FR54

### Epic 4: Prouver la chaine modulaire complete avec `bandeau live`
**Convergence A + B — jalon 2** (= **Convergence 2** dans l'Overview ; meme gate) (apres **Convergence 1** contrat/interface). L'equipe peut prouver en vrai la chaine complete backend -> contrat -> manifest -> runtime -> rendu -> fallback, afin de valider le socle modulaire avant de migrer les flows critiques et les autres modules. Cette preuve inclut un `bandeau live` dont l'etat d'exploitation reste coherent avec les horaires reels, les ouvertures decalees et les cas particuliers, sur la base des prerequis de contrats et de contexte poses par Epics 1 et 2, ainsi qu'un mecanisme minimal d'activation/desactivation admin du module avant que la `config admin simple` complete soit livree plus largement par Epic 9. **Gate decision directrice** : tant que ce slice ne prouve pas la chaine (y compris polling, fallback endpoint, `correlation_id`), ne pas elargir aux gros flows.
Dans cet epic, `FR38` n'est couvert que pour le volet `bandeau live` en tant que premier module obligatoire et preuve de chaine, pas pour l'ensemble des modules obligatoires de la v2.
**FRs covered:** FR10, FR17, FR18, FR19, FR38, FR58, FR61, FR62, FR63

### Epic 5: Recomposer le shell, le dashboard et l'administration existants dans `Peintre_nano`
Les utilisatrices et responsables peuvent retrouver les pages transverses de `Recyclique` dans une UI composee `Peintre_nano` : shell global, navigation, dashboard, pages admin, listings, cartes, statistiques et points d'entree vers les autres ecrans, avec respect du contexte, des contraintes de rendu en `CSS Grid`, du blueprint `workflow explicite -> PageManifest / navigation contractuelle -> layout`, et du principe que la navigation/structure metier viennent de `Recyclique` via contrats commanditaires.
**FRs covered:** FR10, FR21, FR35

### Epic 6: Rendre la caisse v2 exploitable et enrichie par les besoins terrain
**Convergence 3 (flows critiques).** Les operatrices peuvent utiliser dans `Peintre_nano` une caisse v2 **brownfield-first**, structuree comme un workflow operatoire continu : dashboard caisse, ouverture, poste de vente, finalisation, cloture locale et supervision admin session. `FlowRenderer`, manifests et widgets restent des mecanismes d'implementation ; ils ne definissent pas la forme produit a eux seuls. Les widgets caisse sensibles (ex. ticket courant / paiement) peuvent declarer `data_contract.critical: true` : l'etat **DATA_STALE** ou incoherence contractuelle **bloque** les actions sensibles conformement au PRD §10 et a l'instruction contrats donnees.
**FRs covered:** FR2, FR10, FR30, FR38, FR55, FR57

### Epic 7: Rendre la reception v2 exploitable dans la nouvelle chaine UI
**Convergence 3 (flows critiques).** Les operatrices peuvent utiliser la reception dans `Peintre_nano` avec ses ecrans, workflows explicites, definitions d'ecrans, saisies et contextualisation metier, en respectant les contraintes du flux matiere et l'architecture modulaire retenue — memes principes **donnees reelles**, raccourcis, fallbacks visibles et `data_contract` / etats `WidgetDataState` que pour la caisse lorsque pertinent.
**FRs covered:** FR2, FR10, FR29, FR30, FR38, FR56

### Epic 8: Fiabiliser l'articulation comptable reelle avec `Paheko`
Les responsables peuvent synchroniser, suivre, corriger et reconcilier les operations entre `Recyclique` et `Paheko`, avec etats explicites, quarantaine, blocages selectifs, correlation inter-systemes et schema de deploiement cible.
**FRs covered:** FR4, FR10, FR24, FR25, FR26, FR27, FR28, FR30, FR38, FR39, FR42, FR43, FR57, FR66, FR67, FR69, FR70

### Epic 9: Livrer les modules metier complementaires v2
Les responsables et super-admins peuvent utiliser les modules metier complementaires attendus pour une v2 credible : declaration eco-organismes, adherents / vie associative minimale, integration `HelloAsso` et config admin simple, avec arbitrage `HelloAsso` explicite avant implementation large du connecteur.
**FRs covered:** FR10, FR30, FR38, FR44, FR46, FR47, FR59, FR60
**NFR/AR cles:** AR45 (persistance surcharges config admin simple, **ADR P2** ; prerequis backend Epic 2 / `PostgreSQL`)

### Epic 10: Industrialiser, valider et rendre la v2 deployable
L'equipe peut verifier, tester, observer, deployer et qualifier la v2 jusqu'aux gates de beta interne et de version vendable, sans laisser les contraintes de qualite, CI, observabilite, installabilite et readiness des modules obligatoires hors backlog.
**FRs covered:** FR10, FR38, FR73 (jalon CI/readiness)
**NFR/AR cles:** NFR14, NFR15, NFR16, NFR17, NFR18, NFR27, NFR28, AR18, AR35, AR37

## Module Obligatoire Map

- `bandeau live` -> Epic 4
- `cashflow` -> Epic 6
- `reception flow` -> Epic 7
- `synchronisation Paheko` -> Epic 8
- `declaration eco-organismes` -> Epic 9
- `adherents / vie associative minimale` -> Epic 9
- `integration HelloAsso` -> Epic 9
- `config admin simple` -> Epic 9
- `validation readiness / deployabilite des modules obligatoires` -> Epic 10

## Epic Sequencing Notes

Ordre de construction recommande :

1. Epic 1 ferme les prerequis structurants et la validite des structures de donnees.
2. Epic 2 pose le socle backend brownfield.
3. Epic 3 pose le socle frontend greenfield `Peintre_nano`, avec un jalon d'affichage initial : shell vide, grille visible, widgets simples de catalogue, manifest minimal et fallbacks de rendu.
4. Epic 4 prouve la chaine modulaire avec `bandeau live`.
5. Epic 5 recompose le shell, le dashboard et les pages admin/transverses.
6. Epic 6 porte la caisse v2, avec cloture locale exploitable et point de raccord clair vers Epic 8.
7. Epic 7 porte la reception v2 avec workflow explicite et definitions d'ecrans.
8. Epic 8 branche et fiabilise la sync/reconciliation comptable reelle avec `Paheko`.
9. Epic 9 livre les modules metier complementaires v2.
10. Epic 10 ferme la validation, l'industrialisation et les gates de sortie.

Regles de dependance :

- Epic 6 et Epic 7 ne doivent pas dependre de stories futures du meme epic ; ils peuvent demarrer sur une cloture locale exploitable et une sync differee ou encadree tant que le contrat de synchronisation est deja pose au niveau documentaire par Epic 1, sans attendre la livraison complete des stories d'Epic 8.
- La Story 0 d'Epic 3 peut demarrer en **Piste A** avec **stubs** de types / manifests locaux et `ContextEnvelope` **mock** coherent ; pour l'**integration reelle** (hooks sur API, contexte serveur autoritatif), viser la **Convergence 1** : schema `OpenAPI` draft (`recyclique-api.yaml`), `ContextEnvelope` dans OpenAPI, et conventions de validation/merge fermees par Epics 1 et 2.
- Epic 4 peut s'appuyer sur un toggle admin minimal borne au slice `bandeau live` pour satisfaire FR58 ; la `config admin simple` generalisee et reusable reste, elle, dans le perimetre principal d'Epic 9.
- Epic 8 ne doit pas re-definir les contextes, l'auth ou le runtime UI ; il s'appuie sur Epics 1 a 4.
- Epic 9 ne doit pas lancer l'implementation `HelloAsso` large avant la story d'arbitrage prevue par FR47.
- Epic 10 porte principalement des NFRs, ARs et gates de sortie ; il couvre notamment CI, installabilite, matrice d'environnements supportes, observabilite, validation de readiness des modules obligatoires et criteres de beta interne / v2 vendable ; il ne doit pas devenir un fourre-tout pour du metier non planifie ailleurs.

Jalon d'affichage initial a prevoir dans Epic 3 :

- page blanche chargee dans le shell `Peintre_nano` avec grille visible et zones nommees ;
- premiers widgets de catalogue local, par exemple `TextBlock`, `Card`, `KpiCard`, `ListBlock` ou equivalent ;
- affichage de ces widgets dans la grille a partir d'une configuration/manifeste minimal ;
- fallback visible pour slot vide, widget inconnu ou manifest invalide ;
- page de demonstration ou bac a sable d'affichage permettant de verifier progressivement le rendu avant l'injection des vrais modules metier.

**Voir aussi — pilotage d'exécution :** [`guide-pilotage-v2.md`](guide-pilotage-v2.md) réconcilie la **préférence séquentielle** (décision directrice / PRD §12) avec les **Pistes A/B** et les **Convergences** ; cases à cocher aux **jalons** (grain fin dans `implementation-artifacts/sprint-status.yaml`) ; carte des emplacements pour audits, données et rapports de tests.

## Epic 1: Fermer les prerequis structurants et valider le modele de donnees multi-contextes

L'equipe peut verrouiller les inconnues critiques du projet avant implementation large, avec livrables explicites : audit backend/API/donnees, retro `Paheko`, spec multi-contextes, validite des structures de donnees multi-sites/multi-caisses/multi-postes, continuite et integrite des donnees brownfield, contrat de sync/reconciliation, gouvernance `OpenAPI` / `CREOS`, hierarchie de verite, source canonique de `ContextEnvelope`, et formalisation des signaux de contexte/exploitation necessaires aux vues live (horaires reels, ouvertures decalees, cas particuliers) ainsi que la matrice d'arbitrage API/plugin/SQL.

### Story 1.1: Cadrer la surface de travail v2 et le mode de reference Paheko

As a core developer,
I want a documented and approved working surface for local development and tests,
So that the team can implement v2 against a stable reference without ambiguity between `Paheko` runtime, Docker services, and extracted SQLite artifacts.

**Acceptance Criteria:**

**Given** the project needs a practical baseline for dev, test, and architecture validation
**When** the team reviews the local execution options around `Paheko`
**Then** the story produces a decision note that states which setup is the default reference for day-to-day work between a live `Paheko` service in Docker, a local standalone instance, or a recovered SQLite-only reference
**And** the note explains the intended use of each option for development, integration testing, reverse engineering, and troubleshooting

**Given** a chosen reference mode for `Paheko`
**When** the working surface is documented
**Then** the required services, minimum startup sequence, expected data sources, and ownership of test data are explicitly listed
**And** the document states what is in scope for local implementation before full end-to-end sync is available

**Given** the project will need repeatable tests and programming sessions
**When** the working surface is approved
**Then** it defines a default path that future stories can rely on without reopening the environment decision
**And** any remaining alternative setups are marked as optional, transitional, or analysis-only

### Story 1.2: Auditer le brownfield backend, l'API existante et les donnees critiques

As a technical lead,
I want a focused brownfield audit of backend, API, and critical data structures,
So that v2 can reuse what is stable and isolate what must be refactored before contract-driven implementation starts.

**Acceptance Criteria:**

**Given** `recyclique-1.4.4` remains the brownfield baseline for critical business logic
**When** the audit is completed
**Then** it identifies the current entry points, domains, data structures, and flows relevant to `cashflow`, `reception`, auth, permissions, context, and sync
**And** it distinguishes reusable assets, fragile areas, and blocking unknowns

**Given** future frontend and contract work must not depend on unstable internals
**When** the audit findings are written
**Then** they highlight which existing backend surfaces are safe to expose or adapt first
**And** they list the areas where DTOs or contracts must be stabilized before large UI migration begins

**Given** Epic 1 should reduce implementation risk rather than restate the whole codebase
**When** the audit report is finalized
**Then** it contains a prioritized issue list with concrete consequences for Epics 2, 3, 6, 7, and 8
**And** it avoids broad technical inventory with no decision value

### Story 1.3: Specifier le modele multi-contextes et les invariants d'autorisation v2

As a backend and product team,
I want a canonical v2 specification for contexts, roles, groups, permissions, and sensitive revalidation,
So that all future epics share the same security and isolation model.

**Acceptance Criteria:**

**Given** v2 depends on strict isolation between sites, caisses, sessions, postes, and operators
**When** the multi-context specification is published
**Then** it defines the minimal canonical entities and fields for `site`, `caisse`, `session`, `poste de reception`, `role`, `groupe`, `permissions`, and `PIN`
**And** it states the zero-leakage invariants and context-switch rules that future implementations must preserve

**Given** permissions in v2 are additive and computed by `Recyclique`
**When** the authorization model is described
**Then** the story formalizes stable technical keys, customizable labels, multi-group membership, and backend authority over effective permissions
**And** it states that UI labels never act as security truth

**Given** sensitive actions require stronger guarantees than display-level filtering
**When** the security rules are finalized
**Then** they define the minimum step-up behaviors for confirmation, PIN, or role revalidation
**And** they specify when the system must block, degrade, or force explicit recalculation of context

### Story 1.4: Fermer la gouvernance contractuelle `OpenAPI` / `CREOS` / `ContextEnvelope`

As a platform architect,
I want the contract governance for backend data and UI composition to be explicit and reviewable,
So that Epic 2 and Epic 3 can build on one hierarchy of truth instead of inventing parallel models.

**Acceptance Criteria:**

**Given** the project uses both `OpenAPI` and `CREOS`
**When** the governance rules are documented
**Then** the story states the authoritative owner, canonical location, and usage boundary for `OpenAPI`, `ContextEnvelope`, `NavigationManifest`, `PageManifest`, and `UserRuntimePrefs`
**And** it formalizes the truth hierarchy already assumed by the architecture

**Given** future agents and developers will generate, validate, and consume these artifacts
**When** the contract governance is closed
**Then** the story defines versioning expectations, drift detection expectations, and the rule that generated frontend artifacts are derived copies, never a second source of truth
**And** it specifies how shared enums, identifiers, and permission keys flow from backend contracts to UI contracts

**Given** les manifests widgets peuvent declarer un `data_contract` lie a l'API
**When** la gouvernance est fermee
**Then** le projet designe le fichier reviewable `contracts/openapi/recyclique-api.yaml` comme **source reviewable** de la surface v2 (draft evolutif, writer `Recyclique`) et impose des **`operationId` stables** sur les operations exposees, references par `data_contract.operation_id`
**And** les schemas CREOS incluent l'extension documentee dans `contracts/creos/schemas/widget-declaration.schema.json`

**Given** `Peintre_nano` must not become author of business structure
**When** the runtime responsibilities are specified
**Then** the story confirms that runtime resolution may validate, merge, filter, reject, and render contracts
**And** it forbids runtime creation of business routes, permissions, or pages absent from commanditaire contracts

### Story 1.5: Definir le contrat minimal de synchronisation et reconciliation avec `Paheko`

As a product and integration team,
I want a minimal but explicit sync and reconciliation contract between `Recyclique` and `Paheko`,
So that terrain-first workflows can proceed safely before full accounting integration is implemented.

**Acceptance Criteria:**

**Given** terrain operations are recorded in `Recyclique` first and synced later when needed
**When** the sync contract is formalized
**Then** it defines the minimum lifecycle of a synchronized operation, including local recording, retry, quarantine, resolution, rejection, and final accounting state
**And** it specifies the role of durable outbox, idempotency, and correlation identifiers

**Given** some critical actions may eventually be blocked on accounting guarantees
**When** the reconciliation rules are documented
**Then** the story distinguishes non-blocking local acceptance, selective blocking of critical final actions, and manual resolution workflows
**And** it defines the minimum audit trail required for quarantine lifts and manual corrections

**Given** Epics 6 and 7 must not wait for Epic 8 to invent core sync semantics
**When** this story is approved
**Then** later stories can rely on a stable documentary sync contract
**And** they can implement local closure and deferred sync without redefining business accounting states

### Story 1.6: Produire la matrice d'integration `Paheko` et les gaps API reels

As a technical decision maker,
I want a clear operation-by-operation matrix for `Paheko` integration choices,
So that the project can prefer official APIs and only justify plugin or SQL usage when truly necessary.

**Acceptance Criteria:**

**Given** the product follows an API-first strategy for `Paheko`
**When** the integration matrix is produced
**Then** each major business operation is classified as covered by official API, requiring a minimal plugin, limited to SQL analysis/admin usage, or out of v2 scope
**And** unsupported assumptions are excluded from the default path

**Given** integration complexity can drift if not constrained early
**When** the matrix is reviewed
**Then** it includes a concrete list of real API gaps and unknowns that still need validation
**And** each gap is tied to a product consequence or backlog consequence

**Given** plugin usage is allowed only by exception
**When** a need for plugin extension is identified
**Then** the story requires an explicit rationale showing why the official API is insufficient
**And** it prevents SQL transactional writes from becoming the nominal implementation path

### Story 1.7: Formaliser les signaux d'exploitation pour `bandeau live` et les premiers slices

As a module and frontend team,
I want the operational signals needed by `bandeau live` and early slices to be defined before implementation,
So that Epic 4 can prove the modular chain with real business context instead of guessed display logic.

**Acceptance Criteria:**

**Given** the first vertical proof depends on live operational context
**When** the required signals are specified
**Then** the story defines the minimum data needed to represent opening hours, delayed openings, exceptional cases, sync state, and context visibility for `bandeau live`
**And** it identifies which signals come from backend authority versus local runtime presentation

**Given** `bandeau live` must remain coherent with real operations
**When** edge cases are listed
**Then** the specification covers caisses ouvertes plus tard, atypical openings, unavailable external state, and explicit degraded modes
**And** it avoids any silent assumption that a caisse is active only because it exists on the day

**Given** Epic 4 should validate the modular chain without reopening architecture debates
**When** this story is completed
**Then** the first slice can consume a documented contract for operational signals
**And** later modules reuse the same rules for visibility, fallback, and traceability where relevant

## Epic 2: Poser le socle backend brownfield v2

L'equipe peut stabiliser `Recyclique` comme noyau d'autorite v2 pour l'authentification, les contextes, les permissions, la securite sensible, la persistance terrain, l'audit et les invariants metier, afin de fournir un backend fiable aux futurs modules. Cet epic porte aussi l'exposition backend minimale necessaire aux vues live et slices verticaux initiaux, notamment les signaux et contrats permettant au `bandeau live` de refleter les horaires reels, ouvertures decalees et cas particuliers formalises en Epic 1.

> **Exécution et dossier canonique (Correct Course 2026-04-03) :** jusqu'à la story **2.2b**, le développement backend Epic 2 résidait sous `recyclique-1.4.4/api/` (voir `references/artefacts/2026-04-03_01_decision-backend-story-2-1-recyclique-1.4.4-vs-canonical.md`). **Depuis la migration 2.2b (2026-04-03),** le package vivant FastAPI (`recyclic_api`, tests, Alembic) est sous **`recyclique/api/`** à la racine du mono-repo (`_bmad-output/planning-artifacts/architecture/project-structure-boundaries.md`). **Depuis la story 10.6b (2026-04-07),** la stack Docker de développement **`recyclic-local`** se lance depuis le **`docker-compose.yml` à la racine du mono-repo** ; `recyclique-1.4.4/docker-compose.yml` est un fichier de compatibilité qui inclut ce compose. **Ordre suite 2.2b :** poursuivre **2.3** à **2.7**. Référence historique : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-03.md`.

### Story 2.1: Poser le socle de session web v2 et l'autorite d'authentification backend

As a frontend and backend team,
I want `Recyclique` to expose the v2 session/auth foundation under backend authority,
So that all future UI work can rely on a secure and stable authentication model without moving security logic into `Peintre_nano`.

**Acceptance Criteria:**

**Given** v2 authentication remains under `Recyclique` authority
**When** the session foundation is implemented
**Then** the backend provides the minimal endpoints and middleware needed for authenticated same-origin web sessions
**And** session transport follows the chosen secure cookie strategy with backend-managed lifecycle

**Given** old and new frontend surfaces may temporarily coexist
**When** the auth foundation is documented and exposed
**Then** it supports the transition model without duplicating the source of truth for authentication
**And** it avoids pushing credential or authorization decisions into frontend runtime state

**Given** future stories will depend on a stable auth base
**When** this story is completed
**Then** Epic 3 can consume a clear auth/session contract
**And** later business stories do not need to redefine login/session ownership

### Story 2.2: Implementer le `ContextEnvelope` backend minimal et le recalcul explicite de contexte

As a composed UI runtime,
I want `Recyclique` to expose a canonical `ContextEnvelope` and explicit context refresh behavior,
So that the frontend can render only what is valid for the active site, caisse, session, poste, and operator.

**Acceptance Criteria:**

**Given** the v2 truth hierarchy requires backend-owned context
**When** the minimal `ContextEnvelope` contract is implemented
**Then** it exposes the canonical context fields, calculated permissions, and UI-relevant state agreed in Epic 1
**And** its schema is published through the governed backend contract path

**Given** sensitive context changes must never be implicit
**When** site, caisse, session, or poste changes
**Then** the backend supports explicit reload or recalculation of the active context
**And** incomplete or ambiguous context yields an explicit restricted or degraded state rather than a silent guess

**Given** future UI composition depends on safe context resolution
**When** this story is delivered
**Then** Epic 3 and Epic 5 can consume one authoritative context payload
**And** later epics do not need to invent parallel frontend context models

### Story 2.2b: Migrer le package API vers le dossier canonique `recyclique/` (racine mono-repo)

As a platform team,
I want the live FastAPI package to live under the canonical `recyclique/` root path with CI, compose and Story Runner gates updated,
So that there is a single authoritative backend location in the repo before contract-heavy stories (2.6+) and no long-term drift between brownfield path and architecture.

**Acceptance Criteria:**

**Given** the architecture names `recyclique/` at repo root as the nominal backend layout
**When** the migration story is completed
**Then** the application code, tests and tool configuration used for Epic 2 gates point to `recyclique/` (or documented symlinks only if explicitly justified)
**And** `recyclique-1.4.4/api/` is no longer the active development root for new work (archived, README redirect, or equivalent)

**Given** Docker and local dev flows depend on paths
**When** compose and env docs are updated
**Then** developers can run the API from the new location with the same or clearly migrated env vars
**And** no duplicate mutable backend trees remain without an explicit decision note

**Given** Epic Runner and briefs use absolute paths
**When** this story closes
**Then** default gate commands in Story Runner briefs for Epic 2 target the new `recyclique/` package root
**And** `sprint-status.yaml` and this epic remain consistent with the story key `2-2b-migrer-le-backend-vers-recyclique-racine-mono-repo`

### Story 2.3: Mettre en place le calcul additif des roles, groupes et permissions effectives

As a product administrator and security model owner,
I want `Recyclique` to compute effective permissions from roles, groups, and context,
So that authorization remains stable, explainable, and adaptable per ressourcerie.

**Acceptance Criteria:**

**Given** v2 uses configurable roles and simple groups per ressourcerie
**When** the authorization model is implemented
**Then** each role and group uses a stable technical key distinct from the displayed label
**And** a user can belong to multiple groups without breaking permission calculation

**Given** the permission model is additive in v2
**When** effective permissions are calculated
**Then** the backend computes the union of permissions granted by assigned roles and groups within the active perimeter
**And** the resulting permission keys are the only authorization truth exposed to the UI

**Given** labels may be customized locally
**When** labels and keys are exposed in backend responses
**Then** the implementation keeps labels non-authoritative for security decisions
**And** it preserves isolation across sites and administrative scopes

### Story 2.4: Encadrer les actions sensibles avec step-up security, PIN et idempotence

As a security-sensitive business system,
I want `Recyclique` to enforce step-up rules for sensitive actions,
So that critical operations remain safe even if the UI is bypassed, retried, or misused.

**Acceptance Criteria:**

**Given** some operations require stronger guarantees than basic authenticated access
**When** a sensitive mutation is executed
**Then** the backend enforces the configured step-up rule such as confirmation, PIN, or role revalidation
**And** the decision is made server-side even if the UI already filtered the action

**Given** replay and double-submission risks exist on sensitive flows
**When** protected mutations are processed
**Then** they support an idempotency or request-trace mechanism suitable for audit and duplicate protection
**And** failure or refusal states are returned with stable backend semantics usable by the future UI

**Given** PIN is part of the minimal v2 model
**When** PIN-backed actions are handled
**Then** PIN usage is traceable, never logged in clear text, and governed by backend-configurable rules
**And** repeated failure handling follows the security policy defined for v2

### Story 2.5: Stabiliser la persistance terrain locale, l'audit et les journaux critiques

As a terrain-first platform,
I want local operations to remain durably recorded in `Recyclique` with usable audit trails,
So that business activity continues even when downstream integrations are delayed or unavailable.

**Acceptance Criteria:**

**Given** terrain workflows record data in `Recyclique` before accounting synchronization
**When** the persistence foundation is stabilized
**Then** local business operations can be durably stored without requiring immediate external confirmation
**And** the implementation preserves the future ability to replay, analyze, and correlate critical events

**Given** support and supervision require readable traces
**When** critical actions, degradations, and sensitive events are logged
**Then** the logs include at minimum context identifiers, actor identity, operation type, outcome state, and correlation information
**And** sensitive data is masked where it is not operationally required

**Given** future sync and correction workflows depend on trustworthy history
**When** this story is completed
**Then** later stories can rely on a backend audit baseline rather than inventing local logging ad hoc
**And** Epic 8 can build on explicit persisted states instead of implicit behavior

### Story 2.6: Exposer les premiers contrats backend versionnes pour les slices v2

As a contract-driven frontend team,
I want `Recyclique` to expose the first versioned backend contracts needed by the v2 runtime,
So that `Peintre_nano` can consume generated types and business-safe payloads early.

**Acceptance Criteria:**

**Given** the backend is the writer canonique of `OpenAPI`
**When** the first v2 contract surfaces are stabilized
**Then** the backend publishes versioned schemas for the minimal auth/session, `ContextEnvelope`, error envelope, and early operational states needed by the frontend
**And** those schemas follow the agreed naming, date, and error-shape conventions

**Given** frontend codegen must use one outilled source
**When** the contract output is generated
**Then** it flows through the governed artifact path rather than ad hoc handwritten DTO copies
**And** breaking or drifting contract changes become detectable by later CI work

**Given** Epic 3 depends on a real backend contract base
**When** this story is accepted
**Then** the frontend epic can start from real generated inputs instead of speculative mock structures
**And** future slices remain anchored to backend-owned semantics

### Story 2.7: Fournir les signaux backend minimaux pour `bandeau live`

As a first vertical slice team,
I want `Recyclique` to expose the operational backend signals required by `bandeau live`,
So that Epic 4 can prove the chain on real backend-owned information rather than UI assumptions.

**Acceptance Criteria:**

**Given** `bandeau live` must reflect actual operational state
**When** the backend live signal surface is implemented
**Then** it exposes the minimum agreed indicators for opening hours, delayed openings, exceptional cases, context validity, and relevant sync state
**And** the payload distinguishes authoritative business state from presentational concerns

**Given** the live module should stay honest in degraded situations
**When** required data is missing, stale, or ambiguous
**Then** the backend returns an explicit status that allows visible fallback or restricted display
**And** it avoids silent interpretation that could mislead operators about caisse activity

**Given** Epic 4 is only a proof slice and not a full monitoring suite
**When** this story is delivered
**Then** the backend surface stays minimal and sufficient for the first module proof
**And** it does not absorb unrelated admin or dashboard requirements that belong to later epics

## Epic 3: Poser le socle frontend greenfield `Peintre_nano`

**Voir aussi — pilotage d'exécution :** [`guide-pilotage-v2.md`](guide-pilotage-v2.md) (deux récits de rythme, convergences, jalons, carte documentaire) — complément au bloc **Epic Sequencing Notes** plus haut dans ce fichier.

L'equipe peut mettre en service un runtime UI v2 minimal mais reel, avec `Peintre_nano`, `CREOS`, registre de routes, widgets, slots, contrat de rendu et adaptateur auth/session, afin que toute l'UI v2 puisse ensuite etre recomposee sur une base propre. Cet epic inclut explicitement la Story 0 de socle autour de quatre artefacts minimaux (`NavigationManifest`, `PageManifest`, `ContextEnvelope`, `UserRuntimePrefs`), une preuve d'affichage initiale (page blanche de shell, grille visible, premiers widgets/catalogue simples, rendu via manifest minimal, fallbacks visuels), et le respect strict du bornage commanditaire/runtime. L'affichage effectif doit rester l'intersection deterministe du contrat commanditaire, du **`ContextEnvelope` d'autorite backend** (ou **mock / stub structurellement aligne** sur le schema OpenAPI avant **Convergence 1**, comme en Story 3.4) et des `UserRuntimePrefs` non metier.

### Story 3.0: Initialiser `Peintre_nano` et ses quatre artefacts minimaux

As a frontend platform team,
I want a runnable `Peintre_nano` foundation with the four minimal artifacts wired conceptually,
So that the v2 frontend starts from a real runtime base rather than scattered prototypes.

**Acceptance Criteria:**

**Given** `Peintre_nano` is the new frontend v2
**When** the frontend foundation is initialized
**Then** the repository contains a runnable `React` + `TypeScript` + `Vite` app structure aligned with the agreed project boundaries
**And** the app clearly separates app shell, routing, auth, context, layouts, runtime, validation, registry, widgets, slots, and generated contract consumption areas

**Given** the socle v2 distinguishes four minimal artifacts
**When** Story 3.0 is completed
**Then** the frontend foundation is explicitly organized around `NavigationManifest`, `PageManifest`, `ContextEnvelope`, and `UserRuntimePrefs`
**And** each artifact has a defined ownership and runtime responsibility consistent with the agreed truth hierarchy

**Given** this story is the entry point for all later UI work
**When** the initial frontend base is accepted
**Then** future stories can extend one coherent runtime instead of creating competing shell experiments
**And** no business route, permission, or structure is hardcoded as a replacement for commanditaire contracts

### Story 3.1: Mettre en place le shell initial et le layout `CSS Grid`

As a frontend runtime,
I want a minimal shell and layout system based on `CSS Grid`,
So that pages can be composed in named zones before business modules are migrated.

**Acceptance Criteria:**

**Given** `CSS Grid` is mandatory for the v2 layout engine
**When** the shell foundation is implemented
**Then** the app renders a visible root shell with named layout regions and a deterministic grid-based page structure
**And** the shell is usable before any real business module is plugged in

**Given** the first milestone must prove actual rendering, not only file scaffolding
**When** the shell starts successfully
**Then** it displays a blank or demo page with visible layout zones that make future slot composition inspectable
**And** it avoids introducing business logic hidden inside the shell

**Given** later epics will reuse the same composition surface
**When** this story is completed
**Then** Epic 4 and Epic 5 can build on one shell contract
**And** migration work does not need to reinvent page framing per domain

### Story 3.2: Implementer le chargement et la validation minimale des manifests de navigation et de page

As a contract-driven UI engine,
I want `Peintre_nano` to load and validate `NavigationManifest` and `PageManifest`,
So that navigation and page composition come from reviewable contracts instead of ad hoc frontend code.

**Acceptance Criteria:**

**Given** `recyclique` remains author of structural business information
**When** manifest loading is implemented
**Then** the frontend consumes `NavigationManifest` and `PageManifest` as external commanditaire inputs
**And** route or page structure is not invented locally outside these contracts

**Given** runtime resolution must remain deterministic and reject incoherence
**When** manifests are validated
**Then** collisions on `route_key`, `path`, `page_key`, or shortcuts are detected before activation
**And** unresolved page links, unknown widgets, or structurally invalid manifests trigger explicit rejection behavior

**Given** contract safety matters before UI richness
**When** this story is delivered
**Then** the loader favors traceable validation and clear errors over permissive silent fallback
**And** later stories can plug real contracts into a governed runtime path

### Story 3.3: Implementer le registre minimal de widgets, slots et rendu declaratif

As a modular UI platform,
I want a minimal registry for widgets and slots with declarative rendering,
So that page manifests can render a first catalogue of safe UI blocks.

**Acceptance Criteria:**

**Given** the v2 runtime depends on slots and widget declarations
**When** the minimal registry is implemented
**Then** the frontend can resolve known widget types into renderable components within named slots
**And** widget props are handled through a contract-compatible, serializable interface

**Given** the initial milestone should prove real composition
**When** a minimal manifest is rendered
**Then** at least a small starter catalogue such as text, card, KPI, or list-like blocks can be displayed in the grid shell
**And** this first catalogue is clearly runtime infrastructure, not hidden business UI

**Given** future modules must plug into a common mechanism
**When** the registry story is complete
**Then** Epic 4 can register `bandeau live` through the same declarative path
**And** later domain modules avoid bespoke rendering pipelines

### Story 3.4: Integrer l'adaptateur auth/session et la resolution par `ContextEnvelope`

As a secure frontend runtime,
I want `Peintre_nano` to consume backend auth/session state and `ContextEnvelope`,
So that visible navigation and rendered pages stay aligned with backend-owned permissions and context.

**Acceptance Criteria:**

**Given** backend auth and context are authoritative
**When** the frontend auth/context adapter is implemented
**Then** `Peintre_nano` consumes session state and `ContextEnvelope` from backend-owned contracts
**And** it does not promote local runtime state to a second source of truth for permissions or active context

**Given** la **Piste A** peut valider l'adaptateur avec un **mock** de session et d'enveloppe conforme aux types attendus
**When** la **Convergence 1** n'est pas encore livree
**Then** les tests et la demo peuvent utiliser des mocks tout en preservant la forme contractuelle (y compris convention de fraicheur `MAX_CONTEXT_AGE_MS` cote UI)
**And** le basculement vers les reponses reelles du backend ne necessite pas de reecrire les composants widgets, seulement les hooks / client API

**Given** effective rendering is the intersection of commanditaire contracts and active backend context
**When** a page is resolved
**Then** inaccessible navigation entries are filtered according to backend permission and context signals
**And** no business page is rendered when required context or permissions are missing

**Given** context can become ambiguous or incomplete
**When** the runtime receives restricted or degraded backend context
**Then** the frontend reflects that explicit state instead of guessing a valid business configuration
**And** it preserves the security-first rule defined in the PRD

### Story 3.5: Borner `UserRuntimePrefs` a la personnalisation locale non metier

As a user experience runtime,
I want local runtime preferences to personalize presentation without altering business truth,
So that users gain comfort without compromising permissions, routes, or domain meaning.

**Acceptance Criteria:**

**Given** `UserRuntimePrefs` belongs to frontend runtime only
**When** local preferences are implemented
**Then** they support allowed concerns such as density, panel state, onboarding, or shortcut overrides
**And** they remain local by default unless an explicit dedicated backend endpoint is designed later

**Given** local preferences must never become an authorization bypass
**When** preferences are applied during rendering
**Then** they cannot create a route, reveal a hidden business page, or grant extra visibility beyond commanditaire contracts and backend context
**And** the runtime enforces this limitation structurally

**Given** future UI polish will build on this layer
**When** this story is completed
**Then** Epic 5 and later epics can reuse a safe personalization mechanism
**And** they do not need to invent ad hoc UI preference stores with unclear authority

### Story 3.6: Rendre visibles les fallbacks et rejets de runtime

As a resilient UI engine,
I want invalid contracts, unknown widgets, and missing composition inputs to fail visibly,
So that operators and developers can distinguish degraded UI from valid business state.

**Acceptance Criteria:**

**Given** contract and rendering failures are expected during early assembly
**When** a manifest, route, slot, or widget cannot be resolved
**Then** the runtime shows an explicit visible fallback or blocking state according to the configured severity
**And** the failure is not silently swallowed into an apparently normal page

**Given** support and debugging will depend on readable runtime behavior
**When** a fallback or rejection occurs
**Then** the runtime emits enough structured information for logs, diagnostics, or future admin tooling
**And** the displayed feedback stays understandable without leaking irrelevant technical details to operators

**Given** the modular chain must be proven safely before business migration
**When** this story is accepted
**Then** Epic 4 can validate success and failure paths on the same runtime base
**And** later modules inherit a defensive rendering posture by default

### Story 3.7: Produire la page de demonstration du runtime compose

As a development team,
I want a demo page that exercises the minimal runtime composition chain,
So that the frontend foundation can be inspected and validated before real business modules are injected.

**Acceptance Criteria:**

**Given** the initial milestone must prove the composed frontend in practice
**When** the demo page is delivered
**Then** it renders through the real shell, manifest loading path, widget registry, and context-aware resolution path
**And** it demonstrates at least one nominal render path and one visible fallback path

**Given** this page is meant to validate the runtime rather than ship business value directly
**When** the demo scope is defined
**Then** it remains a controlled sandbox or demonstration route and not a hidden business screen
**And** it can be used to verify progressive improvements before domain migration begins

**Given** Epic 4 depends on a proven base rather than only theoretical contracts
**When** this story is completed
**Then** the project has a concrete runtime proof prior to the first real module slice
**And** the `bandeau live` epic can focus on the module chain itself instead of debugging the entire shell from scratch

## Epic 4: Prouver la chaine modulaire complete avec `bandeau live`

**Convergence 2** — meme objectif que le libelle **Convergence A + B — jalon 2** dans l'Epic List. L'equipe peut prouver en vrai la chaine complete backend -> contrat -> manifest -> runtime -> rendu -> fallback, afin de valider le socle modulaire avant de migrer les flows critiques et les autres modules. Cette preuve inclut un `bandeau live` dont l'etat d'exploitation reste coherent avec les horaires reels, les ouvertures decalees et les cas particuliers, sur la base des prerequis de contrats et de contexte poses par Epics 1 et 2, ainsi qu'un mecanisme minimal d'activation/desactivation admin du module avant que la `config admin simple` complete soit livree plus largement par Epic 9.
**Correct Course 2026-04-07 :** la preuve technique automatisee et documentee du bandeau live ne suffit pas a fermer seule le gate produit. La fermeture effective de **Convergence 2** exige un **raccordement dans l'application reellement servie** puis une **validation humaine explicite** sur stack locale officielle.

### Story 4.1: Publier le contrat et les manifests minimaux du module `bandeau live`

As a commanditaire-driven module system,
I want `bandeau live` to have explicit backend and UI contracts,
So that the first vertical slice proves a real module chain instead of a hardcoded demo widget.

**Acceptance Criteria:**

**Given** `bandeau live` is the first mandatory module proof in v2
**When** its minimal slice is defined
**Then** the project publishes the minimal backend contract, `NavigationManifest`, and `PageManifest` entries required to place the module in a real composed page
**And** these artifacts remain consistent with the established truth hierarchy and commanditaire ownership

**Given** the module must stay minimal at this stage
**When** its contracts are reviewed
**Then** they cover only the data and composition needs required for the live banner proof
**And** they do not absorb unrelated dashboard, admin, or generalized settings scope

**Given** the modular chain depends on reviewable artifacts
**When** this story is accepted
**Then** Epic 4 has a contract-level anchor for nominal and failing scenarios
**And** later modules can follow the same vertical pattern

### Story 4.2: Implementer le widget `bandeau live` dans le registre `Peintre_nano`

As a composed UI runtime,
I want `bandeau live` to be registered and rendered through the standard widget mechanism,
So that the first module proves that business-facing UI can plug into the shared runtime without bypassing it.

**Acceptance Criteria:**

**Given** Epic 3 already provides the registry, slots, and shell base
**When** the `bandeau live` widget is introduced
**Then** it is registered through the standard runtime registry and rendered from manifest-driven composition
**And** it does not rely on a one-off rendering path outside the shared runtime

**Given** the module displays operational state rather than static text
**When** the widget receives valid contract-backed data
**Then** it renders a visible banner state coherent with the provided business signals
**And** the displayed content remains bounded to the active context and permitted visibility

**Given** this is the first real module plugged into the socle
**When** the story is completed
**Then** the project has a reusable reference for how future domain widgets integrate with the runtime
**And** the proof remains small enough to debug without dragging in full dashboard complexity

### Story 4.3: Brancher la source backend reelle et les cas d'ouverture decalee

As an operator-facing live module,
I want `bandeau live` to consume the real backend-owned operational signals,
So that the displayed state reflects opening hours, delayed openings, and exceptional cases honestly.

**Acceptance Criteria:**

**Given** the backend exposes the minimal live signal surface from Epic 2
**When** `bandeau live` consumes that source
**Then** the module renders from real backend-provided operational state rather than guessed frontend logic
**And** its displayed status remains consistent with the active context and current permissions

**Given** the terrain explicitly needs support for delayed openings and special cases
**When** the live state is evaluated
**Then** the module can distinguish normal openings, delayed openings, and exceptional operating cases without reducing everything to "caisse du jour"
**And** it avoids presenting a misleading active state when the configured opening window does not justify it

**Given** external or contextual data may be incomplete
**When** the backend returns degraded or ambiguous live information
**Then** the module surfaces a constrained or degraded state rather than silently inventing certainty
**And** the operator can tell that the displayed state is limited

**Given** le gate **Convergence 2** / decision directrice exige une preuve **bout-en-bout** verifiable
**When** le widget `bandeau live` declare un `data_contract` avec `refresh: polling`
**Then** le client applique le rafraichissement selon `polling_interval_s` (ou valeur par defaut documentee si le manifest borne le slice) et les requetes vers l'`operation_id` du bandeau incluent le header canonique **`X-Correlation-ID`**, avec **journalisation** cote backend sur le flux live
**And** une erreur HTTP / timeout / payload invalide sur cet endpoint produit le **fallback visible** (Story 4.4) sans masquer l'echec

### Story 4.4: Rendre visibles les fallbacks et rejets du slice `bandeau live`

As a resilient module chain,
I want the `bandeau live` slice to demonstrate explicit failure behavior,
So that the first vertical proof validates both success paths and defensive runtime behavior.

**Acceptance Criteria:**

**Given** contracts, manifests, widgets, or backend signals can fail during integration
**When** the `bandeau live` slice encounters an invalid contract, unknown widget state, or unresolved composition input
**Then** the runtime produces a visible fallback or rejection according to the established severity rules
**And** the rest of the screen remains intact whenever the failure is non-critical

**Given** the system should not hide uncertainty on a live operational surface
**When** the module cannot safely render trusted state
**Then** it presents understandable degraded feedback instead of a falsely healthy banner
**And** the failure path is traceable for support and development

**Given** Epic 4 is a proof epic
**When** this story is completed
**Then** the slice demonstrates both nominal rendering and defended failure behavior end to end
**And** the team gains a concrete reference before migrating heavier modules

### Story 4.5: Ajouter un toggle admin minimal borne au module `bandeau live`

As a responsible administrator,
I want a minimal activation toggle for `bandeau live`,
So that the first module can be enabled or disabled safely before the broader admin configuration system exists.

**Acceptance Criteria:**

**Given** Epic 4 needs a minimal admin activation path for the first module
**When** the toggle mechanism is implemented
**Then** an administrator can explicitly enable or disable the `bandeau live` slice through a bounded configuration path
**And** that mechanism is limited to the needs of this module proof rather than becoming the full reusable admin-config framework

**Given** module activation impacts visible UI composition
**When** the toggle state changes
**Then** the runtime reflects activation or deactivation through the governed manifest and rendering path
**And** the change remains traceable and understandable for future support

**Given** general admin configuration belongs later in Epic 9
**When** this story is reviewed
**Then** its scope stays explicitly narrow and transitional
**And** it does not absorb generalized ordering, feature matrix, or broad settings management concerns

### Story 4.6: Valider la chaine complete `backend -> contrat -> manifest -> runtime -> rendu -> fallback`

As a delivery team,
I want to validate the complete `bandeau live` chain in one end-to-end proof,
So that the project can move to heavier flows with confidence that the modular architecture works in practice.

**Acceptance Criteria:**

**Given** the first real module slice is assembled
**When** the end-to-end proof is executed
**Then** the team can verify the full chain from backend signal production to contract publication, manifest interpretation, widget rendering, and fallback behavior
**And** the proof identifies any remaining architectural drift before Epic 5, 6, and 7 begin consuming the same pattern

**Given** le gate produit exige une preuve **observable** et non seulement conceptuelle
**When** la validation documentee est revue
**Then** la preuve inclut explicitement : au moins un cycle de **polling** reussi pour le bandeau, la presence de **`X-Correlation-ID`** (ou trace equivalente) sur les appels live verifies, et un scenario **nominal** plus un scenario **echec endpoint** avec fallback visible
**And** les resultats sont enregistres (courte trace dans le ticket / story ou doc d'epic) pour satisfaire la decision directrice « corriger la chaine avant d'aller plus loin »

**Given** the proof should be actionable rather than aspirational
**When** validation is documented
**Then** it records what nominal path succeeded, what failure paths were exercised, and what constraints remain known for subsequent module migrations
**And** it confirms that the slice still respects context isolation and backend authority rules

**Given** Epic 4 is meant to de-risk the roadmap
**When** this story is completed
**Then** the team has a reusable technical reference slice for future module implementation
**And** the fermeture du gate produit reste conditionnee a la story **4.6b** et a une validation humaine explicite sur l'application reellement servie

### Story 4.6b: Raccorder le slice `bandeau live` dans l'application `Peintre_nano` reellement servie

As a delivery team,
I want the `bandeau live` slice to be mounted in the real `Peintre_nano` application served on the official local stack,
So that the Convergence 2 proof can be validated by a human on the same artifact that is actually opened in the browser.

**Acceptance Criteria:**

**Given** Epic 4 contracts, widget, live source, fallbacks, and toggle already exist
**When** the locally served `Peintre_nano` app is opened on the official stack
**Then** the runtime loads the Epic 4 `bandeau live` manifests in the actually served bundle
**And** the user can reach the bandeau page through a documented, reproducible path without editing code manually

**Given** the slice must be visible in the real served UI rather than only in test harnesses
**When** the bandeau page is selected through that path
**Then** the `bandeau-live` widget is resolved by the runtime registry and rendered in the browser
**And** the page no longer falls back to the Epic 3 demo content by default for this route

**Given** the page is permissioned and context-sensitive
**When** the app is used in local validation mode
**Then** the required permission and context path are provided in a minimal, documented, non-ad-hoc way
**And** the slice can issue real live requests from the served app, including `X-Correlation-ID`, without expanding scope to Epic 5 or Epic 9

## Epic 5: Recomposer le shell, le dashboard et l'administration existants dans `Peintre_nano`

Les utilisatrices et responsables peuvent retrouver les pages transverses de `Recyclique` dans une UI composee `Peintre_nano` : shell global, navigation, dashboard, pages admin, listings, cartes, statistiques et points d'entree vers les autres ecrans, avec respect du contexte, des contraintes de rendu en `CSS Grid`, du blueprint `workflow explicite -> PageManifest / navigation contractuelle -> layout`, et du principe que la navigation/structure metier viennent de `Recyclique` via contrats commanditaires.

**Note agents (create-story / review, Epics 5-10) :** `Peintre_nano` reste un **runtime d'affichage borne** : ne pas y recoder navigation metier, permissions, contexte ou logique sensible `Recyclique` hors contrats commanditaires et revalidation backend. Avant toute story ou revue touchant `Peintre_nano` sur les Epics 5 a 10, relire la checklist `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`, l'hypothese `Peintre autonome` (`_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-peintre-autonome-applications-contributrices.md`) et l'artefact de gouvernance `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`.

### Story 5.1: Recomposer la navigation transverse commanditaire dans `Peintre_nano`

As a daily user,
I want the main application navigation to be served through the composed v2 shell,
So that I can reach the transverse areas of `Recyclique` through a UI governed by backend-owned structure.

**Acceptance Criteria:**

**Given** the v2 shell already supports manifest-driven navigation
**When** the transverse navigation is migrated
**Then** the primary navigation, route hierarchy, and structural shortcuts are rendered from commanditaire contracts inside `Peintre_nano`
**And** the frontend does not recreate business navigation structure outside the governed manifest path

**Given** visible navigation depends on backend permissions and active context
**When** entries are resolved for a user
**Then** inaccessible structural entries are hidden or filtered according to the agreed UX policy
**And** no ghost route or silent hole appears in place of missing business structure

**Given** this epic focuses on transverse recomposition
**When** the navigation migration is completed
**Then** it provides stable access to dashboard and admin entry points
**And** it does not absorb the detailed business workflows that belong to later epics

### Story 5.2: Recomposer le dashboard transverse dans la nouvelle chaine UI

As an operator or manager,
I want the dashboard to exist in the composed v2 runtime,
So that I can read the main transverse operational information from the new shell before the full business migration is complete.

**Acceptance Criteria:**

**Given** Epic 4 proved the first vertical module slice
**When** the dashboard is recomposed
**Then** it is rendered through the same contract-driven shell, layout, and widget composition mechanisms
**And** it remains bounded to transverse information rather than embedding full domain workflows

**Given** the dashboard must stay coherent with the active perimeter
**When** it is displayed
**Then** its visible content reflects the selected context and backend permissions
**And** cross-site or cross-caisse leakage is prevented by the same context rules as the rest of the runtime

**Given** this dashboard is part of migration, not a separate architecture
**When** the story is delivered
**Then** it reuses the shared runtime, shared error handling, and shared fallback rules
**And** it does not create a parallel dashboard stack outside `Peintre_nano`

### Story 5.3: Migrer un premier lot cible de listings et vues de consultation transverses

As a responsible user,
I want a first target batch of transverse listings and consultation pages to be reachable in `Peintre_nano`,
So that the v2 shell becomes practically useful sans essayer de migrer tous les ecrans transverses en une seule story.

**Story Preparation Gate:** avant execution, nommer explicitement dans la story ou le ticket d'implementation les `2 a 4` routes / `PageManifest` exacts choisis pour ce lot.

**Acceptance Criteria:**

**Given** several current screens are transverse rather than domain-flow specific
**When** a first migration batch is selected
**Then** the story nomme un ensemble borne de listings et vues de consultation a migrer via le runtime compose
**And** ce premier lot reste borne a un maximum de 2 a 4 routes ou `PageManifest` nommes pour une seule iteration

**Given** this epic must not swallow domain-specific flow implementations
**When** page boundaries are defined
**Then** cashier workflow details stay out of scope for Epic 5
**And** reception workflow specifics remain reserved for Epic 7

**Given** these pages often act as hubs for other areas
**When** they are rendered
**Then** they provide clear entry points toward future modules and flows without pretending those flows are already migrated
**And** unavailable downstream paths follow the agreed visibility or unavailable-action rules

### Story 5.4: Migrer un premier lot cible de pages admin transverses

As a responsible administrator,
I want a first bounded batch of transverse admin pages to be reachable in `Peintre_nano`,
So that the v2 shell gains real admin value without turning one story into a full admin migration program.

**Story Preparation Gate:** avant execution, nommer explicitement dans la story ou le ticket d'implementation les `2 a 3` pages / `PageManifest` admin exacts choisis pour ce lot.

**Acceptance Criteria:**

**Given** transverse admin pages are part of the shared shell value
**When** an admin migration batch is implemented
**Then** the story targets an explicit bounded set of admin pages rather than an open-ended list
**And** ce premier lot reste borne a un maximum de 2 a 3 pages ou `PageManifest` admin pour une seule iteration

**Given** this epic must not swallow domain-specific flow implementations
**When** page boundaries are defined
**Then** cashier workflow details stay out of scope for Epic 5
**And** reception workflow specifics remain reserved for Epic 7

**Given** these admin pages often control access to other areas
**When** they are rendered
**Then** they remain consistent with backend-owned permissions and active context
**And** they do not create a parallel admin stack outside the shared runtime

### Story 5.5: Integrer les libelles personnalises et la visibilite contextuelle dans l'UI transverse

As a ressourcerie-specific user,
I want the transverse UI to reflect local labels and contextual visibility rules,
So that the recomposed shell feels aligned with the local organization without changing security truth.

**Acceptance Criteria:**

**Given** role and structure labels may be customized per ressourcerie
**When** the transverse shell and pages are rendered
**Then** the UI can display backend-provided labels and naming variants where appropriate
**And** those labels remain presentation-only and never replace stable technical authorization keys

**Given** some screens and actions depend on context or permissions
**When** the transverse UI resolves what to show
**Then** it follows the agreed policy between hidden structural navigation and disabled contextual actions with explicit feedback when needed
**And** the visible experience stays coherent with the active `ContextEnvelope`

**Given** Epic 5 carries part of the UX coherence burden for the new shell
**When** this story is completed
**Then** future epics can inherit one stable rule set for labels and visibility behavior
**And** they do not need to redefine local terminology handling screen by screen

### Story 5.6: Poser les templates et layouts reutilisables des pages transverses

As a frontend composition team,
I want reusable transverse page templates and layout conventions,
So that dashboard, admin, listings, and consultation pages share one coherent composition model.

**Acceptance Criteria:**

**Given** the shell and grid engine already exist
**When** transverse page templates are formalized
**Then** the project defines reusable layout patterns for common transverse screens such as dashboard, listing, detail, and admin-style pages
**And** those patterns stay compatible with manifest-driven composition and `CSS Grid`

**Given** migration should reduce structural duplication
**When** new transverse pages are added to the runtime
**Then** they can reuse shared layout conventions instead of ad hoc per-page composition
**And** this reuse does not blur the separation between template infrastructure and business widget content

**Given** later epics will migrate richer screens
**When** this story is completed
**Then** the project has a stable transverse layout language inside `Peintre_nano`
**And** future domains can build on it without inheriting dashboard-specific hacks

### Story 5.7: Gerer les etats vides, chargements et erreurs sur les pages transverses

As a user of the new shell,
I want transverse pages to remain readable in loading, empty, and error states,
So that the migrated shell is usable before the whole product is fully stabilized.

**Acceptance Criteria:**

**Given** migration will temporarily expose partial data and uneven backend readiness
**When** a transverse page loads, has no data, or encounters an error
**Then** the page presents explicit loading, empty, or error states consistent with the shared runtime rules
**And** those states remain distinguishable from valid business content

**Given** some failures should be isolated rather than collapse the whole shell
**When** a non-critical transverse block fails
**Then** the local area can degrade visibly while the rest of the screen stays usable
**And** the resulting behavior remains traceable and supportable

**Given** Epic 5 prepares practical day-to-day usage of the shell
**When** this story is delivered
**Then** transverse pages become meaningfully operable even before all modules are feature-complete
**And** the migration does not rely on silent happy-path assumptions

### Story 5.8: Valider la coherence transverse du shell recompose

As a product delivery team,
I want a transverse validation pass on the recomposed shell, dashboard, and admin surfaces,
So that the project can move to flow-heavy epics with a stable shared UI spine.

**Acceptance Criteria:**

**Given** Epic 5 recomposes the shared surfaces used across the product
**When** the validation pass is executed
**Then** it confirms that navigation, dashboard, admin pages, and transverse layouts all respect commanditaire ownership, context isolation, and shared runtime rules
**And** any remaining migration gaps are documented as explicit follow-up constraints rather than hidden drift

**Given** later epics will rely on these transverse entry points
**When** this story is completed
**Then** Epics 6, 7, 8, and 9 can plug into a stable shell and access pattern
**And** the roadmap no longer depends on the old frontend as the primary transverse spine

**Given** this validation should not become a second implementation epic
**When** scope is reviewed
**Then** the story remains focused on coherence, operability, and known constraints
**And** it does not absorb domain backlog that belongs elsewhere

## Epic 6: Rendre la caisse v2 exploitable et enrichie par les besoins terrain

**Convergence 3 (flows critiques)** — voir aussi l'**Epic List** pour le detail. Les operatrices peuvent utiliser dans `Peintre_nano` une caisse v2 **brownfield-first**, structuree d'abord comme un **workflow operatoire continu** : dashboard caisse, ouverture de session, poste de vente continu, finalisation, cloture locale, puis supervision admin des sessions. Les manifests CREOS, `FlowRenderer`, widgets et pages servent de **mecanismes d'implementation** ; ils ne definissent pas a eux seuls la forme produit cible. Au moins un widget de **ticket courant** (ou equivalent metier) **doit** declarer `data_contract.critical: true` ; l'etat **DATA_STALE** et les echecs de donnees critiques **bloquent** le paiement cote UI **et** sont **revalides** cote backend (PRD §10, architecture).

**Note agents (create-story / review) :** pour toute story de cet epic, garder `Peintre_nano` du cote **runtime / rendu / flow UI** ; contexte, permissions, stale data, paiement, audit et regles metier sensibles restent **backend-autoritaires**. Relire la checklist `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` et l'artefact de gouvernance `references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`.

**Repere de lecture operationnel :** charger aussi `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md` puis `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`.

### Story 6.1: Mettre en service le parcours nominal de caisse v2 dans `Peintre_nano`

As a cash register operator,
I want to complete a normal sale in the new caisse v2,
So that the new UI becomes operational for day-to-day cashflow work.

**Acceptance Criteria:**

**Given** the brownfield caisse starts from an operational entrypoint
**When** the nominal cashflow path is rebaselined in `Peintre_nano`
**Then** an operator can enter a **brownfield-first caisse workspace** from `/caisse`, see the active poste / session / mode, and progress from session opening to product scan or lookup, price capture, payment choice, and ticket issuance
**And** the sequence stays grounded in backend-owned business rules rather than frontend-only logic

**Given** caisse work must remain fast and robust
**When** the nominal flow is used
**Then** the interaction is optimized for keyboard-first operation with immediate feedback on scan, input, validation, and current ticket state
**And** the runtime does not fragment the operator into disconnected caisse mini-pages that would make the flow impractical on terrain

**Given** the new caisse should not depend on full sync completion to exist
**When** the nominal path is completed
**Then** the sale can be locally recorded in `Recyclique`
**And** the UI exposes the local outcome clearly without pretending accounting sync is already finalized

**Given** the Epic 6 implementation still relies on manifests, widgets, and shared runtime mechanisms
**When** the nominal path is delivered
**Then** those mechanisms remain subordinate to the brownfield caisse workflow rather than defining the workflow themselves
**And** au moins un widget **ticket courant** (ou equivalent nomme dans le manifest du slice) **expose** `data_contract.critical: true` et le blocage UI sur **DATA_STALE** / donnees incoherentes **avant** paiement est demontre par test ; le backend **refuse** la mutation de paiement si le contexte ou les preconditions ne sont pas revalides

### Story 6.2: Garantir le contexte caisse et les blocages de securite metier

As a caisse operator,
I want the caisse flow to refuse ambiguous or invalid operating context,
So that I do not perform sales in the wrong site, caisse, session, or permission perimeter.

**Acceptance Criteria:**

**Given** the caisse is a critical terrain flow
**When** a user enters or resumes the dashboard / opening / caisse workspace
**Then** the flow verifies the active site, caisse, session, poste, and permissions required for operation
**And** missing or ambiguous context produces an explicit restricted or blocked state instead of a silent guess

**Given** the UI can show only what backend authority allows
**When** a user lacks a required permission or valid perimeter
**Then** the caisse flow blocks or restricts the sensitive action through backend-backed authorization semantics
**And** the feedback remains understandable for operators

**Given** security must win over fluidity when the two conflict
**When** context integrity cannot be guaranteed
**Then** the caisse flow does not proceed as if conditions were valid
**And** any degradation path remains explicit and traceable

### Story 6.3: Ajouter le parcours `ticket en attente`

As a caisse operator,
I want to place a ticket on hold and resume it later,
So that the new caisse supports a common real-life interruption pattern without losing the active sale.

**Acceptance Criteria:**

**Given** ticket interruption is a field-requested caisse need
**When** the hold flow is implemented
**Then** an operator can place the current sale in an explicit waiting state and resume it later in a controlled way
**And** the resulting behavior stays coherent with caisse context and local persistence rules

**Given** a held ticket still belongs to the caisse business flow
**When** it is resumed or abandoned according to allowed rules
**Then** the UI and backend keep the operation understandable and traceable inside the same caisse workspace
**And** the story does not require full accounting reconciliation to be useful

**Given** Epic 6 should stay sequential and implementable
**When** this story is completed
**Then** the nominal caisse remains usable independently
**And** later variants can build on it without bundling all edge cases in one delivery

### Story 6.4: Ajouter le parcours `remboursement` sous controle

As a responsible caisse user,
I want a controlled refund path in the new caisse,
So that legitimate reversal cases can be handled without inventing ad hoc workarounds.

**Acceptance Criteria:**

**Given** refund is a sensitive terrain request
**When** the refund flow is introduced
**Then** it is exposed as an explicit dedicated path inside the caisse workflow rather than a hidden caisse trick or an isolated product silo
**And** the resulting action stays coherent with permission, traceability, and downstream accounting expectations

**Given** refunds are more sensitive than nominal sales
**When** an operator attempts a refund
**Then** the flow applies the required authorization and visible business controls for that operation
**And** the UI makes clear that the action is a reversal case, not a normal sale

**Given** Epic 8 owns full accounting articulation
**When** this story is delivered
**Then** the refund path remains locally operable within the rules already documented
**And** any final accounting consequences remain aligned with the later sync/reconciliation epic

### Story 6.5: Ajouter les encaissements specifiques sans article et adhesion association

As a caisse operator,
I want to record donation-without-article and association-membership payment flows,
So that the new caisse supports the main non-standard encashment cases raised by the terrain.

**Acceptance Criteria:**

**Given** some real caisse operations do not pass through a normal article sale
**When** the special encashment variants are implemented
**Then** the caisse supports at least donation without article and association membership payment as explicit business flows within the same brownfield caisse workspace
**And** these flows remain understandable to the operator without becoming detached caisse pages

**Given** these cases have downstream accounting or membership implications
**When** they are recorded
**Then** the story keeps the local caisse operation coherent with the documented sync and member-workflow boundaries
**And** it does not move `adherents` ownership or full accounting logic into Epic 6

**Given** Epic 6 should remain incrementally shippable
**When** this story is completed
**Then** the caisse gains meaningful real-world coverage beyond nominal sales without fragmenting the operator journey
**And** other terrain variants can still be added as bounded caisse variants rather than separate product baselines

### Story 6.6: Ajouter les boutons d'actions sociales dedies

As a caisse operator,
I want dedicated social-action encashment buttons,
So that social or solidarity-related caisse operations are visible and operable without being disguised as generic sales.

**Acceptance Criteria:**

**Given** the terrain backlog requests explicit social-action caisse entries
**When** these dedicated buttons are introduced
**Then** the UI exposes named actions for the targeted social-use cases selected for the first delivery batch from within the caisse workspace
**And** those entries remain understandable as dedicated business intents rather than generic custom hacks or detached caisse pages

**Given** these actions can have downstream accounting consequences
**When** they are recorded in caisse
**Then** the local flow remains explicit and traceable
**And** any broader accounting classification or reconciliation implications remain aligned with later stories and epics

**Given** this capability should not turn into an unlimited button factory in one story
**When** the scope is reviewed
**Then** the first delivery is bounded to an explicit initial set of social-action cases
**And** later additions can follow the same pattern incrementally

### Story 6.7: Mettre en place la cloture locale exploitable de caisse

As a responsible caisse user,
I want to close a caisse session locally with usable totals and status,
So that terrain operations can end cleanly before full accounting reconciliation is performed.

**Acceptance Criteria:**

**Given** Epic 6 must stop short of full accounting integration
**When** a caisse session is closed
**Then** the system performs local closure checks, computes the relevant totals, and records a clear local outcome in `Recyclique`
**And** the resulting state is explicit enough to serve as a handoff toward the session manager / admin session detail and later sync and reconciliation work

**Given** some closure situations may be sensitive or inconsistent
**When** a critical discrepancy is detected
**Then** the closure flow exposes a clear blocked, degraded, or locally accepted state according to the documented rules
**And** it does not fake a clean accounting conclusion when such a conclusion is not actually guaranteed

**Given** Epic 8 will handle full real articulation with `Paheko`
**When** this story is delivered
**Then** closure remains locally exploitable without redefining the full sync or quarantine logic
**And** the UI makes the relay toward later reconciliation understandable

### Story 6.8: Gerer un premier perimetre borne de corrections sensibles et l'audit des ventes modifiees

As a super-admin or responsible user,
I want to correct certain caisse entries under controlled conditions,
So that obvious input errors can be fixed without losing accountability.

**Story Preparation Gate:** avant execution, figer une liste fermee de corrections autorisees pour ce lot, par exemple `date seule`, `detail de vente borne`, ou autre sous-ensemble explicite ; ne jamais demarrer cette story avec un perimetre implicite.

**Acceptance Criteria:**

**Given** the field explicitly needs controlled correction of sale date or sale details
**When** a privileged correction path is introduced
**Then** only the authorized role or perimeter can trigger the correction capability
**And** le premier lot reste borne a une liste fermee de corrections autorisees, definie avant implementation pour cette story

**Given** post-hoc sale correction is sensitive even when legally allowed in this context
**When** a correction is performed
**Then** the system records who changed what, when, and from which prior value
**And** the resulting trace is usable for internal review or dispute handling

**Given** correction capability must not become a general hidden bypass
**When** the story is completed
**Then** the correction path remains narrow, auditable, and role-gated from the admin session detail / journal locus
**And** it does not weaken the default caisse immutability posture for ordinary users nor open a generic edition de vente sans bornes

### Story 6.9: Rendre la caisse defensive face aux erreurs, fallbacks et sync differee

As a caisse operator,
I want the new caisse to remain understandable when something fails or sync is delayed,
So that I can continue terrain work without confusion about what has actually been recorded.

**Acceptance Criteria:**

**Given** the caisse must survive partial failures and delayed downstream integration
**When** an operation is locally accepted but not yet synchronized
**Then** the UI distinguishes local recording, pending follow-up, and real blocking conditions
**And** it does not alarm operators unnecessarily when the documented default is deferred sync

**Given** invalid flows, missing contracts, or degraded context may occur
**When** the caisse encounters a non-nominal condition
**Then** it presents explicit fallback, error, or blocked states consistent with the shared runtime rules
**And** the operator can understand whether the issue is local, contextual, or downstream

**Given** supportability matters on a critical terrain flow
**When** these degraded states occur
**Then** the flow remains traceable and operationally interpretable
**And** the screen avoids silent success signals when the underlying state is uncertain

**Given** un widget caisse declare `data_contract.critical: true` (ex. ticket courant / encaissement)
**When** les donnees passees en **DATA_STALE** ou l'endpoint de donnees critique echoue
**Then** les actions sensibles (paiement, validation finale) sont **bloquees** avec feedback explicite, en coherence avec le PRD §10.1 et les etats `WidgetDataState`
**And** le comportement est aligne sur la matrice fallback / securite > fluidite

### Story 6.10: Valider l'exploitabilite terrain de la caisse v2

As a delivery team,
I want a validation pass focused on practical caisse operability,
So that Epic 6 confirms the new caisse is genuinely usable before broader rollout and before full accounting hardening in Epic 8.

**Acceptance Criteria:**

**Given** the caisse is one of the most critical terrain workflows
**When** the validation pass is executed
**Then** it confirms that the caisse v2 reproduces a workflow brownfield operable: dashboard, opening, continuous sale workspace, closure, admin session manager, session detail, error handling, and key terrain variants behave coherently in the new UI
**And** it documents any remaining known gaps without hiding them behind optimistic readiness claims

**Given** Epic 6 should hand off cleanly into Epic 8 rather than duplicate it
**When** the caisse validation is reviewed
**Then** it clearly separates what is already operational locally from what still depends on full accounting articulation with `Paheko`
**And** it preserves the documented relay between local closure and later reconciliation

**Given** this epic is about exploitability, not final perfection
**When** the story is completed
**Then** the team has a caisse v2 baseline fit for continued iteration because it is judged against brownfield parity rather than the coherence of the previous slice-based baseline
**And** later work can harden accounting integration without reopening the basic viability of the new caisse

## Epic 7: Rendre la reception v2 exploitable dans la nouvelle chaine UI

Les operatrices peuvent utiliser la reception dans `Peintre_nano` avec ses ecrans, workflows explicites, definitions d'ecrans, saisies et contextualisation metier, en respectant les contraintes du flux matiere et l'architecture modulaire retenue.

**Note agents (create-story / review) :** pour toute story de cet epic, `Peintre_nano` ne doit pas devenir auteur du **flux matiere** ni du **contexte** ; il consomme et rend des contrats / etats backend. Relire la checklist `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` avant de deriver une implementation.

**Repere de lecture operationnel :** charger aussi `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md` puis `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`.

### Story 7.1: Mettre en service le parcours nominal de reception v2

As a reception operator,
I want to register a standard reception flow in the new UI,
So that the v2 reception becomes usable for everyday material intake work.

**Acceptance Criteria:**

**Given** reception is one of the two critical brownfield flows to preserve
**When** the nominal reception flow is migrated
**Then** an operator can open the reception screen in `Peintre_nano` and complete the core intake sequence through explicit steps
**And** the sequence remains backed by `Recyclique` business authority rather than frontend-only assumptions

**Given** reception work depends on clarity more than ornamental UI
**When** the nominal flow is used
**Then** each step of the intake remains explicit, understandable, and consistent with the active operating context
**And** the UI supports practical terrain use without relying on hidden transitions

**Given** the new reception should be operable before wider module expansion
**When** this story is delivered
**Then** the project has a usable baseline reception path in the new runtime
**And** later enhancements can extend it without redefining the core flow

### Story 7.2: Garantir le contexte reception et les blocages metier associes

As a reception operator,
I want the reception flow to require a valid working context,
So that incoming material is never recorded under the wrong site, poste, or permission perimeter.

**Acceptance Criteria:**

**Given** reception data belongs to the authoritative material flow
**When** a user enters or resumes the reception flow
**Then** the system verifies the active site, poste de reception, and required permissions before allowing intake actions
**And** incomplete or ambiguous context yields an explicit restricted or blocked mode

**Given** the new UI must stay aligned with backend-owned context truth
**When** permission or context requirements are not met
**Then** the flow restricts or blocks the sensitive step through backend-backed semantics
**And** the operator receives feedback that makes the reason understandable

**Given** security and traceability override convenience on critical flows
**When** context validity cannot be guaranteed
**Then** the reception flow does not silently continue
**And** any degraded path remains explicit and supportable

### Story 7.3: Integrer la categorisation, la pesee et la qualification du flux matiere

As a reception operator,
I want to capture the key material characteristics during reception,
So that `Recyclique` remains the reliable source of truth for quantities, categories, and related intake information.

**Acceptance Criteria:**

**Given** `Recyclique` is authoritative for the material flow
**When** reception data is entered
**Then** the flow supports the capture of material categorization, weight or quantity-related information, and intake qualification needed by the business process
**And** those data points are stored in a way that preserves future reporting and declaration usefulness

**Given** category structures can influence later eco-organisme declarations
**When** categorization choices are handled
**Then** the flow records the business-relevant internal categorization without confusing it with later accounting or declaration processing
**And** the UI keeps the operator focused on intake rather than downstream administrative logic

**Given** reception screens must remain practical on terrain
**When** this story is implemented
**Then** the data capture sequence stays explicit and operable
**And** it does not collapse into an over-generalized form that hides the workflow logic

### Story 7.4: Journaliser les entrees reception et assurer leur exploitabilite historique

As a responsible operator or manager,
I want reception entries to be durably recorded with useful traceability,
So that the material flow remains understandable, auditable, and reusable later.

**Acceptance Criteria:**

**Given** the product must support history, replay, and later analysis
**When** a reception entry is validated
**Then** the intake is durably recorded in `Recyclique` with the context and business details needed for future interpretation
**And** the resulting trace is suitable for later material-flow reading and correlation

**Given** reception is part of the operational history, not only a transient screen
**When** entries are stored
**Then** they remain attributable to the relevant context and operator perimeter
**And** they preserve the integrity required for future reconciliation with other business views

**Given** Epic 7 is not the declaration epic itself
**When** this story is reviewed
**Then** it keeps the focus on trustworthy reception history
**And** it does not absorb the broader eco-organisme reporting features reserved for Epic 9

### Story 7.5: Rendre la reception defensive face aux erreurs, contrats incomplets et degradations

As a reception operator,
I want the reception flow to remain understandable when something is missing or invalid,
So that I can distinguish a valid intake, a degraded mode, and a blocked operation.

**Acceptance Criteria:**

**Given** critical terrain flows must not fail silently
**When** the reception flow encounters invalid contracts, unresolved inputs, or incomplete context
**Then** it presents explicit fallback, degraded, or blocked states according to the shared runtime and business rules
**And** it avoids pretending the intake has been safely recorded when that is not true

**Given** some reception problems may still allow partial continuation while others must stop the flow
**When** a non-nominal condition occurs
**Then** the UI distinguishes what can still proceed safely from what requires a hard stop
**And** the resulting operator feedback remains practical rather than overly technical

**Given** later support and quality checks will depend on readable behavior
**When** these defensive states occur
**Then** the flow remains traceable and operationally interpretable
**And** the same defensive stance can be reused in future domain modules

### Story 7.6: Valider l'exploitabilite terrain de la reception v2

As a delivery team,
I want a focused validation pass on the new reception flow,
So that Epic 7 confirms reception is genuinely usable in the new chain before broader rollout.

**Acceptance Criteria:**

**Given** reception is a priority terrain workflow
**When** the validation pass is executed
**Then** it confirms that nominal intake, context enforcement, qualification capture, and defensive non-nominal behavior all operate coherently in the new UI
**And** it identifies remaining gaps as explicit follow-up work rather than hidden assumptions

**Given** Epic 7 should stay centered on the material intake flow
**When** the validation findings are reviewed
**Then** they keep a clean boundary with Epic 6 cashflow specifics, Epic 8 accounting articulation, and Epic 9 declaration/reporting scope
**And** they preserve reception as a reusable reference for later material-flow extensions

**Given** this epic is about operational viability
**When** the story is completed
**Then** the team has a reception v2 baseline fit for continued iteration
**And** later work can enrich analytics or declarations without reopening the core viability of the new reception flow

## Epic 8: Fiabiliser l'articulation comptable reelle avec `Paheko`

Les responsables peuvent synchroniser, suivre, corriger et reconcilier les operations entre `Recyclique` et `Paheko`, avec etats explicites, quarantaine, blocages selectifs, correlation inter-systemes et schema de deploiement cible.

**Note agents (create-story / review) :** pour toute story de cet epic, l'integration `Paheko`, l'idempotence, la quarantaine, les mappings et la correlation restent **derriere le backend `Recyclique`** ; `Peintre_nano` affiche des etats et feedbacks, il ne porte pas la logique comptable. Relire la checklist `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`.

**Repere de lecture operationnel :** charger aussi `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md` puis `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`.

### Story 8.1: Implementer un premier slice syncable de bout en bout `Recyclique -> Paheko`

As a finance-integrated business platform,
I want a first concrete syncable operation to travel end to end from `Recyclique` to `Paheko`,
So that the durable synchronization architecture is proven on a real slice before broader expansion.

**Acceptance Criteria:**

**Given** `Recyclique` records operations first and syncs later
**When** the first real sync slice is implemented
**Then** the backend processes at least one explicitly chosen syncable operation through the durable outbox and synchronization path defined by the architecture
**And** the pipeline remains consistent with at-least-once delivery and backend-owned accounting handoff rules

**Given** the sync path must be operational rather than conceptual
**When** that chosen operation is emitted
**Then** the system can carry it from local persistence to a concrete `Paheko` integration attempt
**And** the resulting state becomes explicitly observable in `Recyclique`

**Given** Epic 8 should build on Epics 6 and 7 rather than replace them
**When** this story is completed
**Then** the project proves the real synchronization backbone on one bounded slice
**And** later stories can extend the coverage without redefining the terrain flows themselves

### Story 8.2: Gerer l'idempotence, les retries et les statuts explicites de sync

As a resilient integration system,
I want synchronization attempts to be repeatable and stateful,
So that retries, duplicates, and partial failures do not corrupt accounting interpretation.

**Acceptance Criteria:**

**Given** sync attempts may fail, be retried, or be replayed
**When** the synchronization state machine is implemented
**Then** each operation exposes explicit backend states such as `a_reessayer`, `en_quarantaine`, `resolu`, and `rejete`
**And** these states are usable by support, administration, and the future UI without relying on free-form messages only

**Given** the integration must resist duplicate emission or repeated processing
**When** the same operation is retried or replayed
**Then** idempotency rules prevent accidental double-accounting effects
**And** the resulting state stays intelligible from the point of view of `Recyclique`

**Given** sync is deferred by default when possible
**When** a retryable failure occurs
**Then** the system preserves terrain continuity while recording a clear downstream follow-up state
**And** it avoids falsely presenting the operation as finally reconciled

### Story 8.3: Gerer les correspondances `site` / `caisse` / emplacements `Paheko`

As a responsible administrator,
I want accounting mappings between `Recyclique` and `Paheko` to be explicit and validated,
So that synchronization never writes into an invalid or silent fallback destination.

**Story Preparation Gate:** avant execution, nommer explicitement le premier slice de mapping vise pour cette story : contexte `site` / `caisse` concerne, type d'operation syncable vise, et destination `Paheko` ciblee.

**Acceptance Criteria:**

**Given** the deployment model maps several `Recyclique` contexts into one `Paheko` perimeter per ressourcerie
**When** mapping rules are implemented
**Then** the first delivery batch covers an explicit bounded mapping set between `site`, `caisse`, and the target `Paheko` destination needed for the chosen sync slice
**And** those mappings are treated as explicit configuration truth rather than guessed runtime behavior

**Given** a required mapping may be missing or invalid
**When** a syncable operation reaches the integration layer without a valid correspondence
**Then** the operation remains recorded in `Recyclique`
**And** the system surfaces an explicit non-syncable or failed-sync state rather than emitting a silent substitute write

**Given** these mappings are operationally sensitive
**When** they are reviewed or changed
**Then** their role in later support and reconciliation remains understandable
**And** the implementation preserves the future ability to audit their effects and extend the mapping matrix in later stories if needed

### Story 8.4: Encadrer la quarantaine et la resolution manuelle des ecarts persistants

As a responsible ressourcerie manager or super-admin,
I want persistent sync discrepancies to enter controlled quarantine and manual resolution workflows,
So that accounting issues are contained, traceable, and never silently ignored.

**Acceptance Criteria:**

**Given** some discrepancies cannot be solved by retry alone
**When** a persistent failure, accounting inconsistency, or missing required correspondence is detected
**Then** the affected operation enters an explicit quarantine state
**And** the transition into quarantine is traceable with enough context for follow-up

**Given** quarantine lifts and manual fixes are sensitive operations
**When** a responsible user resolves or lifts a quarantined case
**Then** the action is restricted to the authorized perimeter and records author, date, context, and reason
**And** the resulting state transition remains visible for later review

**Given** Epic 8 must make supportable accounting integration possible
**When** this story is completed
**Then** persistent sync issues are handled as governed business cases rather than ad hoc troubleshooting
**And** the project gains a clear operational lane for exceptions

### Story 8.5: Mettre en place le suivi et la correlation inter-systemes des operations

As a support and supervision team,
I want synchronized operations to be traceable across `Recyclique` and `Paheko`,
So that issues can be followed end to end without guesswork.

**Acceptance Criteria:**

**Given** support must understand a flow across systems
**When** an operation is emitted, retried, quarantined, or resolved
**Then** the relevant records expose a correlation identifier and enough contextual metadata to follow the path end to end
**And** this trace remains consistent across the important lifecycle stages

**Given** accounting and terrain views can diverge temporarily
**When** a responsible user investigates a sync issue
**Then** the system provides a clear way to relate local terrain history to downstream accounting integration attempts
**And** that relationship does not depend on fragile manual reconstruction

**Given** Epic 8 should improve operability, not just backend mechanics
**When** this story is completed
**Then** support and future admin screens gain a reliable observability baseline
**And** later reporting work can reuse the same correlation semantics

### Story 8.6: Gerer le blocage selectif des actions critiques finales

As a responsible business system,
I want only truly critical final actions to be blockable on accounting guarantees,
So that terrain continuity is preserved by default while unsafe finalization remains preventable.

**Acceptance Criteria:**

**Given** the product principle is terrain-first with deferred sync by default
**When** a business action is evaluated against accounting guarantees
**Then** the system blocks only the critical final actions explicitly designated by the sync policy
**And** ordinary terrain recording is not globally frozen by downstream integration trouble

**Given** some closure or finalization outcomes may no longer be safely guaranteeable
**When** the required accounting condition is not met
**Then** the affected action yields a clear blocked or constrained state
**And** the user-facing semantics remain distinct from the states of locally accepted but not yet reconciled operations

**Given** Epic 6 already introduced local closure semantics
**When** this story is implemented
**Then** it completes the handoff by defining when local sufficiency ends and real accounting gating begins
**And** it does not rewrite the nominal caisse flow itself

### Story 8.7: Valider la reconciliation reelle avec `Paheko`

As a delivery and finance-integrity team,
I want a validation pass on the real synchronization and reconciliation behavior,
So that the project can trust the accounting articulation before wider deployment.

**Acceptance Criteria:**

**Given** Epic 8 exists to make the accounting articulation real
**When** the reconciliation validation is executed
**Then** it confirms that nominal sync, retry, quarantine, mapping failure, and selective blocking behaviors all operate according to the documented contract
**And** it identifies remaining gaps as explicit integration constraints rather than hidden assumptions

**Given** the product distinguishes material-flow truth from accounting truth
**When** the validation findings are reviewed
**Then** they preserve the authority split between `Recyclique` and `Paheko`
**And** they do not collapse the two systems into one false source of truth

**Given** later epics will build admin and complementary modules on top of this backbone
**When** this story is completed
**Then** the project has a credible accounting integration baseline
**And** future work can extend supervision and business modules without reopening the core sync viability question

## Epic 9: Livrer les modules metier complementaires v2

Les responsables et super-admins peuvent utiliser les modules metier complementaires attendus pour une v2 credible : declaration eco-organismes, adherents / vie associative minimale, integration `HelloAsso` et config admin simple, avec arbitrage `HelloAsso` explicite avant implementation large du connecteur.
Ordre recommande dans cet epic : poser d'abord la gouvernance des mappings sensibles avant la consommation declarative a grande echelle, puis avancer sequentiellement sur `adherents`, arbitrage `HelloAsso`, integration minimale `HelloAsso`, `config admin simple`, ACL minimales, et validation finale.

**Note agents (create-story / review) :** pour toute story de cet epic, ne pas confondre **modules v2 livres avec le build** et hypothese **post-v2** de marketplace / chargement tiers. Les ACL, mappings sensibles et reglages simples restent gouvernes par `Recyclique`, ses contrats et sa tracabilite. Relire la checklist `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md` et l'hypothese `_bmad-output/planning-artifacts/architecture/post-v2-hypothesis-marketplace-modules.md`.

**Repere de lecture operationnel :** charger aussi `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md` puis `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`.

### Story 9.1: Livrer le module `declaration eco-organismes`

As a responsible ressourcerie user,
I want to prepare eco-organisme declarations from trustworthy internal business data,
So that the product supports a credible material-and-financial reporting use case in v2.

**Acceptance Criteria:**

**Given** declarations depend on the articulation of material and financial flows
**When** the `declaration eco-organismes` module is implemented
**Then** it can read the relevant period and perimeter from `Recyclique` data and present declaration-oriented outputs through the v2 module chain
**And** the module stays rooted in backend-owned business truth rather than ad hoc spreadsheet-like reconstruction

**Given** internal categories differ from official declaration categories
**When** declaration data is prepared
**Then** the module uses internal categorization with explicit mappings toward eco-organisme reporting categories according to the governed mapping model defined in Story 9.2
**And** it preserves traceability of the mapping used

**Given** this module is complementary but still sensitive
**When** it is delivered
**Then** it follows the same runtime, permission, context, fallback, and audit expectations as the rest of the modular system
**And** it does not collapse declaration logic into generic admin pages

### Story 9.2: Gerer les mappings sensibles et leur gouvernance super-admin

As a super-admin,
I want eco-organisme mappings and similar sensitive module settings to be explicitly governable,
So that high-impact configuration changes stay controlled, visible, and historically understandable.

**Acceptance Criteria:**

**Given** declaration mappings are operationally sensitive
**When** mapping governance is implemented
**Then** only authorized users can create, modify, or validate those sensitive mappings
**And** the affected scope and consequences remain understandable at configuration time

**Given** sensitive mappings may evolve over time
**When** a mapping is changed
**Then** the system keeps enough history to understand which mapping revision influenced later outputs
**And** the resulting configuration remains auditable rather than opaque

**Given** Epic 9 includes super-admin capabilities without replacing the whole product governance model
**When** this story is completed
**Then** the module gains the minimum super-admin control needed for credible declarations
**And** later industrialization can extend governance without reopening the basic sensitivity model

### Story 9.3: Livrer le module `adherents / vie associative minimale`

As a responsible user,
I want a minimal member-management capability in v2,
So that the product supports association membership workflows beyond caisse and reception.

**Acceptance Criteria:**

**Given** v2 includes a minimal `adherents / vie associative` scope
**When** the module is implemented
**Then** authorized users can create and consult member records and read the minimum membership state needed by the product
**And** the module is exposed through the same commanditaire/runtime modular chain as other v2 modules

**Given** this scope is intentionally minimal
**When** the module boundaries are reviewed
**Then** it focuses on core member lifecycle needs rather than broad CRM ambitions
**And** any richer association-management ideas remain outside the minimal v2 contract unless explicitly added later

**Given** member-related actions still depend on context and permissions
**When** the module is used
**Then** the visible screens and actions remain consistent with backend-owned authorization and active perimeter
**And** the module does not leak cross-site or cross-role information

### Story 9.4: Arbitrer le niveau d'integration `HelloAsso` avant implementation large

As a product and architecture team,
I want an explicit decision on the `HelloAsso` integration approach,
So that the project does not commit to a connector strategy before comparing the realistic options.

**Acceptance Criteria:**

**Given** the exact `HelloAsso` integration level is still an architecture-backed choice
**When** the arbitration story is completed
**Then** the project compares at minimum direct `HelloAsso` API integration and reuse or adaptation of the existing `Paheko` plugin path
**And** the decision criteria include simplicity, maintainability, and fit with the member workflow perimeter

**Given** Epic 9 must not launch a wide connector build on assumption alone
**When** the arbitration is documented
**Then** one preferred approach is selected or one clear blocking unknown is recorded
**And** the project avoids accidental implementation drift before this decision is explicit

**Given** this story protects the backlog from premature integration work
**When** it is accepted
**Then** later connector implementation can proceed from an agreed direction
**And** the epic preserves the rule that no broad `HelloAsso` rollout starts before the arbitration exists

**Given** the arbitration must be traceable for implementation and reviews
**When** story 9.4 is completed
**Then** the written outcome is anchored in-repo under `references/migration-paheko/` (spec technique + brouillon promesse / arbitrage), including at minimum: direct `HelloAsso` API path vs `Paheko` cloud-only plugin path, OAuth rate limits per official `limitation-api` page, checkout `metadata` and redirect TTL, Paheko member deduplication (name vs email), and initial migration options (API vs export file)
**And** FR47's comparison explicitly states when the `Paheko` plugin path is excluded (e.g. self-hosted `Paheko` without cloud extension parity)

### Story 9.5: Integrer le minimum utile de `HelloAsso` au parcours adherents

As a responsible association user,
I want the product to consume or reconcile useful `HelloAsso` information,
So that membership-related workflows remain coherent without forcing manual duplicate handling everywhere.

**Acceptance Criteria:**

**Given** the arbitration for `HelloAsso` has already been completed
**When** the minimum viable connector is implemented
**Then** the product can ingest, reconcile, or expose the relevant `HelloAsso` information needed by the minimal member workflow
**And** the resulting behavior remains consistent with the chosen integration strategy

**Given** external membership data can create ambiguity or duplicates
**When** imported or reconciled `HelloAsso` data is handled
**Then** the system avoids silent duplicate creation and surfaces failures or ambiguities explicitly
**And** the user retains a controlled path for manual follow-up when necessary

**Given** `HelloAsso` is complementary and should not block the core product
**When** the connector is delivered
**Then** the minimal member workflow remains usable even if the external integration is temporarily degraded
**And** the overall product does not become dependent on `HelloAsso` for nominal local operation

### Story 9.6: Livrer la `config admin simple` pour modules et reglages simples

As a super-admin or responsible administrator,
I want a simple configuration surface for modules et reglages de faible complexite,
So that the product gains pilotage simple sans transformer cette story en refonte complete des ACL.

**Acceptance Criteria:**

**Given** v2 includes a simple admin configuration capability
**When** the admin-config module is delivered
**Then** authorized users can manage the intended simple settings scope such as activation, order, selected variants, or other explicitly allowed module-level controls
**And** this surface stays bounded to the simple-admin perimeter rather than becoming a full expert control plane

**Given** some settings are more sensitive than others
**When** the configuration UI is used
**Then** the screen makes clear who can act, on which perimeter, and with what effect
**And** changes to sensitive settings remain traceable enough for later supervision

**Given** the **ADR P2** governs persistence of the simple-admin perimeter
**When** surcharges are stored and merged at runtime
**Then** durable storage for this perimeter uses **PostgreSQL** (dedicated model/table) with **deterministic merge** over manifest defaults from the build, not a JSON file on disk in **production**
**And** changes record **author**, **timestamp**, and **reason** where the product requires traceability for supervision

### Story 9.7: Livrer les ACL minimales de fonctionnalites sensibles

As a super-admin or responsible administrator,
I want minimum ACL steering for targeted sensitive capabilities,
So that the riskiest functions can be piloted by role or by user without waiting for a broader governance overhaul.

**Acceptance Criteria:**

**Given** the field explicitly needs ACL steering of sensitive capabilities
**When** feature access settings are exposed
**Then** the system supports minimum ACL control over targeted sensitive functions by role or user where the product scope requires it
**And** those controls remain consistent with backend authority over effective permissions

**Given** this ACL scope is intentionally minimal
**When** the story boundaries are reviewed
**Then** it targets an explicit bounded set of sensitive capabilities rather than every future feature in the product
**And** it does not turn the story into a full authorization redesign

**Given** sensitive access changes have operational impact
**When** ACL settings are changed
**Then** the affected perimeter and intended effect remain understandable to the administrator
**And** the resulting changes stay traceable enough for later supervision

### Story 9.8: Valider la coherence des modules complementaires v2

As a delivery team,
I want a validation pass on the complementary modules epic,
So that the product can claim a credible v2 perimeter beyond the core terrain flows.

**Acceptance Criteria:**

**Given** Epic 9 groups several complementary but strategic modules
**When** the validation pass is executed
**Then** it confirms that eco-organisme declarations, minimal member workflows, `HelloAsso` integration, simple admin configuration, and minimum ACL steering all respect the shared modular chain and permission/context model
**And** the findings distinguish delivered capability from known deferred scope

**Given** these modules extend credibility more than they anchor the whole architecture
**When** the epic is reviewed
**Then** validation keeps their boundaries clean with Epics 5, 8, and 10
**And** it avoids converting complementary scope into a hidden catch-all backlog

**Given** the project needs a believable v2 package
**When** this story is completed
**Then** the roadmap gains a coherent set of complementary modules around the core flows
**And** the product perimeter reads as intentional rather than accidental

## Epic 10: Industrialiser, valider et rendre la v2 deployable

L'equipe peut verifier, tester, observer, deployer et qualifier la v2 jusqu'aux gates de beta interne et de version vendable, sans laisser les contraintes de qualite, CI, observabilite, installabilite et readiness des modules obligatoires hors backlog.

**Note agents (create-story / review) :** pour toute story de cet epic, transformer les garde-fous `OpenAPI` / `CREOS` / agnosticite `Peintre_nano` en validations executables et checks de drift, sans elargir l'epic a une extraction `Peintre` hors scope v2. Relire la checklist `references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`.

**Repere de lecture operationnel :** charger aussi `references/artefacts/2026-04-08_02_pack-lecture-epics-6-10-et-corpus-captures.md` puis `references/artefacts/2026-04-08_03_tableau-ultra-operationnel-epics-6-10.md`.

### Story 10.1: Outiller la CI minimale pour `recyclique`, `peintre-nano` et les contrats

As a delivery platform team,
I want a minimal but enforceable CI pipeline,
So that quality and contract governance stop depending on manual discipline alone.

**Acceptance Criteria:**

**Given** the architecture requires executable governance
**When** the CI baseline is implemented
**Then** the project runs at least the agreed checks for backend, frontend, and contract validation in an automated pipeline
**And** the result becomes the shared baseline for future delivery confidence

**Given** the project depends on governed contract evolution
**When** the CI pipeline evaluates contract-related changes
**Then** it can validate the expected artifact generation and schema-level integrity for the relevant surfaces
**And** it makes contract drift visible before deployment

**Given** Epic 10 should industrialize rather than restate feature work
**When** this story is completed
**Then** the product gains a repeatable quality gate
**And** later stories can build on one delivery backbone instead of ad hoc scripts only

### Story 10.2: Verifier la chaine `OpenAPI -> artefacts generes -> consommation frontend`

As a contract-driven product team,
I want the generated contract chain to be testable and reviewable end to end,
So that backend and frontend stay aligned as the product evolves.

**Acceptance Criteria:**

**Given** the backend is the writer canonique of `OpenAPI`
**When** the contract generation path is exercised
**Then** the project can verify the canonical flow from backend-owned schema to generated artifacts to frontend consumption inputs
**And** the process avoids hidden handwritten copies becoming de facto sources of truth

**Given** the product depends on shared enums, identifiers, and stable DTO semantics
**When** the contract chain is validated
**Then** inconsistencies become detectable before they break composed UI behavior
**And** the resulting review surface remains understandable for maintainers

**Given** several earlier epics rely on this chain implicitly
**When** this story is completed
**Then** the roadmap gains concrete assurance that contract-driven development is really functioning
**And** future module work does not need to re-prove this backbone story by story

**Given** la chaine documentee dans `core-architectural-decisions.md` (generated + `recyclique-api.yaml` + codegen)
**When** la story est acceptee
**Then** le pipeline CI ou la documentation d'equipe demontre qu'il n'existe **qu'un** snapshot OpenAPI par build (pas deux definitions manuelles divergentes) et que `contracts/openapi/recyclique-api.yaml` reste **aligne** sur `contracts/openapi/generated/`
**And** le chemin consomme par `peintre-nano` codegen est nomme explicitement

### Story 10.3: Valider les manifests `CREOS` et les parcours de rendu critiques

As a modular UI platform,
I want `CREOS` artifacts and critical rendering paths to be verified automatically,
So that valid-looking manifests do not silently break the runtime.

**Acceptance Criteria:**

**Given** modular composition is central to the v2 architecture
**When** manifest validation is industrialized
**Then** the project verifies the schemas and structural constraints of supported `CREOS` artifacts before activation or delivery
**And** invalid artifacts are surfaced as real delivery issues rather than runtime surprises only

**Given** les widgets peuvent declarer `data_contract.operation_id`
**When** l'OpenAPI reviewable contient des operations
**Then** la CI (ou script de validation) verifie que chaque `operation_id` reference par un manifest reviewable existe comme `operationId` dans l'OpenAPI du meme snapshot
**And** l'echec bloque ou avertit selon la politique de gate definie pour la release

**Given** a schema-valid artifact can still break rendered behavior
**When** critical render paths are tested
**Then** the product exercises smoke-level rendering checks for the shared runtime and key mandatory modules
**And** the resulting failures remain actionable for maintainers

**Given** Epic 10 must support real deployability
**When** this story is delivered
**Then** the modular system gains an enforceable reliability layer
**And** future module additions inherit a higher readiness bar by default

### Story 10.4: Poser la couverture de tests ciblee sur un premier noyau de parcours critiques

As a quality-focused delivery team,
I want targeted automated coverage for an explicit premier noyau de parcours critiques,
So that regressions on the product spine are detected early without trying to automate the entire backlog at once.

**Story Preparation Gate:** avant execution, enumerer explicitement les 4 cibles minimales du lot de tests : `1` parcours module chain, `1` parcours nominal caisse, `1` parcours nominal reception, `1` parcours sync-sensitive.

**Acceptance Criteria:**

**Given** the product has several critical layers and flows
**When** the first automated test baseline is defined and implemented
**Then** the story names an explicit bounded set of critical paths and risk points to cover across backend behavior, contract boundaries, integration points, and end-to-end smoke paths
**And** the selected tests stay focused on real regression risk rather than ceremonial completeness

**Given** mandatory modules and core terrain flows matter more than peripheral polish
**When** test priorities are chosen
**Then** readiness checks include first the module chain, one bounded nominal caisse path, one bounded nominal reception path, and one bounded sync-sensitive path at the right depth for their risk
**And** the test suite remains maintainable for a solo dev context

**Given** Epic 10 should raise confidence, not noise
**When** this story is completed
**Then** the product gains a practical automated confidence floor
**And** later improvements can expand coverage from a meaningful baseline

### Story 10.5: Rendre l'observabilite et le support exploitables en environnement reel

As a support and operations team,
I want production-relevant observability on the critical flows,
So that incidents and degraded states remain diagnosable after deployment.

**Acceptance Criteria:**

**Given** the product depends on context, sync, and modular runtime behavior
**When** observability is industrialized
**Then** critical flows expose structured logs, correlation semantics, and health-relevant signals sufficient for operational troubleshooting
**And** those signals remain aligned with the architecture decisions already taken

**Given** the system must remain understandable after failures, retries, and degraded modes
**When** an operational issue occurs
**Then** support can inspect a usable trail across the important backend and runtime steps
**And** the project avoids relying on opaque or purely local debugging habits

**Given** observability is part of deployability, not a bonus
**When** this story is completed
**Then** the product gains a realistic operations baseline for beta use
**And** later support tooling can build on the same semantics

### Story 10.6: Documenter l'installation, la stack cible et l'environnement officiellement supporte

As a future deployer or adopting ressourcerie,
I want the product installation and runtime stack to be documented and reproducible,
So that v2 can actually be installed and evaluated outside the author’s head.

**Acceptance Criteria:**

**Given** v2 targets a specific deployment reference stack
**When** installation and deployment documentation is prepared
**Then** it describes the supported environment, the expected services, and the minimum setup path needed to run the product stack coherently
**And** that path remains aligned with the agreed deployment structure including `recyclique`, `peintre-nano`, `paheko`, `postgres`, and `redis`

**Given** the project explicitly targets `Debian` as the official reference environment
**When** support boundaries are documented
**Then** the documentation states what is officially supported versus merely possible
**And** it avoids suggesting that every environment is equally supported

**Given** installation credibility matters for adoption
**When** this story is completed
**Then** the product gains a reproducible baseline for internal beta and future adopters
**And** deployability becomes a documented product property rather than an implicit one

### Story 10.6b: Clarifier le point d'entree Docker local du mono-repo

As a developer or future deployer,
I want the local Docker stack to have one clear entry point in the repository,
So that I can start the product stack without guessing between `recyclique/`, `recyclique-1.4.4/`, or a legacy path.

**Acceptance Criteria:**

**Given** the live backend now lives under `recyclique/api`
**When** the local Docker orchestration is reviewed
**Then** the repository clearly indicates where the dev stack must be launched from
**And** that entry point is aligned with the current backend location or explicitly documented as a transitional compatibility location

**Given** confusion currently exists between the canonical backend path and the legacy compose location
**When** this story is completed
**Then** the project has one documented local Docker startup path
**And** old or transitional paths are either removed, renamed, or clearly marked as historical / compatibility-only

**Given** this is a clarity and operability story, not a product-feature story
**When** the change is implemented
**Then** it updates the relevant README / startup docs / compose references
**And** it avoids reopening backend feature work that already shipped in Epic 2

### Story 10.6c: Documenter et valider le spike de migration PostgreSQL 15 -> 17 hors legacy

As an operations-conscious delivery team,
I want a documented and testable migration spike for PostgreSQL 15 -> 17 on the canonical stack,
So that the version bump is backed by an explicit data-migration path rather than a blind image change.

**Acceptance Criteria:**

**Given** the accepted ADR excludes `recyclique-1.4.4/` from this chantier
**When** the spike is prepared
**Then** the procedure and evidence only target the canonical stack (`docker-compose.yml` racine, `recyclique/api/`, CI, runbooks non legacy)
**And** the documentation reiterates that no migration action is required or planned in `recyclique-1.4.4/`

**Given** a major PostgreSQL upgrade requires a data migration strategy
**When** the spike is completed
**Then** the project documents at least one validated path (`pg_dump` / `pg_restore` and/or `pg_upgrade --check` with decision notes)
**And** the runbook records backup, verification, rollback, and residual risk in a bounded form usable by maintainers

**Given** this story is a spike plus operability story rather than a hidden infrastructure rewrite
**When** it is accepted
**Then** the resulting documentation is short, actionable, and aligned with the ADR and technical research
**And** it does not broaden the scope to unrelated deployment refactors or legacy compose changes

### Story 10.6d: Aligner le compose racine et la CI non legacy sur PostgreSQL 17

As a delivery platform team,
I want the canonical local stack and CI services to target PostgreSQL 17 consistently,
So that development and automated checks stop diverging on the supported database major version.

**Acceptance Criteria:**

**Given** the ADR names `docker-compose.yml` racine and the listed GitHub workflows as in-scope surfaces
**When** the infrastructure alignment is implemented
**Then** the root `postgres` service and the relevant CI `postgres` services target PostgreSQL 17 (or a documented patch-pinned 17 tag where required)
**And** the change set remains explicitly limited to non legacy surfaces

**Given** the repository still contains legacy assets under `recyclique-1.4.4/`
**When** this story is completed
**Then** no migration requirement, compose change, or support promise is added there for this chantier
**And** any remaining references keep the legacy status explicit

**Given** a simple image bump is unsafe without migration awareness
**When** the story is reviewed
**Then** the implementation points to the spike / runbook that explains the data migration prerequisite
**And** the compose / CI alignment is coherent with that documented procedure

### Story 10.6e: Verifier `recyclique/api` et Alembic sur PostgreSQL 17

As a backend maintainer,
I want the canonical API and migration path to be exercised against PostgreSQL 17,
So that the stack upgrade has concrete application-level evidence rather than infrastructure-only optimism.

**Acceptance Criteria:**

**Given** the living backend is `recyclique/api/`
**When** validation is executed against PostgreSQL 17
**Then** the relevant Alembic path and a bounded pytest selection are run or explicitly documented with outcomes
**And** blocking regressions inside the in-scope backend surface are either fixed or reported before the story can be marked done

**Given** the chantier is intentionally bounded
**When** validation evidence is recorded
**Then** it focuses on `recyclique/api/` plus its PostgreSQL-dependent checks
**And** it does not reopen unrelated frontend or product backlog work

**Given** a deployability story needs operator trust
**When** this story is accepted
**Then** the project has a concise verification trail for PostgreSQL 17 compatibility
**And** the final QA can cite that evidence directly

### Story 10.7: Definir et verifier les gates de beta interne et de v2 vendable

As a product owner and delivery team,
I want explicit release-readiness gates,
So that "beta interne" and "v2 vendable" mean something concrete and traceable in the backlog.

**Acceptance Criteria:**

**Given** the roadmap should end in explicit quality decisions rather than intuition
**When** the release gates are defined
**Then** the project documents the minimum conditions for internal beta and for a sellable v2 release
**And** those conditions refer to real product qualities such as module readiness, deployability, operability, contract stability, and critical-flow confidence

**Given** readiness must reflect the mandatory module map
**When** gate checks are reviewed
**Then** the product can state which mandatory modules are considered ready, partially ready, or still blocking
**And** the release decision remains tied to explicit evidence rather than optimism

**Given** Epic 10 is the final quality and deployability epic
**When** this story is completed
**Then** the project has a usable definition of "ready enough" at each release threshold
**And** the v2 scope can be communicated with much less ambiguity

### Story 10.8: Valider la readiness globale de la v2

As a final delivery checkpoint,
I want a global readiness validation across the full v2 backlog,
So that the project ends the epic sequence with an explicit go/no-go picture rather than a pile of partially trusted assumptions.

**Acceptance Criteria:**

**Given** all earlier epics contribute different parts of product readiness
**When** the final readiness pass is executed
**Then** it assesses the state of critical flows, mandatory modules, contracts, observability, test baseline, installation path, and release gates together
**And** it records the main remaining risks in a form usable for decision-making

**Given** Epic 10 must not become a dumping ground for uncategorized feature work
**When** the final validation is reviewed
**Then** it remains focused on verification, qualification, and explicit residual risk
**And** it does not quietly absorb missing product features that belong to prior epics

**Given** the product needs a trustworthy closing point for the planning sequence
**When** this story is completed
**Then** the roadmap gains an explicit final readiness statement
**And** the next phase can begin from a known quality posture rather than a guessed one

## Epic 11: Retrouver la parite UI legacy critique dans `Peintre_nano`

L'equipe peut reconstruire dans `Peintre_nano` un premier noyau de parcours legacy reellement observables, avec preuves terrain sur `localhost:4445`, sans casser le fil des Epics 1 a 10 ni transformer Epic 10 en fourre-tout.

**Note agents (create-story / review) :** cet epic reste etroit. Il couvre uniquement les 3 parcours pilotes formalises dans les artefacts du 2026-04-10 (`login` public, `dashboard` standard, `caisse vente` kiosque) et leurs prerequis UI minimaux. Ne pas y glisser de nouvelles features metier, de refonte design globale, ni de dette backend non deja nommee comme gap de contrat.
Pour la caisse, **Epic 6** reste la reference fonctionnelle metier ; **Epic 11** ne re-specifie pas le domaine caisse. La **Definition of Done** produit pour les slices parité est l'**equivalence utilisateur** avec le legacy sur les parcours listes dans la matrice, **rendue dans** Peintre (manifests CREOS, widgets, slots, donnees API) — pas de contournement contractuel ; detail et gate MCP : `guide-pilotage-v2.md` § *Règle caisse Peintre vs legacy (2026-04-12)* et [`sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`](./sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md). Les ecarts **sans** derogation PO explicite (une ligne matrice = une decision) ne suffisent pas a fermer une story.

**Repere de lecture operationnel :** charger d'abord `references/artefacts/2026-04-10_02_cadrage-parite-ui-legacy-peintre.md`, puis `references/artefacts/2026-04-10_03_matrice-parite-ui-pilotes-peintre.md`, puis `references/artefacts/2026-04-10_04_story-seeds-parite-ui-pilotes-peintre.md`.

### Story 11.1: Retrouver la connexion publique observable dans `Peintre_nano`

As a non-authenticated user,
I want a public login path in `Peintre_nano` that behaves like the legacy reference,
So that I can enter the authenticated UI through a contract-driven path rather than through frontend-specific auth logic.

**Acceptance Criteria:**

**Given** the legacy login is observed on `http://localhost:4445/login`
**When** the public auth slice is implemented in `Peintre_nano`
**Then** the screen exposes the same core intentions (`Connexion`, username, password, submit, forgot-password entry point)
**And** the delivered path remains anchored to reviewable contracts rather than ad hoc local auth structure

**Given** the project hierarchy of truth is `OpenAPI > ContextEnvelope > CREOS`
**When** the login story is delivered
**Then** the frontend uses only the reviewable auth/context operations explicitly accepted for the slice
**And** any legacy-observed endpoint absent from the reviewable YAML is documented as a gap or excluded from scope rather than silently assumed

**Given** this is a pilote de parite UI and not a full auth epic
**When** the story is accepted
**Then** the matrix line `ui-pilote-01-login-public` contains a proof, a contract mapping, and explicit residual gaps
**And** signup / reset / heartbeat remain out of scope unless explicitly brought into a later story

### Story 11.2: Retrouver le dashboard standard observable dans `Peintre_nano`

As an authenticated user,
I want the standard dashboard shell and first transverse view to feel and behave like the legacy reference,
So that the post-login experience regains a recognizable product spine before wider migration work.

**Acceptance Criteria:**

**Given** the legacy dashboard is observed on `http://localhost:4445/`
**When** the dashboard pilote is delivered
**Then** the standard shell, navigation structure, welcome area, and first bounded dashboard blocks match the observed legacy usage at an equivalent functional level
**And** the delivered slice names its explicit route alignment decision between legacy `/` and the current CREOS anchor

**Given** current CREOS reviewable artifacts already include a transverse dashboard skeleton
**When** the story is implemented
**Then** it anchors on reviewable manifests rather than inventing a one-off dashboard page in the frontend
**And** every displayed data block in scope is mapped to a reviewable contract or explicitly marked as blocked / deferred

**Given** this pilote should remain bounded
**When** the story is accepted
**Then** only the bounded blocks and states defined in the matrix are considered in scope
**And** missing statistics, route mismatches, or non-mapped calls are tracked as explicit gaps instead of being hidden inside the implementation

### Story 11.3: Retrouver la vente caisse kiosque observable dans `Peintre_nano`

As a user with `caisse.access` and an open cash session,
I want the nominal kiosk sale flow in `Peintre_nano` to match the observed legacy experience,
So that a critical terrain path becomes testable in the new UI without moving business authority out of the API.

**Acceptance Criteria:**

**Given** the legacy kiosk flow is observed from `http://localhost:4445/caisse` to `/cash-register/sale`
**When** the kiosk pilote is implemented
**Then** the delivered slice reproduces the nominal sequence and shell qualities in scope (hub access, kiosk view, session context, wizard/ticket/finalization structure)
**And** the story remains strictly limited to the nominal real-cash path, excluding virtual and deferred variants

**Given** the current reviewable CREOS slice for cashflow does not equal the legacy kiosk route one-to-one
**When** the story is implemented
**Then** that mismatch is documented as an explicit alignment decision
**And** the frontend does not pretend the current `/caisse` CREOS slice is already a full route-equivalent kiosk contract if it is not

**Given** the kiosk flow is business-critical
**When** the story is accepted
**Then** the matrix line `ui-pilote-03-caisse-vente-kiosk` includes manual proof on `localhost:4445`, a network proof point on the nominal sale path, and explicit contract mapping for the delivered surface
**And** no extra business rules are recreated in UI state beyond the bounded local interaction state needed to drive the flow

## Epic 12: Etendre la parite UI legacy de la reception dans `Peintre_nano`

L'equipe peut etendre la methode legacy-first validee par l'Epic 11 aux ecrans et sous-parcours reception prioritaires, avec preuves terrain sur `localhost:4445`, sans deplacer l'autorite metier hors de `Recyclique` ni absorber des chantiers de convergence qui relevent deja des epics precedents.

**Note agents (create-story / review) :** cet epic reste etroit. Il traite la **parite UI observable** et la cartographie contractuelle de la reception legacy vers `Peintre_nano`, ecran par ecran. Ne pas y glisser de refonte categorie, de logique metier reception recomposee dans le frontend, ni de sujets sync/Paheko hors gaps deja nommes.
Les artefacts de l'Epic 11 servent de methode de reference ; produire un pack reception dedie (cadrage, matrice, story seeds, preuves) avant de chercher la fermeture complete.

**Repere de lecture operationnel :** reutiliser la discipline `OpenAPI > ContextEnvelope > NavigationManifest > PageManifest > UserRuntimePrefs`, les preuves DevTools sur le legacy et l'analyse du code `recyclique-1.4.4` quand le comportement observable doit etre tranche.

### Story 12.1: Retrouver l'acces reception observable dans `Peintre_nano`

As a user with reception access,
I want the reception entry path and its immediate shell to match the observed legacy route,
So that I can retrouver the correct point of entry before deeper migration of the reception workflow.

**Acceptance Criteria:**

**Given** the legacy reception access path is observed on `localhost:4445`
**When** the first reception story is implemented
**Then** `Peintre_nano` exposes the same bounded access intent, shell cues, and immediate context as the reference path in scope
**And** the route alignment decision is explicit rather than silently assumed

**Given** the hierarchy of truth remains `OpenAPI > ContextEnvelope > NavigationManifest > PageManifest > UserRuntimePrefs`
**When** the reception access slice is delivered
**Then** the rendered access state is anchored to reviewable contracts, navigation/page manifests, and explicit runtime preferences
**And** any missing backend contract is documented as a gap instead of being recreated in frontend state

### Story 12.2: Retrouver le flux nominal d'entree reception observable dans `Peintre_nano`

As a reception operator,
I want the nominal intake sequence to feel and behave like the legacy reference,
So that the critical terrain path can be exercised in the new UI without inventing a new workflow.

**Acceptance Criteria:**

**Given** the nominal reception flow is observed in the legacy UI
**When** the intake story is delivered
**Then** the bounded sequence in scope reproduces the same main steps, visible states, and operator cues at an equivalent functional level
**And** the story states explicitly what remains out of scope in the matrix

**Given** reception remains business-authoritative in the API
**When** the story is accepted
**Then** only local interaction state needed for rendering is handled in `Peintre_nano`
**And** category, validation, and business decisions stay mapped to reviewable backend authority

### Story 12.3: Retrouver la mesure et la qualification reception observables dans `Peintre_nano`

As a reception operator,
I want the mesure / qualification parts of the reception path to match the observed legacy behavior in the bounded scope,
So that the migrated UI remains credible on the terrain-critical details that users actually see.

**Acceptance Criteria:**

**Given** the legacy reception UI exposes measurement and qualification states in the nominal path
**When** this story is implemented
**Then** the delivered slice reproduces the visible controls, transitions, and feedback explicitly retained in scope
**And** unsupported branches are marked as gaps, not hidden inside the implementation

**Given** this epic must stay bounded
**When** the story is reviewed
**Then** the matrix records proof points, contract mappings, and residual risks for the delivered reception surface
**And** no silent expansion to full reception domain coverage is accepted

## Epic 13: Etendre la parite UI legacy de la caisse au-dela du kiosque nominal dans `Peintre_nano`

L'equipe peut prolonger la parite UI amorcee par la story 11.3 sur les ecrans et variantes caisse encore critiques sur le terrain, toujours avec preuves legacy sur `localhost:4445`, sans respecifier le domaine caisse deja cadre par l'Epic 6.

**Note agents (create-story / review) :** Epic 6 reste la reference fonctionnelle metier caisse. Cet epic couvre l'**equivalence utilisateur** des ecrans caisse restants **dans** `Peintre_nano` (CREOS, widgets, slots, API), avec la meme **Definition of Done** que l'Epic 11 (voir `guide-pilotage-v2.md` § *Règle caisse Peintre vs legacy* et [`sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md`](./sprint-change-proposal-2026-04-12-parite-caisse-legacy-stricte.md)). Ne pas absorber de nouvelles regles caisse, ni traiter comme equivalent sans decision ecrite le slice CREOS `/caisse` et toute route legacy plus riche.

**Repere de lecture operationnel :** repartir de la matrice et des preuves de l'Epic 11, puis ouvrir un pack dedie pour les extensions caisse encore visibles au legacy (variants, retours, cloture, signaux, raccourcis si confirmes).

### Story 13.1: Retrouver les ecrans caisse adjacents au kiosque observable dans `Peintre_nano`

As a cashier with an active session,
I want the UI states immediately before or after the nominal kiosk sale flow to match the observed legacy behavior,
So that the migrated path does not stop at a misleadingly isolated kiosk screen.

**Acceptance Criteria:**

**Given** the legacy caisse flow includes adjacent UI states around the kiosk path
**When** the extension story is implemented
**Then** the bounded pre/post-kiosk screens in scope are rendered with equivalent shell cues, context, and transitions
**And** the retained scope is documented explicitly in the matrix

**Given** the delivered path must remain contract-driven
**When** the story is accepted
**Then** every displayed block is mapped to reviewable contracts or flagged as deferred
**And** no hidden caisse business fallback is recreated in frontend code

### Story 13.2: Retrouver les variantes caisse explicitement retenues dans la matrice de parite

As a cashier,
I want the explicitly approved caisse variants to feel and behave like the observed legacy reference,
So that important terrain branches can be tested in `Peintre_nano` without guessing their UI.

**Acceptance Criteria:**

**Given** some caisse variants are observed on the legacy reference and approved in the matrix
**When** this story is implemented
**Then** only those approved variants are delivered with explicit route and contract alignment decisions
**And** all other variants remain excluded or marked as gaps

**Given** Epic 6 remains the caisse authority
**When** review happens
**Then** the story proves UI parity in scope without redefining caisse business rules
**And** any mismatch between legacy route shape and current CREOS slice is written down explicitly

### Story 13.3: Retrouver la cloture ou fin de session caisse observable dans `Peintre_nano`

As a cashier or supervisor,
I want the bounded caisse session closing UI to match the legacy reference where it is in scope,
So that the extended caisse surface remains coherent from sale to end-of-session cues.

**Acceptance Criteria:**

**Given** the legacy reference exposes a visible end-of-session or closing path
**When** this story is delivered
**Then** `Peintre_nano` reproduces the retained shell, signals, and operator-facing steps at an equivalent functional level
**And** sync, accounting, or backend-heavy consequences outside the UI scope stay delegated to the proper epics and contracts

**Given** this path is operationally sensitive
**When** the story is accepted
**Then** DevTools proof, contract mapping, and residual gaps are all recorded explicitly
**And** no ambiguous completion state is left undocumented

### Story 13.4: Aligner le hub caisse (`/caisse`) avec la parite UI legacy observable (RCN-01)

As a cashier or supervisor,
I want the cash register hub (`/caisse`) to expose the same observable structure, labels, and affordances as the legacy reference,
So that I can see where I stand and how to enter a sale session without a misleading gap between legacy and `Peintre_nano`.

**Acceptance Criteria:**

**Given** the legacy hub is observed on `localhost:4445/caisse`
**When** this story is delivered
**Then** `Peintre_nano` on `localhost:4444/caisse` exposes an equivalent checklist of visible elements (post titles, register cards, open/resume actions, shell cues) or documents each gap with an explicit matrix line and contract note
**And** DevTools MCP proof (`user-chrome-devtools`: navigate + snapshot + network when relevant) is recorded for legacy and Peintre

**Given** Epic 6 remains the caisse business authority
**When** the story is accepted
**Then** no new business rules are invented in the frontend; rendering stays anchored to OpenAPI, `ContextEnvelope`, manifests, and widgets per Peintre protocol
**And** any mismatch between legacy route richness and the CREOS `/caisse` slice is written in `peintre-nano/docs/03-contrats-creos-et-donnees.md` and the parity matrix, not silently assumed

### Story 13.5: Aligner la transition hub vers vente plein cadre avec la parite legacy observable (RCN-02)

As a cashier with an active path from the cash hub to sale,
I want the transition from the hub to the kiosk sale surface to match the legacy shell and viewport behavior,
So that I do not land on an incoherent screen (double hub + sale, phantom nav, broken full-screen intent).

**Acceptance Criteria:**

**Given** the legacy sequence is observed from `http://localhost:4445/caisse` to the final sale URL (e.g. `/cash-register/sale`)
**When** this story is delivered
**Then** the documented URLs, redirects, disappearance of main transverse nav, and full-viewport framing match the legacy checklist or each gap is recorded on a dedicated matrix line with `Equiv. utilisateur / derogation PO` per project rules
**And** DevTools MCP proof (`user-chrome-devtools`) is captured for legacy and for `Peintre_nano` on `http://localhost:4444` for the same user intent

**Given** virtual and deferred variants are out of scope for this slice (RCN-V optional later)
**When** the story is implemented
**Then** only the real-cash path alignment is in scope unless the matrix explicitly extends the line
**And** any structural difference in CREOS composition is written as an explicit accept / fix / defer decision in `peintre-nano/docs/03-contrats-creos-et-donnees.md` and the matrix

**Given** Epic 6 remains the caisse business authority and Peintre remains contract-driven
**When** the story is accepted
**Then** no new business rules are invented in the frontend; routing and shell adjustments use manifests, widgets, and runtime aliases already allowed by the architecture
**And** optional observability markers such as `data-testid="cash-register-sale-kiosk"` are used only as proof aids, not as a substitute for contract mapping

**Repere decoupe produit :** `_bmad-output/implementation-artifacts/rattrapage-caisse-nominale-decoupe-stories-ui-observables-2026-04-12.md` (troncon **RCN-02**).

### Story 13.6: Certifier l'equivalence utilisateur legacy de la caisse observable dans `Peintre_nano`

As a product owner or terrain referent,
I want the delivered caisse surface in `Peintre_nano` to be explicitly certified against the legacy reference,
So that the team can claim a credible user-equivalent caisse experience instead of a merely partial observable alignment.

**Acceptance Criteria:**

**Given** the caisse parity scope retained by stories 11.x and 13.x is implemented
**When** this certification story is reviewed
**Then** `Peintre_nano` exposes a dedicated cash shell with credible user density and no misleading empty framing versus legacy
**And** any remaining difference is either fixed or explicitly classified in the parity matrix

**Given** the target is user equivalence and not technical showcase
**When** the delivered caisse path is compared to legacy proof
**Then** the operator-facing flow is free of avoidable technical noise, debug artefacts, or contract-internal wording
**And** the proof pack records legacy vs `Peintre_nano` evidence for the same bounded scenarios

**Given** certification cannot rest on implicit acceptance
**When** the story is accepted
**Then** the parity matrix contains zero unclassified gap for the retained caisse scope
**And** any non-equivalent point still present is rejected from certification until classified by explicit decision

### Story 13.7: Auditer et traduire le kiosque legacy vers un plan de portage `Peintre_nano`

As a product and implementation team,
I want the legacy kiosk sale surface to be audited and translated into a precise `Peintre_nano` target map,
So that the next implementation story can reproduce the retained user experience without improvising the portage.

**Acceptance Criteria:**

**Given** the retained kiosk scope must be compared on legacy `localhost:4445` and `Peintre_nano` `localhost:4444`
**When** this audit story is delivered
**Then** every visible kiosk block, label, CTA, shortcut, and major state in scope is inventoried in a legacy -> Peintre translation checklist
**And** each retained element is mapped to a target `PageManifest`, widget, slot, API contract, or explicit blocker/defer decision

**Given** the goal is a credible translation inside Peintre rather than a pixel-copy outside architecture
**When** the audit is accepted
**Then** the story states what must be reproduced as user-equivalent, what may stay adapted in Peintre language, and what remains out of scope
**And** no kiosk behavior is redefined as frontend business authority outside the existing caisse contracts

### Story 13.8: Implementer la traduction kiosque legacy retenue dans `Peintre_nano`

As a cashier using the sale kiosk,
I want the retained legacy kiosk cues to be implemented in `Peintre_nano`,
So that the in-frame sale experience feels like the legacy reference while staying contract-driven.

**Acceptance Criteria:**

**Given** the translation checklist from Story 13.7 is approved
**When** this implementation story is delivered
**Then** the retained kiosk layout, labels, CTA order, and visible empty/loading/error states are reproduced at a user-equivalent level in `Peintre_nano`
**And** any residual gap is classified explicitly in the parity matrix instead of being left implicit

**Given** the kiosk remains a Peintre surface
**When** the story is accepted
**Then** the delivered rendering stays implemented through manifests, widgets, slots, and API-fed contracts already allowed by the architecture
**And** legacy embedding, parallel frontend shortcuts, or newly invented caisse business rules are not accepted as implementation strategies

## Epic 14: Etendre la parite UI legacy de l'administration dans `Peintre_nano`

L'equipe peut retrouver dans `Peintre_nano` les vues d'administration legacy prioritaires pour le parametage quotidien et la supervision simple, avec selection de contexte explicite et preuves de rendu, sans contourner les regles de permissions, de step-up, ou de separation multi-contexte.

**Note agents (create-story / review) :** cet epic distingue l'administration observable de la logique de gouvernance deja traitee ailleurs. Ne pas y glisser de contournement auth, de bypass PIN, ni d'analytique avancee non deja bornee. Les decisions de persistance et de gouvernance restent dans leurs epics de reference ; ici on traite la **parite UI observable** et le fil contractuel vers `Peintre_nano`.

**Repere de lecture operationnel :** s'appuyer sur les invariants multi-contextes, les permissions du `ContextEnvelope`, les manifests de navigation, puis trancher avec DevTools legacy et code `recyclique-1.4.4` avant toute extension admin.

**Suivi BMAD (reconciliation code 2026-04-13) :** les stories **14.3**, **14.4** et **14.5** ont des surfaces Peintre deja implementees (dashboard legacy sur `/admin`, audit-log, groupes) — detail et statuts dans les fichiers story sous `_bmad-output/implementation-artifacts/` et dans `implementation-artifacts/sprint-status.yaml`. L'Epic **14** reste **in-progress** tant que ces stories ne sont pas toutes en **done** (passage **review** vers **done** apres validation, CR et gates selon le workflow projet).

### Story 14.1: Retrouver le shell et le choix de contexte admin observables dans `Peintre_nano`

As an authorized admin user,
I want the admin shell and its visible context selection cues to match the legacy reference,
So that I can navigate the admin space without losing the expected site or scope framing.

**Acceptance Criteria:**

**Given** the legacy admin access path is observed on `localhost:4445`
**When** the first admin story is delivered
**Then** the admin entry shell, navigation cues, and visible context selection states in scope match the legacy intent at an equivalent functional level
**And** the story states explicitly how multi-context rendering is bounded

**Given** admin UI is permission-sensitive
**When** the slice is reviewed
**Then** access control remains driven by `ContextEnvelope` and reviewable manifests
**And** any missing step-up or context contract is surfaced as a documented gap

### Story 14.2: Retrouver les ecrans de parametres admin simples observables dans `Peintre_nano`

As an authorized admin user,
I want the bounded simple configuration screens to feel and behave like the legacy reference,
So that day-to-day administration regains a recognizable UI before broader migration work.

**Acceptance Criteria:**

**Given** some simple admin parameter screens are selected in the parity matrix
**When** this story is implemented
**Then** only those bounded screens are rendered with equivalent visible structure, controls, and feedback
**And** any persistence authority stays mapped to existing contracts rather than improvised in the frontend

**Given** admin scope can easily sprawl
**When** the story is accepted
**Then** retained screens, excluded screens, and residual risks are all explicit in the matrix and proof set
**And** no hidden expansion to the full admin domain is accepted

### Story 14.3: Retrouver les vues admin de supervision simple observables dans `Peintre_nano`

As an authorized admin user,
I want the bounded read-oriented admin supervision views to resemble the legacy reference,
So that Peintre regains credible admin visibility without inventing a new reporting product.

**Acceptance Criteria:**

**Given** the legacy admin area exposes simple supervision or list views in the retained scope
**When** this story is delivered
**Then** the corresponding `Peintre_nano` surfaces reproduce the visible blocks, navigation, and labels that are explicitly kept in scope
**And** advanced analytics or unrelated admin branches remain outside the story

**Given** these views can leak across contexts if handled loosely
**When** the story is reviewed
**Then** the delivered rendering shows explicit context anchoring and permission handling
**And** residual cross-context risks are documented rather than ignored

### Story 14.4: Retrouver la vue audit-log transverse observable dans `Peintre_nano`

As an authorized admin user,
I want the read-oriented audit log surface to be rendered in `Peintre_nano` from served CREOS manifests and stable OpenAPI operations,
So that cross-context audit visibility regains parity with the legacy reference without inventing a new reporting product.

**Acceptance Criteria:**

**Given** the `audit-log` family was contractualized in Epic 16 Story 16.2 (rail **K**) and remains read-oriented supervision
**When** this story is delivered
**Then** the `Peintre_nano` page consumes `GET /v1/admin/audit-log` (or successor) only through the canonical OpenAPI contract and shared admin primitives (shell, guards, list patterns from Epic 17.3 where applicable)
**And** no parallel `fetch` to undocumented paths or legacy-only clients is introduced

**Given** audit reads are sensitive and transverse
**When** the story is reviewed
**Then** access remains driven by documented security (`require_admin_role_strict` per 16.2) and visible empty, loading, and error states are honest about rate limits or denials
**And** `email-logs` and `transaction-logs` stay out of scope unless explicitly folded by a later story

### Story 14.5: Retrouver la gestion des groupes admin observable dans `Peintre_nano`

As an authorized admin user,
I want the groups administration list, detail, and bounded mutations to be observable in `Peintre_nano` through CREOS manifests,
So that ACL configuration regains a recognizable UI aligned with the legacy reference while staying contract-driven.

**Acceptance Criteria:**

**Given** the `groups` family was contractualized in Epic 16 Story 16.2
**When** this story is delivered
**Then** the rendered surfaces use the documented `/v1/admin/groups` operations (list, detail, mutations in scope) without inventing authority client-side
**And** any backend defect (including HTTP 500 on nominal admin calls) is diagnosed and fixed in the backend layer with reproducible tests before the story is closed

**Given** groups management touches identity and permissions
**When** the story is reviewed
**Then** mutations remain within the OpenAPI-documented scope; user-directory bulk actions stay deferred to Epic 21
**And** parity notes reference the Epic 15 matrix line(s) for groups rather than ad hoc screenshots alone

## Epic 15: Fonder le portage admin strict mutualise vers `Peintre_nano`

L'equipe construit un socle d'audit, de mutualisation et de recommandation d'architecture pour porter l'administration legacy vers `Peintre_nano` avec une **parite stricte cote usages**, sans recopier les divergences historiques du code legacy ecran par ecran.

**Note agents (create-story / review) :** cet epic est un chantier **transversal de fondation**. Il ne livre pas directement les ecrans admin finaux ; il produit les audits, matrices, recommandations et decoupages necessaires pour que les epics suivants portent l'admin de facon coherente, mutualisee et contract-driven. Capturer aussi les **patterns emergents** decouverts en cours d'audit, pas seulement ceux deja enumeres.

**Repere de lecture operationnel :** croiser `recyclique-1.4.4/frontend/src/App.jsx`, `recyclique-1.4.4/frontend/src/config/adminRoutes.js`, les pages legacy admin, l'existant Epic 14, la matrice de parite, `peintre-nano/docs/03-contrats-creos-et-donnees.md`, puis utiliser le navigateur integre / Browser pour les preuves visuelles quand utile. Le MCP DevTools peut completer, mais n'est pas le seul canal de preuve.

### Story 15.1: Auditer exhaustivement les surfaces admin legacy a porter vers `Peintre_nano`

As a product and architecture team preparing a strict admin migration,
I want a complete audit of the legacy admin surfaces, routes, screens, and visible behaviors,
So that the migration scope is explicit before any new admin epic is launched.

**Acceptance Criteria:**

**Given** the legacy admin area spans multiple routes and page families
**When** this story is delivered
**Then** every retained admin route in scope is inventoried with its page component, key visible zones, and primary user intent
**And** excluded or deferred routes are explicitly listed with reasons rather than silently omitted

**Given** parity is expected at the user-observable level
**When** the audit is reviewed
**Then** each screen record states the legacy reference points that matter for parity (titles, navigation, controls, data blocks, exports, context cues)
**And** the audit is actionable enough to support later story slicing without reopening discovery from scratch

### Story 15.2: Cartographier les dependances API, permissions et contextes de ladmin legacy

As a team preparing contract-driven migration work,
I want the admin screens mapped to their endpoints, permissions, step-up needs, and context constraints,
So that future CREOS slices stay anchored to real backend authority and not frontend guesswork.

**Acceptance Criteria:**

**Given** admin screens depend on heterogeneous APIs and permission regimes
**When** this story is completed
**Then** the retained admin screens have an explicit mapping to the main endpoints, contracts, permissions, roles, and context requirements they rely on
**And** sensitive flows such as step-up, super-admin actions, exports, or cross-context reads are called out separately

**Given** some screens may currently depend on unstable or implicit contracts
**When** the mapping is reviewed
**Then** each contract gap is named as an OpenAPI, ContextEnvelope, or CREOS gap
**And** no missing authority is papered over as a frontend-only solution

### Story 15.3: Identifier les patterns mutualisables et les anti-patterns du legacy admin

As an architecture team aiming to reduce duplication,
I want a dedicated audit of recurring admin UI patterns and historical inconsistencies,
So that `Peintre_nano` can converge on reusable building blocks instead of cloning fragmented legacy implementations.

**Acceptance Criteria:**

**Given** the legacy admin contains lists, filters, detail views, editing flows, exports, and other repeated patterns built differently
**When** this story is delivered
**Then** a catalog of reusable pattern families is produced across the retained admin corpus
**And** each family distinguishes reusable common behavior from true business-specific variation

**Given** not all useful patterns are known in advance
**When** the audit progresses
**Then** newly discovered emergent patterns are added to the catalog as first-class findings
**And** anti-patterns or accidental historical divergences are explicitly marked as behaviors not to replicate in Peintre

### Story 15.4: Etendre la matrice de parite admin stricte et la couverture des preuves

As a pilotage team,
I want the admin parity matrix extended screen by screen or by coherent admin slice,
So that equivalence, derogations, gaps, and proof obligations are tracked consistently before implementation.

**Acceptance Criteria:**

**Given** the current admin matrix coverage is partial
**When** this story is completed
**Then** the matrix contains one line per retained admin screen or coherent slice with explicit equivalence intent
**And** each line records scope, proof source, contract status, and documented derogations if any

**Given** visual and behavioral proof is required for strict migration decisions
**When** the matrix is reviewed
**Then** each retained line identifies the expected evidence source (legacy code, browser comparison, runtime proof, documentation)
**And** unresolved proof debt remains visible as debt, not as implied validation

### Story 15.5: Produire la recommandation darchitecture pour un admin `Peintre_nano` mutualise

As a senior architecture team,
I want a concrete recommendation for how admin screens should be assembled in CREOS and Peintre,
So that future migration epics reuse stable patterns, contracts, and shared components instead of re-deciding structure per screen.

**Acceptance Criteria:**

**Given** the audits strict and mutualisation are available
**When** this story is delivered
**Then** it defines which recurring admin concerns should become shared widgets, presentation components, generators, shells, or contract conventions
**And** it states the boundaries between screen-specific logic and reusable admin primitives

**Given** future stories must stay contract-driven
**When** the recommendation is reviewed
**Then** it explains how OpenAPI, ContextEnvelope, NavigationManifest, PageManifest, and user prefs interact for admin screens
**And** it rejects any architecture that would reintroduce hidden business logic or screen-by-screen duplication

### Story 15.6: Preparer la passe d'analyse approfondie et le decoupage des futurs epics de portage admin

As a BMAD planning team,
I want a final foundation package that can be handed to a stronger analysis pass and converted into implementation epics,
So that the next admin migration epics start from a validated architecture direction rather than raw notes.

**Acceptance Criteria:**

**Given** the audits, matrix, and recommendation are available
**When** this story is completed
**Then** a dedicated brief for a stronger model analysis pass is prepared with the exact source corpus, constraints, and expected outputs
**And** the future admin migration epics are proposed in a prioritized order with explicit rationale

**Given** BMAD execution should stay disciplined
**When** the planning package is reviewed
**Then** the proposed next epics and stories are specific enough to enter `sprint-status.yaml` and later `create-story` / `dev-story` flows
**And** the foundation package clearly states what is ready, what remains uncertain, and what requires HITL or browser proof

## Epic 16: Deverrouiller les contrats, permissions et garde-fous admin avant portage UI

L'equipe ferme les gaps admin classes **B** identifies par l'Epic 15 afin de rendre les futurs portages `Peintre_nano` strictement contract-driven. Cet epic est **backend / OpenAPI / ContextEnvelope / securite** uniquement; il ne porte aucun ecran admin final.

**Note agents (create-story / review) :** cet epic est le rail **K** de la fondation 15.6. Il traite les autorites backend, les `operation_id`, les permissions, le step-up, l'audit et les exports sensibles. Il ne doit pas absorber de composition JSX, de manifest UI final, ni d'arbitrage produit.

### Story 16.1: Fermer le gap G-OA-03 et requalifier le portage futur de `users`

As a contract-first admin migration team,
I want the blocking gap `G-OA-03` closed and traced in backend and OpenAPI,
So that the future `users` slice can move from partially blocked to portageable without frontend guesswork.

**Acceptance Criteria:**

**Given** the `users` family remains partially blocked in Epic 15
**When** this story is completed
**Then** the backend, OpenAPI, and permission model explicitly cover the missing authority named `G-OA-03`
**And** the resulting contract is reviewable enough to support a future CREOS page without local business reconstruction

### Story 16.2: Stabiliser les contrats et permissions pour `groups`, `audit-log` et `email-logs`

As an admin platform team,
I want the blocked governance and audit surfaces mapped to stable contracts and permissions,
So that later UI work can consume explicit backend authority instead of historical coupling.

**Acceptance Criteria:**

**Given** these admin families are classed `B` by Epic 15
**When** this story is delivered
**Then** each family exposes or documents the required endpoints, security rules, and context constraints
**And** the sensitive read scopes or audit rules stay visible as backend concerns, not UI conventions

### Story 16.3: Encadrer `settings` et les surfaces super-admin par step-up et audit explicites

As a security-conscious architecture team,
I want super-admin settings flows bound to explicit step-up and audit requirements,
So that no high-risk admin surface is ported before its authority chain is fully defined.

**Acceptance Criteria:**

**Given** `settings` and similar super-admin flows are sensitive
**When** this story is reviewed
**Then** the expected step-up, audit trail, and context restrictions are documented in contracts and security notes
**And** no future Peintre story can claim parity on these surfaces without referencing those controls

### Story 16.4: Contractualiser les exports bulk et les stats reception sensibles avant tout slice UI associe

As a team sequencing admin migration safely,
I want exports, bulk actions, and permissive reception stats treated as backend and contract work first,
So that future UI epics do not hide unresolved authority or audit debt inside reusable components.

**Acceptance Criteria:**

**Given** exports and bulk actions are explicitly called out as sensitive in Epic 15
**When** this story is completed
**Then** each retained export or bulk capability has a named contract, permission, and audit expectation
**And** unresolved items remain blocked for UI rather than silently folded into a generic admin console

## Epic 17: Porter les surfaces admin classe A d'identite et de configuration stable dans `Peintre_nano`

L'equipe livre le premier lot de portage UI admin strictement limite aux familles **A** deja suffisamment contractualisees, en mutualisant les briques `shell liste admin`, `guards d'acces`, `vue detail ressource` et variantes de formulaires simples.

**Note agents (create-story / review) :** cet epic est le premier rail **U**. Il ne contient aucune remediation backend de fond; si un gap contractuel nouveau est decouvert, il repart vers l'Epic 16 ou un correct course documente.

### Story 17.1: Porter `pending` comme premier slice CREOS admin observables et mutualisable

As a migration team validating the admin UI rail,
I want a first `pending` admin page rendered through manifests and shared widgets,
So that the contract-driven shell can prove parity on a contained yet representative admin list flow.

**Acceptance Criteria:**

**Given** `pending` is classified `A` after minimal contractualisation
**When** this story is delivered
**Then** the page uses official manifests, shared list shell blocks, and explicit guards
**And** the parity proof references the Epic 15 matrix rather than ad hoc screenshots alone

### Story 17.2: Porter `cash-registers` et `sites` sur une meme ossature admin stable

As an architecture team maximizing reuse,
I want `cash-registers` and `sites` assembled from the same stable admin patterns,
So that two nearby configuration surfaces validate the shared list/detail/form conventions without business duplication.

**Acceptance Criteria:**

**Given** both families are retained in the first admin UI wave
**When** the story is completed
**Then** the delivered pages share the same structural shell, guards, and contract-driven data binding principles
**And** any true business-specific variation remains explicit instead of forking the page generator

### Story 17.3: Consolider les briques mutualisees de shell liste admin, guards et detail simple

As a senior UI architecture team,
I want the first wave to leave behind reusable admin building blocks rather than page-specific code,
So that later admin epics start from hardened primitives instead of another ad hoc layer.

**Acceptance Criteria:**

**Given** the first `A` pages reveal common structure
**When** this story is reviewed
**Then** the reusable shell, guard wiring, and simple detail conventions are documented and used by the delivered pages
**And** no runtime config becomes a second source of business truth

## Epic 18: Porter la supervision caisse et le hub rapports admin dans `Peintre_nano`

L'equipe porte le domaine admin **A** de supervision caisse et rapports, en s'appuyant sur les mutualisations `hub de navigation secondaire`, `cartes KPI`, `shell liste admin` et `console export` uniquement pour les cas deja stabilises contractuellement.

**Note agents (create-story / review) :** cet epic reste un rail **U**. Les exports bulk ou sensibles encore classes `B` restent hors perimetre jusqu'a fermeture explicite par le rail **K**.

### Story 18.1: Porter le hub rapports admin et les points d'entree de supervision caisse

As a pilotage team,
I want the admin reports hub and its main navigation blocks rendered in Peintre,
So that users recover the observable supervision entry points without reviving legacy route duplication.

**Acceptance Criteria:**

**Given** supervision begins from secondary navigation and summary blocks
**When** this story is delivered
**Then** the hub structure, labels, navigation cues, and visible grouping are restored through manifests and shared widgets
**And** the route map stays aligned with a single official navigation authority

### Story 18.2: Porter les listes et details de `session-manager` et `cash-sessions` hors export sensible

As an admin supervision team,
I want session manager and cash session detail flows available in Peintre,
So that operational supervision regains its core list/detail capability before any sensitive export expansion.

**Acceptance Criteria:**

**Given** these flows depend on list/detail and KPI patterns already identified in Epic 15
**When** the story is completed
**Then** the rendered supervision views consume contracts and shared components rather than page-specific business code
**And** excluded sensitive exports remain explicitly out of scope if their authority is still blocked

### Story 18.3: Stabiliser la preuve de parite admin pour les surfaces caisse supervisees

As a strict parity team,
I want browser and matrix evidence for the delivered supervision surfaces,
So that the second admin UI wave is validated against user-observable parity instead of implementation optimism.

**Acceptance Criteria:**

**Given** the supervision UI can drift subtly from legacy
**When** this story is reviewed
**Then** the parity matrix, browser proof, and residual derogations are updated together
**And** unresolved differences remain explicit debt with rationale

## Epic 19: Porter le pilotage admin de la reception dans `Peintre_nano`

L'equipe porte les surfaces **A** de supervision reception sous `Peintre_nano`, en reutilisant `cartes KPI`, `shell liste admin`, `vue detail ressource` et en laissant hors scope tout export ou mutation sensible qui n'a pas encore ete contractualise.

**Note agents (create-story / review) :** cet epic reste strictement UI **A**. Les stats permissives ou exports reception encore classes `B` ne peuvent pas etre absorbés ici.

### Story 19.1: Porter les vues de `reception-stats` et de supervision reception nominative

As a reception pilotage team,
I want the main reception supervision stats and visible context blocks available in Peintre,
So that the reception admin domain regains its first monitoring surface inside the canonical runtime.

**Acceptance Criteria:**

**Given** reception supervision needs contextual KPIs and stable framing
**When** this story is completed
**Then** the delivered stats pages use explicit contracts, context guards, and shared KPI blocks
**And** any blocked metrics or sensitive aggregates remain flagged as contract debt rather than simulated in UI

### Story 19.2: Porter `reception-sessions` et `reception-tickets/:id` avec detail ressource mutualise

As an admin UX team,
I want reception sessions and ticket detail pages built from the reusable list/detail conventions,
So that this domain benefits from the same contract-driven architecture as the other admin rails.

**Acceptance Criteria:**

**Given** the reception domain includes list and detail surfaces
**When** this story is delivered
**Then** those surfaces reuse the shared admin shell and detail conventions identified by Epic 15
**And** unsupported sensitive actions remain explicitly excluded from the scope

### Story 19.3: Valider la parite observable du pilotage reception sans inclure les exports bloques

As a strict migration team,
I want browser-backed parity validation for the reception admin wave,
So that the delivered UI remains aligned with retained legacy expectations while blocked flows stay out of scope.

**Acceptance Criteria:**

**Given** some reception admin behaviors remain deferred
**When** this story is reviewed
**Then** parity proof covers the retained screens and visible context cues
**And** every excluded export or sensitive branch is still referenced as blocked by the contract rail

## Epic 20: Arbitrer le perimetre admin classe C et les surfaces hors scope stabilise

L'equipe tranche les surfaces admin classe **C** qui ne sont ni prêtes au portage UI ni stabilisees cote produit, afin d'eviter que de futures stories techniques absorbent silencieusement du legacy, du super-admin ou de l'experimentation non arbitree.

**Note agents (create-story / review) :** cet epic est le rail **P**. Il produit des decisions, pas du code applicatif. S'il aboutit a de nouveaux perimetres retenus, ceux-ci devront re-rentrer dans la matrice et dans de nouveaux epics dedies.

### Story 20.1: Arbitrer `quick-analysis`, `import/legacy` et les vues combinees super-admin

As a product and architecture leadership team,
I want the class `C` admin surfaces explicitly kept, postponed, or dropped,
So that the migration plan stops carrying ambiguous legacy burden into technical implementation epics.

**Acceptance Criteria:**

**Given** class `C` surfaces remain outside the stabilized migration scope
**When** this story is completed
**Then** each surface has an explicit product decision and rationale
**And** no unresolved class `C` branch is quietly folded into a UI backlog epic

### Story 20.2: Reinjecter les arbitrages `C` dans la matrice, le backlog et les regles de preuve

As a BMAD pilotage team,
I want the product decisions about class `C` reflected in the planning system,
So that future create-story runs start from an explicit scope baseline rather than stale ambiguity.

**Acceptance Criteria:**

**Given** product decisions are only useful if they shape execution
**When** this story is reviewed
**Then** the impacted matrix lines, backlog entries, and proof expectations are updated coherently
**And** any newly retained surface is routed to a dedicated future epic instead of mixed into existing rails

## Epic 21: Porter la gestion des utilisateurs admin dans `Peintre_nano` apres cloture des gaps bloquants

L'equipe porte la famille `users` vers `Peintre_nano` uniquement apres fermeture de `G-OA-03` et stabilisation des autorites associees. Cet epic reste un rail **U** autonome, volontairement separe du rail contrat qui l'a precede.

**Note agents (create-story / review) :** cet epic n'est activable qu'apres evidence reviewable issue de l'Epic 16. Toute regression vers une permission implicite ou un pseudo-role calcule cote front doit etre rejetee.

### Story 21.1: Porter la liste `users` et ses etats de consultation sous CREOS

As an admin migration team,
I want the main users list and consultation flow rendered through official contracts and shared admin shells,
So that the user management surface rejoins the canonical runtime without recreating legacy authority in frontend code.

**Acceptance Criteria:**

**Given** the blocking `users` contract gap has been closed first
**When** this story is delivered
**Then** the list and consultation flow consume explicit contracts, guards, and context signals
**And** residual permissions or context restrictions remain backend-driven and visible

### Story 21.2: Porter les actions utilisateur retenues dans le scope stabilise et en prouver la parite

As a strict parity and security team,
I want only the retained user actions ported and validated against the matrix,
So that the final users epic delivers observable parity without smuggling unresolved sensitive behaviors into runtime prefs or local UI logic.

**Acceptance Criteria:**

**Given** user management combines visible controls and sensitive authority
**When** this story is reviewed
**Then** the retained actions are explicitly mapped to contracts, proof sources, and guards
**And** any excluded or still-sensitive behavior remains named as debt or deferred scope rather than partially implemented

## Epic 22: Rebaseliner la caisse/compta/`Paheko` sur un modele comptable canonique

L'equipe ajoute un rail correctif dedie pour aligner la caisse, la cloture de session, le parametrage comptable et la synchronisation `Paheko` sur le PRD du `2026-04-15`, sans reecrire artificiellement l'historique **done** des Epics 6 et 8. Cet epic introduit la chaine canonique **referentiel des moyens de paiement -> journal detaille des transactions de paiement -> snapshot comptable fige -> builder d'ecritures `Paheko` -> batch outbox idempotent par session**.

**Note agents (create-story / review) :** cet epic est un rail correctif **CASH-COMPTA**. Il rebase les verites metier et comptables sans invalider la fondation historique de terrain (`Epic 6`) ni la fondation transport/sync (`Epic 8`). Les dependances critiques sont : `Epic 10` pour les preuves et gates, `Epic 16` pour les controles super-admin sensibles, `Epic 13.8` en mode **finish-only si compatible transition**, `Epic 14.3` / `14.4` / `14.5` en **pause par defaut** des que la semantique comptable ou le parametrage sensible est en jeu, et `Epic 18` conserve uniquement une valeur de preuve UI historique, sans autorite sur la future semantique comptable.

**FRs covered:** FR4, FR24, FR25, FR26, FR27, FR28, FR39, FR42, FR57, FR66, FR67, FR69, FR70

### Story 22.1: Preparer le schema comptable cible, le backfill et la compatibilite brownfield

As a backend accounting migration team,
I want the canonical accounting model introduced alongside the brownfield model,
So that the project can move toward the new payment truth without breaking historical continuity.

**Acceptance Criteria:**

**Given** the current brownfield still carries legacy payment assumptions
**When** this story is completed
**Then** the canonical accounting entities, fields, and invariants needed for payment methods, detailed payment transactions, session accounting, and `Paheko` export preparation are explicitly defined
**And** the legacy payment field carried by the sale is downgraded to a compatibility concern rather than the accounting source of truth

**Given** historical data and open sessions cannot be discarded
**When** the migration path is documented
**Then** the expected backfill scope, cutover constraints, and rollback-safe compatibility rules are written for historical sessions, open sessions, and newly closed sessions
**And** the story names the minimum data that must exist before later corrective stories can rely on the new model

### Story 22.2: Executer la double lecture, comparer les agregats et piloter la bascule hors legacy

As a migration safety team,
I want the legacy and canonical accounting views compared during transition,
So that the cutover decision is evidence-based instead of assumed.

**Acceptance Criteria:**

**Given** the canonical model may diverge from the legacy aggregation logic
**When** the dual-read phase is active
**Then** the team can compare legacy and canonical totals on a named sample of sessions
**And** mismatches are traceable, reviewable, and classed before any full cutover claim

**Given** cutover changes the accounting authority
**When** the transition rule is approved
**Then** the exit criteria from legacy are explicit, measurable, and tied to a named validation package
**And** no downstream story assumes the cutover happened silently

### Story 22.3: Livrer le parametrage expert des moyens de paiement et des comptes globaux

As a super-admin governance team,
I want expert accounting settings for payment methods and global accounts,
So that the accounting model is configurable without hiding sensitive decisions inside generic admin screens.

**Acceptance Criteria:**

**Given** payment method accounting and global accounts are sensitive super-admin concerns
**When** this story is delivered
**Then** the retained expert settings surfaces, contracts, validations, and audit expectations are explicitly defined
**And** they reuse the step-up and audit principles already established for sensitive admin work

**Given** `config admin simple` and expert accounting governance are not the same product concern
**When** the scope is reviewed
**Then** this story keeps accounting expert settings separate from reusable simple admin toggles
**And** the backlog states which parameters belong to expert governance versus general admin configuration

### Story 22.4: Rebaseliner les parcours caisse pour paiements mixtes, don en surplus et gratuite

As a cashflow product team,
I want the sale finalization flow aligned with the canonical accounting model,
So that mixed payments, extra donations, and zero-value sales become first-class and traceable behaviors.

**Acceptance Criteria:**

**Given** the previous caisse flow was sufficient for a local terrain baseline but not for the new accounting target
**When** this story is completed
**Then** the retained caisse flow supports mixed payments, donation surplus, and free sales without collapsing them into one legacy payment value
**And** the resulting local transactions remain understandable by operators and exploitable by later accounting stories

**Given** the terrain UX must stay fast
**When** the redesigned flow is reviewed
**Then** the story preserves keyboard-first operability and explicit operator feedback on the new cases
**And** any case intentionally deferred remains named instead of silently rejected

### Story 22.5: Etendre le remboursement au modele comptable cible et verrouiller l'autorite exercice anterieur clos

As a refund governance team,
I want refunds aligned with the canonical accounting rules and fiscal-period authority,
So that current-period and prior-period refunds are handled safely and traceably.

**Acceptance Criteria:**

**Given** refund accounting differs between current period and prior closed period
**When** this story is delivered
**Then** the retained model distinguishes the original payment context from the refund payment context
**And** the accounting consequences of each branch are explicit enough for snapshot and export generation

**Given** prior closed period decisions depend on external or authoritative accounting knowledge
**When** the authority source is unavailable or stale
**Then** the system does not guess whether the refund belongs to a closed prior period
**And** the fallback is an explicit block or expert rerouting path with audit visibility

### Story 22.6: Construire le snapshot comptable fige de cloture de session

As a session-closing accounting team,
I want closure to produce an immutable accounting snapshot,
So that later sync and reconciliation work from a frozen business payload rather than moving local data.

**Acceptance Criteria:**

**Given** session closure is the pivot between terrain operations and accounting sync
**When** a session is closed under the retained rules
**Then** the closure process produces a frozen snapshot containing the required totals, detailed breakdowns, context identifiers, and accounting rule revision needed for later export
**And** the snapshot is identifiable independently from UI screens or transient runtime state

**Given** post-closure recalculation would break auditability
**When** downstream accounting processing occurs
**Then** it consumes the frozen snapshot rather than recomputing accounting truth from mutable live data
**And** any correction path is explicit and traceable instead of silent mutation

### Story 22.7: Generer les ecritures avancees multi-lignes `Paheko` et adapter la sync Epic 8

As a sync and accounting integration team,
I want the existing sync foundation to consume the canonical session snapshot,
So that `Paheko` receives deterministic multi-line balanced entries without losing idempotence or observability.

**Acceptance Criteria:**

**Given** one closed session may now require several deterministic accounting sub-entries
**When** the builder and outbox integration are implemented
**Then** the canonical sync unit is one idempotent batch per closed session containing the required indexed sub-entries
**And** the system persists batch correlation, per-sub-entry status, and multiple remote `Paheko` identifiers when relevant

**Given** partial remote success is now possible
**When** only some sub-entries are accepted by `Paheko`
**Then** the local status model exposes that partial success explicitly instead of pretending the whole batch is simply synced or failed
**And** the existing retry, quarantine, and selective blocking principles remain preserved

### Story 22.8: Rebaseliner les preuves qualite et valider bout en bout la chaine caisse -> snapshot -> ecriture -> `Paheko`

As a release-readiness team,
I want the historical proofs updated for the canonical accounting rail,
So that old evidence is not mistaken for coverage of the new model.

**Acceptance Criteria:**

**Given** earlier Epic 6 and Epic 8 proofs predate the canonical accounting model
**When** this story is reviewed
**Then** the project explicitly identifies which prior proofs remain valid, which become insufficient, and which must be replaced
**And** the impacted Definition of Done and release gates are rebased rather than implicitly reused

**Given** the corrective rail must be operationally credible
**When** the end-to-end validation package is assembled
**Then** it covers the retained path from caisse to frozen snapshot to `Paheko` entry generation and sync result visibility
**And** it leaves behind a baseline that `Epic 10` can reuse for final readiness gates

## Epic 23: Alignement produit post-Epic 22 — ventilation `Paheko` par moyen de paiement et cockpit expert Peintre

**Goal:** Fermer l’écart entre l’intention terrain (montants par moyen visibles dans `Paheko` sur les comptes du référentiel expert) et le livrable 22.7 (agrégation par blocs métier). Ajouter une surface Peintre de gestion des moyens de paiement alignée sur l’API expert existante (step-up, pas d’autorité comptable côté client).

**Décision QA (scission) :** trois stories — **23.1** backend Paheko (ventilation par moyen), **23.2** Peintre (moyens de paiement expert), **23.3** Peintre (**comptabilité caisse** / comptes globaux PRD §5.2, distinct des moyens). Dépendance : valeur **Paheko** d’abord (23.1) ; 23.2 / 23.3 peuvent avancer en parallèle sur le hub `/admin/compta` si contrats API stables.

### Story 23.1: Ventiler `Paheko` par moyen de paiement (builder, migration, outbox)

As a trésorier ou intégrateur comptable,
I want des écritures `Paheko` ventilées par moyen à partir du snapshot figé et des comptes expert par moyen,
So that la compta distante reflète la caisse sans tout agréger sur le seul mapping de clôture.

**Implementation artifact:** `_bmad-output/implementation-artifacts/23-1-ventiler-paheko-par-moyen-de-paiement-builder-migration-et-outbox.md`

### Story 23.2: Cockpit Peintre — moyens de paiement expert (step-up, révision)

As a super-admin terrain,
I want gérer les moyens de paiement depuis Peintre avec step-up et publication de révision,
So that je n’ai pas à utiliser l’API brute pour le référentiel courant.

**Implementation artifact:** `_bmad-output/implementation-artifacts/23-2-cockpit-peintre-moyens-paiement-expert-step-up-et-revision.md`

### Story 23.3: Cockpit Peintre — comptabilité caisse (comptes globaux expert)

As a super-admin terrain,
I want consulter et modifier les comptes globaux (ventes, dons, remboursement exercice clos) depuis Peintre,
So that le paramétrage PRD §5.2 soit accessible sans Postman et sans confondre avec les moyens de paiement.

**Implementation artifact:** `_bmad-output/implementation-artifacts/23-3-cockpit-peintre-comptabilite-caisse-comptes-globaux-expert.md`
