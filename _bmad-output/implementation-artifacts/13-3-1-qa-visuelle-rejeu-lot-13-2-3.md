# Rejeu process cible sur lot 13.2.3

Date: 2026-02-28
Story de reference: `13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions`
Objectif: verifier que les preuves sont exploitables en lecture seule et identifier les corrections process avant `13.3.2`.

## Artefacts verifies

- Story:
  - `_bmad-output/implementation-artifacts/13-2-3-remediation-visuelle-lot-admin2-admin3-categories-hors-exclusions.md`
- Manifest:
  - `_bmad-output/implementation-artifacts/13-2-3-audit-admin2-admin3-preuves.json`
- Annexe:
  - `_bmad-output/implementation-artifacts/13-2-3-audit-admin2-admin3-annexe.md`
- Captures AVANT:
  - `_bmad-output/implementation-artifacts/screenshots/11-0/admin-2/*.png`
  - `_bmad-output/implementation-artifacts/screenshots/11-0/admin-3-categories/*.png`

## Verification couverture process

1. Build:
   - trace presente dans la story et dans l annexe (`npm run build`).
2. Tests UI co-loces:
   - trace presente dans la story (suite admin ciblee).
3. Captures et preuves:
   - AVANT presentes et resolubles.
   - APRES non exportees pour ce lot (etat legacy), donc non conforme au schema cible 13.3.1 strict.
   - Action de migration definie: exiger APRES obligatoire pour tout ecran du scope inclus a partir de 13.3.2.
4. Mini audit:
   - resultat global present.
   - ecarts classes presents (critique/majeur/mineur).
5. Exclusions:
   - `pin login`, `users pending`, `permissions` explicitement confirmees.
6. Decision de cloture:
   - decision de lot traitee dans la story et annexe; statut final coherent avec validation review.

## Exploitabilite sans contexte implicite

Verdict: **oui, exploitable en legacy** avec niveau "bon" pour reprise agent, sous reserve d appliquer la normalisation 13.3.1.

Points forts:
- Trajectoire de preuve explicite entre story, manifest et annexe.
- Scope et exclusions repetes, donc faible ambiguite sur le perimetre.
- Residuels mineurs traces et acceptes.

Points a renforcer (avant 13.3.2):
- Uniformiser les champs de manifest autour du canevas 13.3.1 (`story`, `domaine`, `preuves[]`, `decision`) pour eviter la variabilite de schema entre lots.
- Exiger une section "decision de cloture" explicite dans l annexe avec `go-review|blocked` (normalisee).
- Supprimer les modes preuve alternatifs pour stories futures: capture APRES obligatoire par ecran inclus.
- Mapper explicitement les statuts legacy (`ok`, `partiel`, `ok-hitl`, `pass_with_accepted_residuals`) vers le schema cible (`conforme`, `conforme-avec-residuel-accepte`, `non-conforme-bloquant`).

## Ecarts de process constates et corrections proposees

1. Ecart: schema JSON variable selon lot.
   - Correction: adopter le canevas `13-3-1-qa-visuelle-canevas-preuves.json` comme base obligatoire.
2. Ecart: decision de cloture parfois implicite dans les notes/story.
   - Correction: imposer une section "Decision de cloture" dans `*-annexe.md`.
3. Ecart: absences de captures APRES possibles selon contexte HITL.
   - Correction: interdire ce mode pour les nouvelles stories et imposer capture APRES obligatoire (hors scope exclu).
4. Ecart: statuts de decision heterogenes entre lots.
   - Correction: imposer la matrice de mapping legacy -> schema cible dans le manifest et l annexe.

## Decision

- Gate process 13.3.1: **valide** sur rejeu 13.2.3.
- Action pre-13.3.2: appliquer sans exception les canevas 13.3.1 (process + manifest + annexe).
