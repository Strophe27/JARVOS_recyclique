---
name: traiter-depot
description: Ventilates files from references/_depot/ into the correct references/ or doc/ folders, applying project naming and index updates. Reads filenames and agent instructions in files to determine destination; uses native move only; asks user when destination is ambiguous. Use when the user asks to process the depot, ventilate _depot, or treat the inbox.
---

# Traiter la boîte de dépôt

**Pour exécuter en contexte isolé** (sans charger tout le contexte du chat) : déléguer à l'agent **@depot-specialist** (`.cursor/agents/depot-specialist.md`). Sinon, appliquer ce skill dans le chat courant.

---

Ventiler le contenu de **references/_depot/** vers les bons dossiers (references/* ou doc/), en respectant les conventions du projet. Un fichier = une destination. Toujours mettre à jour les index après chaque ventilation.

**Règle fichiers** : déplacer/copier avec **commandes natives** (Copy-Item, Move-Item, Rename-Item ; sous Windows préférer `-LiteralPath` pour noms avec `[]` ou caractères spéciaux). Ne jamais simuler un déplacement en lisant + écrivant ailleurs.

---

## 1. Lire avant d'agir

Pour **chaque** fichier (y compris dans les sous-dossiers de _depot) :

1. **Nom du fichier** : repérer le contexte et les instructions (ex. `USE_WITH_CAUTION`, `[AGENT INSTRUCTION]`, dates, thème : idees, ids, presentation, RAG, paheko, brownfield, api, etc.).
2. **Début du fichier** (premières lignes / bloc) : repérer les instructions pour l'agent (`[AGENT INSTRUCTION]`, `[Instruction agent]`, « nécessaire un sous-dossier », « utiliser avec précaution », « matière pour… », etc.).
3. Si des **instructions** sont présentes : les appliquer pour le choix de destination et le nommage (ex. matière première → préfixe `matiere_`, notice en tête de fichier si « utiliser avec précaution »).

---

## 2. Contenu = idées à capturer

Si le **nom** du fichier évoque des idées (idees, ids, list d'idees, etc.) **ou** si le **contenu** contient une liste d'idées (sans exiger la phrase « noter cette idée ») :

- Lire **`.cursor/skills/idees-kanban/SKILL.md`** et, pour **chaque** idée extraite, appliquer la section **« Créer une idée »** du skill idées-kanban (une fiche par idée).
- Ensuite, ventiler le **fichier source** (la liste) : il ne va **pas** dans references/idees-kanban/ (réservé aux fiches une-idée-un-fichier). Le placer vers vision-projet ou artefacts (ex. `YYYY-MM-DD_archive_liste-idees-importees.md`).
---

## 3. Grille de destination

| Type de contenu | Destination | Nommage / remarque |
|-----------------|-------------|--------------------|
| Vision projet, présentations (matière première), RAG, roadmap, Brief | **references/vision-projet/** | `matiere_` si matière première ; notice en tête si « utiliser avec précaution » |
| Versions épurées prêtes à envoyer (présentation, modes d'emploi) | **doc/** (racine) | Communication publique uniquement |
| Guides Paheko/RecyClique, TODO, CR réunion, decla éco-organismes | **references/migration-paheko/** | Dates + tirets, pas d’espaces |
| Brownfield, API 1.4.x, architecture actuelle, liste endpoints | **references/ancien-repo/** | Conserver noms explicites (ex. architecture-brownfield.md) |
| Dump BDD prod (Paheko SQLite, Recyclic PostgreSQL, sauvegardes sensibles) | **references/dumps/** | Nommer explicitement (ex. paheko-prod.sqlite, recyclic-prod.sql). Gitignore. |
| Références écosystème JARVOS | **references/ecosysteme/** | Emplacement canonique ; une fois ventilé là, ne pas dupliquer ce contenu ailleurs |
| Handoff entre agents, missions, briefs datés | **references/artefacts/** | `YYYY-MM-DD_NN_titre-court.md` |
| Prompts / réponses recherche externe (IA) | **references/recherche/** | `YYYY-MM-DD_titre-court_[IA]_prompt.md` / `_reponse.md` |
| Sans destination adaptée (après échange avec l'utilisateur) | **references/vrac/** | Gitignore, pas d'index |

**Ecosysteme** : destination = references/ecosysteme/. Les autres dossiers y font référence (liens, index), sans copie du contenu.

---

## 4. Décision

- **Une seule destination évidente** (grille + instructions du fichier) → ventiler directement.
- **Sinon** (plusieurs candidats, instruction ambiguë, aucun bon fit) : **ne pas décider seul**. Informer l'utilisateur, proposer 2–3 options (dont references/vrac/ si « nulle part »), demander où placer le fichier ou sous quel nom.

---

## 5. Workflow par fichier

Pour chaque fichier dans _depot (récursif) :

1. Lire nom + début du fichier (instructions).
2. Détecter idées → si oui, appeler le skill idees-kanban puis continuer.
3. Choisir destination (grille ci-dessus) ; si pas une seule évidente, demander à l'utilisateur.
4. Déterminer le **nom de destination** : pas d’espaces ni caractères spéciaux ; conventions par dossier (artefacts = date_NN_titre, etc.).
5. **Déplacer** avec commande native (PowerShell : Move-Item, ou Copy-Item puis Remove-Item pour vider _depot ; `-LiteralPath` si `[]` dans le chemin).
6. Appliquer les **instructions** trouvées (ex. ajouter en tête du fichier une notice « matière première, utiliser avec précaution »).
7. Mettre à jour l'**index** du dossier cible (`references/<dossier>/index.md`) ; si nouveau dossier, mettre à jour `references/index.md` et `references/INSTRUCTIONS-PROJET.md` (tableau + liste des index).
8. **Supprimer l'original** du dépôt après déplacement réussi (vider _depot).

---

## 6. Mise à jour des index

- **Index du dossier cible** : ajouter une entrée (fichier + description permettant de décider sans ouvrir le fichier). Inclure une clause **« Charger si : … »** quand le format du dossier le prévoit (voir `references/INSTRUCTIONS-PROJET.md`).
- **references/dumps/** : pas d'index (contenu gitignore). Ne pas créer ni mettre à jour d'index pour ce dossier.
- **references/index.md** : modifier uniquement si nouveau sous-dossier ou changement de rôle de dossier.
- **doc/index.md** : si un fichier va dans doc/, l'ajouter à la table.

Ne pas mettre à jour `references/idees-kanban/index.md` dans ce skill — c’est géré par le skill idees-kanban.

---

## 7. Règles résumées

- **Un fichier = une destination** (pas de duplication de contenu entre dossiers, sauf référence dans l'index).
- **Sous-dossiers dans _depot** : traiter tous les fichiers (ventiler un par un ou déplacer le dossier si tout va au même endroit).
- **Encodage / noms avec []** : sous Windows, utiliser `-LiteralPath` pour éviter « fichier introuvable ».
- **Référence projet** : en cas de doute sur la structure, lire `references/INSTRUCTIONS-PROJET.md` et `references/index.md`.
