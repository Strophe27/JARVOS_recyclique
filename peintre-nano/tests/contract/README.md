# Tests contractuels

- **Story 1.4 (Piste B) :** `recyclique-openapi-governance.test.ts` — structure minimale du YAML reviewable (`recyclique-api.yaml`), unicité des `operationId`, schéma CREOS `widget-declaration` (champ `data_contract.operation_id`).
- **Story 1.5 (Piste B, doc-only) :** `contrat-sync-paheko-1-5-artefact.test.ts` — présence des sections et termes clés dans l'artefact `references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md` (pas d'exigence `correlation_id` dans l'OpenAPI minimal tant que les schémas d'erreur HTTP ne sont pas livrés).
- **Story 1.6 (Piste B, doc-only) :** `matrice-paheko-1-6-artefact.test.ts` — matrice Paheko + gaps API (`references/artefacts/2026-04-02_06_matrice-integration-paheko-gaps-api.md`) : traçabilité AC, quatre classifications §2, §4 conséquence/backlog, §5 FR5/FR40/AR9, rationales plugin.
- **Story 1.7 (Piste B, doc-only + OpenAPI brouillon) :** `signaux-exploitation-bandeau-1-7-artefact.test.ts` — artefact signaux exploitation / bandeau live (`references/artefacts/2026-04-02_07_signaux-exploitation-bandeau-live-premiers-slices.md`) ; complément dans `recyclique-openapi-governance.test.ts` : `live-snapshot`, **503**, `SyncStateCore`, `ExploitationLiveSnapshot`.
- **Suite :** brancher validation Spectral / drift CI lorsque la chaîne l'exigera — stories 3.2+ / epic 10.
