# Audit `references/` — zones principales (artefacts, recherche, consolidation, migration)

**Date :** 2026-03-31 · Voir synthèse : `2026-03-31_02_audit-references-00-synthese-globale.md`

---

## A. `references/artefacts/`

### Inventaire (ordre de grandeur)

- **~39 fichiers `.md`** sous `artefacts/` (hors `.git` dans la sauvegarde nested-git).  
- Racine : ~26 artefacts datés + `index.md`.  
- Sous-dossiers notables : `archive/` (5 missions Git), `2026-03-24_01_exploration-references-synthese/` (README + 6 `rapport.md` + synthèse orchestrateur), `2026-03-23_01_recyclique-1.4.4-nested-git-backup/` (métadonnées + `.git/`).

### Thèmes

| Thème | Exemples |
|--------|----------|
| Consolidation / paquets | `2026-03-26_04` … `_07`, QA `_03` |
| Handoff stabilisation | `2026-03-31_01_…` |
| Spirale Paheko / PRD | `2026-02-24_06` … `2026-02-25_08` |
| Architecture cible (SPA, API, EventBus) | `2026-02-26_01` |
| BMAD Enterprise / checklist / autopilot | `2026-02-26_02` … `_04` |
| Blueprint UI / workflow | `2026-03-26_01_blueprint-…` |
| Cartographie `references/` | `2026-03-24_01_exploration-…` |

### Index `artefacts/index.md`

- **Entrées** : cohérentes avec les chemins racine listés.  
- **Lacunes mineures** : `2026-03-24_01_…/README.md` et les 6 `rapport.md` non listés un par un (volontaire ou à enrichir) ; métadonnées `.txt` du backup git non indexées (normal).

### Recommandations ultérieures (hors index, action manuelle possible)

- Colonne ou tag « **contexte** » : chantier 1.4.4 actuel vs vision long terme.  
- Réviser les mentions « **pas de commit** » quand l’historique Git les contredit.

---

## B. `references/recherche/`

### Inventaire

- **18 paires / fichiers** datés **2026-02-24** (Perplexity) + `contexte-pour-recherche-externe.md`.  
- **Hors convention** (présents sur disque, absents du tableau d’index avant correction) :  
  - `normalize_typographic_chars_2026-03-16_23-30-07.log`  
  - `normalize_typographic_backup_2026-03-16_23-30-07/index.md` (backup d’index, pas une recherche).

### Clusters thématiques

- Frameworks Python / plugins / **Pluggy** / entry points.  
- Hooks / Redis / EventBus (recherche « pluggy vs alternatives »).  
- **API caisse Paheko**, saisie au poids, auth/SSO, catalogue plugins, version stable Paheko.

### Risques

- **`contexte-pour-recherche-externe.md`** : peut encore dire « pas de code » — à réécrire quand la phase projet change.  
- Aucune recherche datée après 2026-02-24 dans ce dossier.

### Doublons

- Thématique recoupée entre `frameworks-modules-python` et `pluggy-vs-alternatives` — complémentaires, pas doublons byte-à-byte.

---

## C. `references/consolidation-1.4.5/`

### Structure

- Dossier **plat** : **18 fichiers** `.md` hors `index.md`, **tous listés** dans l’index — **aucun orphelin**, aucune entrée fantôme.

### Contenu typologique

- Journal, protocole, synthèse, backlog P0/P1/P2.  
- Audits backend (architecture, data), frontend (architecture, cohérence, auth).  
- Chaîne **2026-03-27** : décision DB, cartographie, prechecks Docker, exécution contrôlée upgrade Alembic.  
- Validation installation Docker locale.

### Pertinence

- **Référence prioritaire** pour « où en est le code 1.4.4 » après stabilisation.

---

## D. `references/migration-paeco/`

### Structure

- **Racine** : 5 fichiers hors `index.md` (guides 2025-11, catégories REP, TODO Christophe, CR réunion).  
- **`audits/`** : 5 fichiers + `audits/index.md` — couverture **exacte**.

### Complémentarité vs consolidation

| consolidation-1.4.5 | migration-paeco |
|---------------------|-----------------|
| Qualité / structure **code** 1.4.4 | **Interop** et **métier** caisse/réception/Paheko |
| Backlog technique (IDs CFG, ARCH…) | Matrice + audits **correspondance** |
| DB / Docker / tests | **Éco-organismes** (`categories-decla-…`) |

Peu de doublon de fond ; **friction** possible si on ne croise pas explicitement backlog + TODO + matrice.

### TODO Christophe

- Contient déjà une mention (édit 2026-02-24) de **croiser avec 1.4.4** — à exploiter systématiquement avant priorisation.

### Guides Paheko 2025-11

- **Version** citée (ex. v1.3.17) : revalider vs instance déployée.

---

*Fin de la zone « principales » — suite : `2026-03-31_04_audit-references-02-ancien-vision-paheko-tri-racine.md`.*
