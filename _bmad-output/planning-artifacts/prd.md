---
stepsCompleted:
  - step-e-01-discovery
  - step-e-02-review
  - step-e-03-edit
workflowType: prd
workflow: edit
classification:
  domain: logiciel-metier-terrain-compta-oss
  projectType: web_app
  complexity: medium
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-JARVOS_recyclique-2026-03-31.md
  - references/vision-projet/2026-03-31_decision-directrice-v2.md
  - .cursor/plans/cadrage-v2-global_c2cc7c6d.plan.md
  - .cursor/plans/separation-peintre-recyclique_4777808d.plan.md
  - .cursor/plans/profil-creos-minimal_6cf1006d.plan.md
  - references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md
  - references/peintre/index.md
  - references/peintre/2026-04-01_pipeline-presentation-workflow-invariants.md
  - references/peintre/2026-04-01_fondations-concept-peintre-nano-extraits.md
  - references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md
  - references/peintre/2026-04-01_instruction-cursor-p1-p2.md
  - references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-31-195824.md
source_of_truth: references/vision-projet/2026-03-31_decision-directrice-v2.md
validationReportUsed: _bmad-output/planning-artifacts/prd-validation-report-2026-04-01-post-edit.md
priorValidationReport: _bmad-output/planning-artifacts/prd-validation-report-2026-04-01.md
document_date: '2026-03-31'
lastEdited: '2026-04-01'
editHistory:
  - date: '2026-04-01'
    changes: 'Post-validation BMAD — frontmatter classification, note decisions perimetre/contrats, index trace FR/NFR vers epics, synthese UX canal web, cadre mesures perf sans nouveaux seuils.'
  - date: '2026-04-01'
    changes: 'Post-QA2 — validationReport chain (post-edit + prior), complexity medium, §17/§16/HelloAsso, §14.3 renvoi §16.3-FR73-NFR27, §11.5 hors Debian, §10.1/§10.2 preuve mapping et extension liste actions critiques ; QA finale typo livrables §17.'
---

# PRD — JARVOS Recyclique v2

**Auteur :** Strophe  
**Date de redaction initiale :** 2026-03-31  
**Derniere revision documentaire :** 2026-04-01 (alignement validation BMAD + corrections QA2)  
**Source de verite de cadrage :** `references/vision-projet/2026-03-31_decision-directrice-v2.md`  
**Statut :** Actif — base pour architecture et epics  
**Documentation de travail Peintre (pipeline, extraits, index) :** `references/peintre/index.md` — alignee PRD ; en cas d'ecart, ce PRD et l'architecture BMAD font foi.

### Stack Peintre_nano (figée)

Les decisions **P1** (stack CSS / styling) et **P2** (stockage des surcharges de configuration admin) sont **fermees**. Sources d'autorite :

- **ADR** : `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`
- **Instruction agents (code, CI, garde-fous)** : `references/peintre/2026-04-01_instruction-cursor-p1-p2.md`

En cas d'ecart avec d'anciens extraits, briefs ou archives, **l'ADR et cette instruction priment** sur le reste de la documentation Peintre pour P1 et P2.

**Priorite de resolution :** pour **P1** et **P2** uniquement, en cas d'ecart entre le **corps** de ce PRD et l'ADR, **l'ADR fait foi** (le present PRD et l'architecture BMAD restent la reference pour le reste du perimetre v2).

**Decisions de perimetre et contrats (lecture WHAT/HOW) :** les choix explicitement nommes dans ce PRD — canal web et adaptateur **React**, surfaces **OpenAPI** / manifests **CREOS JSON**, persistance **PostgreSQL** pour la config admin simple (**P2**), environnement **Debian**, references **TypeScript** pour le pont semantique widget / etats CREOS — sont des **decisions de perimetre, de gouvernance contractuelle ou brownfield** alignees sur l'architecture BMAD active (`_bmad-output/planning-artifacts/architecture/`) et les ADR Peintre. Ils ne remplacent pas les specs d'implementation detaillees (stories, code, CI).

---

## 1. Objet du document

Ce PRD definit le perimetre, les exigences et les contraintes de JARVOS Recyclique v2 en tant qu'evolution brownfield de `recyclique-1.4.4`.

Il ne remplace ni l'architecture detaillee ni les specs techniques fines. Il fournit le cadre produit suffisant pour :

- ecrire l'architecture v2 sans ambiguite majeure ;
- decouper les epics et stories ;
- maintenir la coherence entre les chantiers.

Les arbitrages fondamentaux ont ete valides dans le brief et la decision directrice v2. Ce PRD les integre sans les rediscuter sauf contradiction explicite detectee.

---

## 2. Vision produit

### 2.1 Enonce

Produire une v2 de Recyclique **vendable, installable simplement en open source, exploitable en production par des ressourceries**, et assez propre pour soutenir une dynamique communautaire sans laisser de dette strategique majeure.

### 2.2 Critere de reussite primaire

La reussite ne se mesure pas a la richesse fonctionnelle immediate ni a la sophistication du moteur UI. Elle se mesure a :

1. la **fiabilite terrain** ;
2. la **justesse comptable** ;
3. la **resilience** ;
4. la **modularite reelle de bout en bout**.

### 2.3 Posture brownfield

- La v2 repart de `recyclique-1.4.4` sur les logiques metier critiques.
- Les flows terrain prioritaires (`cashflow`, `reception flow`) conservent les memes bases metier.
- Les ameliorations UX sont autorisees si elles sont evidentes, sures et sans risque metier/comptable.
- Pas de refonte from scratch comme hypothese de depart. Refonte ciblee autorisee au cas par cas si un ecran est veritablement catastrophique ou bloquant.

---

## 3. Repartition des roles systeme

### 3.1 Recyclique

`Recyclique` porte :

- les workflows terrain (caisse, reception, cloture) ;
- la logique metier et les modules metier ;
- les contrats backend (OpenAPI, DTO, permissions, evenements) ;
- les permissions, les contextes et leur calcul ;
- la resilience operationnelle ;
- la zone tampon / journalisation de synchronisation ;
- la verite principale du **flux matiere** ;
- l'historique exploitable pour rejeu, audit et analyse ;
- les manifests CREOS de ses modules metier.

Les declarations de widget **CREOS** peuvent inclure un champ optionnel **`data_contract`** qui lie le widget a une operation backend via un **`operation_id`** OpenAPI stable, une strategie de `refresh`, et un flag `critical` pour le blocage en cas de donnees perimees — specification : `references/peintre/2026-04-01_instruction-cursor-contrats-donnees.md` ; schema : `contracts/creos/schemas/widget-declaration.schema.json`.

### 3.2 Paheko

`Paheko` porte :

- la verite comptable officielle du **flux financier** ;
- les classifications et contraintes comptables sur leur perimetre ;
- l'autorite finale pour la comptabilite.

Integration : approche **API-first**. Plugin Paheko minimal autorise uniquement si un besoin metier n'est pas expose par l'API officielle. Pas d'ecriture SQL transactionnelle comme chemin nominal.

### 3.3 Peintre_nano

`Peintre_nano` porte :

- le shell UI ;
- le registre de modules (`ModuleRegistry`) ;
- le systeme de slots nommes ;
- le catalogue de widgets avec contrat de props ;
- le rendu de flows declaratifs (`FlowRenderer`) ;
- les raccourcis et actions declaratives ;
- les fallbacks visuels et la reaction runtime aux contrats invalides ;
- l'application des droits et contextes pour l'affichage.

`Peintre_nano` ne connait pas le metier Recyclique. Il consomme les manifests CREOS et les informations de contexte/permissions fournies par Recyclique.

Packaging initial : package interne / workspace dans le meme depot. Extraction vers repo dedie preparee des la conception, mais pas un prerequis immediat.

Invariant v2 : `Peintre_nano` doit rester un runtime de rendu / composition borne, extractible plus tard sans devenir des maintenant un produit separe ni un chantier de split multi-repo. Pour le cadrage post-v2 et les garde-fous operatoires, voir `guide-pilotage-v2.md`, `architecture/post-v2-hypothesis-peintre-autonome-applications-contributrices.md` et `../../references/artefacts/2026-04-07_03_checklist-pr-peintre-sans-metier.md`.

### 3.4 CREOS

`CREOS` porte :

- la grammaire commune des manifests, actions, widgets, flows et etats minimaux ;
- la base contractuelle partagee entre Recyclique et Peintre_nano ;
- la compatibilite avec l'ecosysteme JARVOS (meme grammaire, transport variable : documentaire en nano, bus en mini/macro).

### 3.5 Adaptateur de canal (React)

L'adaptateur React porte :

- le rendu concret du shell, des slots et des widgets resolus ;
- les fallbacks visuels ;
- les comportements d'affichage lies au canal web (responsive, multi-device) ;
- sans remonter de logique metier dans Peintre_nano.

Clarification : `Peintre_nano` porte la **composition et la politique de rendu** ; l'adaptateur React porte le **rendu concret dans le canal web**.

---

## 4. Invariants non negociables

### 4.1 Contexte avant ecran

Le contexte est plus fondamental que l'ecran. Le minimum a stabiliser tot :

| Contexte | Role |
|----------|------|
| `site` | Ressourcerie / lieu physique |
| `caisse` | Point de vente actif |
| `session` | Session de caisse en cours |
| `poste de reception` | Point de reception matiere |
| `role` | Role de l'operateur (definissable par ressourcerie, label personnalisable) |
| `groupe` | Groupe(s) d'appartenance pour l'affectation de permissions |
| `permissions` | Droits calcules par Recyclique a partir des roles et groupes |
| `PIN` | Validations sensibles selon le cas |

**Comportement en cas d'ambiguite ou de contexte incomplet :**

- rechargement / recalcul explicite ;
- mode degrade ou restreint explicite ;
- revalidation si necessaire ;
- **la securite gagne sur la fluidite**.

**Changement de contexte sensible** (site, caisse, session, poste) : tout le contexte doit etre recharge/recalcule explicitement. Ce mecanisme peut devenir un workflow explicite dans Peintre_nano.

**Modele minimal v2 pour roles et groupes :**

- chaque role possede une **cle technique stable** et un **libelle personnalisable** par ressourcerie ;
- les groupes servent a regrouper les utilisateurs pour l'affectation de permissions ;
- un utilisateur peut appartenir a plusieurs groupes ;
- en v2, le calcul des droits est **additif** : les permissions effectives sont l'union des permissions accordees par les roles et groupes associes ;
- les labels affiches dans l'UI ne font jamais foi pour la securite : seules les cles techniques et les permissions calculees par Recyclique font autorite.

**Decision de cadrage v2 :**

- la v2 est cadree par defaut sur un modele de permissions **additif et simple** ;
- l'introduction de refus explicites n'est pas un prerequis v2 ;
- si la couche d'authentification / droits retenue fournit nativement un mecanisme de refus explicites sans complexite structurelle supplementaire, ce point pourra etre reouvert en architecture ; sinon il reste hors socle v2.

### 4.2 Modularite de bout en bout

Un module n'est considere comme modulaire que si la **chaine complete** existe :

1. contrat metier (schema, regles) ;
2. recepteur backend ;
3. contrat UI (manifest CREOS) ;
4. runtime frontend (rendu via Peintre_nano) ;
5. permissions et contexte ;
6. fallback, audit et feedback.

Si une brique manque, un mock bien balise et explicite est acceptable en phase de construction, mais pas comme etat final.

### 4.3 Robustesse et explicabilite

Les contrats invalides, widgets non rendables ou flows incomplets doivent produire :

- un **fallback visible** ou un **blocage** selon la criticite ;
- une **journalisation** ;
- un **retour d'information exploitable** (par un humain, un developpeur ou un futur LLM) ;
- la possibilite de **correction et nouvelle tentative**.

Pour les elements critiques terrain (caisse, reception, cloture) :

- fallback explicite et sobre quand la securite metier reste garantie ;
- blocage clair quand la securite metier/comptable n'est plus garantie.

### 4.4 Zero fuite de contexte

Invariant transversal absolu. Aucune vue, aucun widget, aucun slot ne doit laisser fuiter des donnees d'un site, d'une caisse ou d'un operateur vers un autre contexte.

Les vues globales admin/super-admin sont envisageables, mais ne doivent jamais compromettre cet invariant.

**Exigences minimales pour les vues globales :**

- selection explicite du contexte ou du perimetre de consultation ;
- tracabilite de l'acces et du perimetre consulte ;
- absence de cache ou de reutilisation silencieuse de donnees d'un autre contexte ;
- impossibilite d'executer une action sensible hors du contexte explicitement valide.

### 4.5 Donnee exploitable

La donnee v2 doit etre concue des le depart pour :

- **execution** quotidienne ;
- **historicisation** (minimum = existant `1.4.4`, cible = nettement au-dela) ;
- **rejeu** (capacite a comprendre/refaire apres coup) ;
- **analyse** et correlations futures ;
- **tracabilite** des mappings sensibles et de leurs changements.

---

## 5. Double flux a articuler

### 5.1 Flux financier

| Aspect | Autorite | Role |
|--------|----------|------|
| Verite comptable finale | **Paheko** | Classifications, ecritures, contraintes comptables |
| Terrain + zone tampon | **Recyclique** | Saisie, journalisation, resilience, sync |

**Politique de synchronisation retenue :**

- **terrain d'abord** : les donnees sont enregistrees dans Recyclique ;
- **sync reportable** : la synchronisation vers Paheko peut etre retardee ;
- **blocage selectif** : seules certaines actions critiques finales peuvent etre bloquees si la sync n'est pas a jour ;
- un probleme de sync **ne bloque pas** le terrain par defaut ;
- resilience par **zone tampon Recyclique** avec reprise ulterieure.

**Gouvernance minimale des ecarts de sync :**

- tout ecart persistant de sync doit entrer dans un etat explicite : `a_reessayer`, `en_quarantaine`, `resolu`, `rejete` ;
- le passage en quarantaine est obligatoire en cas d'echec persistant, d'incoherence comptable detectee, ou d'absence de correspondance comptable requise ;
- la levee de quarantaine doit etre tracee et realisee uniquement par un **responsable de ressourcerie** ou un **super-admin** ; l'architecture precisera ensuite le detail exact du workflow ;
- toute levee de quarantaine ou resolution manuelle doit laisser une trace d'audit avec auteur, date, contexte et motif ;
- le support doit pouvoir s'appuyer sur un identifiant de correlation inter-systemes pour suivre un flux de bout en bout.

### 5.2 Flux matiere

| Aspect | Autorite |
|--------|----------|
| Poids, quantites, categories, sous-categories | **Recyclique** |
| Classifications officielles pour les declarations | **Recyclique** (avec mappings eco-organismes) |

### 5.3 Consequence produit

La v2 doit articuler ces deux flux sans les confondre. Elle doit permettre :

- le fonctionnement quotidien ;
- la reconciliation ;
- l'historique ;
- les futures lectures analytiques ;
- les declarations eco-organismes (croisement flux financier + flux matiere).

---

## 6. Utilisateurs cibles

### 6.1 Utilisateurs principaux

| Profil | Besoins cles |
|--------|-------------|
| **Operateurs terrain** | Caisse rapide, reception fiable, cloture, raccourcis robustes, contexte garanti, comportement previsible |
| **Responsables de ressourcerie** | Supervision locale, reconciliation, suivi des operations sensibles, pilotage minimum des modules, lecture historique |
| **Comptabilite / administration** | Verite comptable dans Paheko, sync fiable, tracabilite, controle des ecarts |

### 6.2 Utilisateurs secondaires

| Profil | Besoins cles |
|--------|-------------|
| **Super-admin / expert** | Mappings sensibles, parametrages structures, controle des reglages critiques, audit |
| **Futures ressourceries adoptantes** | Installation simple, socle lisible, modularite credible, open source |

### 6.3 Roles, labels et groupes

Chaque ressourcerie doit pouvoir adapter la terminologie et la structure de roles a son propre fonctionnement. Les roles ne sont pas des constantes codees en dur.

**Socle v2 obligatoire :**

- roles definissables par ressourcerie (pas un jeu fixe impose par le code) ;
- labels personnalisables sur les designations d'utilisateurs et de roles (ex. « operateur » → « valoriste », « benevole caisse », ou tout autre terme propre a la ressourcerie) ;
- groupes simples permettant de regrouper des utilisateurs pour l'affectation de permissions.

**Contraintes :**

- chaque role et chaque groupe doivent avoir une **cle technique stable** distincte du libelle affiche ;
- le systeme de permissions de Recyclique doit etre capable de calculer les droits a partir de roles definis par la ressourcerie, pas uniquement a partir d'un jeu predefini ;
- en v2, les permissions sont **additives** entre roles et groupes ; les mecanismes de refus explicite, heritage complexe ou exceptions avancees sont hors socle initial ;
- les labels personnalises doivent etre propages dans l'UI via les contextes de rendu Peintre_nano (un widget qui affiche « operateur » doit afficher le label reel de la ressourcerie) ;
- l'isolation multi-sites s'applique aussi aux roles et groupes : un role ou un label defini sur un site ne doit pas fuiter vers un autre.

**Hors socle v2 (reportable) :**

- heritage de permissions entre groupes ;
- editeur graphique de roles ;
- workflows d'approbation par role.

### 6.4 Exigences UX (canal web, synthese)

Cette section formalise le volet **UX / UI** attendu pour un PRD type **web_app** BMAD, sans dupliquer les invariants deja poses (contexte avant ecran, zero fuite, matrice fallback SS 10, SS 3.5 adaptateur canal).

- **Shell et navigation :** parcours coherents du login aux flows terrain ; la structure informationnelle et la composition d'ecran restent **commandees par Recyclique** et rendues par **Peintre_nano** (SS 3, SS 7, SS 8.8).
- **Canal web :** comportements **responsive** et **multi-poste** pris en charge par l'adaptateur de canal (SS 3.5) dans les limites du perimetre v2 (pas de personnalisation riche ni d'interfaces analytiques avancees hors scope).
- **Feedback utilisateur :** etats charges / vides / erreurs / degrades **visibles et explicites** sur les flows critiques ; alignement avec la matrice SS 10 et les etats donnees widget (`WidgetDataState`, SS 10.1).
- **Securite percue :** l'UI peut masquer ou guider, mais **ne substitue pas** l'autorisation backend (SS 11.2) ; labels et libelles personnalises **ne font pas foi** pour la securite (SS 4.1, SS 6.3).
- **Ameliorations UX terrain :** autorisees lorsqu'elles sont **evidentes, sures** et sans risque metier ou comptable (SS 2.3).

---

## 7. Perimetre fonctionnel v2

### 7.1 Capacites coeur

#### UI integrale via Peintre_nano

Toute l'UI v2 passe par Peintre_nano, du login au dernier ecran. Ce qui est phase, ce ne sont pas les ecrans, mais les **capacites** du moteur :

**Capacites minimales v2 :**

- shell ;
- slots nommes ;
- widgets avec contrat de props ;
- activation / desactivation de modules ;
- contrats d'affichage ;
- actions declaratives ;
- raccourcis declaratifs ;
- flows simples (`wizard`, `tabbed`, et le flow `cashflow` comme priorite terrain) ;
- fallback et journalisation ;
- gestion des droits et contextes au rendu.

#### Modules metier

| Module | Statut v2 | Role dans la validation |
|--------|-----------|----------------------|
| Cashflow (caisse) | Obligatoire | Preuve terrain critique |
| Reception flow | Obligatoire | Preuve terrain critique |
| Bandeau live | Obligatoire | Preuve modulaire legere mais complete |
| Declaration eco-organismes | Obligatoire | Premier grand module metier |
| Adherents / vie associative minimale | Obligatoire | Preuve metier complementaire, evite biais mono-module |
| Synchronisation Paheko | Obligatoire | Articulation terrain/compta |
| Integration HelloAsso | Obligatoire | Capacite confirmee dans le brief |
| Config admin simple | Obligatoire (v2 vendable) | Pilotage minimal du shell et des modules |

**Lecture du statut « Obligatoire » dans ce tableau :** il impose de livrer le **minimum v2** decrit dans les sous-sections du perimetre (parcours ou capacites utilisables, reprises manuelles encadrees lorsque le PRD les prevoit). Il **n'exige pas** une automatisation maximale lorsqu'une sous-section renvoie explicitement a une **etude ou un livrable d'architecture** pour fixer le niveau exact — cas **HelloAsso** : le **Scope minimum HelloAsso** (SS 7.1) et l'etude de cadrage (deux voies API / plugin Paheko) definissent l'ampleur **sans** contredire l'obligation de couvrir le parcours adherents a ce minimum.

#### Synchronisation Paheko

La v2 doit livrer un contrat de synchronisation couvrant au minimum :

- sessions de caisse et cloture ;
- ecritures comptables ;
- politique de reconciliation en cas d'echec de sync ;
- granularite du push ;
- idempotence et retry ;
- gestion des rejets ;
- reprise apres incident ;
- statut final d'une operation cote Recyclique et cote Paheko.

Hierarchie technique :

1. API officielle Paheko en priorite ;
2. plugin Paheko minimal si un besoin n'est pas expose par l'API ;
3. SQL limite a l'analyse, au controle ou a l'administration, jamais comme chemin transactionnel nominal.

**Note de clarification :** un mecanisme de queue ou d'outbox (par exemple Redis Streams ou equivalent) peut etre retenu pour la resilience **interne** de synchronisation cote Recyclique. Cela ne constitue pas un bus CREOS v2 et ne remet pas en cause le principe `CREOS documentaire` pour les manifests UI.

#### Multi-sites / multi-caisses / postes

La v2 doit supporter la granularite : `ressourcerie → site → caisse → session → poste de reception`.

Exigences a verrouiller :

- regles d'isolation des sessions et tickets ;
- habilitations par site/caisse ;
- comportement si plusieurs caisses vivent en parallele ;
- identifiants metiers et techniques par site/caisse/session ;
- numerotation des tickets et horodatage ;
- permissions operateur et changements de contexte ;
- evenements de cloture et reprise apres incident ;
- mapping `register_id` / `site_id` Recyclique vers emplacements Paheko ;
- comportement si une correspondance site/caisse/emplacement est absente.

**Comportement minimal retenu en cas de correspondance absente ou invalide :**

- l'operation terrain reste enregistree dans Recyclique ;
- l'operation est marquee comme non syncable et doit entrer dans un etat visible pour support et supervision ;
- les actions critiques finales dependantes de cette correspondance peuvent etre bloquees selon la matrice produit de blocage ;
- aucune ecriture silencieuse vers un axe ou emplacement de substitution ne fait partie du chemin nominal v2.

Schema de deploiement cible : une instance Paheko par ressourcerie, projection de plusieurs sites et caisses Recyclique dans le modele Paheko.

#### Configuration admin simple

Ce n'est **pas** un grand panneau admin metier. C'est un pilotage minimal du shell et des modules :

- activation / desactivation de modules ou blocs ;
- ordre de certains blocs ;
- variantes simples d'affichage ;
- aide ou overlay de raccourcis.

**Persistance de cette couche (P2, ADR)** : les reglages qui relevent du paragraphe ci-dessus (activation, ordre, variantes simples, parametres prevus par le build dans le perimetre « admin simple ») sont stockes en **PostgreSQL** comme **surcharges** fusionnees de maniere deterministe avec les **valeurs par defaut** des manifests livres au build — voir l'ADR P2 dans le bloc « Stack Peintre_nano ». **Pas de fichier JSON sur disque en production** pour cette configuration dynamique ; la **tracabilite** des changements (auteur, date, motif) suit la decision directrice.

Les **mappings sensibles** et **reglages critiques** (hors perimetre « admin simple » ci-dessus) restent reserves au niveau **super-admin/expert**, avec forte tracabilite. Supports possibles : fichiers structures (TOML, YAML, JSON) ou base de donnees, selon le domaine, avec ouverture future a une assistance admin plus riche — **sans contredire** P2 pour ce qui est deja couvert par la config admin simple versionnee.

**Modele de deploiement des manifests et contributions UI en v2 :**

- les manifests et contributions supportes en v2 sont **versionnes et livres avec le build** comme source primaire ;
- la configuration runtime ne peut agir que sur l'activation, l'ordre, les variantes simples et les parametres prevus par le build ;
- le chargement dynamique de manifests tiers hors build n'est pas un prerequis v2 ; il reste une ouverture future soumise a la gouvernance contractuelle.

#### Scope minimum HelloAsso

L'integration HelloAsso est un connecteur metier du perimetre v2, pas une dependance bloquante pour l'installabilite du coeur produit.

**Minimum v2 attendu :**

- capacite a ingerer ou rapprocher les informations utiles aux parcours `adherents / vie associative minimale` ;
- prevention des doublons silencieux ;
- journalisation des echecs de rapprochement ;
- possibilite de reprise ou traitement manuel encadre en cas d'echec du connecteur.

**Decision de cadrage :**

- le niveau exact d'integration HelloAsso en v2 depend d'une etude d'architecture dediee ;
- cette etude devra comparer au minimum deux voies :
  - usage direct de l'API HelloAsso ;
  - usage ou adaptation du plugin HelloAsso existant cote Paheko ;
- la voie retenue devra privilegier la solution la plus simple, la plus maintenable et la plus compatible avec les parcours `adherents` et la gouvernance `Recyclique` / `Paheko`.

**Livrable d'arbitrage (trace 2026-04-12) :** le resultat ecrit de l'etude (decision, promesse produit, points dev) est consolide dans `references/migration-paheko/2026-04-12_specification-integration-helloasso-recyclique-paheko.md` et `references/migration-paheko/2026-04-12_brouillon-arbitrage-helloasso-et-promesse-recyclique-paheko.md` ; la recherche externe associee porte un **erratum** dans `references/recherche/2026-04-12_helloasso-api-v5-paheko-perimetre-recyclique_perplexity_reponse.md` (quotas OAuth vs interpretation initiale). La story **9.4** (`epics.md`) renvoie a ces chemins pour la preuve d'arbitrage.

**Hors scope v2 :**

- automatisation riche de bout en bout sur tous les cas HelloAsso ;
- moteur de reconciliation avance ou configurable librement par un non-expert.

### 7.2 Hors perimetre initial

Ne sont pas des prerequis de la v2 :

- personnalisation riche ;
- editeur convivial de flows ;
- pilotage agentique riche ;
- interfaces analytiques avancees ;
- edition admin riche facon back-office complet ;
- composition dynamique par IA (Peintre_mini) ;
- bus CREOS Redis/RabbitMQ obligatoire ;
- gates Capitaine_Balance pleinement branchees ;
- experimentation DivKit ;
- container queries et subgrid (prepares architecturalement, non implementes) ;
- metriques d'interaction (callback noop prevu, collecte reelle reportee) ;
- lazy loading par module (bundle commun en Phase 0) ;
- fusion manifest cartouche JARVOS / manifest Peintre (separes en v2).

Ces sujets restent des ouvertures volontaires. L'architecture doit les rendre possibles sans les imposer.

---

## 8. Profil CREOS minimal v2

### 8.1 Objets obligatoires

| Objet | Description |
|-------|-------------|
| `ModuleManifest` | Declaration complete d'un module UI (routes, slots, widgets, actions, shortcuts, flows) |
| `SlotDefinition` | Declaration d'un point d'extension dans le shell |
| `WidgetDeclaration` | Declaration d'un widget avec type stable, meta_props et props_schema |
| `ModuleAction` | Action metier exposee par un module (bouton, commande), multi-slots |

### 8.2 Objets toleres (preparation, pas obligatoires partout)

- `PageTemplate` ;
- `ZoneRole` ;
- `LayoutComposition`.

### 8.3 Rules minimales

- `ModulePermissions` ;
- `SlotConstraints`.

### 8.4 States minimaux

- `ACTIVE`, `INACTIVE`, `ERROR`.

### 8.5 Events minimaux

- `ModuleActivatedEvent`, `ModuleDeactivatedEvent`, `SlotContentChangedEvent`.

### 8.6 Commands minimales

- `ACTIVATE_MODULE`, `DEACTIVATE_MODULE`, `REGISTER_WIDGET`.

### 8.7 Hors noyau minimal

- `COMPOSE_LAYOUT` pilote par agent ;
- bus CREOS obligatoire ;
- gates Capitaine_Balance branchees ;
- optimisation automatique ou IA des layouts.

### 8.8 Repartition emission / consommation

| Acteur | Responsabilite |
|--------|---------------|
| **Recyclique** emet | Manifests CREOS de ses modules, routes symboliques, actions, permissions, contextes de rendu, declarations de contributions aux slots, DTO et contrats backend via OpenAPI |
| **Peintre_nano** valide et consomme | Manifests conformes au profil CREOS, widgets declares et leur props_schema, etats activation/desactivation, regles de contraintes de slots |
| **Adaptateur React** rend | Shell, slots, widgets resolus, fallback visuels, comportements d'affichage lies au canal |

Regle de gouvernance : les routes symboliques, actions et contrats UI doivent rester traces a une source versionnee et coherentement relies aux contrats backend ; aucune convention locale non versionnee ne doit devenir une seconde source de verite.

---

## 9. Parcours et flows critiques

### 9.1 Cashflow (passage en caisse)

**Criticite :** maximale — preuve terrain critique v2.

Parcours type : scan/recherche produit → saisie prix → mode de paiement → emission ticket.

Exigences :

- raccourcis clavier fluides (scan → Tab → prix → Entree → paiement), utilisable sans souris ;
- contexte garanti : site, caisse, session, operateur ;
- blocage si contexte incomplet ou ambigu ;
- validations metier et comptables avant cloture de ticket ;
- journalisation complete ;
- resilience : la transaction reste dans Recyclique meme si Paheko est temporairement indisponible ;
- fallback explicite si un widget ou une contribution UI n'est pas rendable.

### 9.2 Reception flow (reception de marchandise)

**Criticite :** maximale — preuve terrain critique v2.

Exigences :

- contexte garanti : site, poste de reception, operateur ;
- categorisation (flux matiere), pesee, qualification ;
- journalisation des entrees ;
- lien avec le flux matiere (verite Recyclique) ;
- fallback et blocage sur les memes principes que le cashflow.

### 9.3 Cloture de session / cloture de caisse

Exigences :

- controle des totaux ;
- reconciliation avec les donnees en zone tampon ;
- declenchement de la sync vers Paheko (si pas deja fait en temps reel) ;
- blocage possible si ecart critique detecte avant sync finale ;
- journalisation et historisation.

### 9.4 Bandeau live

**Role :** preuve modulaire legere.

Exigences :

- premier module a prouver la chaine complete : contrat backend → manifest CREOS → registre Peintre_nano → slot → rendu → fallback ;
- activation/desactivation via config admin ;
- si le bandeau live ne prouve pas la chaine modulaire, **la chaine doit etre corrigee avant d'aller plus loin**.

### 9.5 Declaration eco-organismes

**Role :** premier grand module metier.

Exigences :

- agnostique des categories boutique : categories internes libres → mapping vers categories officielles par eco-organisme ;
- croisement flux matiere + flux financier ;
- appui sur le socle modulaire deja prouve (ne doit pas inventer son propre socle) ;
- contrat backend, manifest CREOS, runtime frontend, permissions, fallback ;
- configurabilite des mappings en super-admin.

**Perimetre minimum v2 pour ce module :**

- produire les donnees necessaires a la declaration a partir des flux terrain deja saisis ;
- conserver la tracabilite du mapping entre categories internes et categories officielles ;
- permettre une lecture par periode et par perimetre de ressourcerie/site selon la spec multi-contextes ;
- ne pas embarquer en v2 un moteur de parametrage reglementaire generaliste.

### 9.6 Adherents / vie associative minimale

**Role :** preuve metier complementaire (evite un biais de conception sur un seul module).

Exigences :

- gestion minimum des benevoles et adhesions ;
- integration HelloAsso ;
- module construit sur la meme chaine modulaire que les autres.

**Minimum vendable v2 :**

- creation et consultation des adherents ;
- suivi minimum de l'etat d'adhesion ;
- rapprochement minimum avec HelloAsso ;
- droits et contextes coherents avec le modele roles/groupes de la ressourcerie.

**Hors scope v2 :**

- CRM associatif complet ;
- automatisations avancees de communication ;
- workflows riches de validation associative.

---

## 10. Matrice fallback / blocage / retry

### 10.1 Principes generaux

| Situation | Comportement |
|-----------|-------------|
| Widget non rendable | Fallback visible + journalisation |
| Module non critique en echec | Isolation de l'erreur, reste de l'ecran intact |
| Flow invalide ou incomplet | Blocage du flow concerne, retour a un mode simple si possible, feedback explicite |
| Contexte ambigu ou incomplet | Mode restreint/degrade explicite, pas de supposition silencieuse |
| Action sensible | Controle supplementaire (confirmation, PIN, revalidation role) |
| Sync Paheko indisponible | Enregistrement dans Recyclique, retry ulterieur, pas de blocage terrain par defaut |
| Ecart de sync persistant | Signalement, passage en quarantaine, resolution tracee par un role habilite |
| Conflit securite vs fluidite | **La securite gagne** |
| Donnees widget en cours / chargees / erreur / vide / perimees (`WidgetDataState`) | Composants de presentation dedies (`WidgetSkeleton`, erreur, vide) ; si le manifest declare `data_contract.critical: true`, l'etat **perime** (`DATA_STALE`) peut **bloquer** les actions sensibles (ex. paiement caisse) en coherence avec la securite > fluidite — vocabulaire : `contracts/creos/schemas/widget-data-states.schema.json` |

**Note de compatibilite avec la matrice ci-dessus :** les lignes existantes (widget non rendable, module non critique, flow invalide, etc.) restent valides pour la **composition** et le **runtime CREOS** ; la ligne ajoutee couvre la **couche donnees metier** par widget, orthogonale aux etats de cycle de vie module (`ACTIVE` / `INACTIVE` / `ERROR`).

**Lexique runtime :** en **TypeScript**, l'etat courant d'un hook peut utiliser `status: 'stale' | 'loading' | …` ; le vocabulaire **CREOS** / schema `widget-data-states.schema.json` utilise les codes **`DATA_STALE`**, **`DATA_LOADING`**, etc. Le mapping **1:1** (`stale` ↔ `DATA_STALE`, etc.) est impose dans la couche d'adaptation widget — pas deux semantiques paralleles sans pont documente.

**Preuve et non-regression :** la coherence du mapping hook / codes CREOS doit etre verifiable par **revue de code** et, en **CI**, par les controles prevus sur les contrats et le rendu des manifests (**§ 14.4–14.5** ; **NFR28** dans `epics.md`) — objectif : eviter deux vocabulaires paralleles sans pont explicite.

### 10.2 Actions critiques finales pouvant etre bloquees

- cloture comptable definitive ;
- validation financiere irreversible ;
- generation ou validation finale d'une ecriture qui doit etre reputee comptablement exacte ;
- operation finale necessitant une correspondance site/caisse/emplacement Paheko valide ;
- validation finale d'un ecart ou d'une reprise manuelle de sync.

Le blocage selectif s'applique uniquement quand la securite metier/comptable n'est plus garantissable autrement. Pour les **nouveaux** types d'operations sensibles hors liste, la matrice produit / architecture peut **etendre** la liste tout en conservant ce principe.

### 10.3 Cas nominaux de cloture et d'ecart critique

| Cas | Statut attendu |
|-----|----------------|
| Cloture avec sync disponible et totaux coherents | Autoriser la cloture |
| Cloture avec sync indisponible mais donnees terrain coherentes et aucune exigence comptable finale immediatement requise | Autoriser la cloture locale, placer en attente de sync, signaler l'etat |
| Cloture avec correspondance comptable absente ou incoherence comptable detectee | Bloquer l'action finale concernee et placer le flux en quarantaine |
| Cloture avec besoin de reprise manuelle deja identifie | Autoriser uniquement selon role habilite, avec trace d'audit et motif |

**Definition produit minimale d'un ecart critique :** tout ecart qui empeche de garantir soit l'exactitude comptable finale, soit la bonne affectation de l'operation au bon contexte site/caisse/emplacement, soit la capacite de rejouer et expliquer correctement l'operation apres coup.

---

## 11. Exigences non fonctionnelles

### 11.1 Resilience

- Les donnees sont toujours enregistrees dans Recyclique, meme si Paheko est indisponible.
- Zone tampon avec retry et reprise apres incident.
- Le terrain ne depend pas d'une disponibilite externe pour continuer a fonctionner.

### 11.2 Securite

- Authentification et permissions sous autorite Recyclique.
- L'affichage dans Peintre_nano ne vaut jamais autorisation effective : toute action sensible doit etre revalidee cote Recyclique.
- PIN et validations sensibles sur les actions critiques.
- Zero fuite de contexte entre sites/caisses/operateurs.
- Manifests CREOS livres avec le build comme source primaire (securite > flexibilite au demarrage).

**Politique minimale PIN v2 :**

- le PIN est distinct des autres secrets d'authentification utilises par l'utilisateur ;
- il ne doit jamais apparaitre en clair dans les logs ;
- les usages du PIN doivent etre traces pour les actions sensibles ;
- blocage temporaire apres plusieurs erreurs ;
- la longueur, le nombre d'essais autorises avant blocage, et la duree du blocage sont des **settings** ;
- ces settings font partie des parametres de base editables par un **super-admin** ;
- ces parametres doivent pouvoir etre portes par la configuration structuree retenue (JSON, YAML ou equivalent) et exposes via un editeur integre leger cote super-admin ;
- la reinitialisation du PIN doit etre reservee a un **super-admin** ou a un **responsable habilite** selon le perimetre retenu par l'architecture.

### 11.3 Tracabilite et audit

- Journalisation des actions sensibles : resultat, qui, quand, quel contexte.
- Journalisation des fallbacks, blocages et degradations.
- Retour d'information exploitable pour support/admin.
- Boucle correction/retry avec message d'erreur utile.
- Sur la compta et les flux sensibles : capacite de rejouer/comprendre apres coup.

**Schema minimal attendu pour les journaux critiques :**

- `correlation_id` commun au flux quand pertinent ;
- identifiants de contexte (`site`, `caisse`, `session`, `poste`) ;
- identifiant interne utilisateur ou operateur ;
- type d'operation, etat, motif d'echec ou de blocage ;
- masquage des donnees sensibles non necessaires au support.

### 11.4 Performance

- Le cashflow doit rester fluide au clavier (pas de latence perceptible sur scan/saisie/paiement).
- Le shell Peintre_nano ne doit pas introduire de penalite de rendu visible sur les flows terrain critiques.
- Bundle commun en v2 (lazy loading par module reporte a la phase suivante).

**Cadre de mesure (sans seuils chiffres imposes par ce PRD) :** les cibles qualitatives ci-dessus restent la reference produit. Les **seuils quantitatifs** (ex. percentiles de latence, echantillons de tests, criteres d'acceptation instrumentes) seront **fixes dans le plan de tests performance et l'observabilite** en coherence avec l'architecture, **sans contredire** ces exigences ni introduire de metriques contradictoires avec le perimetre brownfield existant.

### 11.5 Installabilite et open source

- Installation documentee et reproductible sur environnement cible.
- Socle lisible et suffisamment propre pour ouverture communautaire.
- Pas de dependance a un service propriataire pour le fonctionnement de base.
- La matrice d'environnements officiellement supportes doit etre publiee avant release candidate v2.

**Decision de cadrage v2 :**

- une seule installation officielle est supportee pour la v2 ;
- l'environnement cible officiel est **Debian** ;
- c'est aussi l'environnement de reference utilise pour le projet lui-meme ;
- les autres environnements peuvent etre explores plus tard, mais ne font pas partie du support officiel v2.

**Posture communautaire :** les installations sur d'autres OS (ex. derivés Debian/Ubuntu, conteneurs) peuvent etre **best-effort** par la communaute mais restent **hors support officiel** et hors **matrice publiee** (§ 11.5, gates § 13) tant qu'aucune extension explicite du perimetre supporte n'est decidee.

### 11.6 Donnees

- Le modele de donnees doit supporter l'articulation des deux flux (financier / matiere).
- Historicisation suffisante pour rejeu, analyse, correlations.
- Grain de donnees : totaux **et** operations detaillees accessibles.
- Mappings super-admin historises (savoir a partir de quand un mapping a change).
- Base assez propre pour de futurs usages analytiques par JARVOS nano ou autres briques.

---

## 12. Dependances et contraintes structurantes

### 12.1 Ordre structurant

L'ordre suivant minimise le risque systemique et doit etre respecte comme preference forte (ajustable si un audit reel l'impose) :

| # | Etape | Statut |
|---|-------|--------|
| 1 | Decision directrice v2 | **Fait** — document pivot `2026-03-31` |
| 2 | Separation Recyclique / Peintre_nano | **Fait** — plan valide |
| 3 | Profil CREOS minimal | **Fait conceptuellement** — plan valide, reste a figer en schemas formels |
| 4 | Audit backend / API / donnees + retro-engineering Paheko | A produire |
| 5 | Spec multi-sites / multi-caisses / postes + mapping Paheko | A produire |
| 6 | Contrat socle sync / reconciliation Recyclique / Paheko | A produire sur base des etapes 4 et 5 |
| 7 | Gouvernance contractuelle + schemas CREOS formels | A produire |
| 8 | Architecture modulaire + socle UI transverse | A produire |
| 9 | PRD actif + architecture active sans ambiguite majeure | Ce document + architecture a venir |

**Guide operationnel d'execution** : pour suivre en parallele les **deux rythmes** possibles (sequence structurante ci-dessus vs Pistes A/B dans les epics), les **jalons** a cocher et la **cartographie** des livrables documentaires (audits, donnees, tests), voir [`guide-pilotage-v2.md`](guide-pilotage-v2.md) — sans dupliquer les tableaux de cette section.

### 12.2 Sequence de validation produit

| # | Etape | Ce qu'elle prouve |
|---|-------|------------------|
| 1 | Audit backend / API / donnees | Compatibilite du socle existant avec la cible v2 |
| 2 | Retro-engineering Paheko sur donnees reelles | Limites reelles de l'API, mapping metier/compta |
| 3 | Spec multi-sites / multi-caisses / postes + mapping Paheko | Invariants de contexte et de projection comptable pour tous les chantiers |
| 4 | Contrat socle sync / reconciliation | Politique claire de livraison, retry, quarantaine, resolution |
| 5 | Gouvernance contractuelle + schemas CREOS formels | Grammaire machine stable pour manifests et compatibilite |
| 6 | Runtime minimal Peintre_nano | Moteur de composition reel |
| 7 | Preuve chaine modulaire sur `bandeau live` | Chaine complete backend → manifest → registre → slot → rendu → fallback |
| 8 | Recomposition transverse shell, navigation, dashboard, admin (**epic-5**, sprint) | Prerequis UI entre bandeau live et parcours terrain lourds ; aligne `epics.md` et `sprint-status.yaml` |
| 9 | Preuves terrain critiques : `cashflow` + `reception flow` | Robustesse terrain, contexte, raccourcis, flows, blocage/fallback |
| 10 | Premier grand module metier : `eco-organismes` | Validation du socle sur un domaine metier complet |
| 11 | Chantiers paralleles : `adherents`, config admin simple, HelloAsso, autres | Couverture fonctionnelle v2 |

**Regle :** si `bandeau live` ne prouve pas la chaine modulaire, corriger la chaine avant d'aller plus loin. L'etape **8** explicite le jalon **epic-5** absent de certaines sequences courtes de brainstorming mais presente dans le plan d'execution. Si un audit contredit le plan, arbitrer au cas par cas.

### 12.3 Dependances entre chantiers

| Chantier | Depend de | Peut demarrer en parallele avec |
|----------|-----------|---------------------------------|
| A — Socle integration Paheko | Contrat de sync valide, politique API/plugin/SQL | - |
| B — Multi-sites/multi-caisses | Audit backend/API/donnees | A (partiellement) |
| C — Separation Recyclique/Peintre_nano + CREOS | Decision directrice | B (les invariants de B contraignent C) |
| D — Socle UI transverse (Peintre_nano) | C (contrats) + B (contextes) | - |
| E — Module eco-organismes | A, B, C, D prouves | Config admin simple |
| Config admin simple | C, D | E, Adherents |
| Adherents | C, D | E, Config admin |

Regle de preemption : en cas de conflit entre un choix UI/contrat et un invariant de contexte, de permissions ou de projection comptable, l'invariant metier gagne et le chantier UI doit s'aligner.

### 12.4 Goulots d'etranglement identifies

1. **Noyau donnees / API / contextes** — doit etre clarifie avant de dessiner les modules.
2. **CREOS minimal reellement fige en schemas JSON** — doit etre suffisant sans etre surdimensionne.
3. **Peintre_nano appliquant droits + contexte + fallback** — doit etre prouve en vrai.
4. **Chaine modulaire complete en petit** — doit etre prouvee avant un gros module metier.

---

## 13. Gates de sortie

### 13.1 Beta interne ressourcerie test

| Critere | Description |
|---------|-------------|
| Terrain fiable | Cashflow et reception flow fonctionnels et stables |
| Compta acceptable | Scenarios critiques de sync/reconciliation documentes et verifies sur les parcours prioritaires |
| Modularite prouvee partiellement | Bandeau live prouve la chaine modulaire minimale |
| Zero fuite de contexte | Aucun defaut critique detecte sur site, caisse, session, poste |

**Preuves attendues pour declarer la beta interne :**

- liste de scenarios critiques executes avec resultat documente ;
- verification explicite des comportements de fallback, blocage et quarantaine sur les parcours prioritaires ;
- constats terrain remontes sur au moins un contexte reel de ressourcerie test.

### 13.2 V2 vendable / commercialisable

| Critere | Description |
|---------|-------------|
| Terrain fiable | Cashflow et reception flow robustes et eprouves |
| Compta propre | Politique de reconciliation explicite, parcours critiques verifies, traitement clair des ecarts de sync |
| Modularite front prouvee de bout en bout | Preuves confirmees sur bandeau live, eco-organismes et adherents |
| Zero fuite de contexte | Aucun defaut critique sur les contextes sensibles |
| Config admin minimale reelle | Activation/desactivation, ordre de blocs, variantes simples operationnels |
| Installation open source | Documentee et reproductible sur environnement cible |
| Ouverture communautaire | Produit assez propre pour des contributions tierces |

**Preuves attendues pour declarer la v2 vendable :**

- scenarios critiques de caisse, reception, cloture et sync executes et documentes ;
- preuve explicite de la modularite sur `bandeau live`, `eco-organismes` et `adherents` ;
- publication de la matrice d'environnements supportes et de la documentation d'installation associee ;
- absence de defaut critique ouvert sur fuite de contexte, blocage comptable ou perte de tracabilite.

---

## 14. Gouvernance contractuelle

### 14.1 Source de verite des schemas

Emplacement canonique des artefacts reviewables : repertoire `contracts/` a la racine du depot — `contracts/openapi/recyclique-api.yaml`, `contracts/creos/schemas/` (voir architecture BMAD et `contracts/README.md`). Les chemins historiques sous `_bmad-output` ne remplacent pas cette source pour le code et la CI cible.

### 14.2 Versionnement

- Manifests CREOS : SemVer, aligne avec les conventions JARVOS.
- OpenAPI : versionne separement mais de facon coordonnee.
- Numero de compatibilite explicite dans chaque manifest (couple API/manifest ↔ version Peintre).

### 14.3 Breaking changes

- **Politique de signalement et de gestion** : a **produire** en coherence avec **§ 16.3**, la **Definition of done** (**§ 14.5**) et l'exigence **FR73** / **NFR27** dans `epics.md` — le PRD pose l'exigence ; le detail operationnel est livre avec la gouvernance contractuelle.
- **Propagation** vers les instances deployees (OSS et cloud) sans briser le rendu, une fois la politique ci-dessus fixee.

### 14.4 Validation CI

- Un manifest valide en schema ne doit pas casser le rendu React (contrat props/widgets manquants) → a outiller en CI.

### 14.5 Definition of done contractuelle avant implementation large

Avant implementation large des modules v2, les points suivants doivent etre consideres comme closes :

- emplacement canonique des schemas defini ;
- regles de versionnement `OpenAPI` / `CREOS` fixees ;
- politique de breaking changes explicite ;
- schemas formels minimaux publies pour `ModuleManifest`, `WidgetDeclaration`, `SlotDefinition`, `ModuleAction` ;
- validation CI minimale disponible sur schemas + smoke test de rendu pour les manifests critiques.

---

## 15. Risques principaux

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Rater la modularite de base | Blocage de tous les modules metier | Prouver la chaine en petit (bandeau live) avant le grand (eco-organismes) |
| Sur-complexifier Peintre_nano / CREOS | Retard de sortie v2 | Profil de capacites minimal, pas de sur-architecture prematuree |
| Sous-estimer les invariants multi-contextes | Fuites de contexte, erreurs comptables | Stabiliser tot site/caisse/session/poste/role/PIN, spec dediee |
| Mal formaliser l'articulation terrain/compta/zone tampon | Ecarts de sync non recuperables | Contrat de sync explicite avec idempotence, retry, quarantaine |
| Ouvrir trop tot les sujets riches | Dilution du socle, dette strategique | Hors perimetre initial strictement delimite |
| Cout d'onboarding OSS de la separation Peintre/Recyclique | Barriere a la contribution communautaire | Documentation claire des contrats, exemples de manifests publics |
| Donnees existantes incompatibles avec la cible multi-sites | Rework massif du modele | Audit backend/API/donnees en amont de l'implementation |

---

## 16. Points encore a verrouiller avant architecture finale

Les points suivants sont des **verrous reels** — pas des questions ouvertes residuelles, mais des **prealables explicites** a l'architecture active :

### 16.1 Contrat de synchronisation Recyclique / Paheko

A produire : matrice definitive `API / plugin minimal / SQL hors flux`, couvrant idempotence, retry, quarantaine, reconciliation, semantique de livraison, cles de correlation inter-systemes, versionnement des payloads, et traduction detaillee de la gouvernance minimale deja posee dans ce PRD.

### 16.2 Spec multi-contextes

A produire : granularite exacte `ressourcerie → site → caisse → session → poste`, regles d'isolation, mapping vers entites/emplacements Paheko, comportement en contexte incomplet, risques d'integrite connus dans la base active (notamment autour de `site_id`). Doit aussi couvrir : modele de roles definissables par ressourcerie, groupes, labels personnalisables, et leur interaction avec le calcul de permissions et les contextes de rendu.

### 16.3 Gouvernance contractuelle

A trancher : source canonique des schemas, articulation OpenAPI / schemas CREOS, politique de versionnement et de breaking changes, mecanisme de validation CI.

### 16.4 Schemas CREOS formels

Le profil CREOS minimal est conceptuellement fige. Il reste a produire les **schemas JSON formels** validables automatiquement pour `ModuleManifest`, `WidgetDeclaration`, `SlotDefinition`, `ModuleAction`.

### 16.5 Mecanisme de sync concret

A confirmer ou reviser : recours a Redis Streams ou mecanisme equivalent pour la resilience de sync. Semantique de livraison retenue (at-least-once, exactly-once, etc.).

## 17. Statut des questions produit

Il ne reste plus de **lacune redactionnelle** ni de **question produit bloquante non cadrée** dans les sections de ce document : les sujets encore ouverts (ex. **niveau exact HelloAsso**, **sync** concrete, **politique breaking changes**) sont **deja renvoyes** aux paragraphes de perimetre (SS 7, SS 14–16) et aux **livrables d'architecture**.

Les points encore a **produire** pour passer a l'implementation relevent :

- de l'architecture et des specs techniques derivees ;
- des **verrous § 16** (contrat sync, multi-contextes, gouvernance contractuelle incluant breaking changes, schemas CREOS, mecanisme de sync) ;
- et du choix de mise en oeuvre concret des settings, du stockage de configuration et des mecanismes de synchronisation.

---

## Annexe A — Contradictions detectees dans les sources

Aucune contradiction bloquante n'a ete detectee entre les sources actives sur les arbitrages centraux. Le point de vigilance principal concerne l'existence historique d'anciens recits dans le depot (strategie `Paheko = backend principal`, `caisse native Paheko`, etc.) qui restent en dehors du perimetre canonique actuel. Le document pivot `2026-03-31_decision-directrice-v2.md` fait foi.

---

## Annexe B — Glossaire

| Terme | Definition dans ce PRD |
|-------|----------------------|
| `Recyclique` | Noyau metier, contrats backend, contexte, resilience, sync, historique |
| `Paheko` | Autorite comptable officielle du flux financier |
| `Peintre_nano` | Moteur de composition d'interface cote client |
| `CREOS` | Grammaire commune minimale des declarations UI (manifests, actions, widgets, flows, etats) |
| `Adaptateur de canal` | Couche de rendu concret (React pour le web) |
| `Manifest CREOS` | Declaration d'un module (routes, slots, widgets, actions, shortcuts, flows) au format CREOS documentaire (JSON) |
| `Slot` | Point d'extension nomme dans le shell UI |
| `Widget` | Composant reutilisable avec type stable et props_schema |
| `Flow` | Sequence d'etapes (state machine legere) declaree en JSON |
| `Zone tampon` | Espace de stockage local Recyclique pour les donnees en attente de sync vers Paheko |
| `Quarantaine` | Etat explicite d'un flux ou d'une operation qui ne peut pas etre synchronise ou valide sans traitement trace |
| `Correlation_id` | Identifiant de suivi d'un meme flux ou evenement a travers plusieurs composants ou systemes |
| `Cashflow` | Parcours passage en caisse |
| `Reception flow` | Parcours reception de marchandise |
| `Bandeau live` | Module d'affichage temps reel servant de preuve modulaire |
| `Config admin simple` | Pilotage minimal du shell et des modules (activation, ordre, variantes) |

---

## Annexe C — Index de tracabilite des exigences (renvoi epics)

Les **identifiants stables** des exigences fonctionnelles **FR1 a FR73** et non fonctionnelles **NFR1 a NFR28** sont definis dans l'inventaire du fichier **`_bmad-output/planning-artifacts/epics.md`** (sections *Functional Requirements* et *NonFunctional Requirements*). Ce PRD en est la source narrative ; l'inventaire epics fait foi pour les **ID machine** et le decoupage story.

| Zone thematique dans ce PRD | ID stables (epics.md) |
|-----------------------------|------------------------|
| SS 2 Vision, SS 2.3 brownfield, SS 3 Repartition des roles | FR1 a FR10 |
| SS 4 Invariants non negociables | FR11 a FR22 |
| SS 5 Double flux | FR23 a FR30 |
| SS 6 Utilisateurs, roles, labels, groupes | FR31 a FR36 |
| SS 7 Perimetre fonctionnel v2 (modules, sync, multi-sites, admin, HelloAsso) | FR37 a FR47 |
| SS 8 Profil CREOS, SS 8.8 Emission / consommation | FR48 a FR54 |
| SS 9 Parcours et flows critiques | FR55 a FR60 |
| SS 10 Matrice fallback / blocage / donnees widget | FR61 a FR70 |
| SS 11.2 Securite, SS 11.3 Tracabilite (exigences fonctionnelles associees) | FR71, FR72 |
| SS 14.5 Definition of done contractuelle | FR73 |
| SS 11 Exigences non fonctionnelles (synthese) | NFR1 a NFR28 |

**Usage pour les stories :** chaque story peut pointer vers une **plage de sections PRD** (ex. SS 9.1 + SS 10.x) et vers les **FR/NFR** correspondants dans `epics.md`, comme recommande par le rapport de validation du PRD.
