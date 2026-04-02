# Types — frontière des quatre artefacts

| Module | Artefact | Rôle |
|--------|----------|------|
| `navigation-manifest.ts` | NavigationManifest | Vérité commanditaire — navigation / structure informationnelle. |
| `page-manifest.ts` | PageManifest | Vérité commanditaire — composition de page (slots / widgets CREOS). |
| `context-envelope.ts` | ContextEnvelope | Vérité backend / OpenAPI ; stubs Piste A uniquement. |
| `user-runtime-prefs.ts` | UserRuntimePrefs | Préférences UI locales, non autoritatives sur le métier. |

Ordre de lecture des vérités : **OpenAPI / ContextEnvelope → manifests → UserRuntimePrefs** (voir `project-structure-boundaries.md`).
