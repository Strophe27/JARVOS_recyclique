---
name: explorer-transcripts-cursor
description: >-
  Builds a compact index of Cursor on-disk agent transcripts (JSONL under
  agent-transcripts), searches by keyword via local tools, and prepares resume
  briefs without pasting full chats. Use when Cursor chat history is missing or
  after DB maintenance, to recover context from ~/.cursor/projects/…/agent-transcripts,
  or when the user asks to explore past agent conversations with minimal tokens.
---

# Explorer les transcripts Cursor (disque)

## Revue des limites (à ne pas contredire)

- Les **titres affichés dans l’UI Cursor** ne sont en général **pas** dans les `.jsonl` ; l’index utilise un **extrait du premier message utilisateur** et l’**UUID** du dossier. Si `first_user_snippet` est **vide** (format atypique), **lire les premières lignes** du fichier `.jsonl` ciblé plutôt que conclure à une conversation vide.
- Ce flux **ne réinjecte pas** l’historique dans Cursor ; il **documente et résume** ce qui reste sur disque.
- Du contenu peut être **`[REDACTED]`** ou absent : récupération **partielle** seulement.
- **Confidentialité** : secrets, tokens, données perso peuvent figurer dans les transcripts ; ne pas copier des extraits vers le dépôt sans accord ; ne pas publier d’index complet dans un ticket public.

## Quand appliquer ce skill

- Historique de chat **vide** alors que le projet a déjà été ouvert avec Cursor.
- Besoin de **retrouver** une session agent, un fichier cité, un mot-clé, après **maintenance** de la base locale Cursor.
- Demande explicite d’**index / recherche / brief de reprise** sur `agent-transcripts` **sans** charger des fichiers énormes dans le contexte LLM.

## Principe économie de tokens

1. **D’abord** exécuter le script d’index (sortie JSON compacte) ou `rg` sur les chemins ; **ensuite seulement** ouvrir un `.jsonl` ciblé (extraits) si nécessaire.
2. **Ne pas** coller des transcripts entiers dans le chat sauf **audit ponctuel** sur **un** UUID après choix utilisateur.

**Coût disque / CPU** : sans `--limit`, le script parcourt **tous** les dossiers parents et **lit chaque ligne** de chaque `<uuid>.jsonl` (pour un `line_count` fiable et les outils). Sur des centaines de gros fichiers, prévoir un délai ; pour un **aperçu rapide**, utiliser `--limit N` (déjà trié par date de modification décroissante).

## Où sont les fichiers

Racine typique (Windows) : `%USERPROFILE%\.cursor\projects\<slug-workspace>\`

- Transcripts parents : `agent-transcripts\<uuid>\<uuid>.jsonl`
- Sous-agents : `agent-transcripts\<uuid>\subagents\*.jsonl` (détail optionnel)

Le **slug** du dossier correspond au chemin du workspace (ex. `d-users-Strophe-Documents-1-IA-La-Clique-Qui-Recycle-JARVOS-recyclique`). Si plusieurs dossiers existent pour un même repo (chemins différents), vérifier lequel est à jour (dates).

## Script fourni (à exécuter en terminal)

Chemin du skill : `.cursor/skills/explorer-transcripts-cursor/`

Indexer les conversations **parent** (métadonnées + premier extrait utilisateur + noms d’outils, sans gros payloads). **PowerShell** (depuis la racine du dépôt) :

```powershell
# Remplacer <slug-workspace> par le nom du dossier sous %USERPROFILE%\.cursor\projects\ (dérivé du chemin du repo).
python .cursor/skills/explorer-transcripts-cursor/scripts/index_transcripts.py `
  --cursor-project-dir "$env:USERPROFILE\.cursor\projects\<slug-workspace>"
```

Git Bash / sh :

```bash
python .cursor/skills/explorer-transcripts-cursor/scripts/index_transcripts.py \
  --cursor-project-dir "$HOME/.cursor/projects/<slug-workspace>"
```

Chemin direct vers `agent-transcripts` :

```bash
python .cursor/skills/explorer-transcripts-cursor/scripts/index_transcripts.py --agent-transcripts "CHEMIN/VERS/agent-transcripts"
```

Options utiles : `--limit 50`, `--snippet-chars 200`, `--max-tool-names 40`, `--verbose` (stderr : lignes JSON non valides).

**Prérequis** : Python 3 (commande `python` ou `python3` selon l’OS), bibliothèque standard uniquement.

### Sortie JSON (schéma)

- `agent_transcripts_dir` : chemin résolu vers `agent-transcripts`.
- `parent_conversation_count` : nombre d’entrées dans `conversations`.
- `conversations[]` : `uuid`, `jsonl`, `has_subagents`, `line_count` (lignes physiques du fichier), `mtime_utc`, `first_user_snippet`, `tool_names_head` (liste plafonnée par `--max-tool-names`).

### Vérification locale du script

```bash
python .cursor/skills/explorer-transcripts-cursor/scripts/test_index_transcripts.py -v
```

## Recherche plein texte (hors modèle)

Pour trouver un UUID ou un extrait sans parser tout en JSON : **ripgrep** (`rg`) si disponible ; sinon équivalent PowerShell `Select-String -Path ...\*.jsonl`.

```bash
rg -n "motCleOuChemin" "CHEMIN/agent-transcripts" --glob "*.jsonl"
```

Limiter aux fichiers parents (racine de chaque UUID) :

```bash
rg -n "pattern" "CHEMIN/agent-transcripts/*/*.jsonl"
```

Sous **cmd.exe**, le glob `*/*.jsonl` peut ne pas s’appliquer comme sous Bash ; préférer PowerShell ou un chemin `-g '*.jsonl'` avec filtre manuel sur le segment parent.

Ne remonter au chat que les **lignes utiles** (avec contexte court), pas des fichiers entiers.

## Workflow recommandé

1. **Résoudre** le dossier `agent-transcripts` du projet (slug + `USERPROFILE`).
2. **Exécuter** `index_transcripts.py` ; conserver la sortie JSON **hors** du dépôt si elle est volumineuse ou sensible.
3. Si besoin : **rg** sur un motif ; identifier **un** `uuid`.
4. **Lire** uniquement le début / fins ciblées du `<uuid>.jsonl` concerné, ou régénérer un extrait via un petit script ad hoc (même dossier `scripts/` si on l’ajoute plus tard).
5. Produire un **brief de reprise** (5–12 lignes) : objectif utilisateur, décisions, chemins de fichiers touchés, suites possibles.

## Sous-agents

Le dossier `subagents/` complète une session parent. **Ne pas** exposer les UUID de sous-agents comme identifiants de conversation utilisateur ; s’y référer seulement comme **« sous-agent du parent &lt;uuid&gt; »** si l’utilisateur a besoin de creuser une délégation.

## Améliorations futures (hors périmètre v1 du skill)

- Second script : export markdown **local** avec sommaire par UUID (sur demande explicite utilisateur).
- Cartographie dépendances parent → sous-agents (liste de fichiers).
- Filtre date (mtime) côté script.

Pour créer ou modifier d’autres skills Cursor, utiliser le skill **create-skill** (référence Cursor, hors dépôt).
