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
| **2026-04-01_adr-p1-p2-stack-css-et-config-admin.md** | **ADR acceptée** — fermeture **P1** (CSS Modules + `tokens.css` + Mantine v8 ciblée, interdits Tailwind / CSS-in-JS runtime / utilitaires globaux) et **P2** (surcharges admin en **PostgreSQL** + fusion déterministe avec manifests build). **Source d’autorité** pour l’implémentation et les mises à jour BMAD. |
| **2026-04-01_instruction-cursor-p1-p2.md** | **Instructions agents Cursor** : intégration P1/P2 dans le code et les artefacts ; patterns de dossiers ; checklist QA ; **ne pas réécrire** le concept / pipeline / extraits datés — l’ADR se superpose. |
| **2026-04-01_pipeline-presentation-workflow-invariants.md** | Pipeline nano → macro **consolidé** (cadrage antérieur au verrou P1/P2) : règle de divergence PRD ; **§16** et concept §7 peuvent encore mentionner P1–P13 comme *historique* — **P1 et P2 sont clos par l’ADR** ci-dessus ; **§12** epics + pont `cashflow` ; etc. |
| **2026-04-01_fondations-concept-peintre-nano-extraits.md** | **Extraction opérationnelle** du concept (dont checklist **P3–P13** encore ouvertes dans la vision tant que non tranchées). |

---

## Liens utiles (hors dossier)

- Architecture active : `_bmad-output/planning-artifacts/architecture/` (dont `navigation-structure-contract.md`, `core-architectural-decisions.md`).
- Recherches externes consolidées : `references/recherche/` — dont `2026-03-31_peintre-nano-p1-stack-css-styling_perplexity_reponse.md` (base de la décision **P1** dans l’ADR) et les autres `2026-03-31_*peintre*_perplexity_reponse.md`.
- Vision projet / concept : `references/vision-projet/` (ex. `2026-03-31_peintre-nano-concept-architectural.md` si présent).
