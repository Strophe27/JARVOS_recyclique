# Fixtures manifests (Piste A)

Jeux JSON **reviewables** simulant le commanditaire — pas une seconde vérité compile-time hors tests.

- **`valid/`** : navigation + page cohérents avec l’allowlist `widgetType` (`src/validation/allowed-widget-types.ts`).
- **`navigation-demo-home-only.json`** : nav minimale (une entrée → `demo-home`) pour tests unitaires qui ne chargent qu’une page ; **`navigation.json`** : lot complet démo runtime (story 3.7) aligné avec `public/manifests/`.
- **`peintre-nano/public/manifests/`** : copie servie en dev pour vérification manuelle via `fetch` (optionnel).
