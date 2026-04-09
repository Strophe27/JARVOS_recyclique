# Perimetre et positionnement

## Identite du projet

`Peintre_nano` est le moteur de composition UI cote client utilise par `Recyclique v2`.

Dans sa forme actuelle, il assemble :

- un shell applicatif ;
- un registre de widgets ;
- des layouts et slots nommes ;
- des manifests de navigation et de pages ;
- des flows et composants relies a des contrats de donnees.

Sa responsabilite est de rendre une interface coherente a partir d'artefacts declaratifs et de conventions de runtime. Sa responsabilite n'est pas de devenir une seconde source de verite metier.

## Ce que Peintre_nano est

- un runtime de rendu React pour une UI composee ;
- un point d'assemblage entre shell, widgets, manifests et contrats ;
- un socle pour brancher des domaines UI par registre plutot que par couplage implicite ;
- un frontend pense pour rester extractible plus tard.

## Ce que Peintre_nano n'est pas

- un backend metier ;
- l'auteur canonique des permissions ou des operations ;
- une source alternative aux contrats `OpenAPI` ;
- la totalite de la vision `Peintre` long terme ;
- un repo autonome deja finalise.

## Position dans l'ecosysteme JARVOS

Dans la vision JARVOS, `Peintre` appartient aux briques transverses de generation d'interfaces. Cette vision est utile pour cadrer la trajectoire, mais elle ne doit pas etre confondue avec l'etat reel du code aujourd'hui.

Lecture prudente :

- la vision ecosysteme decrit un role cible dans une pile plus large ;
- `Peintre_nano` actuel est d'abord le frontend de `Recyclique v2` ;
- l'autonomie future reste une hypothese preparee par les frontieres du code, pas une realite operationnelle deja livree.

## Nano, mini, macro

Le vocabulaire Peintre distingue plusieurs echelles :

- `nano` : composition declarative locale, manifests versionnes, transport documentaire ;
- `mini` et `macro` : extensions de la meme grammaire dans des usages plus dynamiques ou plus larges.

Le point important pour ce repo est simple : `Peintre_nano` est la forme actuellement implementee et exploitable. Il ne faut pas y melanger prematurement des responsabilites relevant d'autres echelles.

Pour le detail de ce vocabulaire et de cette trajectoire, se referer a `references/peintre/` et aux documents d'architecture Peintre du monorepo.

## Principe de bornage

Le garde-fou central est le suivant :

> `Peintre_nano` rend ce que l'application commanditaire declare et autorise ; il n'invente pas la structure metier.

Concretement, cela implique notamment :

- pas de pages ou routes metier inventees hors contrats ;
- pas de logique d'autorisation decidee uniquement cote UI ;
- pas de duplication libre des schemas backend ;
- pas de glissement progressif vers un "Recyclique bis" code dans la facade.

## Relation avec Recyclique

Aujourd'hui :

- `Peintre_nano` est le frontend de `Recyclique v2` ;
- `Recyclique` reste l'auteur metier, l'autorite sur les operations et le writer canonique des contrats ;
- les domaines comme la caisse, le bandeau live ou la reception vivent encore dans le meme monorepo, mais doivent rester branches via des frontieres explicites.

Cette discipline est ce qui permettra, plus tard, d'extraire `Peintre` comme moteur autonome sans chirurgie lourde.
