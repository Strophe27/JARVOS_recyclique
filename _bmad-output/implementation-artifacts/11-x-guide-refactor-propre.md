# Guide refactor propre - Anti gruyere

Date: 2026-02-28
Version: 1.0

## 1) Intention

Construire une base maintenable: lisible, testable, coherente, reprise facile par un nouvel agent/dev.

## 2) Principes

- Une responsabilite par composant/module.
- Nommage stable et previsible.
- Pas de logique dupliquee.
- Pas de correction visuelle sans reference (capture + source 1.4.4).
- Refactor progressif mais propre, jamais "quick fix" cache.

## 3) Architecture code (frontend)

- Organisation par domaine: `auth`, `caisse`, `reception`, `admin`, `shared`.
- Composants UI reutilisables dans `shared`.
- Hooks metier dedies, pas de logique API dans la vue.
- Etat:
  - local si possible
  - store/etat partage uniquement si justifie

## 4) Regles de qualite

- Build sans erreur obligatoire.
- Tests co-loces obligatoires sur routes/composants critiques.
- Pas de TODO non borne en production.
- Pas de secret, URL sensible, ou hack temporaire laisse en place.

## 5) Definition de "fait proprement"

- Le code est comprenable sans contexte oral.
- Les decisions sont tracees dans les artefacts.
- Les conventions sont respectees a l identique.
- Un nouveau dev peut reprendre sans reverse engineering long.

## 6) Interdits explicites

- Patch CSS "one-shot" non documente.
- Duplication de composant quasi identique.
- Changement de comportement sans ticket/decision.
- Contournement de tests pour faire passer un build.
