---
name: profil-creos-minimal
overview: Définir le profil CREOS documentaire minimal que Recyclique v2 doit émettre et que Peintre_nano doit consommer, afin d’aligner immédiatement la séparation front/back sur la grammaire JARVOS sans surcharger la V2 avec les couches mini/macro.
todos:
  - id: scope-creos-min
    content: "Délimiter le noyau CREOS minimal pour la V2 : ce qui est obligatoire maintenant vs reporté à Peintre_mini / macro"
    status: pending
  - id: objets-canoniques
    content: Figer les objets, rules, states et events minimaux nécessaires aux manifests UI et au shell Peintre_nano
    status: pending
  - id: schemas-versioning
    content: Définir les schémas JSON canoniques, le vocabulaire initial et les règles de versionnement compatibles JARVOS
    status: pending
  - id: roles-emission-consommation
    content: Spécifier ce que Recyclique émet, ce que Peintre_nano valide/consomme et ce que l’adaptateur React rend
    status: pending
  - id: rebase-cadrage-v2
    content: "Aligner explicitement cette annexe sur le plan parent rebasé `cadrage-v2-global`, en confirmant ce qu’elle précise sans redire le rebase déjà effectué"
    status: pending
isProject: false
---

# Profil CREOS Minimal

## But

Produire une annexe de cadrage qui fixe le **profil CREOS documentaire minimal** pour `Recyclique v2` et `Peintre_nano`.

Ce mini-plan sert a eviter deux erreurs :

- inventer un JSON UI local qui ne se raccordera pas proprement a l ecosysteme JARVOS ;
- surcharger la V2 avec toute la vision `Peintre_mini` / `macro` avant d avoir stabilise le socle nano.

## Decision de fond

Pour la V2 :

- `CREOS` est la **grammaire commune**.
- Le **transport reste documentaire** : fichiers JSON ou structures persistables, pas de bus obligatoire en V2.
- La regle est : **meme grammaire, transport variable**.
- Tout ce qui depend de l agent, du bus, de la composition dynamique par IA, ou de la regulation avancee reste **hors noyau minimal**.

## Position dans la hierarchie des plans

- Le **plan parent canonique** est `[.cursor/plans/cadrage-v2-global_c2cc7c6d.plan.md](.cursor/plans/cadrage-v2-global_c2cc7c6d.plan.md)`.
- Le sous-plan frere qui traite la separation d architecture est `[.cursor/plans/separation-peintre-recyclique_4777808d.plan.md](.cursor/plans/separation-peintre-recyclique_4777808d.plan.md)`.
- Cette annexe ne redefinit pas l ordre global ; elle precise seulement le **profil `CREOS` documentaire minimal** de l etape correspondante.
- En cas de divergence d ordre ou de priorite, **le parent fait foi**.

## Noyau minimal a figer

### Objets obligatoires

- `ModuleManifest`
- `SlotDefinition`
- `WidgetDeclaration`
- `ModuleAction`

### Objets toleres en preparation mais non obligatoires partout en V2

- `PageTemplate`
- `ZoneRole`
- `LayoutComposition`

Regle pratique :

- ces objets peuvent etre prepares conceptuellement en V2 ;
- ils ne doivent pas devenir un prerequis global des modules courants ;
- leur usage doit rester cible, optionnel et compatible avec un shell minimal.

### Rules minimales

- `ModulePermissions`
- `SlotConstraints`

### States minimaux

- `ACTIVE`
- `INACTIVE`
- `ERROR`

### Events minimaux

- `ModuleActivatedEvent`
- `ModuleDeactivatedEvent`
- `SlotContentChangedEvent`

### Commands minimales

- `ACTIVATE_MODULE`
- `DEACTIVATE_MODULE`
- `REGISTER_WIDGET`

### Hors scope du noyau minimal

- `COMPOSE_LAYOUT` pilote par agent
- bus CREOS Redis/Rabbit obligatoire
- gates `Capitaine_Balance` pleinement branchees
- experimentation `DivKit`
- optimisation automatique ou IA des layouts

## Repartition des roles

### Ce que Recyclique doit emettre

- les manifests CREOS de ses modules metier ;
- les routes symboliques, actions, permissions, contextes de rendu ;
- les declarations de contributions aux slots ;
- les DTO et contrats backend associes via `OpenAPI`.

### Ce que Peintre_nano doit valider et consommer

- les manifests conformes au profil CREOS retenu ;
- les widgets declares et leur `props_schema` ;
- les etats d activation / desactivation ;
- les regles de contraintes de slots.

### Ce que l adaptateur React doit rendre

- le shell ;
- les slots ;
- les widgets resolus ;
- les fallback visuels ;
- les comportements d affichage lies au canal, sans remonter de logique metier dans Peintre.

## Schémas et gouvernance

Il faut produire une source canonique pour :

- le schema du `ModuleManifest` ;
- le schema du `WidgetDeclaration` ;
- le vocabulaire initial Peintre dans le registre CREOS ;
- la convention `SemVer` des manifests, alignee avec la vision Peintre_nano.

Il faut aussi trancher tres vite :

- ou vit la source de verite des schemas ;
- qui versionne `OpenAPI` et qui versionne les schemas CREOS ;
- comment on signale un breaking change.

## Verification minimale avant implementation

Avant de lancer du dev significatif, il faut pouvoir demontrer :

- qu un module Recyclique peut publier un `ModuleManifest` valide ;
- qu un `Slot` Peintre peut consommer ce manifest et rendre une contribution simple ;
- qu un widget declare avec `props_schema` est resolu sans couplage metier dur ;
- qu un module peut etre active / desactive sans casser le shell.

## Sort du plan `cadrage-v2-global`

Le plan `cadrage-v2-global` ne doit **pas** etre jete.

Il a vocation a rester le **plan parent rebase**.

Cette annexe en precise la consequence sur l axe `CREOS` :

- **axes conserves dans le parent** :
  - decision directrice v2 ;
  - matrice d integration Paheko ;
  - spec multi-sites / multi-caisses ;
  - architecture modulaire ;
  - rebase BMAD.
- **axe fortement corrige dans le parent** :
  - l axe `framework UI/UX Recyclique`.
- **reformulations desormais actees dans le parent** :
  - `Peintre` n est plus seulement une capacite future encadree ;
  - `Peintre_nano` devient un **socle UI structurel deploye en plusieurs phases** ;
  - le framework UI de Recyclique doit maintenant etre pense comme : `Recyclique emet des contrats et contributions`, `Peintre_nano compose`, `React rend`.
- **insertion desormais actee dans le parent** :
  - une sous-phase explicite `profil CREOS documentaire minimal` avant la vraie redefinition du framework UI.

## Fil directeur recommande

Pour reprendre le fil, l ordre canonique reste celui du plan parent.

Cette annexe intervient plus precisement sur le moment suivant :

1. Decision directrice v2.0.
2. Separation `Recyclique` / `Peintre_nano`.
3. Profil `CREOS` minimal.
4. Reprise des axes historiques encore valides : Paheko, multi-sites, modularite, BMAD.
5. Relance du `Brief` / `PRD` / `Architecture` une fois cette colonne vertebrale posee.

## Risque principal

Le vrai danger n est pas de garder l ancien plan.

Le vrai danger est de **continuer a l utiliser tel quel** alors que son axe UI est maintenant depasse par la decision Peintre/Recyclique.

La bonne posture est donc :

- **ne pas jeter** ;
- **ne pas suivre tel quel** ;
- **le transformer en plan parent rebase**, avec le plan Peintre/Recyclique et cette annexe CREOS comme nouveaux sous-plans structurants.