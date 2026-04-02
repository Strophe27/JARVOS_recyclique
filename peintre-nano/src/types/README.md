# Types — frontière des quatre artefacts

| Module | Artefact | Rôle |
|--------|----------|------|
| `navigation-manifest.ts` | NavigationManifest | Vérité commanditaire — navigation / structure informationnelle (`route_key`, `path`, `page_key`, `shortcut_id` optionnels côté JSON). |
| `page-manifest.ts` | PageManifest | Vérité commanditaire — composition de page (slots / widgets CREOS). Chaque slot peut porter des **props** optionnelles : en JSON, champ **`widget_props`** (snake_case) ; après ingest, **`widgetProps`** (camelCase), objet plat JSON-compatible. |
| `context-envelope.ts` | ContextEnvelope | Vérité backend / OpenAPI ; stubs Piste A uniquement. |
| `user-runtime-prefs.ts` | UserRuntimePrefs | Préférences UI locales, non autoritatives sur le métier. **Seuls** les consommateurs de **présentation** (shell, tokens, `data-*`) doivent les lire — pas `filterNavigation` / `resolvePageAccess`. |

Ordre de lecture des vérités : **OpenAPI / ContextEnvelope → manifests → UserRuntimePrefs** (voir `project-structure-boundaries.md`).
