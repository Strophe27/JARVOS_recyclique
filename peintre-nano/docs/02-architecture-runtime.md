# Architecture du runtime

## Vue d'ensemble

Le runtime `Peintre_nano` assemble un shell React, des manifests declaratifs, un registre de widgets et des composants de rendu pour produire l'interface finale.

Le flux logique est le suivant :

1. chargement des manifests et preferences de runtime ;
2. validation et normalisation des artefacts ;
3. resolution de la navigation et de la page cible ;
4. rendu du shell, des layouts, des slots et des widgets ;
5. branchement des flows et etats de donnees associes.

## Points d'entree principaux

- `src/main.tsx` : bootstrap du frontend ;
- `src/app/App.tsx` : composant racine ;
- `src/app/demo/RuntimeDemoApp.tsx` : shell de composition principal actuel ;
- `src/registry/` : enregistrement des widgets ;
- `src/runtime/` : chargement, validation et garde-fous runtime.

## Briques majeures

Le runtime s'articule autour de quelques briques stables : le shell applicatif, le registre de widgets, les layouts et slots de rendu, puis les flows et interactions relies aux contrats et aux etats de donnees.

## Shell applicatif

Le shell fournit l'ossature generale de l'application : providers, layouts globaux, navigation et rendu de page. Il porte l'experience de base, mais ne doit pas devenir un depot de logique metier cachee.

## Registre de widgets

Le registre est le point d'assemblage des widgets connus du runtime. Il permet de brancher les domaines UI explicitement et de limiter les dependances implicites.

Bon principe :

- un widget est enregistre, resolu et rendu par un contrat clair ;
- un domaine n'entre pas dans le shell par import opportuniste ou logique cachee.

## Layouts, slots et rendu

Les manifests de page decrivent une composition ; le runtime se charge ensuite de mapper cette composition sur des layouts, zones et widgets concrets.

Autrement dit :

- les contrats decrivent la structure attendue ;
- le runtime applique les regles de rendu ;
- les composants React restent des adaptateurs de canal, pas la source de la structure.

## Flows et interactions

Le runtime doit pouvoir exposer des parcours et actions UI sans devenir lui-meme l'autorite de ces actions.

En pratique :

- l'interface peut declencher des actions ou afficher des etats ;
- les validations metier sensibles restent du cote de `Recyclique` ;
- l'UI peut se degrader proprement si les donnees ou contrats attendus ne sont pas disponibles.

## Organisation actuelle du code

L'arborescence `src/` montre deja les frontieres utiles pour un futur split :

- `app/` pour le shell, les providers et le rendu de haut niveau ;
- `api/` pour les clients HTTP et erreurs ;
- `domains/` pour les domaines UI branches ;
- `flows/`, `slots/` et `widgets/` pour les briques de composition et de rendu ;
- `migration/` pour les ponts et adaptations lies a la transition en cours ;
- `generated/` pour les artefacts derives et placeholders associes ;
- `registry/` pour la composition explicite ;
- `runtime/` pour la validation et la resolution ;
- `validation/`, `types/`, `fixtures/` et `styles/` pour le support.

## Invariants a tenir

- garder un pipeline de rendu unique ;
- brancher les domaines via registre, slots et contrats ;
- eviter le couplage direct entre shell generique et details du backend ;
- privilegier les conventions declaratives aux structures React improvisees ;
- maintenir un mode degrade explicite en cas de contrat invalide ou de donnees manquantes.

## Ce que cette architecture prepare

L'objectif n'est pas de separer physiquement tous les morceaux tout de suite. L'objectif est de conserver des frontieres suffisamment nettes pour qu'une extraction future du moteur soit une evolution de packaging, pas une refonte complete.
