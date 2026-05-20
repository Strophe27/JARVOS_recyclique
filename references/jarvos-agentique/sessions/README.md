# Notes de session — references/jarvos-agentique/sessions/

**Date :** 2026-05-21 (Phase 0.B)

Espace pour des **fiches courtes** (≤ 1 page) apres une session agent significative. Ce n'est **pas** une archive de transcripts Cursor.

---

## Quand creer une fiche

- Decision HITL non encore dans un artefact `references/artefacts/`
- Reprise differee d'un chantier (lien plan + UUID transcript)
- Echec ou NEEDS_HITL a documenter pour la session suivante

**Ne pas creer** de fiche pour chaque chat Cursor — privilegier artefacts dates et index transcripts.

---

## Convention de nommage

```
YYYY-MM-DD_<slug-court>.md
```

Optionnel dans le corps : `UUID transcript` (ex. `c8a645ab-...`) — **pas** de lien vers JSONL.

---

## Gabarit minimal

```markdown
# Session YYYY-MM-DD — <titre>

- **Type :** bmad-dev-story | jarvos-discovery | orchestration-graph | mixte
- **Posture dominante :** Ombre | Archi | Arbitre
- **Plan / story :** chemin ou ID
- **Transcript (optionnel) :** UUID seulement
- **Decisions :** puces courtes
- **Suite :** prochain fichier a charger (porte entree §4)
```

---

## Interdit

| Interdit | Alternative |
|----------|-------------|
| Coller un transcript JSONL | Index [`12-MOD-index-transcripts`](../protocole-modules-recyclique/12-MOD-index-transcripts-modularite.md) |
| Secrets, tokens, credentials | `references/dumps/` ou gitignore — jamais ici |
| PII | Resumer sans donnees personnelles |
| Dupliquer un artefact `artefacts/` complet | Lien vers l'artefact existant |

---

## Privacy

Voir [`../index.md`](../index.md) § Privacy et retention. Les fiches peuvent etre versionnees dans Git ; elles doivent rester **epurees**.

---

## Exemples (a venir)

Aucune fiche exemple en Phase 0.B — le premier cas d'usage attendu est la cloture du chantier **memoire sessions** (`jarvos-memoire-sessions/`) ou une reprise plan `qa2_global_modules`.
