# Sprint Change Proposal — Rebaseline caisse/compta/Paheko

Date: 2026-04-15
Mode: Batch
Statut: Approved
Approbation utilisateur: yes

## 1. Issue Summary

### Déclencheur validé

Le plan BMAD actif considère la partie caisse/compta/Paheko comme déjà cadrée et en grande partie exécutée via les Epics 6 et 8, alors que le nouveau PRD `references/migration-paheko/2026-04-15_prd-recyclique-caisse-compta-paheko.md` introduit une refonte plus précise et plus large sur :

- le modèle des moyens de paiement ;
- la source de vérité comptable (`payment_transactions`) ;
- les paiements mixtes ;
- les dons en caisse ;
- la gratuité ;
- les remboursements, y compris sur exercice antérieur clos ;
- le snapshot comptable figé à la clôture ;
- la construction des écritures avancées multi-lignes Paheko ;
- le paramétrage SuperAdmin comptable.

### Nature du changement

- Nouvelle exigence métier structurante apparue après un premier cycle d'implémentation.
- Pas un bug isolé dans une story unique.
- Le point de friction principal est le handoff historique `Epic 6 -> Epic 8` :
  - `Epic 6` livre une caisse localement exploitable ;
  - `Epic 8` livre la dorsale outbox/sync/réconciliation ;
  - le nouveau PRD ajoute maintenant la couche métier/comptable fine qui n'est ni pleinement dans l'un, ni pleinement dans l'autre.

### Evidence

- Le PRD actif `_bmad-output/planning-artifacts/prd.md` reste volontairement générique sur la clôture, la sync et les écritures Paheko.
- `Epic 8` et ses stories `8.1` à `8.7` couvrent surtout la fiabilité de sync, l'outbox, les mappings, la quarantaine, la corrélation et la réconciliation réelle.
- `Story 6.4` couvre le remboursement local, mais avec un cadrage beaucoup plus borné que le nouveau PRD du 15/04.
- `Story 6.7` couvre la clôture locale exploitable, sans snapshot comptable figé ni règles comptables détaillées par moyen de paiement.
- `Story 9.6` couvre la `config admin simple`, alors que le nouveau PRD demande du paramétrage expert/super-admin comptable, plus sensible que le périmètre "simple admin".
- La version révisée du PRD a déjà corrigé plusieurs points techniques utiles au pilotage :
  - remboursement sur exercice antérieur clos orienté vers un compte configurable, candidat par défaut `672`, avec validation expert-comptable ;
  - stratégie recommandée de plusieurs transactions équilibrées par session côté Paheko plutôt qu'une seule écriture monolithique ;
  - plan de migration déjà structuré en préparation / double lecture / bascule définitive.

## 2. Impact Analysis

### 2.1 Epic impact

#### Epic 6

Impact: partiel mais réel.

Ce qui reste valide :

- workflow caisse brownfield-first ;
- remboursement local contrôlé ;
- clôture locale exploitable ;
- UI honnête sur local vs sync différée ;
- exploitabilité terrain générale.

Ce qui devient insuffisant :

- remboursement borné au cas simple ;
- absence de modèle comptable explicite pour paiements mixtes, dons caisse, gratuité, N-1 ;
- clôture calculée sans notion canonique de snapshot comptable figé ;
- agrégats insuffisants pour générer l'écriture Paheko cible.

Conclusion :

- ne pas rollback Epic 6 ;
- ne pas réécrire l'histoire de ses stories done ;
- ajouter un backlog correctif qui étend la caisse existante vers une sémantique comptable plus exacte.

#### Epic 8

Impact: fort.

Ce qui reste valide :

- outbox durable ;
- idempotence / retries ;
- mappings ;
- quarantaine ;
- corrélation ;
- blocage sélectif ;
- preuve de sync/réconciliation réelle sur un slice clôture.

Ce qui devient insuffisant :

- le payload syncé n'est plus seulement un "slice clôture" ; il doit devenir le résultat d'un snapshot comptable structuré ;
- les règles métier/comptables détaillées ne sont pas encore décrites au niveau du backlog actif ;
- la génération d'écriture avancée multi-lignes Paheko doit être explicitement backloggée ;
- la vérité comptable locale doit être clarifiée avant de parler de "réconciliation réelle" sur tout le périmètre.

Conclusion :

- ne pas rollback Epic 8 ;
- conserver Epic 8 comme fondation transport/fiabilité ;
- ajouter un backlog correctif métier/comptable au-dessus de cette fondation.

#### Epic 9

Impact: limité mais important de frontière.

`Story 9.6` ne doit pas absorber ce sujet :

- le PRD du 15/04 demande du paramétrage comptable sensible ;
- `Epic 9` vise la config admin simple, pas un plan de contrôle expert comptable ;
- ces écrans demandent plus de traçabilité, de validations et de garde-fous que le périmètre 9.6.

Conclusion :

- ne pas déplacer ce besoin vers 9.6 ;
- traiter le paramétrage comptable comme un sous-domaine dédié du correct course.

#### Epic 10

Impact: fort sur les gates, même si l'epic ne porte pas le métier.

Ce qui reste valide :

- industrialisation, CI, readiness, observabilité.

Ce qui devient insuffisant :

- certaines preuves historiques `6.x` / `8.x` ne suffisent plus à certifier la cible produit du 15/04 ;
- les gates release peuvent rester "verts" sur une sémantique comptable devenue partielle.

Conclusion :

- ne pas rouvrir le périmètre fonctionnel d'Epic 10 ;
- ajouter une re-baseline qualité explicite avant toute nouvelle certification.

#### Epic 13

Impact: fort tant que l'epic reste en cours.

Ce que l'epic porte :

- parité observable de surfaces caisse `Peintre_nano`, dont la clôture et le hub caisse.

Risque :

- continuer le portage/parité UI sur une baseline métier caisse devenue obsolète au regard du nouveau PRD.

Conclusion :

- geler toute extension de parité caisse qui présuppose la sémantique actuelle de clôture / remboursement tant que le nouvel epic correctif n'a pas clarifié la cible ;
- n'autoriser que les travaux strictement compatibles avec une couche de transition documentée.

#### Epic 14 et Epic 18

Impact: partiel mais réel.

Ce que ces epics portent :

- surfaces admin observables et supervision des sessions / cash sessions.

Risque :

- les écrans de supervision et de paramétrage peuvent figer des concepts de session, de clôture ou de réglage admin qui ne reflètent plus le futur modèle comptable canonique.

Conclusion :

- préserver les livrables existants ;
- empêcher de nouveaux slices UI/admin de faire autorité sur le modèle comptable avant cadrage du nouvel epic correctif.

#### Epic 16

Impact: dépendance structurante, pas epic à rouvrir.

Ce que l'epic apporte :

- chaînes d'autorité super-admin, step-up et audit explicites sur les surfaces sensibles, notamment `Story 16.3`.

Conclusion :

- le futur paramétrage comptable sensible doit explicitement réutiliser les garde-fous de `16.3` ;
- ne pas redéfinir une sécurité admin parallèle dans le nouvel epic correctif.

### 2.2 Artifact conflicts

#### PRD canonique BMAD

Conflit :

- `prd.md` dit déjà "sync Paheko", "clôture", "cashflow", mais sans fixer la nouvelle granularité comptable opératoire du PRD du 15/04.

Impact :

- le PRD canonique doit absorber ou référencer explicitement :
  - `payment_transactions` comme source de vérité ;
  - `payment_methods` ;
  - snapshot comptable de session ;
  - règles mixtes / dons / gratuité / remboursements ;
  - écriture multi-lignes Paheko ;
  - distinction réglages simple-admin vs expert/super-admin.

#### Epics

Conflit :

- les stories Epic 6 / 8 racontent correctement le premier périmètre livré, mais plus le périmètre cible actualisé.

Impact :

- il faut ajouter un nouvel epic correctif au lieu de réécrire les stories done comme si elles avaient toujours porté ce nouveau scope.

#### Architecture

Conflit :

- l'architecture parle d'outbox durable et de sync, mais pas encore d'un pipeline explicite :
  - `payment_methods` -> `payment_transactions` -> snapshot comptable figé -> entry builder Paheko -> outbox.
- le PRD corrigé recommande plusieurs transactions équilibrées par session côté Paheko, alors que la sémantique de sync historique reste formulée au singulier.

Impact :

- ajouter une note ou ADR d'architecture ciblée sur la chaîne comptable caisse/Paheko.
- figer l'unité canonique de sync avant implémentation large.

#### UX / UI

Conflit :

- les flows caisse et admin ne couvrent pas encore la complexité UX du nouveau PRD :
  - paiements multi-lignes ;
  - don en surplus ;
  - gratuité ;
  - remboursement N-1 ;
  - écrans de paramétrage comptable expert.

Impact :

- prévoir un lot UX/produit explicite dans le backlog correctif.

#### Gouvernance backlog

Point de vigilance :

- la numérotation active du backlog s'étend déjà au-delà des epics 1 à 10, jusqu'à `Epic 21`, avec coexistence d'epics fondation, portage UI et backlog complémentaire.

Impact :

- le prochain `CE` doit s'insérer proprement dans cette numérotation et expliciter les dépendances vers les epics déjà en cours (`10`, `13`, `14`) ou récemment livrés (`16`, `18`) ;
- éviter de traiter `Epic 22` comme un simple appendice isolé alors qu'il rebase des hypothèses exploitées ailleurs.

## 3. Path Forward Evaluation

### Option 1 — Direct adjustment

Viabilité: Oui
Effort: Medium/High
Risque: Medium

Lecture :

- possible si on accepte de traiter les livrables existants comme fondations ;
- insuffisant si on se contente de retoucher deux ou trois stories ;
- viable seulement sous forme de rebaselining explicite avec nouvel epic correctif.

### Option 2 — Rollback

Viabilité: Non recommandée
Effort: High
Risque: High

Pourquoi non :

- la dorsale Epic 8 reste utile ;
- la caisse Epic 6 reste utile ;
- rollback détruirait de la valeur acquise sans résoudre le besoin métier/comptable.

### Option 3 — PRD MVP review

Viabilité: Partielle
Effort: Low/Medium
Risque: Medium

Lecture :

- utile pour phaser la livraison ;
- inutile si elle sert à évacuer la justesse comptable demandée ;
- pertinente seulement pour séquencer le correctif en lots.

### Recommandation

Approche retenue: Hybrid

- garder les Epics 6 et 8 comme fondations historiques et techniques ;
- geler ou borner les epics UI/admin déjà en cours dès qu'ils touchent la sémantique caisse/compta révisée ;
- mettre à jour le PRD canonique ;
- produire une courte mise à jour d'architecture ;
- créer un nouvel epic correctif dédié à la refonte caisse/compta/Paheko ;
- rebaseliner explicitement les preuves qualité et les gates de release ;
- phaser ce nouvel epic pour livrer d'abord la justesse comptable minimale, puis le confort admin/UX.
- retenir comme hypothèse de travail par défaut : **1 message outbox idempotent par session**, contenant **N sous-écritures déterministes** vers Paheko, avec corrélation commune, index stable par sous-écriture et statut de batch explicite en cas de succès partiel.

Rationale :

- minimise le rework ;
- évite de falsifier l'historique des stories done ;
- garde la traçabilité entre "premier slice syncable" et "modèle comptable cible complet" ;
- évite que les epics UI/admin continuent à dériver sur une vérité métier obsolète ;
- produit un backlog plus honnête et plus pilotable.

## 4. Detailed Change Proposals

### 4.1 PRD modifications

#### Proposal PRD-1

Artifact: `_bmad-output/planning-artifacts/prd.md`
Section: `cashflow`, `clôture`, `Synchronisation Paheko`, `config admin`

OLD:

- le PRD canonique décrit la clôture locale, la sync Paheko, la zone tampon et les flows caisse ;
- il ne fixe pas encore le modèle détaillé des moyens de paiement, la source de vérité comptable, le snapshot figé, ni les règles détaillées de remboursement/don/gratuité.

NEW:

- intégrer les décisions du PRD du 15/04 comme extension canonique du périmètre caisse/compta/Paheko ;
- ajouter explicitement :
  - `payment_transactions` source de vérité ;
  - `payment_methods` + comptes comptables associés ;
  - `free` = vente à 0 EUR, pas moyen de paiement ;
  - paiements mixtes ;
  - don en caisse distinct du paiement ;
- remboursement standard vs remboursement sur exercice antérieur clos ;
  - snapshot comptable figé de session ;
- génération d'une ou plusieurs écritures Paheko multi-lignes équilibrées selon la stratégie retenue ;
  - paramétrage comptable expert séparé de la config admin simple.

Rationale:

- c'est la condition pour que le backlog correctif ne flotte pas sur un document canonique devenu trop générique.

### 4.2 Architecture modifications

#### Proposal ARCH-1

Artifact: `_bmad-output/planning-artifacts/architecture/`

OLD:

- architecture centrée sur outbox durable, sync at-least-once, mapping, corrélation.

NEW:

- ajouter un delta d'architecture décrivant la chaîne :
  - `payment_methods`
  - `payment_transactions`
  - `cash_session_accounting_snapshot`
  - `paheko_entry_builder`
  - `paheko_outbox`
- figer la granularité canonique de sync :
  - **1 message outbox par session clôturée**
  - payload contenant **N sous-écritures déterministes** (`transaction 1`, `transaction 2`, `transaction 3`, etc.)
  - **1 corrélation de batch** + **1 index stable par sous-écriture**
  - persistance de **N identifiants Paheko** côté Recyclique, pas d'unique `transaction_id` au singulier
  - état explicite si succès partiel (`partial_synced` ou équivalent contractuel à définir)
- préciser versioning payload, migration brownfield, compat legacy `sales.payment_method`, et séparation entre:
  - calcul comptable local ;
  - transport outbox ;
  - intégration Paheko.
- préciser aussi la source d'autorité pour `accounting_period_closed`, sa fraîcheur acceptable, son cache local éventuel et le fallback opératoire si `Paheko` n'est pas joignable lors d'un remboursement sur exercice antérieur clos.

Rationale:

- évite que le calcul métier/comptable soit réabsorbé implicitement dans le transport outbox.

### 4.3 Epic strategy

#### Proposal EPIC-1

Artifact: `_bmad-output/planning-artifacts/epics.md`

OLD:

- Epic 6 = caisse exploitable localement
- Epic 8 = articulation comptable réelle avec Paheko
- Epic 9.6 = config admin simple

NEW:

- conserver Epic 6 et Epic 8 comme "fondations livrées" ;
- ajouter un nouvel epic correctif, recommandé: `Epic 22` si la numérotation courante est conservée après `21`.
- documenter explicitement ses dépendances et frontières avec `Epic 10`, `Epic 13`, `Epic 14`, `Epic 16` et `Epic 18`.

Nom recommandé :

`Epic 22: Rebaseliner la caisse/compta/Paheko sur un modèle comptable canonique`

Résumé recommandé :

"Les responsables et super-admins peuvent utiliser une caisse dont les paiements, dons, gratuités, remboursements, clôtures et écritures Paheko reposent sur un modèle comptable canonique, traçable et paramétrable, sans remettre en cause la fondation outbox/sync déjà livrée."

Rationale:

- meilleur compromis entre honnêteté historique et pilotage exécutable.

### 4.4 Proposed new stories

#### Story 22.1

Titre:

`Préparer le schéma comptable cible, le backfill et la compatibilité brownfield`

But:

- créer `payment_methods` ;
- enrichir `payment_transactions` ;
- backfiller l'historique minimal nécessaire ;
- définir les règles pour sessions ouvertes, historiques et rollback technique.

#### Story 22.2

Titre:

`Exécuter la double lecture, comparer les agrégats et piloter la bascule hors legacy`

But:

- faire coexister ancien et nouveau calcul le temps de la transition ;
- comparer les agrégats legacy vs nouveaux ;
- définir la règle de cutover et les critères de sortie.

#### Story 22.3

Titre:

`Livrer le paramétrage expert des moyens de paiement et des comptes globaux`

But:

- écran SuperAdmin moyens de paiement ;
- écran comptabilité caisse ;
- audit, step-up et validations fortes réutilisant la fondation `16.3`.

#### Story 22.4

Titre:

`Rebaseliner les parcours caisse pour paiements mixtes, don en surplus et gratuité`

But:

- adapter le flow caisse ;
- conserver UX terrain simple ;
- produire des transactions locales comptablement exploitables.

#### Story 22.5

Titre:

`Étendre le remboursement au modèle comptable cible et verrouiller l'autorité exercice antérieur clos`

But:

- distinguer `original_payment_method` / `refund_payment_method` ;
- gérer exercice courant vs exercice antérieur clos ;
- verrouiller la source d'autorité et le fallback opératoire pour `accounting_period_closed`.

#### Story 22.6

Titre:

`Construire le snapshot comptable figé de clôture de session`

But:

- calculer ventes, dons, remboursements, écarts ;
- interdire le recalcul mouvant après clôture ;
- figer le payload métier.

#### Story 22.7

Titre:

`Générer les écritures avancées multi-lignes Paheko et adapter la sync Epic 8`

But:

- builder une ou plusieurs transactions équilibrées par session selon la stratégie retenue ;
- encapsuler ces sous-écritures dans **un batch outbox idempotent par session** ;
- brancher outbox/processor existants sur le snapshot et les écritures ;
- préserver idempotence, corrélation, quarantaine, blocage sélectif ;
- définir le traitement d'un succès partiel et la trace des identifiants distants multiples.

#### Story 22.8

Titre:

`Rebaseliner les preuves qualité et valider bout en bout la chaîne caisse -> snapshot -> écriture -> Paheko`

But:

- invalider explicitement les anciennes preuves devenues insuffisantes ;
- redéfinir les DoD impactées et les gates de release ;
- tests ciblés ;
- preuve locale + réelle ;
- baseline d'exploitation claire.

### 4.5 Story changes to existing delivered backlog

#### Proposal STORY-1

Artifact: Epic 6 / Story 6.4

OLD:

- remboursement local sous contrôle, scope borné, pas de compta finale détaillée.

NEW:

- ne pas réécrire la story 6.4 ;
- ajouter dans le nouvel epic une extension explicite "22.5" qui prend le relais du point de vue comptable.

Rationale:

- protège l'historique done et évite un faux récit rétrospectif.

#### Proposal STORY-2

Artifact: Epic 6 / Story 6.7

OLD:

- clôture locale exploitable, sans promesse comptable finale.

NEW:

- ne pas réécrire la story 6.7 ;
- ajouter dans le nouvel epic une story 22.6 qui transforme la clôture locale en clôture comptablement canonique.

Rationale:

- cohérent avec le handoff original 6 -> 8, tout en comblant le delta métier maintenant explicité.

#### Proposal STORY-3

Artifact: Epic 8 / Stories 8.1–8.7

OLD:

- fondation sync/reconciliation sur un slice clôture.

NEW:

- ajouter une note epic-level indiquant que ces stories fournissent la fondation transport/fiabilité ;
- le calcul comptable canonique des payloads est désormais porté par l'epic correctif.

Rationale:

- évite de sur-promettre ce que 8.x couvre réellement.

#### Proposal STORY-4

Artifact: Epics 13 / 14 / 18

OLD:

- poursuite de slices UI/admin sur la baseline caisse/session en vigueur.

NEW:

- ajouter une note de pilotage précisant :
  - `13.8` : **finish-only si compatible transition** ; aucun élargissement de scope, aucune nouvelle vérité comptable embarquée ; si la review exige une décision sur clôture/compta, alors **pause** et reroutage vers le nouvel epic correctif ;
  - `14.3`, `14.4`, `14.5` : **pause par défaut** pour tout ce qui toucherait réglages sensibles, supervision session ou sémantique comptable ; reprise possible uniquement sur aspects purement observables/transverses explicitement notés "compatibles transition" ;
  - `Epic 18` : **ne pas rouvrir** ; conserver les livrables `done` comme preuves historiques de supervision UI, mais **ne pas** les considérer comme autorité sur la future sémantique comptable ;
  - toute nouvelle story liée à clôture, détail session, cash sessions ou paramétrage admin sensible doit dépendre du nouvel epic correctif ou s'annoncer explicitement "compatible transition".

Rationale:

- évite un rework UI/admin silencieux pendant que la fondation métier change.

## 5. MVP Impact and Action Plan

### MVP impact

Le MVP n'est pas à redéfinir, mais il doit être rephasé.

Lecture recommandée :

- garder comme MVP correctif la justesse comptable minimale sur la caisse et la clôture ;
- repousser les raffinements non indispensables si besoin ;
- ne pas repousser la source de vérité comptable ni le snapshot figé, car ce sont désormais des fondations, pas des finitions.

### High-level action plan

1. Geler ou borner les travaux `Epic 13` / `14` / `18` qui supposent la sémantique comptable actuelle.
2. `EP` — intégrer le PRD du 15/04 dans le PRD canonique BMAD.
3. `CA` — produire un delta d'architecture sur la chaîne comptable caisse/Paheko, y compris l'autorité `N-1` et l'unité canonique de sync batch.
4. `CE` — créer l'epic correctif et ses stories.
5. Rebaseliner les DoD et gates qualité touchées, notamment côté `Epic 10`.
6. Mettre à jour `sprint-status.yaml` avec décisions explicites :
   - `13.8` = `finish-only si compatible transition`, sinon `pause`
   - `14.3`, `14.4`, `14.5` = `pause` jusqu'à cadrage du nouvel epic correctif
   - `Epic 18` = inchangé, `done`, non autoritatif sur la future sémantique comptable
   - insertion du nouvel epic et de ses dépendances
7. `IR` — vérifier l'alignement final avant reprise de delivery.

### Re-baseline qualité

À expliciter dans le prochain lot de travail :

- quelles preuves `6.x` et `8.x` restent valides comme fondation ;
- quelles preuves deviennent insuffisantes pour la cible produit du 15/04 ;
- quels tests ou validations E2E deviennent désormais obligatoires pour certifier la chaîne :
  - caisse ;
  - snapshot ;
  - écriture ;
  - transmission batch Paheko ;
  - supervision/admin associée.

## 6. Scope Classification and Handoff

### Classification

Major

Pourquoi :

- impact multi-artifacts ;
- changement de modèle de données ;
- impact backlog ;
- impact UX et admin ;
- impact PRD canonique et architecture.

### Handoff recipients

- PM / John :
  - intégrer les décisions produit dans le PRD canonique ;
  - arbitrer le phasage MVP correctif.
- Architect / Winston :
  - formaliser la chaîne comptable canonique ;
  - verrouiller migration, payload, versioning, SoT.
- Scrum Master / Bob :
  - expliciter les freezes et dépendances sur `Epic 10`, `13`, `14`, `18` ;
  - insérer le nouvel epic sans créer de collision de pilotage.
- PM / John via `CE` :
  - créer l'epic correctif et les stories.
- Dev / Amelia ensuite :
  - implémenter story par story.

## 7. Checklist Status Summary

- 1. Trigger and context: Done
- 2. Epic impact assessment: Done
- 3. Artifact conflict analysis: Done
- 4. Path forward evaluation: Done
- 5. Sprint change proposal components: Done
- 6. Approval pending: Done
- 6.4 Update `sprint-status.yaml`: Action-needed, avec freezes/dépendances explicites

## 8. Recommended Next Step

Si cette proposition est approuvée :

1. lancer `EP` pour intégrer le PRD du 15/04 dans le corpus canonique ;
2. lancer `CA` pour le delta architecture ;
3. lancer `CE` pour générer le nouvel epic correctif ;
4. formaliser les freezes/dépendances sur les epics UI/admin impactés ;
5. seulement ensuite mettre à jour `sprint-status.yaml`.
