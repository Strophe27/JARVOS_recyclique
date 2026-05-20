# dev/ — scripts mémoire sessions (Phase 2)

Outils **stdlib uniquement** pour lire les JSONL `log/cursor-agent/`, résoudre les transcripts Cursor et produire des fiches légères dans `references/jarvos-agentique/sessions/`.

**Prérequis :** Python 3.10+ ; exécuter depuis ce dossier (`dev/`) pour que `import index_lib` fonctionne.

## Fichiers

| Script | Rôle |
|--------|------|
| [`index_lib.py`](index_lib.py) | Helpers : `read_jsonl`, manifest/prompts/responses, `workspace_slug`, résolution `agent-transcripts/<uuid>/<uuid>.jsonl` |
| [`consolidate_manifest.py`](consolidate_manifest.py) | Déduplique `sessions_manifest.jsonl` par `conversation_id` (dernière ligne gagne) |
| [`triage_session.py`](triage_session.py) | Heuristiques de type session → fiche MD courte |
| [`export_transcript_md.py`](export_transcript_md.py) | Export MD léger depuis JSONL (sans blocs thinking / REDACTED massifs) |

Fixtures unitaires : [`../tests/fixtures/`](../tests/fixtures/) (`sample_*_line.jsonl` — une ligne JSON par fichier).

## Chemins par défaut

Depuis la **racine du dépôt** JARVOS_recyclique :

- `log/cursor-agent/sessions_manifest.jsonl`
- `log/cursor-agent/prompts.jsonl`
- `log/cursor-agent/responses.jsonl`
- Transcripts : `%USERPROFILE%\.cursor\projects\<workspace-slug>\agent-transcripts\<uuid>\<uuid>.jsonl`

Le slug workspace est dérivé du chemin racine (minuscules, tirets) — aligné sur les hooks (`hook_common.project_slug_from_root`).

## Usage

```powershell
cd "D:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\jarvos-memoire-sessions\dev"

# Vérifier la syntaxe
python -m py_compile index_lib.py consolidate_manifest.py triage_session.py export_transcript_md.py

# Consolider le manifest (aperçu)
python consolidate_manifest.py --dry-run

# Consolider (écriture)
python consolidate_manifest.py

# Triage une session par UUID → fiche sessions/
python triage_session.py --uuid c8a645ab-a1ff-4d86-a559-4362f9c8c30b

# Aperçu sans écrire
python triage_session.py --uuid c8a645ab-a1ff-4d86-a559-4362f9c8c30b --dry-run

# Export transcript MD (léger)
python export_transcript_md.py --uuid c8a645ab-a1ff-4d86-a559-4362f9c8c30b --max-lines 80 -o ..\..\tmp-transcript-export.md
```

**Ne pas lancer en Phase 2 :** `triage_session.py --limit 30` (batch Phase 5).

## Types de session (heuristiques)

| Type | Signaux typiques |
|------|------------------|
| `bmad-dev-story` | `_bmad-output/implementation-artifacts`, `bmad`, story file |
| `jarvos-discovery` | QCM, ARCH, cartographie / protocole |
| `orchestration-graph` | `.cursor/plans`, long-run, QA2 plan |
| `mixte` | Scores proches ou aucun signal fort |

Sortie fiche : `references/jarvos-agentique/sessions/<8-premiers-chars-uuid>_<slug-court>.md` (3–15 lignes ; `bmad-dev-story` = fiche courte **sans** section patterns).

## API `index_lib` (extrait)

```python
from index_lib import read_manifest, transcript_jsonl_path, workspace_slug

rows = read_manifest()
path = transcript_jsonl_path("c8a645ab-a1ff-4d86-a559-4362f9c8c30b", workspace_root="D:/.../JARVOS_recyclique")
slug = workspace_slug("D:/users/.../JARVOS_recyclique")
```

## Confidentialité

Ne pas committer d'exports transcript volumineux ni de secrets. Les fiches `sessions/` restent épures (UUID seulement, pas de JSONL intégral).
