---
stepsCompleted:
  - step-01-document-discovery
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
    - UX integree aux fichiers d'architecture et possiblement a epics.md ; aucun document UX dedie trouve
---

# Implementation Readiness Assessment Report

**Date:** 2026-04-01
**Project:** JARVOS_recyclique

## Step 1 - Document Discovery

### Documents retenus pour l'evaluation

#### PRD
- `_bmad-output/planning-artifacts/prd.md`

#### Architecture
- Source retenue : dossier shardé `_bmad-output/planning-artifacts/architecture/`
- Fichiers inclus :
  - `index.md`
  - `core-architectural-decisions.md`
  - `implementation-patterns-consistency-rules.md`
  - `navigation-structure-contract.md`
  - `project-context-analysis.md`
  - `project-structure-boundaries.md`
  - `starter-template-evaluation.md`
  - `architecture-validation-results.md`
  - `architecture-workflow-completion.md`

#### Epics et Stories
- `_bmad-output/planning-artifacts/epics.md`
- Aucun fichier `*story*.md` separe trouve dans `_bmad-output/planning-artifacts`

#### UX
- Aucun document UX dedie trouve dans `_bmad-output/planning-artifacts`
- Note utilisateur : les precisions UX sont integrees dans les fichiers d'architecture et possiblement dans `epics.md`

### Points de clarification resolus
- La version `_bmad-output/planning-artifacts/archive/architecture.md` est exclue car archivee
- L'UX est consideree comme embarquee dans d'autres artefacts et non comme un livrable autonome

## PRD Analysis

### Functional Requirements

FR1: La v2 doit partir de `recyclique-1.4.4` sur les logiques metier critiques, en conservant les bases metier des flows terrain prioritaires `cashflow` et `reception flow`.
FR2: Recyclique doit porter les workflows terrain, la logique metier et les modules metier, les contrats backend, les permissions et contextes, la resilience operationnelle, la zone tampon de synchronisation, la verite principale du flux matiere, l'historique exploitable, et les manifests CREOS de ses modules.
FR3: Paheko doit rester l'autorite comptable finale du flux financier, avec une integration API-first ; un plugin minimal n'est autorise qu'en second choix, et l'ecriture SQL transactionnelle est exclue du chemin nominal.
FR4: Peintre_nano doit porter le shell UI, le registre de modules, les slots nommes, le catalogue de widgets, le rendu declaratif des flows, les raccourcis et actions declaratives, les fallbacks visuels, et l'application des droits et contextes pour l'affichage.
FR5: Peintre_nano ne doit pas connaitre le metier Recyclique et doit consommer les manifests CREOS ainsi que les informations de contexte et permissions fournies par Recyclique.
FR6: L'adaptateur React doit rendre concretement shell, slots, widgets resolus, fallbacks visuels et comportements d'affichage lies au canal web, sans remonter de logique metier dans Peintre_nano.
FR7: Le systeme doit stabiliser un modele de contexte minimal comprenant `site`, `caisse`, `session`, `poste de reception`, `role`, `groupe`, `permissions` et `PIN`.
FR8: En cas d'ambiguite ou de contexte incomplet, le systeme doit recharger ou recalculer explicitement le contexte, passer en mode degrade ou restreint explicite, revalider si necessaire, et privilegier la securite sur la fluidite.
FR9: Tout changement de contexte sensible (`site`, `caisse`, `session`, `poste`) doit declencher un rechargement ou recalcul explicite de tout le contexte.
FR10: Chaque role doit avoir une cle technique stable et un libelle personnalisable par ressourcerie ; les groupes doivent permettre de regrouper des utilisateurs pour l'affectation de permissions ; un utilisateur peut appartenir a plusieurs groupes.
FR11: Le calcul des droits en v2 doit etre additif, correspondant a l'union des permissions portees par les roles et groupes associes, sans que les labels UI fassent autorite pour la securite.
FR12: Un module ne peut etre considere modulaire que si la chaine complete existe : contrat metier, recepteur backend, contrat UI CREOS, runtime frontend, permissions et contexte, fallback/audit/feedback.
FR13: Les contrats invalides, widgets non rendables ou flows incomplets doivent produire un fallback visible ou un blocage selon la criticite, une journalisation, un retour d'information exploitable, et une possibilite de correction puis nouvelle tentative.
FR14: Pour les elements critiques terrain (`caisse`, `reception`, `cloture`), le systeme doit fournir un fallback explicite quand la securite metier reste garantie, et un blocage clair quand elle ne l'est plus.
FR15: Aucune vue, widget ou slot ne doit laisser fuiter des donnees d'un site, d'une caisse ou d'un operateur vers un autre contexte.
FR16: Les vues globales admin/super-admin doivent imposer une selection explicite du contexte ou perimetre consulte, tracer l'acces et le perimetre, interdire la reutilisation silencieuse de donnees d'un autre contexte et empecher toute action sensible hors contexte explicitement valide.
FR17: La donnee v2 doit supporter l'execution quotidienne, l'historicisation, le rejeu, l'analyse et la tracabilite des mappings sensibles et de leurs changements.
FR18: Recyclique doit enregistrer les donnees du terrain en priorite, permettre une synchronisation reportable vers Paheko, n'autoriser qu'un blocage selectif de certaines actions critiques finales, et maintenir une resilience par zone tampon avec reprise ulterieure.
FR19: Tout ecart persistant de synchronisation doit etre place dans un etat explicite (`a_reessayer`, `en_quarantaine`, `resolu`, `rejete`).
FR20: Le passage en quarantaine doit etre obligatoire en cas d'echec persistant, d'incoherence comptable detectee ou d'absence de correspondance comptable requise.
FR21: La levee de quarantaine doit etre reservee a un responsable de ressourcerie ou a un super-admin, etre tracee avec auteur, date, contexte et motif, et s'appuyer sur un identifiant de correlation inter-systemes.
FR22: Recyclique doit rester l'autorite sur le flux matiere : poids, quantites, categories, sous-categories et classifications officielles pour les declarations.
FR23: La v2 doit articuler flux financier et flux matiere sans les confondre, tout en permettant fonctionnement quotidien, reconciliation, historique, lectures analytiques futures et declarations eco-organismes.
FR24: Les roles doivent etre definissables par ressourcerie, avec labels personnalisables et groupes simples pour l'affectation de permissions.
FR25: Les labels personnalises des roles et designations d'utilisateurs doivent etre propages dans l'UI via les contextes de rendu de Peintre_nano.
FR26: L'isolation multi-sites doit s'appliquer aussi aux roles et groupes ; un role ou label defini sur un site ne doit pas fuiter vers un autre.
FR27: Toute l'UI v2 doit passer par Peintre_nano, du login au dernier ecran.
FR28: Les capacites minimales du moteur UI v2 doivent couvrir shell, slots nommes, widgets avec contrat de props, activation/desactivation de modules, contrats d'affichage, actions declaratives, raccourcis declaratifs, flows simples (`wizard`, `tabbed`, `cashflow` prioritaire), fallback, journalisation, gestion des droits et contextes au rendu.
FR29: Les modules metier obligatoires v2 sont `cashflow`, `reception flow`, `bandeau live`, `declaration eco-organismes`, `adherents / vie associative minimale`, `synchronisation Paheko`, `integration HelloAsso` et `config admin simple`.
FR30: Le contrat de synchronisation Paheko doit couvrir au minimum sessions de caisse et cloture, ecritures comptables, reconciliation en cas d'echec, granularite du push, idempotence et retry, gestion des rejets, reprise apres incident, et statut final d'une operation cote Recyclique et cote Paheko.
FR31: La v2 doit supporter la granularite `ressourcerie -> site -> caisse -> session -> poste de reception`.
FR32: Le systeme doit verrouiller les regles d'isolation des sessions et tickets, les habilitations par site/caisse, le comportement avec plusieurs caisses en parallele, les identifiants metiers et techniques, la numerotation des tickets, l'horodatage, les permissions operateur et changements de contexte, les evenements de cloture et reprise apres incident, le mapping `register_id` / `site_id` vers Paheko, et le comportement en cas de correspondance absente.
FR33: En cas de correspondance site/caisse/emplacement absente ou invalide, l'operation terrain doit rester enregistree dans Recyclique, etre marquee comme non syncable dans un etat visible, pouvoir bloquer les actions critiques finales dependantes, et ne jamais ecrire silencieusement vers un axe de substitution.
FR34: La configuration admin simple doit permettre l'activation/desactivation de modules ou blocs, l'ordre de certains blocs, des variantes simples d'affichage et une aide ou overlay de raccourcis.
FR35: Les mappings sensibles et reglages critiques doivent rester reserves au niveau super-admin/expert avec forte tracabilite.
FR36: Les manifests et contributions UI supportes en v2 doivent etre versionnes et livres avec le build comme source primaire ; la configuration runtime ne peut agir que sur l'activation, l'ordre, les variantes simples et les parametres prevus.
FR37: L'integration HelloAsso doit au minimum permettre d'ingerer ou rapprocher les informations utiles au parcours `adherents / vie associative minimale`, prevenir les doublons silencieux, journaliser les echecs de rapprochement et permettre une reprise ou un traitement manuel encadre.
FR38: Le `cashflow` doit supporter le parcours scan/recherche produit -> saisie prix -> mode de paiement -> emission ticket.
FR39: Le `cashflow` doit offrir des raccourcis clavier fluides, garantir le contexte `site`, `caisse`, `session`, `operateur`, bloquer en cas de contexte incomplet ou ambigu, effectuer les validations metier et comptables avant cloture, journaliser completement, resister a l'indisponibilite temporaire de Paheko et fournir un fallback explicite en cas de contribution UI non rendable.
FR40: Le `reception flow` doit garantir le contexte `site`, `poste de reception`, `operateur`, permettre categorisation, pesee et qualification, journaliser les entrees, rester lie au flux matiere et appliquer les memes principes de fallback et blocage que le cashflow.
FR41: La cloture de session/caisse doit controler les totaux, reconcilier avec la zone tampon, declencher la synchronisation vers Paheko si besoin, pouvoir bloquer si un ecart critique est detecte avant sync finale, et journaliser/historiser.
FR42: Le `bandeau live` doit prouver la chaine complete backend -> manifest CREOS -> registre Peintre_nano -> slot -> rendu -> fallback, et etre activable/desactivable via la configuration admin.
FR43: Si le `bandeau live` ne prouve pas la chaine modulaire, cette chaine doit etre corrigee avant d'aller plus loin.
FR44: Le module `declaration eco-organismes` doit etre agnostique des categories boutique, mapper des categories internes libres vers des categories officielles, croiser flux matiere et flux financier, reutiliser le socle modulaire commun, exposer contrat backend/manifest/runtime/permissions/fallback et permettre la configurabilite des mappings en super-admin.
FR45: Le perimetre minimum v2 du module `declaration eco-organismes` doit produire les donnees necessaires a la declaration a partir des flux terrain, conserver la tracabilite du mapping, permettre une lecture par periode et perimetre de ressourcerie/site, sans embarquer un moteur de parametrage reglementaire generaliste.
FR46: Le module `adherents / vie associative minimale` doit couvrir la gestion minimum des benevoles et adhesions, l'integration HelloAsso, et reutiliser la meme chaine modulaire que les autres modules.
FR47: Le minimum vendable du module `adherents` doit permettre creation et consultation des adherents, suivi minimum de l'etat d'adhesion, rapprochement minimum avec HelloAsso, et droits/contextes coherents avec le modele roles/groupes de la ressourcerie.
FR48: Le systeme doit appliquer la matrice fallback/blocage/retry definie pour widgets non rendables, modules non critiques en echec, flows invalides, contextes ambigus, actions sensibles, sync indisponible, ecarts persistants et conflits securite/fluidite.
FR49: Le systeme doit pouvoir bloquer selectivement les actions critiques finales comme la cloture comptable definitive, la validation financiere irreversible, la validation finale d'une ecriture comptable, les operations finales necessitant une correspondance Paheko valide, et les reprises manuelles de sync.
FR50: Les cas nominaux de cloture doivent distinguer cloture autorisee avec sync disponible, cloture locale autorisee avec sync indisponible mais coherence terrain, blocage avec correspondance comptable absente ou incoherence detectee, et cloture reservee a un role habilite en cas de reprise manuelle.
FR51: Les objets CREOS obligatoires du profil minimal v2 doivent couvrir `ModuleManifest`, `SlotDefinition`, `WidgetDeclaration` et `ModuleAction`.
FR52: Les rules minimales CREOS doivent couvrir `ModulePermissions` et `SlotConstraints`, avec les etats `ACTIVE`, `INACTIVE`, `ERROR`, les evenements `ModuleActivatedEvent`, `ModuleDeactivatedEvent`, `SlotContentChangedEvent`, et les commandes `ACTIVATE_MODULE`, `DEACTIVATE_MODULE`, `REGISTER_WIDGET`.
FR53: Recyclique doit emettre manifests CREOS, routes symboliques, actions, permissions, contextes de rendu, contributions aux slots, DTO et contrats backend via OpenAPI ; Peintre_nano doit valider et consommer ces manifests ; l'adaptateur React doit rendre le resultat.
FR54: Les routes symboliques, actions et contrats UI doivent rester traces a une source versionnee et relies coheremment aux contrats backend ; aucune convention locale non versionnee ne doit devenir une seconde source de verite.
FR55: Avant implementation large des modules v2, l'emplacement canonique des schemas, les regles de versionnement OpenAPI/CREOS, la politique de breaking changes, les schemas formels minimaux et une validation CI minimale doivent etre consideres comme closes.

Total FRs: 55

### Non-Functional Requirements

NFR1: La reussite v2 doit prioriser la fiabilite terrain, la justesse comptable, la resilience et la modularite reelle de bout en bout.
NFR2: Les ameliorations UX ne sont autorisees que si elles sont evidentes, sures et sans risque metier ou comptable.
NFR3: La securite doit toujours prevaloir sur la fluidite en cas de conflit.
NFR4: Le systeme doit garantir la robustesse et l'explicabilite des erreurs, fallbacks, blocages et tentatives de correction.
NFR5: Le systeme doit assurer une isolation stricte des contextes et une absence totale de fuite de donnees inter-sites/inter-caisses/inter-operateurs.
NFR6: Les donnees doivent etre historisees et suffisamment riches pour rejet, audit, analyse et correlations futures.
NFR7: Les operations terrain doivent pouvoir continuer meme en cas d'indisponibilite de Paheko.
NFR8: La quarantaine, la resolution manuelle et les ecarts de synchronisation doivent etre traçables de bout en bout.
NFR9: Les journaux critiques doivent inclure `correlation_id`, identifiants de contexte, identifiant interne utilisateur/operateur, type d'operation, etat, motif d'echec ou de blocage, avec masquage des donnees sensibles non necessaires au support.
NFR10: L'authentification et les permissions doivent rester sous autorite Recyclique, et toute action sensible doit etre revalidee cote Recyclique.
NFR11: Le PIN doit etre distinct des autres secrets, ne jamais apparaitre en clair dans les logs, tracer ses usages, supporter un blocage temporaire apres plusieurs erreurs, et etre parametrable par settings editables par super-admin.
NFR12: Le cashflow doit rester fluide au clavier, sans latence perceptible sur scan, saisie et paiement.
NFR13: Le shell Peintre_nano ne doit pas introduire de penalite de rendu visible sur les flows terrain critiques.
NFR14: L'installation doit etre documentee et reproductible sur l'environnement cible.
NFR15: Le socle doit etre lisible et suffisamment propre pour permettre une ouverture communautaire.
NFR16: Le fonctionnement de base ne doit pas dependre d'un service proprietaire.
NFR17: La matrice des environnements officiellement supportes doit etre publiee avant la release candidate v2.
NFR18: Une seule installation officielle est supportee pour la v2, sur Debian.
NFR19: Le modele de donnees doit rester assez propre pour de futurs usages analytiques par JARVOS nano ou d'autres briques.
NFR20: Le profil CREOS minimal doit etre suffisamment stable pour etre valide automatiquement par schemas JSON et smoke tests CI.

Total NFRs: 20

### Additional Requirements

- Contraintes de scope : pas de personnalisation riche, pas d'editeur convivial de flows, pas de pilotage agentique riche, pas d'analytique avancee, pas de back-office admin complet, pas de composition dynamique par IA, pas de bus CREOS obligatoire, pas de DivKit, pas de container queries/subgrid en v2.
- Contraintes d'ordre structurant : audit backend/API/donnees, spec multi-sites, contrat de sync, gouvernance contractuelle et schemas CREOS formels restent des prerequis structurants a produire.
- Contraintes de validation : la chaine modulaire doit etre prouvee en petit avec `bandeau live` avant les gros modules metier.
- Contraintes de gouvernance : la source canonique des schemas, la politique de versionnement et de breaking changes, et le mecanisme de validation CI restent a formaliser avant implementation large.
- Contraintes de deploiement : manifests et contributions UI livres avec le build, pas de chargement dynamique tiers hors build comme prerequis v2.

### PRD Completeness Assessment

Le PRD est globalement riche, coherent et tres explicite sur les invariants produit, les modules obligatoires, les flows critiques, la gouvernance de synchronisation et les exigences non fonctionnelles. Il fournit une base exploitable pour une verification de couverture par les epics.

Les zones encore non closes ne relevent pas d'un manque de vision produit mais de livrables derivés encore a produire : spec multi-contextes detaillee, contrat de synchronisation Recyclique/Paheko, schemas CREOS formels, gouvernance contractuelle precise et validation CI associee. Cela signifie que le PRD est fort sur le "quoi" et le "pourquoi", mais qu'une partie du "comment formel" est explicitement reportee vers architecture et specs techniques.

## Epic Coverage Validation

### Coverage Matrix

| FR Number | PRD Requirement | Epic Coverage | Status |
| --------- | --------------- | ------------- | ------ |
| FR1 | Brownfield sur `recyclique-1.4.4` | Epic 2 | ✓ Covered |
| FR2 | Bases metier conservees pour `cashflow` et `reception flow` | Epic 6, Epic 7 | ✓ Covered |
| FR3 | Recyclique = autorite workflows, contrats, permissions, contextes, resilience, historique, manifests | Epic 2 | ✓ Covered |
| FR4 | Paheko = autorite comptable, API-first, plugin minimal, pas de SQL nominal | Epic 1, Epic 8 | ✓ Covered |
| FR5 | Peintre_nano porte shell, registre, slots, widgets, flows, actions, raccourcis, fallbacks, droits/contextes | Epic 3 | ✓ Covered |
| FR6 | Peintre_nano ne connait pas le metier Recyclique | Epic 3 | ✓ Covered |
| FR7 | Adaptateur React rend le web sans logique metier | Epic 3 | ✓ Covered |
| FR8 | Contexte minimal `site/caisse/session/poste/role/groupe/permissions/PIN` | Epic 1, Epic 2 | ✓ Covered |
| FR9 | Rechargement/recalcul et mode degrade explicite si contexte incomplet | Epic 2 | ✓ Covered |
| FR10 | Rechargement explicite apres changement de contexte sensible | Epic 2 | ✓ Covered |
| FR11 | Roles/groupes avec cle technique stable et libelle personnalisable | Epic 2 | ✓ Covered |
| FR12 | Calcul additif des droits | Epic 2 | ✓ Covered |
| FR13 | Chaine modulaire complete obligatoire | Epic 4 | ✓ Covered |
| FR14 | Fallback/blocage/journalisation/feedback/correction sur contrats invalides | Epic 4 | ✓ Covered |
| FR15 | Zero fuite de contexte | Epic 1, Epic 2 | ✓ Covered |
| FR16 | Vues globales admin/super-admin sous contraintes strictes de contexte | Epic 5 | ✓ Covered |
| FR17 | Donnee exploitable pour execution, historique, rejeu, analyse, tracabilite | Epic 1, Epic 2 | ✓ Covered |
| FR18 | Terrain d'abord, sync reportable, blocage selectif, resilience zone tampon | Epic 2, Epic 8 | ✓ Covered |
| FR19 | Etats explicites de sync (`a_reessayer`, `en_quarantaine`, `resolu`, `rejete`) | Epic 8 | ✓ Covered |
| FR20 | Quarantaine obligatoire dans les cas definis | Epic 8 | ✓ Covered |
| FR21 | Levee de quarantaine reservee, tracee et corrélable | Epic 8 | ✓ Covered |
| FR22 | Recyclique autorite sur le flux matiere | Epic 7 | ✓ Covered |
| FR23 | Articulation flux financier + flux matiere | Epic 6, Epic 7, Epic 8, Epic 9 | ✓ Covered |
| FR24 | Roles definissables par ressourcerie, labels personnalisables, groupes simples | Epic 2 | ✓ Covered |
| FR25 | Propagation des labels personnalises dans l'UI | Epic 5 | ✓ Covered |
| FR26 | Isolation multi-sites appliquee aussi aux roles et groupes | Epic 1 | ✓ Covered |
| FR27 | Toute l'UI v2 passe par Peintre_nano | Epic 3, Epic 4, Epic 5, Epic 6, Epic 7, Epic 8, Epic 9, Epic 10 | ✓ Covered |
| FR28 | Capacites minimales du moteur UI v2 | Epic 3 | ✓ Covered |
| FR29 | Modules obligatoires v2 | Epic 4, Epic 6, Epic 7, Epic 8, Epic 9, Epic 10 | ✓ Covered |
| FR30 | Contrat de synchronisation Paheko complet | Epic 8 | ✓ Covered |
| FR31 | Granularite `ressourcerie -> site -> caisse -> session -> poste` | Epic 1 | ✓ Covered |
| FR32 | Regles multi-sites/multi-caisses/mappings/contextes a verrouiller | Epic 1 | ✓ Covered |
| FR33 | Comportement si correspondance Paheko absente ou invalide | Epic 8 | ✓ Covered |
| FR34 | Configuration admin simple minimale | Epic 9 | ✓ Covered |
| FR35 | Reglages sensibles reserves au super-admin/expert avec tracabilite | Epic 9 | ✓ Covered |
| FR36 | Manifests versionnes et livres avec le build ; runtime borne | Epic 3 | ✓ Covered |
| FR37 | Minimum v2 de l'integration HelloAsso | Epic 9 | ✓ Covered |
| FR38 | Parcours `cashflow` complet et robuste | Epic 6 | ✓ Covered |
| FR39 | Exigences detaillees `cashflow` clavier/contexte/validation/fallback | Epic 6 | ✓ Covered |
| FR40 | Exigences detaillees `reception flow` | Epic 7 | ✓ Covered |
| FR41 | Cloture session/caisse avec controle, reconciliation, sync, blocage, historisation | Epic 6, Epic 8 | ✓ Covered |
| FR42 | `Bandeau live` comme preuve modulaire | Epic 4 | ✓ Covered |
| FR43 | Corriger la chaine si `bandeau live` ne prouve pas le socle | Epic 4 | ✓ Covered |
| FR44 | Module `declaration eco-organismes` complet et configurable | Epic 9 | ✓ Covered |
| FR45 | Perimetre minimum v2 `declaration eco-organismes` | Epic 9 | ✓ Covered |
| FR46 | Module `adherents / vie associative minimale` | Epic 9 | ✓ Covered |
| FR47 | Minimum vendable `adherents` | Epic 9 | ✓ Covered |
| FR48 | Matrice fallback/blocage/retry appliquee | Epic 2, Epic 4, Epic 8 | ✓ Covered |
| FR49 | Blocage selectif des actions critiques finales | Epic 8 | ✓ Covered |
| FR50 | Statuts explicites des cas nominaux de cloture et ecarts critiques | Epic 8 | ✓ Covered |
| FR51 | Objets CREOS obligatoires | Epic 3 | ✓ Covered |
| FR52 | Rules/etats/evenements/commandes CREOS minimaux | Epic 3 | ✓ Covered |
| FR53 | Recyclique emet, Peintre_nano consomme, React rend | Epic 2, Epic 3 | ✓ Covered |
| FR54 | Source versionnee unique et traceable pour routes/actions/contrats UI | Epic 1, Epic 3 | ✓ Covered |
| FR55 | Gouvernance contractuelle et validation CI minimales closes avant implementation large | Epic 1, Epic 10 | ✓ Covered |

### Missing Requirements

Aucun FR du PRD n'est non couvert dans `epics.md`.

Points d'attention :
- La couverture dans `epics.md` est plus granulaire que celle du PRD, avec des FR supplementaires `FR56` a `FR73` qui decomposent plus finement certains flows (`cashflow`, `reception`, cloture, PIN, gouvernance contractuelle).
- Cette sur-couverture est saine tant qu'elle reste alignée avec le PRD et ne cree pas de perimetre implicite hors cadrage.
- L'UX n'apparait pas comme document separe mais elle est bien prise en charge dans `epics.md` via `UX Design Requirements` et `UX Coverage Map`.

### Coverage Statistics

- Total PRD FRs: 55
- FRs covered in epics: 55
- Coverage percentage: 100%
- FRs supplementaires dans `epics.md` non numerotees dans le PRD: 18 (`FR56` a `FR73` dans le referentiel epics)

## UX Alignment Assessment

### UX Document Status

- Aucun document UX autonome trouve dans `_bmad-output/planning-artifacts`
- UX embarquee identifiee dans `epics.md` via :
  - `UX Design Requirements`
  - `UX Coverage Map`
- UX egalement supportee implicitement par l'architecture shardee, notamment dans :
  - `_bmad-output/planning-artifacts/architecture/navigation-structure-contract.md`
  - `_bmad-output/planning-artifacts/architecture/implementation-patterns-consistency-rules.md`

### Alignment Issues

- Aucun conflit majeur detecte entre UX embarquee, PRD et architecture active.
- Le PRD impose deja plusieurs exigences UX structurantes, notamment :
  - contexte toujours visible et autoritatif
  - changements de contexte sensibles explicites
  - fluidite clavier sur les flows terrain
  - feedback explicite sur erreurs, fallback, sync differee, blocages et quarantaine
- `epics.md` traduit ces attentes en exigences UX explicites (`UX-DR1` a `UX-DR16`) et les rattache a des epics concrets.
- L'architecture supporte bien ces besoins UX :
  - l'affichage est borne par l'intersection `contrat commanditaire x contexte serveur x preferences runtime locales`
  - `UserRuntimePrefs` ne peut pas modifier permissions, routes ou verite metier
  - les etats de sync affiches doivent provenir des contrats backend, pas d'inferences frontend
  - les erreurs de manifest/contrat doivent echouer visiblement et non silencieusement

### Warnings

- Warning: absence de livrable UX dedie. Ce n'est pas bloquant ici car l'UX est bien formalisee dans `epics.md`, mais cela reduit la lisibilite si l'on cherche un artefact UX unique.
- Warning: l'UX est distribuee entre PRD, epics et architecture ; il faudra veiller a maintenir cette coherence lors de la generation des stories pour eviter qu'une exigence UX transverse soit oubliee.

## Epic Quality Review

### 🔴 Critical Violations

- Absence totale de stories detaillees dans `epics.md`. Le document contient un squelette reserve et aucun ensemble de stories implementables. Cela empeche de valider :
  - le sizing reel des stories
  - l'independance intra-epic
  - les acceptance criteria au format Given/When/Then
  - les dependances vers l'avant entre stories
- Plusieurs epics restent principalement cadres comme des lots de socle ou de fermeture technique plutot que comme de vrais increments de valeur utilisateur autonomes :
  - `Epic 1: Fermer les prerequis structurants et valider le modele de donnees multi-contextes`
  - `Epic 3: Poser le socle frontend greenfield Peintre_nano`
  - `Epic 4: Prouver la chaine modulaire complete avec bandeau live`
  - `Epic 10: Industrialiser, valider et rendre la v2 deployable`
  Ces epics sont utiles architecturalement, mais selon la regle stricte du workflow ils ressemblent encore trop a des milestones techniques.
- `Epic 10` concentre explicitement de la qualite, de la CI, de l'observabilite, de l'installabilite et de la readiness globale. C'est pratiquement un epic transversal de durcissement, pas un epic oriente outcome utilisateur autonome.

### 🟠 Major Issues

- L'independance des epics est raisonnablement argumentee, mais pas totalement demontree tant que les stories n'existent pas. Les notes de sequencing limitent les dependances, sans fournir encore la preuve executable story par story.
- `Epic 4` depend fortement des prerequis d'Epics 1 a 3 pour exister. Il est coherent comme slice de preuve, mais sa valeur utilisateur directe reste faible tant qu'il est formule avant tout comme "preuve de chaine".
- `Epic 1` et `Epic 3` parlent surtout de fermeture de prerequis, gouvernance contractuelle, schemas, runtime minimal, registre, artefacts et validation. La valeur metier finale est indirecte, ce qui expose a des stories trop techniques plus tard si elles ne sont pas recadrees.
- La carte de couverture FR est excellente, mais elle peut masquer un risque classique : une bonne tracabilite documentaire sans decoupage executable. Ici, la couverture n'equivaut pas encore a readiness de delivery.

### 🟡 Minor Concerns

- `epics.md` est plus granulaire que le PRD sur les FR, ce qui est globalement positif, mais demande une vigilance de maintenance pour eviter une derive entre les deux numerotations.
- L'UX est bien couverte dans le document, mais elle n'est pas encore descendue en stories testables ; une partie des attentes UX pourrait se diluer au moment du decoupage.

### Recommendations

- Generer maintenant les stories detaillees avant de declarer la readiness implementation.
- Recentrer le wording des epics techniques sur l'outcome utilisateur ou operationnel concret quand c'est possible.
- Decouper en stories autonomes chaque epic de socle, avec une valeur observable a la fin de chaque story.
- Ajouter des acceptance criteria complets et testables pour chaque story, y compris erreurs, blocages, fallback et cas de sync differee.
- Verifier explicitement qu'aucune story ne depend d'une story future dans le meme epic ou dans un epic ulterieur.

## Summary and Recommendations

### Overall Readiness Status

NEEDS WORK

### Critical Issues Requiring Immediate Action

- Les stories detaillees n'existent pas encore dans `epics.md`, ce qui empeche de valider la readiness implementation au niveau executable.
- Plusieurs epics conservent une forme de milestone technique (`Epic 1`, `Epic 3`, `Epic 4`, `Epic 10`) et doivent etre surveilles lors du decoupage pour eviter des stories purement techniques sans valeur livrable.
- L'UX est bien specifiee mais distribuee entre PRD, epics et architecture ; elle doit etre tracee explicitement dans les stories pour ne pas se perdre.

### Recommended Next Steps

1. Generer les stories detaillees a partir des epics actuels.
2. Revalider chaque story contre les regles d'independance, de sizing et d'acceptance criteria.
3. Corriger ou reformuler les epics les plus techniques si le decoupage en stories n'arrive pas a faire emerger une vraie valeur autonome par increment.

### Final Note

Cette evaluation a identifie 5 points d'attention majeurs sur 4 categories : structure documentaire, couverture des exigences, alignement UX et qualite des epics. Les exigences PRD sont couvertes et l'UX est coherente avec l'architecture, mais l'absence de stories detaillees empeche de considerer le projet comme pret pour l'implementation sans reserve.
