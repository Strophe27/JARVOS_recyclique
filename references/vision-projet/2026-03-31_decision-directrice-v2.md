# Decision directrice v2

**Statut** : Document pivot de cadrage v2  
**Date** : 2026-03-31  
**Source principale** : `_bmad-output/brainstorming/brainstorming-session-2026-03-31-195824.md`  
**Documents relies** : `.cursor/plans/cadrage-v2-global_c2cc7c6d.plan.md`, `.cursor/plans/separation-peintre-recyclique_4777808d.plan.md`, `.cursor/plans/profil-creos-minimal_6cf1006d.plan.md`, `references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md`

---

## Role du document

Ce document sert de **pont** entre le brainstorming clos et la suite BMAD operationnelle.

Il ne remplace pas le futur Brief, le PRD ou l'architecture detaillee. Il fixe la **ligne directrice v2** qui doit rester stable pendant la relance BMAD, sauf si un audit reel impose une correction explicite.

---

## Decision centrale

La v2 de JARVOS Recyclique est une **evolution brownfield** a partir de `recyclique-1.4.4`, pas une refonte from scratch.

La ligne directrice retenue est :

- `Recyclique` = noyau metier, contrats backend, contexte, resilience, sync, historique terrain.
- `Paheko` = autorite comptable officielle du **flux financier**.
- `Peintre_nano` = moteur integral de composition de **toute l'UI v2**.
- `CREOS` = grammaire commune minimale des declarations UI.

La v2 doit etre **production-ready** au sens fort :

- vendable ;
- installable simplement en open source ;
- utilisable reellement en production ;
- assez propre pour ouvrir une dynamique communautaire ;
- assez solide pour ne pas laisser une dette strategique majeure juste apres la sortie.

---

## Ce que signifie v2 production-ready

La reussite v2 ne se mesure pas d'abord a la richesse immediate des fonctions ou a la sophistication du moteur UI.

Elle se mesure d'abord a :

- la **fiabilite terrain** ;
- la **justesse comptable** ;
- la **resilience** ;
- la **modularite reelle de bout en bout**.

La v2 doit donc garantir :

- des parcours terrain critiques fiables ;
- une articulation propre avec `Paheko` ;
- une UI integralement portee par `Peintre_nano`, mais avec un **profil de capacites minimal** au depart ;
- un socle de donnees, contextes et contrats assez propre pour supporter la suite du projet.

---

## Repartition des roles systeme

### Recyclique

`Recyclique` porte :

- les workflows terrain ;
- la logique metier ;
- les contrats backend ;
- les permissions et contextes ;
- la resilience operationnelle ;
- la zone tampon / journalisation de sync ;
- la verite principale du **flux matiere** ;
- l'historique exploitable pour rejeu et analyse.

### Paheko

`Paheko` porte :

- la verite comptable officielle ;
- les classifications et contraintes du **flux financier** sur leur perimetre ;
- l'autorite finale pour la comptabilite.

### Peintre_nano

`Peintre_nano` porte :

- le shell UI ;
- les slots ;
- le registre de modules ;
- les widgets ;
- le rendu de flows declaratifs ;
- les raccourcis et actions declaratives ;
- les fallbacks visuels et la reaction runtime aux contrats invalides.

### CREOS

`CREOS` porte :

- la grammaire commune des manifests, actions, widgets, flows et etats minimaux ;
- la base contractuelle commune entre `Recyclique` et `Peintre_nano`.

---

## Invariants non negociables

### Contexte avant ecran

Le contexte est plus fondamental que l'ecran.

Le minimum a stabiliser tot est :

- `site`
- `caisse`
- `session`
- `poste de reception`
- `role`
- `permissions`
- `PIN` et validations sensibles selon le cas

Si le contexte est ambigu ou incomplet :

- rechargement / recalcul explicite ;
- mode degrade ou restreint explicite ;
- revalidation si necessaire ;
- la securite gagne sur la fluidite.

### Modularite de bout en bout

Un module n'est pas considere comme modulaire parce qu'il affiche un ecran.

Il n'est considere comme modulaire que si la chaine complete existe :

- contrat metier ;
- recepteur backend ;
- contrat UI ;
- runtime frontend ;
- permissions / contexte ;
- fallback / audit / feedback.

### Robustesse et explicabilite

Les contrats invalides, widgets non rendables ou flows incomplets doivent produire :

- un fallback visible ou un blocage selon la criticite ;
- une journalisation ;
- un retour d'information exploitable ;
- la possibilite de correction et de nouvelle tentative.

### Donnee exploitable

La donnee v2 doit etre pensee des le depart pour :

- execution ;
- historicisation ;
- rejeu ;
- analyse ;
- correlations futures.

Le niveau actuel d'historique constitue un **minimum**, pas une cible suffisante.

---

## Double flux a articuler

### Flux financier

Lecture retenue :

- `Paheko` = verite comptable finale ;
- `Recyclique` = terrain + zone tampon + synchronisation.

### Flux matiere

Lecture retenue :

- `Recyclique` = verite principale.

### Consequence

La v2 doit articuler proprement ces deux flux sans les confondre.

Elle doit permettre :

- le fonctionnement quotidien ;
- la reconciliation ;
- l'historique ;
- les futures lectures analytiques ;
- les declarations eco-organismes.

---

## Ce que v2 doit livrer en minimum credible

### Cote UI / Peintre

Toute l'UI v2 passe par `Peintre_nano`, mais les capacites initiales restent minimales :

- shell ;
- slots ;
- widgets ;
- contrats d'affichage ;
- actions declaratives ;
- raccourcis declaratifs ;
- flows simples ;
- fallback / journalisation ;
- gestion des droits et contextes.

Ne sont pas des prerequis v2 :

- personnalisation riche ;
- editeur convivial de flows ;
- pilotage agentique riche ;
- interfaces analytiques avancees.

### Cote metier

Capacites non negociables confirmees :

- declaration eco-organismes ;
- synchronisation avec `Paheko` ;
- gestion minimum benevoles / adhesions ;
- integration `HelloAsso` ;
- architecture modulaire et modulable.

---

## Sequence de travail retenue

La sequence recommandee est une **preference forte**, reexaminable si les audits reels imposent autre chose.

1. Audit backend / API / donnees.
2. Retro-engineering `Paheko` sur donnees reelles.
3. Spec multi-sites / multi-caisses / postes de reception.
4. Figer `CREOS` minimal et les contrats UI minimaux.
5. Construire le runtime minimal `Peintre_nano`.
6. Prouver la chaine modulaire sur **`bandeau live`**.
7. Prouver les flows terrain critiques :
   - `cashflow`
   - `reception flow`
8. Engager le premier grand module metier :
   - `eco-organismes`
9. Ouvrir ensuite les chantiers paralleles :
   - config admin simple ;
   - `adherents` / vie associative minimale ;
   - autres modules.

Si `bandeau live` ne prouve pas la chaine :

- il faut corriger la chaine avant d'aller plus loin.

Si un audit contredit le plan :

- il faut arbitrer au cas par cas ;
- corriger le plan si necessaire ;
- ne pas forcer la realite a rentrer dans un schema faux.

---

## Ce qui est stable tot, ajustable ensuite, ou laisse ouvert

### Doit etre stabilise tot

- noyau du modele de donnees / historique ;
- contextes et permissions ;
- lieux de verite ;
- contrats minimaux `CREOS` / `Peintre_nano` ;
- regles de securite, fallback, blocage, audit.

### Peut etre ajuste apres premiers tests

- variantes d'affichage ;
- ordre de certains blocs ;
- une partie des raccourcis ;
- certains mappings super-admin ;
- details de flows non critiques.

### Doit rester ouvert plus longtemps

- edition admin riche ;
- editeur convivial de flows ;
- personnalisation avancee ;
- pilotage agentique riche ;
- interfaces analytiques avancees.

---

## Configuration et super-admin

La `config admin simple` ne designe pas un grand panneau admin metier.

Elle designe un pilotage minimal du shell et des modules, par exemple :

- activation / desactivation ;
- ordre de certains blocs ;
- variantes simples ;
- aide ou overlay de raccourcis.

Les mappings sensibles doivent rester reserves a un niveau **super-admin / expert**, avec forte tracabilite.

Ils pourront etre portes par des fichiers ou supports de configuration structures (`TOML`, `YAML`, `JSON`, etc.), avec ouverture future a une assistance admin plus riche, y compris agentique, mais pas comme prerequis immediat.

---

## Destination de cette decision

Ce document sert maintenant de base pour choisir la suite BMAD.

La suite recommandee est :

1. utiliser cette decision comme **source de verite de cadrage** ;
2. produire un artefact BMAD suivant propre (brief ou equivalent) ;
3. enchainer ensuite vers PRD, architecture et epics sur cette base ;
4. garder les audits et etudes comme entrees structurantes, pas comme annexes oubliees.

---

## Resume ultra-court

La v2 de Recyclique doit rester un brownfield rigoureux :

- `Recyclique` porte le metier vivant ;
- `Paheko` porte la verite comptable ;
- `Peintre_nano` porte toute l'UI ;
- `CREOS` porte la grammaire contractuelle ;
- et la priorite absolue est de prouver un socle fiable, modulaire, traçable et exploitable avant d'ouvrir les capacites plus riches.
