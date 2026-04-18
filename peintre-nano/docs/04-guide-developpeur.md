# Guide developpeur

## Objectif

Ce guide donne le minimum utile pour travailler dans `peintre-nano/` sans devoir relire tout le contexte BMAD ou toute la vision long terme de Peintre.

## Stack actuelle

Le projet repose principalement sur :

- `Vite`
- `React`
- `TypeScript`
- `Mantine v8`
- `Vitest`

La direction UI deja posee dans les documents de reference est la suivante :

- `CSS Modules` pour la structuration locale ;
- `src/styles/tokens.css` pour les tokens de design partages ;
- pas de `Tailwind` ;
- pas de CSS-in-JS runtime comme couche principale ;
- pas d'utilitaires globaux qui court-circuitent les conventions du projet.

## Commandes courantes

Depuis `peintre-nano/`, les commandes usuelles sont :

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run lint`

Selon le contexte local, certaines commandes supposent aussi la disponibilite du backend et des contrats partages du monorepo.

Important : dans l'etat actuel du projet, `npm run lint` correspond a une verification TypeScript stricte via `tsc -b`, pas a un lint de style de type `ESLint`.

## Variables et environnement

Le projet peut se comporter differemment selon certains flags de runtime et la facon dont l'API est exposee.

Points a verifier avant de debugger un comportement :

- mode demo ou auth live ;
- prefixe ou URL de l'API ;
- proxy Vite en developpement, notamment le passage par `/api` defini dans `vite.config.ts` ;
- disponibilite des contrats et types generes attendus.

## Structure a connaitre

Pour contribuer efficacement, il faut surtout reperer :

- `src/app/` pour le shell, les providers et le rendu d'ensemble ;
- `src/api/` pour les clients et erreurs backend ;
- `src/domains/` pour les domaines UI ;
- `src/registry/` pour l'enregistrement des widgets ;
- `src/runtime/` pour le chargement et la validation runtime ;
- `tests/` pour la couverture de comportement et de gouvernance.

## Regle de contribution importante

Quand une nouvelle fonctionnalite UI est ajoutee, se demander d'abord :

- est-ce une responsabilite du moteur ou d'un domaine applicatif ;
- quel contrat ou manifeste porte cette structure ;
- est-ce que l'ajout cree un couplage implicite au metier `Recyclique`.

Si la reponse pousse vers du metier code en dur dans le shell ou dans des utilitaires supposés generiques, il faut revoir l'implementation.

## Tests

Le dossier `tests/` couvre plusieurs besoins differents :

- tests unitaires ;
- tests de rendu ou de parcours cote frontend ;
- tests de contrat et de gouvernance autour des manifests et artefacts partages.

Tous ces tests n'ont pas le meme niveau d'autonomie. Certains dependent explicitement du monorepo et des dossiers `contracts/`.

## Consequence pratique

Quand un test casse, verifier d'abord si la regression vient :

- du runtime `peintre-nano` lui-meme ;
- d'un contrat ou type partage qui a change ;
- d'un chemin monorepo ou d'un artefact externe attendu.

## Bonnes pratiques de contribution

- brancher les widgets via le registre plutot que par import opportuniste ;
- garder les clients API regroupes dans `src/api/` ;
- eviter de dupliquer des types deja derives de `OpenAPI` ;
- documenter les nouveaux couplages monorepo au lieu de les laisser implicites ;
- preferer une degradation visible a une invention silencieuse du runtime.

## A garder en tete

`Peintre_nano` doit rester developpable comme frontend utile aujourd'hui, tout en conservant des frontieres assez propres pour un futur split. Une contribution reussie n'est donc pas seulement "fonctionnelle" ; elle doit aussi preserver l'extractibilite du projet.
