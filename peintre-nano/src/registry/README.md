# Registre widgets (`src/registry/`)

- **`widget-registry.ts`** : enregistrement explicite `widgetType` → composant React, `resolveWidget` (succès ou erreur structurée), ensemble des types pour l’allowlist validation.
- **`register-demo-widgets.ts`** : catalogue starter préfixe `demo.*` (infra, pas métier).
- **`shell-slot-regions.ts`** : table `slot_id` → régions grille du shell (`header`, `nav`, `main`, `aside`, `footer`) ; inconnu → zone `main` avec `data-testid="page-slot-unmapped"`.

Chargement : importer `peintre-nano/src/registry` (side-effect) avant toute validation qui s’appuie sur les types enregistrés.
