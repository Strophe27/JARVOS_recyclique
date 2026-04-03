# Ancien repo — Recyclique 1.4.4

Ce dossier sert a rapatrier et analyser le repo public Recyclique 1.4.4, le projet precurseur de JARVOS Recyclique.

**URL du repo (public, figé 1.4.4) :** https://github.com/La-Clique-qui-Recycle/RecyClique

---

## Contenu du repo original

- Code source application v1.4.4 (en production sur une ressourcerie test)
- ~100 stories BMAD v4 (construction empirique, apprentissage progressif de l'architecture et du vibe coding)
- Historique de bugs, corrections et decisions techniques
- Architecture initiale a documenter pour identifier ce qui est a refactorer

---

## Comment rapatrier le repo

```bash
# Depuis la racine du projet JARVOS Recyclique
git clone https://github.com/La-Clique-qui-Recycle/RecyClique.git references/ancien-repo/repo/
```

Le dossier `repo/` est gitignore — le clone reste local uniquement (contenu volumineux).

---

## Comment lancer l'analyse brownfield

Une fois le clone effectue, utiliser le workflow **Document Project** :

```
/bmad-bmm-document-project
```

Pointer le workflow vers `references/ancien-repo/repo/`.
Il produira une documentation structuree (overview, architecture, contrats API, modeles, etc.)
dans **ce dossier** (`references/ancien-repo/`) : point d'entree **index.md**. Cette doc servira de base de connaissance pour le refactor JARVOS Recyclique.

---

## Alignement avec le code dans JARVOS_recyclique

- Le dossier **`recyclique-1.4.4/`** (à la racine du dépôt JARVOS) est la copie de travail courante de la baseline 1.4.x ; la stack Docker Desktop **`recyclic-local`** pointe en général sur son `docker-compose.yml`.
- L'inventaire **`v1.4.4-liste-endpoints-api.md`** est réconcilié périodiquement avec **`/v1/openapi.json`** (voir `references/artefacts/2026-04-02_02_...` §1 bis). Le sous-dossier **`repo/`** (clone gitignore) reste optionnel.

## Utilite pour JARVOS Recyclique

- Comprendre les decisions metier issues des besoins reels de la ressourcerie
- Recuperer les patterns utiles et les conventions qui ont fonctionne
- Identifier ce qui a ete construit empiriquement vs ce qui doit etre reenginiere
- Alimenter le Brief, le PRD et l'architecture du refactor v0.1.0
