# Schemas JSON CREOS

**Gouvernance (Story 1.4)** : [`references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md`](../../../references/artefacts/2026-04-02_04_gouvernance-contractuelle-openapi-creos-contextenvelope.md) — périmètre CREOS, hiérarchie AR39, lien **`data_contract.operation_id`** ↔ **`operationId`** OpenAPI dans `contracts/openapi/recyclique-api.yaml`.

| Fichier | Role |
|---------|------|
| `widget-declaration.schema.json` | **Catalogue / déclaration** de widget (identité, `data_contract` optionnel, meta). **Ce n'est pas** le schéma des **placements** dans un `PageManifest` runtime (`slot_id`, `widget_type`, `widget_props` en JSON snake_case côté fichier) : ce dernier est validé par l'ingest TypeScript dans `peintre-nano` (voir stories 3.2–3.3). Ne pas confondre « déclaration CREOS » et « ligne de slot dans une page ». La racine de l'objet widget autorise encore des champs additionnels (`additionalProperties: true`) pour absorber l'evolution du profil CREOS ; durcir en `false` quand le corpus de champs sera fige. |
| `widget-data-states.schema.json` | Codes **CREOS** `DATA_*` (donnees widget). Distinct du type TS `WidgetDataState<T>` (`status` en minuscules) — voir PRD §10.1. |

**CI recommandee (Epic 10)** : lorsque `contracts/openapi/recyclique-api.yaml` contient des `paths` non vides, verifier que chaque `data_contract.operation_id` reference dans les manifests reviewables existe comme `operationId` dans l'OpenAPI.
