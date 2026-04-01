# Index — references/peintre/

**Matière de travail** sur JARVOS Peintre : pipeline nano → macro, contrats CREOS, layout, orchestration UI, et recherche **interne** (synthèses de session, décisions de co-design avec Strophe).

**Ce n’est pas** :

- `references/recherche/` — prompts/réponses Perplexity (etc.) et convention `*_prompt.md` / `*_reponse.md` ;
- `references/artefacts/` — handoffs ponctuels entre agents (convention `NN` optionnelle) ;
- `_bmad-output/` — livrables BMAD officiels (PRD, architecture) : on **référence** ces sources ici, on ne les remplace pas.

**Convention de fichiers** : `YYYY-MM-DD_titre-court.md` (titre en kebab-case). Pas de suffixe obligatoire `_perplexity_` : ce dossier accueille notes, synthèses et artefacts de travail rédigés dans le repo ou en session Cursor.

> Charger ce dossier pour toute session **cadrage Peintre**, **macro layout / agents**, ou **alignement implémentation** `peintre-nano/` avec la vision long terme.

---

## Fichiers

| Fichier | Rôle |
|---------|------|
| **2026-04-01_pipeline-presentation-workflow-invariants.md** | Pipeline nano → macro **consolidé** : règle de divergence PRD ; contexte / premier rendu ; draft→validé→rendu + menaces dynamiques ; **annexe miroir PRD §10.1** + §10.2–10.3 ; ADR orchestration ; a11y par phases ; **§12 aligné epics** (3→4→5→6–7→8→9) + `sprint-status.yaml` ; **§2 ter** pont concept vision + Phase 0 vs document dynamique. Passes QA + sous-agents **2026-04-01**. |
| **2026-04-01_fondations-concept-peintre-nano-extraits.md** | **Extraction opérationnelle** du concept architectural Peintre_nano (vision 2026-03-31) : Influx CREOS, `ModuleManifest`, mapping BMAD (§5 document Phase 0 vs Phase 1+), phases SDUI ↔ pipeline, flows (§7 pont `cashflow` / sprint), meta-props, zone roles, `PageTemplate`, nommage, slots shell, templates layout, handles mini, Piral, P1–P13, frameworks — sans remplacer le document vision ni le PRD. |

---

## Liens utiles (hors dossier)

- Architecture active : `_bmad-output/planning-artifacts/architecture/` (dont `navigation-structure-contract.md`, `core-architectural-decisions.md`).
- Recherches externes consolidées : `references/recherche/` — fichiers `2026-03-31_*peintre*_perplexity_reponse.md`.
- Vision projet / concept : `references/vision-projet/` (ex. `2026-03-31_peintre-nano-concept-architectural.md` si présent).
