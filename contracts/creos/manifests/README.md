# Manifests CREOS reviewables (`contracts/creos/manifests/`)

Tout fichier `*.json` sous ce dossier fait partie du **périmètre reviewable** partagé (gouvernance pivot 1.4 / Convergence 2).

## Sandbox démo (exceptions gate Story 10.3)

Les manifests suivants servent des scénarios démo / garde-fous runtime **sans** exiger le crosswalk OpenAPI `operation_id` ↔ `operationId` **tant qu’aucun nœud `data_contract`** (avec `operation_id` ou `secondary_sources`) n’est présent dans le JSON :

- `page-demo-home.json`
- `page-demo-guarded-page.json`
- `page-demo-unknown-widget.json`

Dès qu’un `data_contract` est ajouté à l’un de ces fichiers, les règles AC2 de la gate globale [`peintre-nano/tests/contract/creos-manifests-governance-10-3.test.ts`](../../../peintre-nano/tests/contract/creos-manifests-governance-10-3.test.ts) s’appliquent comme pour les autres manifests.

## Tous les autres fichiers

- Contrôles structurels (parse JSON, conventions catalogue, schéma widget sur `widgets-catalog-*.json`).
- Crosswalk **`operation_id`** (clés JSON uniquement) ↔ **`operationId`** dans [`contracts/openapi/recyclique-api.yaml`](../../openapi/recyclique-api.yaml) (snapshot aligné chaîne 10.2).
- Cohérence bundle **lot servi produit** : `navigation-transverse-served.json` + pages référencées (voir gate 10.3).
- **Parité AC1c / smoke AC4 :** allowlist et lot pages démo diffèrent volontairement (gouvernance vs NFR28) — defer CR, story 10.3 Review Findings L246.

**Arborescence :** la gate 10.3 ne parcourt que les `*.json` **à la racine** de ce dossier (pas de sous-dossiers). Tout manifest reviewable doit rester plat ici tant que la gate n’est pas étendue.

Gate automatisée : `npx vitest run tests/contract/creos-manifests-governance-10-3.test.ts` (depuis `peintre-nano/`).
