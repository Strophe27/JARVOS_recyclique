# Architecture – État des lieux (current)

Ce dossier contient une **documentation d’architecture alignée sur l’état réel du projet** à la date indiquée dans le document. Elle est destinée à un usage externe (partenaires, architectes, intégration) et à toute décision technique basée sur les faits.

## Rôle de ce dossier

- **État des lieux honnête** : services réellement déployés, stack actuelle, dette technique et écarts par rapport à une « architecture cible ».
- **Aucune modification des autres docs** : le dossier `docs/export_doc_ecosystem/` reste inchangé ; il peut décrire une vision ou un export passé (ex. bot Telegram encore mentionné alors qu’il est désactivé).
- **Source de vérité pour « aujourd’hui »** : `architecture-brownfield.md` décrit ce qui existe dans le code et dans Docker au moment de sa rédaction.

## Fichiers

| Fichier | Description |
|--------|-------------|
| **architecture-brownfield.md** | État réel de l’architecture : stack, services Docker, données, intégrations, déploiement, dette technique. |
| **fonctionnalites-actuelles.md** | Liste des fonctionnalités livrées et opérationnelles (par domaine : auth, caisse, réception, admin, etc.), avec références API, routes et stories. |
| **README.md** | Ce fichier. |

## Comment mettre à jour

1. **Ré-audit manuel** : relire `docker-compose.yml`, les Dockerfiles, les points d’entrée (API, frontend), et mettre à jour `architecture-brownfield.md` en conséquence.
2. **Workflow BMAD (template)** : la tâche **Document an Existing Project** (`.bmad-core/tasks/document-project.md`) est le template prévu pour ce type de livrable : analyse du projet existant, état réel (y compris dette technique), génération d’un document brownfield. L’agent **Analyst** (`.bmad-core/agents/analyst.md`) peut exécuter cette tâche ; le résultat peut être sauvegardé dans ce dossier sans modifier `docs/export_doc_ecosystem/`.

## Public cible

- Architectes ou équipes techniques externes.
- Partenaires d’intégration (ex. Paheko, éco-organismes).
- Tout lecteur ayant besoin d’une description **actuelle et fidèle** du système, sans confusion avec des documents historiques ou prospectifs.
