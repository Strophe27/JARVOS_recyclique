---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments:
  - references/vision-projet/2026-03-31_decision-directrice-v2.md
  - .cursor/plans/cadrage-v2-global_c2cc7c6d.plan.md
  - .cursor/plans/separation-peintre-recyclique_4777808d.plan.md
  - .cursor/plans/profil-creos-minimal_6cf1006d.plan.md
  - references/vision-projet/2026-03-31_peintre-nano-concept-architectural.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-31-195824.md
date: 2026-03-31
author: Strophe
source_of_truth: references/vision-projet/2026-03-31_decision-directrice-v2.md
---

# Product Brief: JARVOS Recyclique v2

## Executive Summary

JARVOS Recyclique v2 est une evolution brownfield de `recyclique-1.4.4`, pas une refonte from scratch. L'objectif est de produire une v2 vendable, installable simplement en open source, exploitable en production par des ressourceries, et suffisamment propre pour soutenir la suite du projet sans dette strategique majeure immediate.

La ligne directrice retenue est stable :

- `Recyclique` porte le noyau metier, les contrats backend, les contextes, la resilience, l'historique terrain et la synchronisation.
- `Paheko` est l'autorite comptable officielle du flux financier.
- `Peintre_nano` est le moteur integral de toute l'UI v2.
- `CREOS` est la grammaire commune minimale des declarations UI.

La v2 doit articuler proprement deux flux distincts :

- **flux financier** : `Paheko` = verite comptable finale, `Recyclique` = terrain + zone tampon + synchronisation ;
- **flux matiere** : `Recyclique` = verite principale.

Le succes de la v2 ne se mesure pas d'abord a la richesse immediate des interfaces, mais a quatre qualites non negociables :

- fiabilite terrain ;
- justesse comptable ;
- resilience ;
- modularite reelle de bout en bout.

Le **zero fuite de contexte** reste un invariant transversal absolu de cette v2.

## Vision Produit

### Probleme a resoudre

La base `recyclique-1.4.4` constitue un point de depart exploitable mais insuffisant comme cible long terme. Le projet doit sortir d'une logique de dette accumulee, de couplages implicites et d'outillage terrain limite, tout en conservant les acquis operationnels et les habitudes critiques quand elles restent saines.

Le probleme produit n'est donc pas "repenser totalement Recyclique", mais **reconstruire un socle fiable et modulaire a partir du reel** :

- garder la continuite terrain ;
- articuler correctement `Recyclique` et `Paheko` ;
- poser une vraie chaine modulaire de bout en bout ;
- rendre la donnee exploitable pour execution, historique, rejeu et analyse ;
- faire passer toute l'UI v2 par `Peintre_nano` sans sur-architecturer son premier perimetre.

### Pourquoi les solutions actuelles ne suffisent pas

- `recyclique-1.4.4` reste trop fragile comme base definitive pour une trajectoire produit durable.
- `Paheko` ne remplace pas le metier terrain Recyclique, mais doit devenir la verite comptable officielle sur son perimetre.
- Une simple modernisation visuelle ne reglerait ni les contextes, ni la resilience, ni la qualite des contrats, ni la justesse des flux.
- Une refonte from scratch augmenterait fortement le risque de perte metier, de retard et de sur-architecture.

### Solution proposee

Construire JARVOS Recyclique v2 comme une **evolution incrementale rigoureuse** a partir de `recyclique-1.4.4`, en reexprimant progressivement le produit dans une architecture cible ou :

- `Recyclique` porte le metier vivant, les permissions, les contextes, les workflows terrain, les modules metier, la journalisation et la sync ;
- `Paheko` reste la verite officielle du financier, avec une integration prioritairement **API-first** ;
- `Peintre_nano` porte le moteur integral de composition UI avec un profil de capacites volontairement minimal au depart ;
- l'adaptateur de canal web (notamment `React`) porte le rendu concret des widgets et du shell ;
- l'authentification, les permissions et les contextes restent sous autorite `Recyclique`, puis sont consommes par `Peintre_nano` ;
- `CREOS` fournit les objets contractuels minimaux pour manifester modules, widgets, actions, flows et etats.

## Principes Directeurs

### Invariants non negociables

- Le contexte est plus fondamental que l'ecran : `site`, `caisse`, `session`, `poste de reception`, `role`, `permissions`, `PIN` et validations sensibles structurent ce qui peut etre rendu ou execute.
- En cas d'ambiguite de contexte, la securite gagne sur la fluidite : rechargement, recalcul, mode degrade ou blocage explicite selon le cas.
- La modularite n'existe que si la chaine complete existe : contrat metier, recepteur backend, contrat UI, runtime frontend, permissions, contexte, fallback, audit.
- Les contrats invalides, widgets non rendables et flows incomplets doivent produire un fallback visible ou un blocage, de la journalisation et un retour exploitable.
- La matrice **fallback / blocage / retry** des flows critiques devra etre explicitee dans le PRD pour `cashflow`, `reception flow` et les actions sensibles.
- La donnee v2 doit etre concue pour execution, historicisation, rejeu, analyse et correlations futures.
- Le niveau actuel d'historique constitue un minimum utile, mais pas une cible suffisante pour la v2.
- Pour le flux financier, la regle produit retenue est : **terrain d'abord dans `Recyclique`, sync reportable, blocage seulement selectif sur actions critiques finales**.
- L'integration `Paheko` suit une priorite **API-first** ; plugin minimal seulement si necessaire, et pas d'ecriture SQL transactionnelle comme chemin nominal.

### Posture brownfield

- La v2 repart d'abord presque a l'identique de `1.4.4` sur les logiques metier critiques.
- Les flows terrain prioritaires restent `cashflow` et `reception flow`.
- Les ameliorations UX sont autorisees si elles sont evidentes, sures et sans risque metier ou comptable.
- Les ecrans ou blocs les plus faibles peuvent etre corriges plus librement au cas par cas, mais ce n'est pas l'hypothese de depart.

## Utilisateurs Cibles

### Utilisateurs principaux

- **Operateurs terrain** : caisse, reception, cloture, manipulations rapides, contexte fiable, raccourcis robustes, comportement previsible.
- **Responsables de ressourcerie** : supervision locale, reconciliation, suivi des operations sensibles, pilotage minimum des modules/blocs, lecture historique exploitable.
- **Comptabilite / administration** : verite comptable dans `Paheko`, sync fiable, traçabilite, controle des ecarts, base assez propre pour les obligations officielles.

### Utilisateurs secondaires

- **Super-admin / expert** : mappings sensibles, parametrages structures, controle fort des reglages critiques, audit.
- **Futures ressourceries adoptantes** : installation simple, socle lisible, modularite credible, ouverture open source.

## Proposition de Valeur

JARVOS Recyclique v2 doit fournir a une ressourcerie un systeme capable de faire tourner le quotidien sans fragilite structurelle, tout en preparant proprement les extensions futures.

La valeur differenciante repose sur :

- une vraie articulation terrain/compta entre `Recyclique` et `Paheko` ;
- une UI integralement composee via `Peintre_nano`, mais sans exiger un moteur surdimensionne des le depart ;
- une modularite reelle, prouvee par une chaine complete et non par simple affichage d'ecrans ;
- une base de donnees et d'historique exploitable au-dela de l'execution immediate ;
- un produit pensable a la fois pour la production reelle, l'open source et une future dynamique communautaire.

## Portee v2

### Capacites cœur attendues

- Toute l'UI v2 passe par `Peintre_nano`.
- `Peintre_nano` demarre avec un profil minimal : shell, slots, widgets, contrats d'affichage, actions declaratives, raccourcis declaratifs, flows simples, fallback, journalisation, gestion des droits et contextes.
- `Recyclique` reste la verite principale du flux matiere, le systeme terrain vivant, la zone tampon de sync et le support de l'historique exploitable.
- `Paheko` reste l'autorite comptable officielle du flux financier.
- Le produit doit couvrir au minimum :
  - synchronisation avec `Paheko` ;
  - declaration `eco-organismes` comme premier grand module metier cible ;
  - gestion minimum benevoles / adhesions ;
  - integration `HelloAsso` ;
  - architecture modulaire et modulable.

### Seuil minimal credible pour la v2

La v2 est consideree credible si elle prouve :

- des parcours terrain critiques fiables ;
- une articulation propre `Recyclique` / `Paheko` ;
- une UI entierement portee par `Peintre_nano` ;
- des contextes et permissions robustes ;
- une journalisation et des fallbacks exploitables ;
- un socle de donnees suffisant pour la suite PRD / architecture / epics.

## Hors Perimetre Initial

Ne sont pas des prerequis de la v2 :

- personnalisation riche ;
- editeur convivial de flows ;
- pilotage agentique riche ;
- interfaces analytiques avancees ;
- edition admin metier large facon back-office complet.

Ces sujets restent des ouvertures volontaires, pas des gates de fermeture du brief.

## Configuration et Gouvernance

La `config admin simple` vise un pilotage minimal du shell et des modules, pas un grand panneau admin produit.

Le minimum vise en v2 est :

- activation / desactivation ;
- ordre de certains blocs ;
- variantes simples ;
- aide ou overlay de raccourcis.

Les mappings critiques et reglages sensibles restent reserves a un niveau super-admin / expert, avec forte tracabilite et support structure par fichiers ou supports configures.

## Critères de Succès

### Beta interne ressourcerie test

- terrain fiable ;
- scenarios critiques de sync / reconciliation documentes et verifies sur les parcours prioritaires ;
- `bandeau live` prouve la chaine modulaire minimale ;
- `cashflow` et `reception flow` prouvent la robustesse terrain critique ;
- aucun defaut critique de fuite de contexte detecte sur `site`, `caisse`, `session` et `poste` ;
- modularite partiellement prouvee.

### V2 vendable / commercialisable

- terrain fiable ;
- compta propre au sens d'une politique de reconciliation explicite, de parcours critiques verifies et d'un traitement clair des ecarts de sync ;
- modularite front prouvee de bout en bout ;
- preuves modulaires confirmees sur `bandeau live`, `eco-organismes` et une preuve metier complementaire cote `adherents` ;
- aucun defaut critique de fuite de contexte detecte sur les contextes sensibles ;
- configuration admin minimale reellement disponible ;
- installation open source documentee et reproductible sur environnement cible ;
- produit assez propre pour ouverture communautaire.

## Ordre de Travail Pour la Suite

Pour la suite BMAD, le **plan parent canonique** reste `cadrage-v2-global_c2cc7c6d.plan.md`.

L'ordre structurant a respecter pour enchaîner proprement vers PRD puis architecture est :

1. decision directrice v2 comme source de verite active ;
2. separation `Recyclique` / `Peintre_nano` ;
3. profil `CREOS` minimal ;
4. contrat socle de synchronisation / reconciliation `Recyclique` / `Paheko` ;
5. specification multi-sites / multi-caisses / postes ;
6. architecture modulaire et socle UI transverse sur cette base ;
7. PRD actif et architecture active sans ambiguite majeure.

## Strategie de Validation Produit

La sequence retenue n'est pas un dogme, mais une preference forte car elle minimise le risque systemique :

1. audit backend / API / donnees ;
2. retro-engineering `Paheko` sur donnees reelles ;
3. specification multi-sites / multi-caisses / postes ;
4. figer `CREOS` minimal et les contrats UI minimaux ;
5. construire le runtime minimal `Peintre_nano` ;
6. prouver la chaine sur `bandeau live` ;
7. prouver les flows terrain critiques `cashflow` et `reception flow` ;
8. engager le premier grand module metier `eco-organismes` ;
9. ouvrir ensuite les chantiers paralleles (`adherents`, config admin simple, autres modules).

Lecture produit :

- `bandeau live` sert de preuve modulaire legere mais complete ;
- `cashflow` et `reception flow` servent de preuves terrain critiques ;
- `adherents` constitue une preuve metier complementaire utile pour eviter un biais de conception sur un seul module ;
- `eco-organismes` ne doit pas inventer le socle, mais valider un socle deja credible.

Si `bandeau live` ne prouve pas la chaine modulaire, la chaine doit etre corrigee avant d'aller plus loin.

## Risques Principaux

- rater la modularite de base ;
- sur-complexifier techniquement le socle `Peintre_nano` / `CREOS` et retarder la sortie ;
- sous-estimer les invariants multi-contextes (`site`, `caisse`, `session`, `poste`, droits, PIN`) ;
- mal formaliser l'articulation entre verite terrain, verite comptable et zone tampon ;
- ouvrir trop tot des sujets riches (admin avance, IA, edition conviviale, analytics) avant d'avoir prouve le socle.

## Contradictions Reelles Detectees

Aucune contradiction bloquante n'apparait sur les arbitrages centraux du cadrage : brownfield `1.4.4`, roles `Recyclique` / `Paheko` / `Peintre_nano` / `CREOS`, double flux et priorite terrain/compta/resilience.

Le point de vigilance principal n'est pas une contradiction interne du cadrage actuel, mais l'existence historique d'anciens recits encore presents ailleurs dans le depot, ainsi que certains details operationnels encore portes surtout par le brainstorming. Pour ce brief, le document pivot `2026-03-31_decision-directrice-v2.md` fait foi.

## Questions Residuelles

Les points suivants restent a trancher ou formaliser avant de figer une architecture active ou d'engager une implementation stable des contrats sensibles :

1. **Contrat de synchronisation `Recyclique` / `Paheko`** : matrice definitive `API / plugin minimal / SQL hors flux`, idempotence, retry, quarantaine, reconciliation, autorite de resolution en cas d'ecart persistant.
2. **Spec multi-contextes** : granularite exacte `ressourcerie -> site -> caisse -> session -> poste`, regles d'isolation, mapping vers les entites/emplacements `Paheko`, comportement en contexte incomplet.
3. **Gouvernance contractuelle** : source canonique des schemas, articulation entre `OpenAPI` et schemas `CREOS`, versionnement et signalement des breaking changes.

## Resume de Cloture

Le brief v2 est maintenant suffisamment stable pour lancer un **PRD actif de cadrage** sur une base propre, sans repartir de zero et sans reouvrir les arbitrages deja confirmes.

Il ne doit pas etre lu comme une autorisation de figer deja toute l'architecture : les questions residuelles ci-dessus restent des **gates explicites** pour verrouiller ensuite la sync, les contextes et la gouvernance contractuelle.

La lecture a conserver est simple :

- brownfield rigoureux a partir de `recyclique-1.4.4` ;
- `Recyclique` = metier, contexte, resilience, historique, sync ;
- `Paheko` = verite comptable officielle ;
- `Peintre_nano` = moteur integral de toute l'UI v2 ;
- `CREOS` = grammaire contractuelle minimale ;
- priorite absolue = fiabilite terrain, justesse comptable, resilience, zero fuite de contexte.
