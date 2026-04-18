# Widgets (`src/widgets/`)

Implémentations React des blocs déclarés dans les manifests. Chaque widget :

- reçoit des **props JSON** via `widgetProps` (objet plat sérialisable, camelCase après ingest) ;
- utilise **CSS Modules** + variables `var(--pn-…)` (ADR P1) ;
- peut employer **Mantine** à l’intérieur du bloc (pas pour le layout shell).

Dossier **`demo/`** : catalogue starter préfixe `demo.*`, enregistré dans `src/registry/register-demo-widgets.ts`.
