# Zones gitignore / sensibles

Ces dossiers sont en tout ou partie **hors Git** (voir racine `.gitignore` : `references/vrac/`, `references/ecosysteme/`, `references/dumps/` ; contenu de `references/_depot/*` ignore sauf `.gitkeep`).

## vrac/

**Fichiers repérés :** au minimum `bmad.md` (documentation BMAD Method, framework IA, workflows — volumineux).

**Themes :** processus de dev assiste par IA pour le projet ; **peu de lien direct** avec integration Paheko / migration metier dans ce fichier.

## ecosysteme/

**Fichiers typiques (selon index) :** `index.md`, `appercu_ecosysteme.md`, `JARVOS_ecosysteme-IMPRESSION_complet.md`.

**Themes projet (resume sans detail confidentiel) :** vision **JARVOS_ecosystem** (fractal, hexagonal, bus **CREOS**, ports MCP/API) ; **JARVOS_recyclique / RecyClique** comme **application metier** dans la couche ecosysteme, **standalone** ; liens optionnels avec **JARVOS_perso**, **LeFil**, **Ganglion**, **Atelier**, **Peintre**, **Tresor**, **Plexus** ; **JARVOS_server** = mode deploiement on-prem.

**Utilite pour Paheko/Recyclique :** cadrage strategique — Recyclique **autonome** mais **branchable** sur le reste de l'ecosysteme ; eviter de sur-concevoir ou de casser l'architecture cible JARVOS.

## _depot/

**Etat :** souvent vide operationnellement ; `.gitkeep` preserve le dossier. Fichiers en attente de ventilation (skill **traiter-depot**).

## dumps/ (metadonnees uniquement)

**Documentation utile sans ouvrir les binaires :**

| Fichier | Role |
|---------|------|
| `README.md` | Ne pas committer ; sauvegardes Paheko (SQLite) et Recyclic (PostgreSQL) pour analyse locale et **2e passe** correspondances. |
| `schema-paheko-dev.md` | Schema Paheko dev (SQLite, plugin Caisse, module saisie poids) pour **mapping RecyClique**. |
| `schema-recyclic-dev.md` | Schema Recyclic dev (PostgreSQL), genere par script, sans donnees sensibles dans le doc. |

**Binaires / gros dumps :** non inventories ici ; **ne jamais** les committer ni coller dans le chat.

## Synthese : quoi retenir pour Paheko/Recyclique

1. **`references/dumps/`** + `schema-*-dev.md` : matiere directe pour **correspondances BDD** et **2e passe** locale.
2. **`references/ecosysteme/`** : **cadrage strategique** Recyclique dans JARVOS (autonome + branchements futurs).
3. **`references/vrac/`** (tel qu'observe) : surtout **BMAD generique** ; peu d'apport specifique Paheko/migration.

## Risques confidentialite

- **`dumps/`** : donnees prod potentielles — ne pas versionner ni diffuser.
- **`ecosysteme/`** : confidentiel — resumer les themes, ne pas reproduire de blocs longs hors contexte autorise.
- **Schemas `schema-*.md`** : interne projet.

## Meta

Rapport produit par sous-agent explore (2026-03-24) ; fichier materialise par l'orchestrateur.
