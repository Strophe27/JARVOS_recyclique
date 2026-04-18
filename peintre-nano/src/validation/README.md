# Validation — manifests commanditaires

- **Parse JSON** + normalisation des clés **snake_case → camelCase** (`key-normalize.ts`, `*-ingest.ts`).
- **Règles croisées** nav + pages + allowlist `widgetType` : `validate-bundle-rules.ts`.
- **Erreurs** : codes stables dans `manifest-validation-types.ts` (pas seulement `console.error`).

Les **widgets** autorisés en Piste A sont listés dans `allowed-widget-types.ts` jusqu’au registre (story 3.3).
