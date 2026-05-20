# jarvos-memoire-sessions — Phase 0.A (sandbox)

**Statut :** amorçage chantier — structure et fixtures uniquement, pas de pipeline exécutable.

## Objectif

Espace de travail isolé pour concevoir et tester la **mémoire de sessions** agentiques JARVOS (manifests, prompts, corrélation avec les transcripts Cursor), sans polluer le code métier Recyclique.

## Contexte projet

- **Stub local :** [CONTEXT.md](CONTEXT.md) — pointeur unique vers la taxonomie officielle.
- **Porte d'entrée agentique :** [references/jarvos-agentique/00-porte-entree-contexte.md](../references/jarvos-agentique/00-porte-entree-contexte.md) (pack Phase 0.B — voir [artefact handoff](../references/artefacts/2026-05-21_07_contexte-chantier-memoire-jarvos.md)).
- **Index références :** [references/index.md](../references/index.md)

## Arborescence Phase 0.A

| Chemin | Rôle |
|--------|------|
| `CONTEXT.md` | Lien contexte (≤ 20 lignes, pas de duplication taxonomie) |
| `dev/` | Scripts et prototypes (vide au départ) |
| `tests/fixtures/` | Lignes JSONL d'exemple (`sample_*_line.jsonl`) |

## Prochaines étapes (hors 0.A)

1. Valider le schéma des lignes manifest / prompt avec le porte d'entrée agentique.
2. Brancher lecture transcripts (`explorer-transcripts-cursor`) et hooks `log/cursor-agent/` si pertinent.
3. Implémenter validateur + tests sous `tests/` (Phase 0.B+).

## Conventions

- Français pour la doc ; identifiants techniques en anglais snake_case.
- Fixtures : **une ligne JSON valide par fichier** (format JSONL unitaire pour tests ciblés).
