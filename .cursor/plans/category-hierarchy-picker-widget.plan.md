# Plan d’implémentation — widget enregistré « sélecteur hiérarchique catégories »

## Contexte et objectif

Extraire la logique UI + navigation de **`KioskCategoryWorkspace`** (`peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`, ~l.745–1014) vers un **widget Peintre enregistré**, **agnostique de l’API**, avec le contrat existant **`RegisteredWidgetProps`** (`widgetProps?: Readonly<Record<string, unknown>>` dans `peintre-nano/src/registry/widget-registry.ts`).

Brancher soit :

- **Caisse / legacy** : `fetchCategoriesList` + type **`CategoryListItem`** (`peintre-nano/src/api/dashboard-legacy-stats-client.ts`, `GET /v1/categories/`).
- **Réception** : `getReceptionCategories` + type **`ReceptionCategoryRow`** (`peintre-nano/src/api/reception-client.ts`).

Réintroduire ensuite **`CashflowNominalWizard`** et **`ReceptionNominalWizard`** comme **consommateurs** du widget (ou d’un composant interne exporté partagé, voir § Architecture).

**Modèle minimal interne** (normalisé, hors wire) :

| Champ       | Rôle |
|------------|------|
| `id`       | Identifiant stable |
| `parent_id`| Parent ou `null` racine |
| `label`    | Libellé affiché (`name` côté API) |
| `ordre`    | Tri stable (`display_order` caisse ; réception : défaut ou tri dérivé documenté) |

**Métadonnées optionnelles** (hors modèle minimal mais nécessaires au comportement caisse) : conserver pour l’adaptateur caisse la possibilité de propager `shortcut_key` (ou équivalent) pour les raccourcis positionnels — soit en étendant un type `CategoryHierarchyRow` minimal + champs optionnels, soit via une **couche d’adaptation** qui joint l’item source au moment du `onPick`.

---

## État du dépôt — dossier `category-hierarchy-picker`

Le statut Git initial mentionnait des fichiers non suivis sous `peintre-nano/src/widgets/category-hierarchy-picker/` (`CategoryHierarchyPicker.tsx`, `*.module.css`, `normalize.ts`, `types.ts`). **Le dossier `peintre-nano/src/widgets/category-hierarchy-picker/` peut être absent du dépôt** (non versionné, machine locale, ou snapshot incomplet) : **ne pas supposer** qu’un code local non suivi existe — toujours partir du dépôt versionné et des extractions documentées (`KioskCategoryWorkspace`, etc.).

**Décision** : à l’implémentation,

- si le dossier existe localement : **comparer** avec le code extrait de `KioskCategoryWorkspace` et **fusionner** (éviter deux implémentations divergentes) ;
- sinon : **créer** le module sous `peintre-nano/src/widgets/category-hierarchy-picker/` en reprenant le comportement validé par les tests existants (grille kiosque, `data-testid`, raccourcis).

---

## Architecture recommandée

Les wizards (**`CashflowNominalWizard`**, **`ReceptionNominalWizard`**) importent le **core** **`CategoryHierarchyPicker`** (composant à props typées). Le **wrapper** qui implémente **`RegisteredWidgetProps`** sert CREOS/runtime (`category_source`, `presentation`, etc.) ; ce n’est **pas** un chemin d’intégration obligatoire dans les wizards — ils évitent de tout router par `Record<string, unknown>` en important le core directement.

### 1. Couches

1. **`CategoryHierarchyRow`** (nom à finaliser) : modèle normalisé `{ id, parent_id, label, ordre }` + éventuellement `meta?: unknown` ou champs optionnels typés pour `shortcut_key` (caisse uniquement).
2. **Adaptateurs purs** (sans React) :
   - `fromCategoryListItem(items: CategoryListItem[]): CategoryHierarchyRow[]`
   - `fromReceptionCategoryRow(items: ReceptionCategoryRow[]): CategoryHierarchyRow[]` (définir `ordre` : ex. `0` partout + tri secondaire par `label`, ou index si besoin).
3. **Chargement** : le widget enregistré ne peut pas recevoir de fonctions via JSON CREOS. Deux options cohérentes avec le mandat :
   - **Option A (recommandée pour CREOS + simplicité)** : `widgetProps` contient une **clé discriminante** serializable, p.ex. `category_source: 'legacy_categories' | 'reception_categories'`. Le composant utilise `useAuthPort()` et appelle **en interne** `fetchCategoriesList` ou `getReceptionCategories`, puis mappe vers `CategoryHierarchyRow[]`.
   - **Option B** : exposer **`CategoryHierarchyPicker`** comme composant interne à props (`loadRows`, `variant`, callbacks) pour les wizards qui ont besoin de contrôle fin ; le **widget enregistré** n’est qu’un **wrapper** mince qui lit `widgetProps` et délègue à Option A.

Les wizards **`CashflowNominalWizard`** / **`ReceptionNominalWizard`** peuvent soit importer le **core** (Option B), soit monter le **widget enregistré** via `resolveWidget` (plus lourd, rarement utile dans le même bundle). Le plan privilégie **import direct du composant partagé** depuis `widgets/category-hierarchy-picker/` pour garder les callbacks typés (feuille choisie, drill, reset) sans tout passer par `Record<string, unknown>`.

### 2. Variantes de présentation (important)

Le **kiosque caisse** utilise aujourd’hui un **drill-down** dans une seule grille (`KioskCategoryWorkspace`) + `browseResetEpoch`, `onContinueWithoutGrid`, raccourcis clavier globaux.

La **réception** utilise un **rail à deux niveaux** (grille racines + panneau enfants), refs DOM pour le focus, scope clavier `root` / `child`, et logique métier liée au ticket (`selectedRootId`, `categoryId`, etc.) — voir `ReceptionNominalWizard.tsx` (~l.618–1160 et JSX ~1055+).

**Conclusion** : un seul **modèle d’arbre** partagé, mais **deux modes UI** exposés via `widgetProps` et/ou props du core, p.ex. :

- `presentation: 'kiosk_drill'` — comportement actuel `KioskCategoryWorkspace`
- `presentation: 'reception_rail'` — comportement proche du bloc réception actuel

Les **`data-testid`** existants doivent rester **stables** par domaine (`cashflow-kiosk-category-*` vs `reception-category-*`) pour limiter les régressions de tests.

---

## Fichiers à toucher (ordre suggéré)

1. **`peintre-nano/src/widgets/category-hierarchy-picker/types.ts`** — modèle normalisé, enums `presentation` / `category_source`, types de callbacks.
2. **`peintre-nano/src/widgets/category-hierarchy-picker/normalize.ts`** (ou `adapters/*.ts`) — mappers depuis `CategoryListItem` et `ReceptionCategoryRow`.
3. **`peintre-nano/src/widgets/category-hierarchy-picker/CategoryHierarchyPicker.tsx`** — UI + état (`parentId` drill, ou `activeRootId` rail), effets fetch + `AbortController`, raccourcis (factoriser les constantes de touches communes si pertinent sans casser AZERTY/kiosque).
4. **`peintre-nano/src/widgets/category-hierarchy-picker/CategoryHierarchyPicker.module.css`** — styles extraits ou partagés (éviter duplication massive avec `CashflowNominalWizard.module.css` / `ReceptionNominalWizard.module.css` ; migration progressive).
5. **`peintre-nano/src/widgets/category-hierarchy-picker/CategoryHierarchyPickerWidget.tsx`** — implémente `RegisteredWidgetProps`, lit `widgetProps`, rend `CategoryHierarchyPicker`.
6. **`peintre-nano/src/registry/register-cashflow-widgets.ts`** — `registerWidget('category-hierarchy-picker', CategoryHierarchyPickerWidget)` (nom exact à aligner sur les catalogues CREOS).
7. **`peintre-nano/src/registry/register-reception-widgets.ts`** — même enregistrement **ou** centralisation dans un `register-category-widgets.ts` appelé depuis `peintre-nano/src/registry/index.ts` pour n’enregistrer qu’une fois (éviter double enregistrement si les deux bundles chargent le même type — **à trancher à l’implémentation** ; si un seul fichier `register-*` importe le widget, suffisant).
8. **`peintre-nano/src/registry/widget-registry.ts`** — **probablement aucun changement** de type ; documenter les clés `widgetProps` attendues dans un commentaire JSDoc **sur le composant widget**, pas forcément dans le registry.
9. **`peintre-nano/src/domains/cashflow/CashflowNominalWizard.tsx`** — supprimer `KioskCategoryWorkspace` et les constantes qui ne servent plus localement ; importer le picker + adaptateur/props ; conserver **`sale_kiosk_category_workspace`** et le micro-rail tel quel.
10. **`peintre-nano/src/domains/reception/ReceptionNominalWizard.tsx`** — remplacer le bloc JSX catégories + une partie des handlers par le widget en mode `reception_rail` (ou composant core) ; **préserver** la logique ticket/poste/poids hors périmètre strict du picker.
11. **`contracts/creos/manifests/widgets-catalog-cashflow-nominal.json`** — ajouter une entrée pour le nouveau `widget_type` (meta slice, story, éventuel `data_contract` hint `GET /v1/categories/` ou réutilisation réception selon variante).
12. **`contracts/creos/manifests/widgets-catalog-reception-nominal.json`** — idem pour `GET /v1/reception/categories` si applicable.
13. **`contracts/creos/manifests/page-cashflow-nominal.json`** — **facultatif** : ne changer que si une **nouvelle slot** expose le widget seul ; sinon le manifest page peut rester inchangé si seul `cashflow-nominal-wizard` est utilisé avec `widget_props` déjà fusionnés côté runtime démo (cf. `RuntimeDemoApp`). Documenter dans la story si **`sale_kiosk_category_workspace`** doit apparaître explicitement dans CREOS pour certains déploiements.
14. **`contracts/creos/manifests/page-reception-nominal.json`** — idem (souvent vide `{}` pour `reception-nominal-wizard`).
15. **`peintre-nano/docs/03-contrats-creos-et-donnees.md`** (ou doc équivalente déjà citée pour Story 13.8) — **mise à jour courte** du flux kiosque si le composant change de chemin fichier (éviter doc obsolète ; **uniquement si** le projet autorise l’édition de cette doc dans la même story).

---

## Étapes ordonnées (implémentation)

1. Créer le dossier widget + **types + adaptateurs + tests unitaires purs** des mappers (cas `parent_id` null/vide, ordre, filtrage `is_active` côté caisse uniquement).
2. Implémenter **`CategoryHierarchyPicker`** mode **`kiosk_drill`** en recopiant le comportement de `KioskCategoryWorkspace` (fetch, erreurs, loader, grille, retour parent, raccourcis, `onContinueWithoutGrid`).
3. Brancher **`CashflowNominalWizard`** sur le picker ; supprimer l’ancienne fonction interne ; exécuter les tests unitaires kiosque listés ci-dessous.
4. Implémenter mode **`reception_rail`** en migrant progressivement le JSXHandlers depuis `ReceptionNominalWizard` ; **ne pas casser** refs/`tabIndex`/accessibilité sans équivalence.
5. Ajouter **`CategoryHierarchyPickerWidget`** + **`registerWidget`** dans le(s) fichier(s) d’enregistrement approprié(s).
6. Mettre à jour **`widgets-catalog-*.json`** (+ pages CREOS seulement si nouvelle composition).
7. Passer **lint / tests** (voir § Tests) en mode **bloquant**, sans jobs en arrière-plan.

---

## Risques de régression

### Caisse / kiosque (`sale_kiosk_category_workspace`)

- Régression **GET `/v1/categories/`** (loading bloqué, `authRef` + `AbortController`, annulation au démontage).
- **Raccourcis clavier** : conflit avec `LinesStep` / micro-rail (`Escape`, `Backspace`, `Tab` vers finalisation — effets ~l.1323–1350).
- **`data-testid`** : `cashflow-kiosk-category-grid`, `cashflow-kiosk-category-{id}`, erreurs, fallback manuel.
- **Hints prix** : `selectedCategoryMeta` (`CategoryListItem`) doit rester disponible au wizard après sélection feuille.

### Réception

- **Focus** et navigation clavier (`root` vs `child`, `keyboardShortcutScope`) — risque majeur si la factorisation néglige `ref` ou `tabIndex`.
- **Hiérarchie** : distinction `hasHierarchy`, feuilles racines vs nœuds intermédiaires (logique `rootsWithChildren` / `leafRoots` actuelle).
- **`data-testid`** `reception-category-tile-*`, `reception-subcategory-tile-*`, grilles — tests e2e/unit éventuels.

### Registre / CREOS

- **Double enregistrement** du même `widget_type` si appel dans cashflow et reception registers sans garde.
  - Le **`widget-registry`** utilise en pratique `Map.set` **sans erreur** : en cas de double appel à `registerWidget` pour le même type, **le dernier enregistrement écrase le précédent** — pas d’exception, mais risque de bundle/type inattendu.
  - **Imposer un seul** `registerWidget` pour ce widget : p.ex. **`register-category-widgets.ts`** (ou équivalent) appelé **une fois** depuis **`peintre-nano/src/registry/index.ts`**, plutôt que des enregistrements dupliqués dans `register-cashflow-widgets.ts` et `register-reception-widgets.ts`.
- Catalogue CREOS désynchronisé avec `getRegisteredWidgetTypes()` si l’outil de validation est utilisé en CI.

---

## Stratégie de tests

### Tests unitaires existants (à réexécuter après refactor)

- `peintre-nano/tests/unit/cashflow-nominal-wizard-kiosk-13-8.test.tsx` — charge `/v1/categories/`, affichage grille, interactions clavier basiques selon les cas couverts.
- `peintre-nano/tests/unit/cashflow-nominal-wizard-kiosk-micro-rail-flow.test.tsx` — enchaînement micro-phases kiosque.

Adapter les imports/mocks si les composants sont déplacés ; **conserver les attentes sur URLs et testids** sauf renommage coordonné.

### Tests e2e caisse

- `peintre-nano/tests/e2e/cashflow-nominal-6-1.e2e.test.tsx` et helpers **`peintre-nano/tests/e2e/helpers/kiosk-sale-add-line.ts`** — vérifier que le parcours kiosque « ajout ligne » reste vert.

### Tests réception (bloquant si le picker touche aux catégories)

Suite **bloquante** suggérée par QA (à exécuter en CI / avant merge, sans job en arrière-plan) :

- **Unitaire** : `peintre-nano/tests/unit/reception-defensive-7-5.test.tsx` — minimum pour la couche défensive réception.
- **E2E** (si le refactor du picker impacte la sélection / les tuiles catégories) :
  - `peintre-nano/tests/e2e/reception-nominal-7-1.e2e.test.tsx`
  - `peintre-nano/tests/e2e/reception-lignes-7-3.e2e.test.tsx`

Conserver en complément tout test ciblant la grille catégories déjà présent ; à défaut, **smoke manuel** post-refactor sur sélection racine → enfant → poids.

### Nouveaux tests recommandés (priorité basse si temps limité)

- Tests unitaires du **mapper** `CategoryListItem` / `ReceptionCategoryRow` → modèle minimal.
- Un test RTL **isolé** de `CategoryHierarchyPicker` avec `fetch` mocké pour réduire la dépendance au wizard monolithique.

---

## `widget_type` proposé (alignement catalogues)

Pour figer l’alignement entre **`registerWidget`**, **`getRegisteredWidgetTypes()`** et les manifests **`widgets-catalog-*.json`** :

- **`widget_type`** : `category-hierarchy-picker` (à réutiliser tel quel dans les catalogues caisse et réception sauf contrainte métier contraire documentée).

---

## Manifests CREOS — rappel

| Fichier | Rôle |
|---------|------|
| `contracts/creos/manifests/page-cashflow-nominal.json` | Slots page caisse ; souvent pas de changement si le picker reste interne au wizard. |
| `contracts/creos/manifests/page-reception-nominal.json` | Idem réception. |
| `contracts/creos/manifests/widgets-catalog-cashflow-nominal.json` | **Ajout** du type widget + meta. |
| `contracts/creos/manifests/widgets-catalog-reception-nominal.json` | **Ajout** du même type ou variante documentée. |

---

## Livrable (ce document)

Chemin absolu du présent fichier de plan :

`d:\users\Strophe\Documents\1-IA\La Clique Qui Recycle\JARVOS_recyclique\.cursor\plans\category-hierarchy-picker-widget.plan.md`
