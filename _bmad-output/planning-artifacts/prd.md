---
stepsCompleted:
  - step-e-01-discovery
  - step-e-02-review
  - step-e-03-edit
  - step-e-04-complete
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
  - references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-04-15-caisse-compta-paheko-rebaseline.md
  - references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md
  - references/operations-speciales-recyclique/2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md
source_of_truth: references/vision-projet/2026-03-31_decision-directrice-v2.md
validationReportUsed: _bmad-output/planning-artifacts/prd-validation-report-2026-04-15-post-edit.md
priorValidationReport: _bmad-output/planning-artifacts/prd-validation-report-2026-04-01.md
document_date: '2026-03-31'
# document_date = date de redaction initiale ; revisions ulterieures : lastEdited ci-dessous et editHistory.
lastEdited: '2026-04-18'
editHistory:
  - date: '2026-04-18'
    changes: 'Post re-QA2 fermeture — scenarios arbitrage PRD doubles, revue habilitations §6.3, concurrence §9.1, correlation §11.3, perf profil §11.4, gate beta Epic 24 §13.1, harmonisation §16 cloture livrables vs §17, Annexe A perimetre/triggers.'
  - date: '2026-04-18'
    changes: 'Post-QA2 — coexistence explicite des deux PRD caisse (migration vs operations speciales), annexes C/beta §13/§17/§12.1, mitigation risque PRD specialises (table §15), note document_date YAML, tracabilite Epic 24.'
  - date: '2026-04-18'
    changes: 'Edit-prd BMAD — rattachement du chantier operations speciales de caisse (PRD v1.1 + prompt ultra operationnel dans references/operations-speciales-recyclique/), renvoi vers Epic 24 et ADR architecture ; complement au sous-domaine caisse/compta sans remplacer le PRD specialise migration-paheko.'
  - date: '2026-04-15'
    changes: 'Post-validation BMAD — ajout d un resume executif et du diagnostic brownfield, durcissement des exigences web_app (navigateurs, accessibilite, SEO), criteres plus testables sur parcours/gates/NFR, reduction des fuites d implementation residuelles et fermeture de plusieurs gaps de tracabilite.'
  - date: '2026-04-15'
    changes: 'Edit-prd BMAD post-correct-course approuve — integration canonique mince du delta caisse/compta/Paheko (source de verite comptable locale, paiement mixte/don/free/remboursement, snapshot de session, lot de sync Paheko, distinction admin simple vs parametrage comptable sensible) avec renvois vers le PRD specialise et la sprint change proposal.'
  - date: '2026-04-01'
    changes: 'Post-validation BMAD — frontmatter classification, note decisions perimetre/contrats, index trace FR/NFR vers epics, synthese UX canal web, cadre mesures perf sans nouveaux seuils.'
  - date: '2026-04-01'
    changes: 'Post-QA2 — validationReport chain (post-edit + prior), complexity medium, §17/§16/HelloAsso, §14.3 renvoi §16.3-FR73-NFR27, §11.5 hors Debian, §10.1/§10.2 preuve mapping et extension liste actions critiques ; QA finale typo livrables §17.'
---

# PRD — JARVOS Recyclique v2

**Auteur :** Strophe  
**Date de redaction initiale :** 2026-03-31  
**Derniere revision documentaire :** 2026-04-18 (rattachement operations speciales caisse / Epic 24) ; precedemment 2026-04-15 (delta canonique caisse/compta/Paheko + durcissement post-validation BMAD)  
**Source de verite de cadrage :** `references/vision-projet/2026-03-31_decision-directrice-v2.md`  
**Statut :** Actif — base pour architecture et epics  
**Documentation de travail Peintre (pipeline, extraits, index) :** `references/peintre/index.md` — alignee PRD ; en cas d'ecart, ce PRD et l'architecture BMAD font foi.

**Sous-domaine specialise caisse/compta/Paheko :**
- **PRD detaille :** `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md`
- **Correct course approuve :** `_bmad-output/planning-artifacts/sprint-change-proposal-2026-04-15-caisse-compta-paheko-rebaseline.md`

**Chantier operations speciales de caisse (parcours annulation, remboursements, tags metier, Paheko) :**
- **PRD specialise v1.1 :** `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md`
- **Prompt execution (audit P0-P3, livrables, ordre) :** `references/operations-speciales-recyclique/2026-04-18_prompt-ultra-operationnel-operations-speciales-recyclique_v1-1.md`
- **Pilotage BMAD :** Epic 24 dans `_bmad-output/planning-artifacts/epics.md` ; decisions d'architecture : `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md`

**Regle de lecture :** le present `prd.md` reste la **source canonique haut niveau** pour le produit v2 ; le PRD specialise caisse/compta/Paheko porte le **detail operatoire** du sous-domaine (regles comptables, exemples d'ecritures, tables et phasage fin) tant qu'il reste aligne sur ce PRD canonique et sur l'architecture active. Le PRD **operations speciales** detaille les parcours terrain et tags ; il **complete** le PRD migration-paheko sans le remplacer. En cas de tension, la hierarchie est : vision directrice > ce prd.md > PRD specialises > epics/stories actifs.

**Coexistence des deux PRD specialises caisse :** le PRD **migration-paheko / caisse-compta** fixe le **cadre comptable**, les mappings et la chaine de synchronisation ; le PRD **operations speciales** fixe les **parcours terrain**, tags et regles metier des sorties matiere. En cas de conflit sur une **regle comptable** ou un **export Paheko**, le PRD migration-paheko et `cash-accounting-paheko-canonical-chain.md` **priment**. En cas de conflit sur un **parcours operateur**, une **regle de tag** ou une **preuve terrain**, le PRD operations speciales et l'ADR `2026-04-18-adr-operations-speciales-caisse-paheko-v1.md` **priment**, dans la limite du cadre comptable precedent.

**Scenarios type (non exhaustifs) pour trancher sans ambiguite :**

1. **Tag ou libelle metier « social »** demande sur un ticket alors qu'une ligne d'export Paheko cible un compte incompatible : ajuster le **mapping** ou le **compte** dans le referentiel expert / PRD migration (autorite comptable) ; le libelle terrain suit des que le cadre comptable le permet.
2. **Preuve terrain obligatoire** (justification, trace) impose un delai ou un statut visible incompatible avec une **ecriture immediate** : la **preuve et la coherence terrain** priment sur la formulation UI, mais la **structure des ecritures** reste celle du snapshot et du builder — en cas de blocage Paheko, etats quarantaine / reprise Epic 8, pas de contournement export parallele.

### Stack Peintre_nano (figée)

Les decisions **P1** (stack CSS / styling) et **P2** (stockage des surcharges de configuration admin) sont **fermees**. Sources d'autorite :

- **ADR** : `references/peintre/2026-04-01_adr-p1-p2-stack-css-et-config-admin.md`
- **Instruction agents (code, CI, garde-fous)** : `references/peintre/2026-04-01_instruction-cursor-p1-p2.md`

En cas d'ecart avec d'anciens extraits, briefs ou archives, **l'ADR et cette instruction priment** sur le reste de la documentation Peintre pour P1 et P2.

**Priorite de resolution :** pour **P1** et **P2** uniquement, en cas d'ecart entre le **corps** de ce PRD et l'ADR, **l'ADR fait foi** (le present PRD et l'architecture BMAD restent la reference pour le reste du perimetre v2).

**Decisions de perimetre et contrats (lecture WHAT/HOW) :** les choix explicitement nommes dans ce PRD — canal web et adaptateur **React**, surfaces **OpenAPI** / manifests **CREOS JSON**, persistance **PostgreSQL** pour la config admin simple (**P2**), environnement **Debian**, references **TypeScript** pour le pont semantique widget / etats CREOS — sont des **decisions de perimetre, de gouvernance contractuelle ou brownfield** alignees sur l'architecture BMAD active (`_bmad-output/planning-artifacts/architecture/`) et les ADR Peintre. Ils ne remplacent pas les specs d'implementation detaillees (stories, code, CI).

---

## 1. Objet du document

### 1.1 Resume executif

`JARVOS Recyclique v2` est une evolution brownfield de `recyclique-1.4.4` destinee a fournir :

- un socle terrain exploitable en production sur ressourcerie reelle ;
- une articulation explicable entre `Recyclique` (terrain, contexte, resilience, sync) et `Paheko` (verite comptable finale) ;
- une UI entierement portee par `Peintre_nano` sans refonte from scratch du metier ;
- un cadre suffisamment stable pour produire architecture, epics et stories sans ambiguite majeure.

La v2 est consideree en reussite si elle demontre quatre qualites primaires :

- **fiabilite terrain** ;
- **justesse comptable** ;
- **resilience** ;
- **modularite reelle de bout en bout**.

### 1.2 Probleme produit

La base `recyclique-1.4.4` reste exploitable comme point de depart, mais pas comme cible long terme. Le probleme produit n'est pas de refaire integralement Recyclique : il est de sortir d'une logique de **dette accumulee**, de **couplages implicites** et d'**outillage terrain limite**, tout en conservant les acquis operationnels sains.

La v2 doit donc reconstruire un socle plus fiable a partir du reel :

- garder la continuite terrain ;
- articuler correctement `Recyclique` et `Paheko` ;
- rendre la donnee exploitable pour execution, audit, rejeu et analyse ;
- faire passer toute l'UI v2 par `Peintre_nano` sans sur-architecture prematuree.

Ce PRD definit le perimetre, les exigences et les contraintes de JARVOS Recyclique v2 en tant qu'evolution brownfield de `recyclique-1.4.4`.

Il ne remplace ni l'architecture detaillee ni les specs techniques fines. Il fournit le cadre produit suffisant pour :

- ecrire l'architecture v2 sans ambiguite majeure ;
- decouper les epics et stories ;
- maintenir la coherence entre les chantiers.

Les arbitrages fondamentaux ont ete valides dans le brief et la decision directrice v2. Ce PRD les integre sans les rediscuter sauf contradiction explicite detectee.

---

## 2. Vision produit

### 2.1 Enonce

Produire une v2 de Recyclique **exploitable en production par des ressourceries**, **installable sur l'environnement cible officiellement supporte**, **publiable en open source**, et suffisamment gouvernee pour soutenir des evolutions futures sans dette strategique majeure immediate.

### 2.2 Critere de reussite primaire

La reussite ne se mesure pas a la richesse fonctionnelle immediate ni a la sophistication du moteur UI. Elle se mesure a :

1. la **fiabilite terrain** ;
2. la **justesse comptable** ;
3. la **resilience** ;
4. la **modularite reelle de bout en bout**.

### 2.3 Posture brownfield

- La v2 repart de `recyclique-1.4.4` sur les logiques metier critiques.
- Les flows terrain prioritaires (`cashflow`, `reception flow`) conservent les memes bases metier.
- Les ameliorations UX sont autorisees si elles reduisent le nombre d'actions, d'erreurs ou d'hesitations sur un parcours critique, sans augmenter le risque metier ou comptable.
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
- la preparation comptable locale des sessions avant integration `Paheko` ;
- la verite principale du **flux matiere** ;
- l'historique exploitable pour rejeu, audit et analyse ;
- les manifests CREOS de ses modules metier.

Pour le sous-domaine caisse/compta, `Recyclique` porte donc aussi la **verite comptable locale operatoire** necessaire a la cloture de session : calculs a partir des paiements enregistres, preparation d'un snapshot comptable fige, et emission d'un lot de synchronisation corrigeable vers `Paheko` sans remettre en cause le principe `terrain d'abord`.

Les widgets critiques doivent pouvoir declarer explicitement leur dependance a des donnees metier fraiches, de maniere contractuelle et verifiable, afin de permettre un blocage produit explicite lorsque la donnee critique n'est plus fiable.

### 3.2 Paheko

`Paheko` porte :

- la verite comptable officielle du **flux financier** ;
- les classifications et contraintes comptables sur leur perimetre ;
- l'autorite finale pour la comptabilite.

Integration : approche **API-first**. Plugin Paheko minimal autorise uniquement si un besoin metier n'est pas expose par l'API officielle. Pas d'ecriture SQL transactionnelle comme chemin nominal.

### 3.3 Peintre_nano

`Peintre_nano` porte :

- le shell UI ;
- le registre des modules actifs et disponibles ;
- le systeme de slots nommes ;
- le catalogue de widgets avec contrat de props ;
- le rendu des flows declaratifs ;
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
| Verite comptable locale operatoire | **Recyclique** | Calcul de cloture, snapshot comptable de session, preparation du lot de sync |
| Terrain + zone tampon | **Recyclique** | Saisie, journalisation, resilience, sync |

**Politique de synchronisation retenue :**

- **terrain d'abord** : les donnees sont enregistrees dans Recyclique ;
- **source de verite locale** : les calculs de cloture s'appuient sur les donnees de paiement enregistrees dans Recyclique avant emission vers `Paheko` ;
- **sync reportable** : la synchronisation vers Paheko peut etre retardee ;
- **blocage selectif** : seules certaines actions critiques finales peuvent etre bloquees si la sync n'est pas a jour ;
- un probleme de sync **ne bloque pas** le terrain par defaut ;
- resilience par **zone tampon Recyclique** avec reprise ulterieure.

**Decision canonique pour la caisse/compta :**

- la comptabilisation reste **par session de caisse**, pas ticket par ticket ;
- la source de verite comptable locale des paiements devient un **journal detaille des transactions de paiement** ;
- les moyens de paiement administrables deviennent un **referentiel metier explicite** ;
- la cloture produit un **snapshot comptable fige de session** ;
- la synchronisation vers `Paheko` s'opere sur un **lot de session corrigeable**, pouvant contenir plusieurs sous-ecritures equilibrees selon la strategie retenue en architecture.

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
| **Operateurs terrain** | Encaisser, receptionner et cloturer sur parcours nominal sans souris ; contexte garanti ; etats d'erreur et de reprise explicites |
| **Responsables de ressourcerie** | Superviser localement ; suivre les ecarts ; relire une cloture et son snapshot ; piloter les reglages admin simples sans intervention technique |
| **Comptabilite / administration** | Retrouver une verite comptable lisible dans Paheko ; comprendre l'etat d'un lot de session ; traiter les ecarts avec tracabilite |

### 6.2 Utilisateurs secondaires

| Profil | Besoins cles |
|--------|-------------|
| **Super-admin / expert** | Mappings sensibles, parametrages structures, controle des reglages critiques, parametrage comptable sensible, audit |
| **Futures ressourceries adoptantes** | Installer le socle sur environnement supporte, creer un premier contexte exploitable, comprendre les contrats et contribuer sans ambiguite majeure |

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
- **revue des habilitations :** la gouvernance minimale doit permettre une **verification periodique** (qui detient quelles permissions sensibles, sur quel site) et une **reduction de surface** lors des audits internes ; les exports ou listings d'habilitations effectifs sont **souhaitables** des qu'un livrable admin couvre les roles groupes (sinon trace au minimum dans les journaux d'audit des actions sensibles) ;
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
- **Feedback utilisateur :** etats charges / vides / erreurs / degrades **visibles et explicites** sur les flows critiques ; alignement avec la matrice SS 10 et les etats de donnees widget du socle canonique.
- **Securite percue :** l'UI peut masquer ou guider, mais **ne substitue pas** l'autorisation backend (SS 11.2) ; labels et libelles personnalises **ne font pas foi** pour la securite (SS 4.1, SS 6.3).
- **Ameliorations UX terrain :** autorisees lorsqu'elles reduisent la friction sur un parcours critique sans diminuer les garde-fous metier ou comptables (SS 2.3).

### 6.5 Exigences web_app minimales

Pour le type de projet `web_app`, la v2 retient les exigences suivantes :

- **Matrice navigateurs officielle v2 :** support nominal desktop sur **Chromium stable** et **Firefox ESR** dans l'environnement cible ; usage **best-effort** sur `Edge` recent ; mobile et tablettes hors parcours nominal v2 hors besoins ponctuels de consultation.
- **Accessibilite cible :** les parcours `login`, `cashflow`, `reception flow`, `cloture`, `config admin simple` et les ecrans de reprise doivent respecter un niveau **WCAG 2.1 AA** sur navigation clavier, contrastes, labels et messages d'erreur exploitables.
- **SEO :** non applicable au coeur authentifie de la v2. Si des pages publiques de presentation, documentation ou onboarding web sont produites, elles relevent d'un livrable distinct et ne conditionnent pas la sortie produit du coeur metier.
- **Contexte de mesure web :** les exigences de rendu, d'accessibilite et de performance sont verifiees sur l'environnement officiellement supporte de `§ 11.5`, avec donnees nominales et poste de travail de ressourcerie de reference.

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

**Delta canonique caisse/compta/Paheko (2026-04-15) :**

- la caisse v2 doit supporter des **paiements mixtes**, le **don en surplus**, la **gratuite** (`free` comme vente a `0`, pas moyen de paiement) et les **remboursements** y compris sur **exercice anterieur clos** ;
- les calculs comptables de cloture doivent partir du **journal detaille des transactions de paiement**, et non du **champ legacy de paiement porte par la vente** ;
- la cloture de session doit produire un **snapshot comptable fige** avant emission vers `Paheko` ;
- le lot de synchronisation d'une session peut contenir plusieurs sous-ecritures equilibrees (par exemple ventes/dons, remboursements exercice courant, remboursements exercice anterieur clos), sans changer le principe d'une supervision et d'une correlation communes ;
- le **parametrage comptable sensible** de ce sous-domaine est distinct de la **config admin simple** et reste reserve au **super-admin / expert** avec forte tracabilite.

**Source detaillee du sous-domaine :** `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md`

Hierarchie technique :

1. API officielle Paheko en priorite ;
2. plugin Paheko minimal si un besoin n'est pas expose par l'API ;
3. SQL limite a l'analyse, au controle ou a l'administration, jamais comme chemin transactionnel nominal.

**Note de clarification :** un mecanisme de queue ou d'outbox durable, ou equivalent, peut etre retenu pour la resilience **interne** de synchronisation cote Recyclique. Cela ne constitue pas un bus CREOS v2 et ne remet pas en cause le principe `CREOS documentaire` pour les manifests UI.

#### Multi-sites / multi-caisses / postes

La v2 doit supporter la granularite : `ressourcerie → site → caisse → session → poste de reception`.

Exigences a figer avant implementation large :

- une session, un ticket ou une cloture ne doivent jamais etre visibles ni actionnables hors du contexte `site/caisse/session` explicitement valide ;
- les habilitations doivent pouvoir limiter un utilisateur a un sous-ensemble explicite de sites et de caisses ;
- deux caisses actives en parallele sur un meme site ne doivent ni partager silencieusement une session ni produire une collision silencieuse sur les identifiants de ticket ou de cloture ;
- chaque ticket, session et cloture doit porter un identifiant metier relisible et un identifiant technique tracable ;
- la cloture et la reprise apres incident doivent laisser un evenement horodate et rejouable ;
- la projection vers `Paheko` doit reposer sur une correspondance explicite entre le contexte Recyclique et l'emplacement comptable cible ;
- si cette correspondance manque, l'operation reste locale, visible en supervision et non synchronisee tant qu'une correction explicite n'est pas faite.

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

**Clarification produit :** le parametrage des **moyens de paiement**, des **comptes globaux de cloture** et des **cas comptables speciaux** du domaine caisse/compta/Paheko fait partie de ces reglages **sensibles** et **n'entre pas** dans le perimetre de la `config admin simple`.

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
- optimisation fine de layout CSS non indispensable a la preuve produit v2 ;
- telemetrie d'interaction fine non indispensable a la preuve produit v2 ;
- strategie avancee de decoupage du chargement front non indispensable a la preuve produit v2 ;
- fusion des couches de manifests au-dela du profil CREOS minimal.

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

- le parcours nominal `scan -> prix -> validation -> paiement` doit etre realisable **entierement au clavier**, sans souris, sur poste de reference ;
- contexte garanti : site, caisse, session, operateur ;
- blocage si contexte incomplet ou ambigu ;
- validations metier et comptables avant cloture de ticket ;
- journalisation complete ;
- resilience : la transaction reste enregistree dans Recyclique meme si `Paheko` est indisponible au moment de la vente ;
- fallback explicite si un widget ou une contribution UI n'est pas rendable.

Le parcours caisse v2 doit aussi couvrir, sans demander une culture comptable a l'operatrice :

- les **paiements mixtes** ;
- le **don en surplus** distinct du paiement de vente ;
- la **gratuite** comme vente a `0` ;
- le **remboursement** standard ;
- le **remboursement sur exercice anterieur clos** avec aide explicative et garde-fous renforces.

**Concurrence et integrite de session :** deux operateurs ou deux navigateurs sur une meme session caisse ne doivent pas corrompre silencieusement un ticket ; les **invariants de concurrence**, l'**idempotence** des operations sensibles et le **verrouillage logique** de session sont portes par la **spec multi-contextes** (§16.2) et les contrats backend — pas improvises dans l'UI seule. En cas de perte reseau ou timeout, **reprise explicite** sans double encaissement ni perte tracee.

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
- calcul a partir de la source de verite comptable locale des paiements ;
- production d'un **snapshot comptable fige** de session avant emission vers `Paheko` ;
- reconciliation avec les donnees en zone tampon ;
- declenchement de la sync vers Paheko (si pas deja fait en temps reel) ;
- blocage possible si ecart critique detecte avant sync finale ;
- journalisation et historisation.

### 9.4 Bandeau live

**Role :** preuve modulaire legere.

Exigences :

- premier module a prouver la chaine complete : contrat backend → manifest CREOS → registre Peintre_nano → slot → rendu → fallback ;
- activation/desactivation via config admin ;
- preuve explicite du profil CREOS minimal sur au moins `ModuleManifest`, `WidgetDeclaration`, `SlotDefinition` et `ModuleAction` ;
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

- produire, a partir des flux terrain deja saisis, les agregats et details necessaires a une declaration par periode et par perimetre ;
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

### 9.7 Configuration admin minimale

**Role :** preuve de pilotage local du shell et des modules sans basculer dans un back-office expert.

Exigences :

- un responsable habilite peut activer ou desactiver un module ou bloc supporte par la `config admin simple` ;
- un responsable habilite peut modifier l'ordre d'un bloc et choisir une variante simple prevue par le build ;
- chaque changement est trace avec auteur, date, contexte et motif ;
- un changement valide devient visible au prochain rechargement autorise du shell, sans redeploiement ni edition manuelle de base ;
- les reglages comptables sensibles restent exclus de ce parcours et renvoyes au niveau `super-admin / expert`.

### 9.8 Installation et onboarding d'une ressourcerie

**Role :** preuve d'installabilite officielle et d'adoptabilite du socle v2.

Exigences :

- a partir d'un environnement vierge officiellement supporte, l'installation nominale doit permettre d'atteindre un shell authentifie sans edition manuelle de base de donnees ;
- la procedure documentee doit permettre de creer un premier contexte exploitable (`site`, `caisse`, compte admin initial, modules de base) ;
- les prerequis, etapes et points de verification doivent etre documentes de maniere rejouable ;
- toute etape hors procedure standard doit etre explicitement marquee comme support, migration ou intervention expert, pas comme chemin nominal.

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
| Donnees widget en cours / chargees / erreur / vide / perimees | Etats de presentation dedies (`chargement`, `erreur`, `vide`) ; si un contrat de donnees critique declare une donnee perimee, cet etat peut **bloquer** les actions sensibles en coherence avec la securite > fluidite |
| Parametrage comptable sensible invalide ou incomplet | Blocage explicite des actions comptables finales dependantes, correction reservee au role habilite, pas de valeur de substitution silencieuse |
| Lot de sync partiellement applique cote Paheko | Etat explicite de reprise / reconciliation, trace commune du lot, pas de succes global implicite |

**Note de compatibilite avec la matrice ci-dessus :** les lignes existantes (widget non rendable, module non critique, flow invalide, etc.) restent valides pour la **composition** et le **runtime CREOS** ; la ligne ajoutee couvre la **couche donnees metier** par widget, orthogonale aux etats de cycle de vie module (`ACTIVE` / `INACTIVE` / `ERROR`).

**Lexique runtime :** le vocabulaire des etats de donnees doit rester **unique et documente** entre les contrats et l'UI. La v2 n'accepte pas deux semantiques paralleles non raccordees pour parler d'une meme situation de donnees.

**Preuve et non-regression :** cette coherence doit etre verifiable par la validation contractuelle et les tests de rendu des manifests critiques — objectif : eviter deux vocabulaires paralleles sans pont explicite.

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

- Toute operation terrain finalisee est enregistree dans `Recyclique` avant qu'un succes externe `Paheko` ne soit suppose.
- Un scenario de reprise apres indisponibilite `Paheko` doit permettre de rejouer un lot en attente **sans perte silencieuse** et **sans duplication silencieuse**.
- Le terrain doit pouvoir continuer a fonctionner en mode degrade lorsqu'une dependance externe est indisponible, hors actions finales explicitement bloquees par `§ 10`.

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
- blocage temporaire apres **5 erreurs consecutives** sur une fenetre de **15 minutes** ;
- la longueur minimale par defaut est de **6 caracteres numeriques** ; la duree de blocage par defaut est de **15 minutes** ; le nombre d'essais autorises avant blocage et la duree du blocage restent des **settings** reconfigurables ;
- ces settings font partie des parametres de base editables par un **super-admin** ;
- ces parametres doivent pouvoir etre portes par la configuration structuree retenue (JSON, YAML ou equivalent) et exposes via un editeur integre leger cote super-admin ;
- la reinitialisation du PIN doit etre reservee a un **super-admin** ou a un **responsable habilite** selon le perimetre retenu par l'architecture.

### 11.3 Tracabilite et audit

- Journalisation des actions sensibles : resultat, qui, quand, quel contexte.
- Journalisation des fallbacks, blocages et degradations.
- Retour d'information exploitable pour support/admin.
- Boucle correction/retry avec message d'erreur contenant au minimum l'operation concernee, la consequence immediate, l'action suivante attendue et un identifiant de correlation si escalation necessaire.
- Sur la compta et les flux sensibles : capacite de rejouer/comprendre apres coup.
- Sur la caisse/compta : historisation des changements de parametrage comptable sensible, des remboursements speciaux et des traitements de lots de session.

**Correlation et chemins critiques :** toute **ecriture** ou **lot** synchronise vers `Paheko` doit porter une **correlation** et des identifiants exploitables conformement au **contrat de synchronisation** (§16.1) ; aucune conception ne doit permettre un succes affiche **sans** lien traçable entre l'operation terrain et la livraison comptable.

**Schema minimal attendu pour les journaux critiques :**

- `correlation_id` commun au flux quand pertinent ;
- identifiants de contexte (`site`, `caisse`, `session`, `poste`) ;
- identifiant interne utilisateur ou operateur ;
- type d'operation, etat, motif d'echec ou de blocage ;
- masquage des donnees sensibles non necessaires au support.

### 11.4 Performance

- Sur poste de reference et donnees nominales, le parcours `cashflow` doit amener l'utilisateur de la saisie au prochain etat exploitable en **moins de 200 ms p95** sur les actions clavier critiques (`scan`, `validation prix`, `selection paiement`).
- Sur poste de reference et donnees nominales, le shell web authentifie doit rendre un ecran critique exploitable en **moins de 2 secondes p95** apres navigation ou rechargement autorise.
- La strategie de chargement front n'est pas un prerequis produit en soi ; elle est acceptable tant qu'elle respecte les criteres de performance ci-dessus et n'introduit pas de blocage visible sur les flows critiques.

**Cadre de mesure :** les seuils ci-dessus sont verifies sur l'environnement officiellement supporte (**Debian**, §11.5), avec jeux de donnees nominaux et plan de tests performance versionne. Le **profil materiel minimal** utilise pour les mesures (CPU, RAM, stockage disque, latence reseau de reference ou simulation Paheko) doit etre **nomme dans l'architecture active** ou dans un **guide performance** relicie au projet afin d'eviter les disputes en recette. L'architecture et l'observabilite peuvent completer ces mesures, sans les contredire ni les affaiblir.

### 11.5 Installabilite et open source

- Installation documentee et reproductible sur environnement cible.
- Socle lisible et documente pour ouverture communautaire.
- Pas de dependance a un service propriataire pour le fonctionnement de base.
- La matrice d'environnements officiellement supportes doit etre publiee avant release candidate v2.
- La matrice navigateurs officiellement supportes doit etre publiee avec la documentation d'installation du coeur web.
- Une installation nominale est consideree complete lorsque le shell authentifie est accessible et qu'un premier contexte exploitable peut etre cree sans edition manuelle de base.

**Decision de cadrage v2 :**

- une seule installation officielle est supportee pour la v2 ;
- l'environnement cible officiel est **Debian** ;
- c'est aussi l'environnement de reference utilise pour le projet lui-meme ;
- les autres environnements peuvent etre explores plus tard, mais ne font pas partie du support officiel v2.

**Posture communautaire :** les installations sur d'autres OS (ex. derivés Debian/Ubuntu, conteneurs) peuvent etre **best-effort** par la communaute mais restent **hors support officiel** et hors **matrice publiee** (§ 11.5, gates § 13) tant qu'aucune extension explicite du perimetre supporte n'est decidee.

### 11.6 Donnees

- Le modele de donnees doit supporter l'articulation des deux flux (financier / matiere).
- Historicisation permettant de relire une operation, une cloture de session et la version de mapping appliquee au moment des faits.
- Grain de donnees : totaux **et** operations detaillees accessibles.
- Mappings super-admin historises (savoir a partir de quand un mapping a change).
- Pour toute session cloturee, les donnees exportees ou relues doivent permettre de retrouver au minimum : contexte, lignes de detail, totaux, version de mapping et identifiant de correlation.
- Donnees exportables et relisibles sans transformation ad hoc pour les usages d'audit, de rapprochement et d'analyse v2.
- Les donnees de cloture de session doivent pouvoir etre figees dans un **snapshot comptable** non recalcule silencieusement apres cloture.

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

**Delta structurant 2026-04-15 :** pour le sous-domaine caisse/compta/Paheko, la sequence doit aussi expliciter la chaine `referentiel des moyens de paiement -> journal detaille des transactions de paiement -> snapshot comptable de session -> lot de synchronisation Paheko`, ainsi que son articulation avec les epics `6`, `8`, `10`, `13`, `14`, `16` et `18` via le correct course approuve. Le **rail correctif comptable** et la **ventilation Paheko** sont portes par les epics **`22`**, **`23`** ; le chantier **parcours operations speciales / tags** est porte par l'**Epic `24`** (voir `epics.md` et PRD `references/operations-speciales-recyclique/`).

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
| Terrain fiable | Scenarios nominaux et de degradation critiques `cashflow` et `reception flow` executes sans defaut bloquant ouvert sur le contexte ou la perte de donnee |
| Compta acceptable | Scenarios critiques de sync/reconciliation documentes et verifies sur les parcours prioritaires |
| Modularite prouvee partiellement | `Bandeau live` prouve la chaine modulaire minimale et le passage d'un contrat CREOS au rendu effectif |
| Zero fuite de contexte | Aucun defaut critique detecte sur site, caisse, session, poste |

**Preuves attendues pour declarer la beta interne :**

- liste de scenarios critiques executes avec resultat documente ;
- verification explicite des comportements de fallback, blocage et quarantaine sur les parcours prioritaires ;
- constats terrain remontes sur au moins un contexte reel de ressourcerie test.
- pour la caisse/compta : preuve explicite sur paiements mixtes, don en surplus, gratuite, remboursement standard, remboursement sur exercice anterieur clos, snapshot de session et lot de synchronisation associe.
- lorsque le chantier **operations speciales** (Epic 24) est dans le perimetre de la release consideree : preuves documentees alignees sur `epics.md` Epic 24 et le PRD `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md` (parcours, tags, Paheko).
- **decision produit documentee** : inclusion ou exclusion explicite d'Epic 24 dans le **scope beta** de la release ; si Epic 24 est **hors** scope, la beta reste valide sous reserve d'une **mention ecrite** « beta sans parcours operations speciales completes » dans les notes de gate ;
- pour le `bandeau live` : preuve documentee qu'un `ModuleManifest`, ses contributions de slot et son rendu nominal peuvent etre valides sans convention locale non versionnee.

### 13.2 V2 vendable / commercialisable

| Critere | Description |
|---------|-------------|
| Terrain fiable | Parcours `cashflow`, `reception flow` et `cloture` executes sur environnement supporte avec preuves documentees et sans defaut critique ouvert sur perte de donnee ou fuite de contexte |
| Compta propre | Politique de reconciliation explicite, parcours critiques verifies, traitement clair des ecarts de sync |
| Modularite front prouvee de bout en bout | Preuves confirmees sur bandeau live, eco-organismes et adherents |
| Zero fuite de contexte | Aucun defaut critique sur les contextes sensibles |
| Config admin minimale reelle | Un responsable habilite peut modifier activation, ordre et variante simple sur environnement supporte, avec audit et sans redeploiement |
| Installation open source | Installation nominale documentee, reproductible et verifiee sur environnement cible officiel, jusqu'au shell authentifie et au premier contexte exploitable |
| Ouverture communautaire | Contrats, documentation d'installation et guide de contribution minimum publies de facon coherente avec la gouvernance contractuelle |

**Preuves attendues pour declarer la v2 vendable :**

- scenarios critiques de caisse, reception, cloture et sync executes et documentes ;
- preuve explicite de la modularite sur `bandeau live`, `eco-organismes` et `adherents` ;
- publication de la matrice d'environnements supportes et de la documentation d'installation associee ;
- publication de la matrice navigateurs supportes et du niveau d'accessibilite cible ;
- absence de defaut critique ouvert sur fuite de contexte, blocage comptable ou perte de tracabilite.
- pour le sous-domaine caisse/compta/Paheko : preuve documentee d'un lot de session complet, de sa reprise en cas d'echec et de l'absence de succes global implicite en cas d'application partielle cote `Paheko`.
- pour `config admin simple` : preuve documentee d'au moins un changement de configuration applique et trace sans intervention technique hors procedure.

---

## 14. Gouvernance contractuelle

### 14.1 Source de verite des schemas

Emplacement canonique des artefacts reviewables : repertoire `contracts/` a la racine du depot — `contracts/openapi/recyclique-api.yaml`, `contracts/creos/schemas/` (voir architecture BMAD et `contracts/README.md`). Les chemins historiques sous `_bmad-output` ne remplacent pas cette source pour le code et la CI cible.

**Note (PRD canonique)** : les chemins listes dans le frontmatter YAML `inputDocuments` servent la **tracabilite** des sources ayant nourri ce PRD ; une verification periodique que les fichiers existent encore (rename, deplacement) est **recommandee** lors des revues majeures, eventuellement en CI documentation legere si le projet l'adopte.

### 14.2 Versionnement

- Manifests CREOS : SemVer, aligne avec les conventions JARVOS.
- OpenAPI : versionne separement mais de facon coordonnee.
- Numero de compatibilite explicite dans chaque manifest (couple API/manifest ↔ version Peintre).

### 14.3 Breaking changes

- **Politique minimale v2 :** toute rupture de contrat `OpenAPI` ou `CREOS` doit etre annoncee explicitement, versionnee, accompagnee d'un impact note et d'un chemin de migration ou de compatibilite.
- **Propagation** vers les instances deployees (OSS et cloud) sans rupture silencieuse du rendu ou des parcours critiques.
- Pour le sous-domaine caisse/compta/Paheko, cette gouvernance devra aussi couvrir le **versionnement du lot de sync de session**, la pluralite d'identifiants distants eventuels et le traitement des succes partiels ou des reprises manuelles.

### 14.4 Validation CI

- Les contrats critiques doivent etre validables de maniere automatisable, de sorte qu'un manifest conforme sur le fond ne degrade pas silencieusement le rendu nominal attendu.

### 14.5 Definition of done contractuelle avant implementation large

Avant implementation large des modules v2, les points suivants doivent etre consideres comme closes :

- emplacement canonique des schemas defini ;
- regles de versionnement `OpenAPI` / `CREOS` fixees ;
- politique de breaking changes explicite ;
- schemas formels minimaux publies pour `ModuleManifest`, `WidgetDeclaration`, `SlotDefinition`, `ModuleAction` ;
- mecanisme automatise minimal disponible pour verifier la validite des schemas et la non-regression de rendu des manifests critiques.

---

## 15. Risques principaux

| Risque | Impact | Mitigation |
|--------|--------|-----------|
| Rater la modularite de base | Blocage de tous les modules metier | Prouver la chaine en petit (bandeau live) avant le grand (eco-organismes) |
| Sur-complexifier Peintre_nano / CREOS | Retard de sortie v2 | Profil de capacites minimal, pas de sur-architecture prematuree |
| Sous-estimer les invariants multi-contextes | Fuites de contexte, erreurs comptables | Stabiliser tot site/caisse/session/poste/role/PIN, spec dediee |
| Mal formaliser l'articulation terrain/compta/zone tampon | Ecarts de sync non recuperables | Contrat de sync explicite avec idempotence, retry, quarantaine |
| Laisser le champ legacy de paiement porte par la vente survivre comme referentiel reel | Clotures incoherentes et doubles verites | Basculer les calculs comptables sur le journal detaille des transactions de paiement avec transition encadree |
| Dupliquer la verite du sous-domaine entre PRD canonique et PRD specialises (migration Paheko **et** operations speciales) | Divergence documentaire et backlog ambigu | Garder ici un delta canonique mince ; detail comptable et sync vers `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` ; parcours terrain, tags et preuves vers `references/operations-speciales-recyclique/` ; trancher les chevauchements selon la **coexistence des deux PRD** (bloc lecture ci-dessus) |
| Ouvrir trop tot les sujets riches | Dilution du socle, dette strategique | Hors perimetre initial strictement delimite |
| Cout d'onboarding OSS de la separation Peintre/Recyclique | Barriere a la contribution communautaire | Documentation claire des contrats, exemples de manifests publics |
| Donnees existantes incompatibles avec la cible multi-sites | Rework massif du modele | Audit backend/API/donnees en amont de l'implementation |

---

## 16. Points encore a verrouiller avant architecture finale

Les points suivants sont des **verrous reels** — pas des questions ouvertes residuelles, mais des **prealables explicites** a l'architecture active. Chaque verrou est considere **clos** lorsque le **livrable nomme** (spec, contrat, schemas, mecanisme) est **approuve** en architecture / pilotage et reference dans les documents de suivi — ce statut est **distinct** de l'absence de lacune **redactionnelle** au niveau du present PRD canonique (§17) :

### 16.1 Contrat de synchronisation Recyclique / Paheko

A produire : matrice definitive `API / plugin minimal / SQL hors flux`, couvrant idempotence, retry, quarantaine, reconciliation, semantique de livraison, cles de correlation inter-systemes, versionnement des payloads, et traduction detaillee de la gouvernance minimale deja posee dans ce PRD.

Pour le sous-domaine caisse/compta/Paheko, ce contrat devra aussi figer :

- la source de verite comptable locale des paiements ;
- le role du **snapshot comptable fige de session** ;
- la granularite du **lot de synchronisation de session** ;
- la gestion de plusieurs sous-ecritures equilibrees pour une meme session ;
- la semantique de succes partiel, de reprise et de correlation commune.

### 16.2 Spec multi-contextes

A produire : granularite exacte `ressourcerie → site → caisse → session → poste`, regles d'isolation, mapping vers entites/emplacements Paheko, comportement en contexte incomplet, risques d'integrite connus dans la base active (notamment autour de `site_id`). Doit aussi couvrir : modele de roles definissables par ressourcerie, groupes, labels personnalisables, et leur interaction avec le calcul de permissions et les contextes de rendu.

### 16.3 Gouvernance contractuelle

A trancher : source canonique des schemas, articulation OpenAPI / schemas CREOS, politique de versionnement et de breaking changes, mecanisme de validation CI.

### 16.4 Schemas CREOS formels

Le profil CREOS minimal est conceptuellement fige. Il reste a produire les **schemas JSON formels** validables automatiquement pour `ModuleManifest`, `WidgetDeclaration`, `SlotDefinition`, `ModuleAction`.

### 16.5 Mecanisme de sync concret

A confirmer ou reviser : mecanisme de file durable, politique de reprise et semantique de livraison retenue pour la resilience de sync.

Le **mecanisme concret** ne change pas la decision produit de haut niveau : la cloture de caisse prepare un **lot de session** corrigeable et tracable vers `Paheko`. Le detail de transport reste de la responsabilite de l'architecture.

## 17. Statut des questions produit

Au sens **strictement redactionnel** de ce document canonique, il ne reste plus de **lacune** ni de **question produit bloquante non cadrée par renvoi** : les sujets encore **ouverts au niveau livrable** (contrat sync, spec multi-contextes, schemas CREOS formels, mecanisme de file, etc.) sont listes au **§16** et ferment par **livraison et approbation** des artefacts correspondants — ce que le §16 traite comme **verrous d'architecture**, pas comme « trous de redaction » du present PRD.

Les sujets **fonctionnels** encore evolutifs sur le canonique (ex. **niveau exact HelloAsso**, detail **sync** Paheko, **politique breaking changes**) restent **renvoyes** aux paragraphes de perimetre (SS 7, SS 14–16), au **PRD specialise** du `2026-04-15`, et aux **livrables d'architecture**.

Le **detail terrain** des operations speciales de caisse (annulation, remboursements types, tags, extension Paheko terrain) **n'est pas** « deja ferme » dans ce canonique : il est **porte** par le PRD `references/operations-speciales-recyclique/`, l'**Epic 24** et l'ADR operations speciales — sans contredire la distinction ci-dessus entre **cadrage narratif** (ce PRD) et **preuves livrees** (§16, stories).

Les points encore a **produire** pour passer a l'implementation relevent :

- de l'architecture et des specs techniques derivees ;
- des **verrous § 16** (contrat sync, multi-contextes, gouvernance contractuelle incluant breaking changes, schemas CREOS, mecanisme de sync) ;
- et du choix de mise en oeuvre concret des settings, du stockage de configuration et des mecanismes de synchronisation.

---

## Annexe A — Contradictions detectees dans les sources

**Périmètre de la revue :** alignment des documents **actifs** cites dans le frontmatter `inputDocuments` et des sources de verite nommees dans le corps (vision directrice, PRD specialises, architecture BMAD, `epics.md`) ; **non** exhaustive sur l'integralite du depot ni sur les archives.

Aucune contradiction bloquante n'a ete detectee entre ces sources sur les arbitrages centraux. Le point de vigilance principal concerne l'existence historique d'anciens recits dans le depot (strategie `Paheko = backend principal`, `caisse native Paheko`, etc.) qui restent en dehors du perimetre canonique actuel. Le document pivot `2026-03-31_decision-directrice-v2.md` fait foi.

**Relire ou mettre à jour cette annexe** lors d'un changement majeur de la vision directrice, d'un PRD specialise caisse, d'un correct course Paheko, ou de la promotion d'un **Epic** structurant (ex. cloture Epic 22–24) — pas a chaque story mineure.

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
| `Payment_methods` | Referentiel des moyens de paiement administrables et relies a leurs comptes comptables |
| `Payment_transactions` | Source de verite comptable locale des paiements et remboursements pour la cloture de session |
| `Snapshot comptable de session` | Etat fige de synthese comptable produit a la cloture avant emission vers `Paheko` |
| `Lot de sync de session` | Ensemble corrigeable et trace des sous-ecritures comptables preparees pour une meme cloture de session |
| `Cashflow` | Parcours passage en caisse |
| `Reception flow` | Parcours reception de marchandise |
| `Bandeau live` | Module d'affichage temps reel servant de preuve modulaire |
| `Config admin simple` | Pilotage minimal du shell et des modules (activation, ordre, variantes) |

---

## Annexe C — Index de tracabilite des exigences (renvoi epics)

Les **identifiants stables** des exigences fonctionnelles **FR1 a FR73** et non fonctionnelles **NFR1 a NFR28** sont definis dans l'inventaire du fichier **`_bmad-output/planning-artifacts/epics.md`** (sections *Functional Requirements* et *NonFunctional Requirements*). Ce PRD en est la source narrative ; l'inventaire epics fait foi pour les **ID machine** et le decoupage story.

**Note de lecture :** les numerotations de sections du PRD (ex. `§9.7`, `§9.8`) sont des **identifiants de section documentaire** ; elles ne designent pas des numéros de story ou d'epic et ne doivent pas etre lues comme tels.

| Zone thematique dans ce PRD | ID stables (epics.md) |
|-----------------------------|------------------------|
| SS 2 Vision, SS 2.3 brownfield, SS 3 Repartition des roles | FR1 a FR10 |
| SS 4 Invariants non negociables | FR11 a FR22 |
| SS 5 Double flux | FR23 a FR30 |
| SS 6 Utilisateurs, roles, labels, groupes | FR31 a FR36 |
| SS 7 Perimetre fonctionnel v2 (modules, sync, multi-sites, admin, HelloAsso, delta canonique caisse/compta/Paheko) | FR37 a FR47 |
| SS 8 Profil CREOS, SS 8.8 Emission / consommation | FR48 a FR54 |
| SS 9 Parcours et flows critiques | FR55 a FR60 |
| SS 10 Matrice fallback / blocage / donnees widget | FR61 a FR70 |
| SS 11.2 Securite, SS 11.3 Tracabilite (exigences fonctionnelles associees) | FR71, FR72 |
| SS 14.5 Definition of done contractuelle | FR73 |
| SS 11 Exigences non fonctionnelles (synthese) | NFR1 a NFR28 |

**Usage pour les stories :** chaque story peut pointer vers une **plage de sections PRD** (ex. SS 9.1 + SS 10.x) et vers les **FR/NFR** correspondants dans `epics.md`, comme recommande par le rapport de validation du PRD. Les parcours `§9.7` et `§9.8` se lisent conjointement avec `§11.5` et `§13.2` pour justifier respectivement la preuve de `config admin simple` et celle d'`installation open source`. Pour le sous-domaine caisse/compta/Paheko, le present PRD fournit le **cadre canonique** ; le detail operatoire renvoie au PRD specialise `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md`.

**Epic 24 — operations speciales :** le decoupage BMAD et les stories sont dans `_bmad-output/planning-artifacts/epics.md` (Epic 24). La trace produit detaillee est dans `references/operations-speciales-recyclique/2026-04-18_prd-recyclique-operations-speciales-sorties-matiere-paheko_v1-1.md` ; les decisions d'architecture dans `_bmad-output/planning-artifacts/architecture/2026-04-18-adr-operations-speciales-caisse-paheko-v1.md`.
