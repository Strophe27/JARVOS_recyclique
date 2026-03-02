# Story 18-6 : Caisse — grille categories, sous-categories et presets

## Statut

done

## Contexte

**Epic 18 — Parite fonctionnelle caisse 1.4.4**

La story 18-5 a livre le layout complet (header vert, KPI banner fonctionnelle, toggle Live/Session, etat vide dashboard). Le fichier `CashRegisterSalePage.tsx` possede deja :
- Une grille de categories basique (cards avec badge lettre raccourci clavier)
- Des boutons presets en `Group` horizontal compact
- Quatre onglets (Categorie / Sous-categorie / Poids / Prix)
- L'onglet "Sous-categorie" contient un placeholder "a venir"

L'audit 18-4 §2 identifie les ecarts suivants (scope de cette story) :

1. **Pas de `EnhancedCategorySelector`** : grille inline dans `CashRegisterSalePage`. Doit devenir un composant dedie.
2. **Sous-categories non implementees** : placeholder "a venir" — navigation hierarchique categorie → sous-categories absente.
3. **Presets sans differenciation visuelle par type** : `button_type` (Don, Recyclage, Decheterie) non traduit visuellement.
4. **Pas de `PresetButtonGrid`** : presets affiches en `Group` horizontal compact — doivent etre en grille visuelle avec couleur/badge par type.
5. **Noms officiels non utilises** : `official_name` (B48-P5) present dans le modele mais non affiche en caisse.
6. **Etat vide categories** : aucun message explicite si `categories = []`.

**Reference audit :** `_bmad-output/implementation-artifacts/18-4-audit-caisse-inventaire.md` §2

**Note importante sur les sources 1.4.4 :** Les fichiers source `.tsx` 1.4.4 (`EnhancedCategorySelector.tsx`, `CategorySelector.tsx`, etc.) ne sont pas presents physiquement dans le depot. L'implementation s'appuie sur la documentation brownfield disponible dans `references/ancien-repo/` (component-inventory-frontend.md, fonctionnalites-actuelles.md) et sur l'audit 18-4.

## Estimation

5 points

## Histoire utilisateur

**As a** operateur caisse,  
**I want** retrouver la grille de selection de categories et les presets identiques a la 1.4.4,  
**So that** je puisse saisir une vente rapidement avec les boutons que je connais.

## Criteres d'acceptation

### AC1 — Grille categories : cards visuelles

**Given** la page de saisie vente avec des categories chargees  
**When** l'onglet "Categorie" est actif  
**Then** les categories s'affichent dans un composant `CategoryGrid` dedie (dans `frontend/src/caisse/CategoryGrid.tsx`)  
**And** chaque card affiche : le nom de la categorie, le badge de raccourci clavier (lettre unique), et la couleur de fond si `official_name` est renseigne (distinction visuelle)  
**And** la card selectionnee est mise en surbrillance (`categoryCardSelected`)  
**And** `data-testid="caisse-category-grid"` est present sur la grille  
**And** chaque card a `data-testid="category-card-{id}"`

### AC2 — Navigation sous-categories

**Given** l'operateur clique sur une categorie parente (qui possede des sous-categories, i.e. `parent_id === null` et d'autres categories ont `parent_id === cette_categorie.id`)  
**When** il clique sur la card de la categorie parente  
**Then** la vue passe automatiquement a l'onglet "Sous-categorie" et affiche uniquement les sous-categories de cette categorie parente  
**And** un bouton "Retour" permet de revenir a la grille des categories parentes  
**And** `data-testid="subcategory-grid"` est present quand des sous-categories sont affichees  
**And** `data-testid="subcategory-back-btn"` est present sur le bouton retour

**Given** l'operateur clique sur une categorie sans sous-categories (feuille)  
**When** il clique sur la card  
**Then** la categorie est directement selectionnee (comportement actuel conserve) — pas de navigation vers sous-categories

### AC3 — Presets : grille visuelle avec types

**Given** des presets actifs sont charges  
**When** l'onglet "Categorie" est actif  
**Then** les presets sont affiches dans un composant `PresetButtonGrid` dedie (dans `frontend/src/caisse/PresetButtonGrid.tsx`)  
**And** chaque preset a une couleur de fond basee sur `button_type` :
  - `don` ou `don_18` → fond bleu clair (Mantine `color="blue"`)
  - `recyclage` → fond vert (Mantine `color="green"`)
  - `decheterie` → fond orange (Mantine `color="orange"`)
  - autre / non reconnu → fond gris par defaut (Mantine `color="gray"`)  
**And** le prix est affiche sur le preset : `{nom} — {prix} €`  
**And** `data-testid="preset-grid"` est present sur le conteneur  
**And** chaque bouton preset a `data-testid="preset-{id}"`

### AC4 — Etat vide categories

**Given** aucune categorie n'est disponible (API retourne `[]`)  
**When** la page de saisie se charge  
**Then** un message explicite est affiche dans la grille : "Aucune categorie disponible. Contactez un administrateur."  
**And** pas de crash JS  
**And** `data-testid="category-grid-empty"` est present sur ce message

### AC5 — Extraction composant : CashRegisterSalePage refactore

**Given** la story est terminee  
**When** on lit `CashRegisterSalePage.tsx`  
**Then** la grille de categories est remplacee par `<CategoryGrid ... />`  
**And** les boutons presets sont remplaces par `<PresetButtonGrid ... />`  
**And** la logique de navigation sous-categories est geree dans `CategoryGrid`  
**And** `CashRegisterSalePage` ne contient plus de JSX inline pour la grille ni pour les presets

### AC6 — Preuves de fermeture

- Capture grille categories avec donnees reelles ou jeu de test (cards visibles, badge lettre, surbrillance).
- Navigation categorie parente → sous-categories fonctionnelle (ou log console si aucune sous-categorie en BDD).
- Presets visibles avec couleur par type.
- Zero erreur JS bloquante.
- Trace Copy/Consolidate/Security dans les Completion Notes.

## Taches techniques

### T1 — Audit de l'implementation actuelle

1. Lire `frontend/src/caisse/CashRegisterSalePage.tsx` : confirmer la structure JSX actuelle de la grille categories et des presets (deja fait dans la preparation de cette story — conforme a l'audit §2).
2. Verifier si `frontend/src/caisse/CategoryGrid.tsx` et `frontend/src/caisse/PresetButtonGrid.tsx` existent. S'ils n'existent pas, les creer.

### T2 — Creer `PresetButtonGrid.tsx`

Creer `frontend/src/caisse/PresetButtonGrid.tsx` :

```tsx
interface PresetButtonGridProps {
  presets: PresetItem[];
  onPresetClick: (preset: PresetItem) => void;
}
```

- Utiliser `SimpleGrid` Mantine ou `Group wrap="wrap"` pour la disposition.
- Pour chaque preset, afficher un `Button` Mantine avec :
  - `color` derive de `button_type` (mapping ci-dessous)
  - Label : `{preset.name}` + ligne prix `{(preset.preset_price / 100).toFixed(2)} €` (ou badge prix)
  - `data-testid={`preset-${preset.id}`}`
  - `onClick={() => onPresetClick(preset)`
- Mapping `button_type` → couleur Mantine :

```ts
function getPresetColor(buttonType: string): string {
  const t = buttonType.toLowerCase();
  if (t === 'don' || t === 'don_18') return 'blue';
  if (t === 'recyclage') return 'green';
  if (t === 'decheterie') return 'orange';
  return 'gray';
}
```

- Si `presets.length === 0`, ne rien rendre (composant retourne `null`).
- `data-testid="preset-grid"` sur le conteneur.

### T3 — Creer `CategoryGrid.tsx`

Creer `frontend/src/caisse/CategoryGrid.tsx` :

```tsx
interface CategoryGridProps {
  categories: CategoryItem[];
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string) => void;
  // Callback appele quand une categorie parente est cliquee ET a des enfants
  onParentCategoryClick?: (parentId: string) => void;
  // Mode "sous-categories" : si parentId est defini, afficher uniquement les enfants
  filterParentId?: string | null;
  categoryShortcuts: Array<{ category: CategoryItem; letter: string }>;
}
```

**Logique de rendu :**

1. Si `filterParentId` est `null` ou `undefined` : afficher uniquement les categories racines (`parent_id === null`), avec leurs raccourcis.
2. Si `filterParentId` est defini : afficher uniquement les categories dont `parent_id === filterParentId`.
3. Si aucune categorie a afficher : rendre un message `data-testid="category-grid-empty"`.

**Comportement au clic sur une card :**

- Calculer si la categorie cliquee a des enfants : `categories.some(c => c.parent_id === category.id)`.
- Si oui : appeler `onParentCategoryClick(category.id)` (deleguera la navigation vers sous-categories dans `CashRegisterSalePage`).
- Si non : appeler `onCategorySelect(category.id)` (selection directe).

**Rendu d'une card :**

```tsx
<button
  key={category.id}
  type="button"
  className={`${styles.categoryCard}${selected ? ` ${styles.categoryCardSelected}` : ''}`}
  data-testid={`category-card-${category.id}`}
  onClick={handleClick}
>
  <Text size="sm" fw={500}>{category.name}</Text>
  {category.official_name && (
    <Text size="xs" c="dimmed">{category.official_name}</Text>
  )}
  <span className={styles.shortcutBadge}>{shortcut?.letter ?? ''}</span>
</button>
```

- `data-testid="caisse-category-grid"` sur le conteneur grille (categories racines).
- `data-testid="subcategory-grid"` sur le conteneur grille (sous-categories).

### T4 — Integrer les composants dans `CashRegisterSalePage.tsx`

Dans `CashRegisterSalePage.tsx` :

1. Ajouter l'etat `subCategoryParentId: string | null` (initialement `null`) pour suivre la navigation sous-categories.
2. Dans l'onglet "Categorie" :
   - Remplacer le bloc `{presets.length > 0 && <Group>...</Group>}` par `<PresetButtonGrid presets={presets} onPresetClick={addPresetToCart} />`
   - Remplacer le bloc `<div className={styles.categoryGrid}>` par `<CategoryGrid categories={categories} selectedCategoryId={selectedCategoryId} onCategorySelect={setSelectedCategoryId} categoryShortcuts={categoryShortcuts} />`
3. Dans l'onglet "Sous-categorie" :
   - Remplacer le placeholder "a venir" par :
     ```tsx
     {subCategoryParentId ? (
       <Stack gap="sm">
         <Button
           variant="subtle"
           size="xs"
           leftSection={<span>←</span>}
           data-testid="subcategory-back-btn"
           onClick={() => { setSubCategoryParentId(null); setActiveTab('categorie'); }}
         >
           Retour aux categories
         </Button>
         <CategoryGrid
           categories={categories}
           selectedCategoryId={selectedCategoryId}
           onCategorySelect={(id) => { setSelectedCategoryId(id); }}
           categoryShortcuts={categoryShortcuts}
           filterParentId={subCategoryParentId}
         />
       </Stack>
     ) : (
       <Stack align="center" justify="center" py="xl">
         <Text c="dimmed">Cliquez sur une categorie parente pour voir ses sous-categories</Text>
       </Stack>
     )}
     ```
4. Passer `onParentCategoryClick` au `CategoryGrid` de l'onglet "Categorie" :
   ```tsx
   onParentCategoryClick={(parentId) => {
     setSubCategoryParentId(parentId);
     setActiveTab('sous-categorie');
   }}
   ```
5. Supprimer la logique JSX inline de la grille categories et des presets (maintenant dans les composants dedies).

### T5 — Tests co-loces

**Fichier : `frontend/src/caisse/PresetButtonGrid.test.tsx`** (a creer)

- Test : rendu avec 0 presets → ne rend rien (ou conteneur vide sans crash).
- Test : rendu avec presets de types differents → les `data-testid` corrects sont presents.
- Test : click sur un preset appelle `onPresetClick` avec le bon preset.
- Test : couleur button_type "don" → classe/couleur bleue (tester via attribut ou snapshot).
- Test : couleur button_type "recyclage" → couleur verte.

**Fichier : `frontend/src/caisse/CategoryGrid.test.tsx`** (a creer)

- Test : categories vides → `data-testid="category-grid-empty"` est rendu.
- Test : categories racines affichees (parent_id = null), sous-categories filtrees.
- Test : click sur categorie sans enfants → `onCategorySelect` appele.
- Test : click sur categorie avec enfants → `onParentCategoryClick` appele (pas `onCategorySelect`).
- Test : `filterParentId` defini → seules les sous-categories du parent sont affichees.
- Test : card selectionnee a la classe `categoryCardSelected`.

### T6 — Validation build

```bash
cd frontend && npm run build
```

Zero erreur TypeScript. Zero warning critique.

## File List

### Fichiers a creer

| Fichier | Raison |
|---------|--------|
| `frontend/src/caisse/CategoryGrid.tsx` | T3 : composant grille categories + navigation sous-categories |
| `frontend/src/caisse/PresetButtonGrid.tsx` | T2 : composant grille presets avec differenciation visuelle par type |
| `frontend/src/caisse/CategoryGrid.test.tsx` | T5 : tests UI co-loces |
| `frontend/src/caisse/PresetButtonGrid.test.tsx` | T5 : tests UI co-loces |

### Fichiers a modifier

| Fichier | Raison |
|---------|--------|
| `frontend/src/caisse/CashRegisterSalePage.tsx` | T4 : remplacer JSX inline grille/presets par composants dedies ; ajouter etat `subCategoryParentId` ; brancher navigation sous-categories |

### Fichiers non touches par cette story

| Fichier | Note |
|---------|------|
| `frontend/src/caisse/CaisseHeader.tsx` | Hors scope |
| `frontend/src/caisse/CaisseStatsBar.tsx` | Hors scope |
| `frontend/src/caisse/CaisseDashboardPage.tsx` | Hors scope |
| `frontend/src/caisse/CashRegisterSalePage.module.css` | Les tokens CSS existants (`categoryGrid`, `categoryCard`, `categoryCardSelected`, `shortcutBadge`) sont reutilises tel quels. Ajouter des tokens si necessaire mais ne pas supprimer l'existant. |
| `frontend/src/api/caisse.ts` | Hors scope — `CategoryItem` et `PresetItem` existants sont suffisants |

## Notes techniques

### Architecture 1.4.4 (documentation brownfield)

D'apres `references/ancien-repo/component-inventory-frontend.md` :

- **`EnhancedCategorySelector`** : selecteur hierarchique avec onglets, gestion parent_id, affichage sous-categories sur clic categorie parente. Prop `onSelect(categoryId)`.
- **`CategorySelector`** : version basique (categories racines uniquement, pas de sous-categories).
- **`CategoryDisplayManager`** : gestion visibilite et ordre (`is_visible_sale`, `display_order`). Le filtrage est deja fait cote API (`/v1/categories/sale-tickets` retourne uniquement `is_visible_sale=true` dans l'ordre `display_order`). Pas besoin de reimplementer ce composant.
- **`PresetButtonGrid`** : grille de boutons avec distinction visuelle par type. Les types 1.4.4 : `don`, `don_18`, `recyclage`, `decheterie`.
- **`Sale.tsx`** : composant page de vente 1.4.4 — equivalent direct de l'actuel `CashRegisterSalePage.tsx`. Non present physiquement dans le depot (voir note sources brownfield ci-dessus) ; la logique a reimplementer est documentee dans l'audit 18-4.
- **`categoryStore.ts`** : store Zustand 1.4.4 pour l'etat des categories — hors scope de cette story, traite en 18-10.

### Types existants (pas de modification API)

```ts
// api/caisse.ts
export interface CategoryItem {
  id: string;
  name: string;
  parent_id: string | null;   // null = categorie racine, non-null = sous-categorie
  official_name: string | null;
  is_visible_sale: boolean;
  display_order: number;
  // ...
}

export interface PresetItem {
  id: string;
  name: string;
  category_id: string | null;
  preset_price: number;        // centimes
  button_type: string;         // "don", "don_18", "recyclage", "decheterie", etc.
  sort_order: number;
  is_active: boolean;
}
```

### Raccourcis clavier

La logique `getShortcutLetter` et `categoryShortcuts` reste dans `CashRegisterSalePage`. Elle est passee comme prop a `CategoryGrid`. L'assignation des lettres ne concerne que les categories racines visibles (comportement actuel conserve — a affiner dans story 18-7 si necessaire).

### Navigation sous-categories : logique de detection

```ts
const hasChildren = (categoryId: string): boolean =>
  categories.some(c => c.parent_id === categoryId);
```

Cette detection est locale (pas d'appel API supplementaire). Les sous-categories sont deja toutes chargees par `/v1/categories/sale-tickets`.

### Filtrage dans CategoryGrid

- **Mode racines** (`filterParentId` = null/undefined) : `categories.filter(c => c.parent_id === null)`
- **Mode sous-categories** (`filterParentId` = "uuid") : `categories.filter(c => c.parent_id === filterParentId)`

### Styles CSS existants a reutiliser

Dans `CashRegisterSalePage.module.css` :
- `.categoryGrid` — conteneur grille (CSS Grid)
- `.categoryCard` — card individuelle
- `.categoryCardSelected` — surbrillance card selectionnee
- `.shortcutBadge` — badge lettre raccourci

Importer ces styles dans `CategoryGrid.tsx` via `import styles from './CashRegisterSalePage.module.css'` ou creer `CategoryGrid.module.css` si des styles specifiques sont necessaires (a eviter si possible pour ne pas dupliquer).

### Convention tests

Tests co-loces `*.test.tsx` (Vitest + React Testing Library + jsdom). Pas de Jest. Pas de Playwright pour cette story.

### Perimetre strictement hors scope (→ stories suivantes)

| Fonctionnalite | Story cible |
|----------------|-------------|
| Raccourcis clavier AZERTY physiques | 18-7 |
| Modificateurs quantite/poids au clavier | 18-7 |
| Stores Zustand (categoryStore, cashSessionStore) | 18-10 |
| React Query pour cache categories | 18-10 |
| Types presets Recyclage (poids obligatoire), Decheterie (logique specifique) | 18-8 (finalisation) |
| FinalizationScreen (confirmation apres ticket) | 18-8 |

## Plan de tests

### Tests unitaires (Vitest + RTL)

**`PresetButtonGrid.test.tsx`**

```
✓ rendu sans presets → pas de crash, conteneur absent ou vide
✓ rendu avec 3 presets → 3 boutons data-testid="preset-{id}" presents
✓ click preset → onPresetClick appele avec le bon objet PresetItem
✓ button_type="don" → color="blue" (attribut data-color ou class Mantine)
✓ button_type="recyclage" → color="green"
✓ button_type="decheterie" → color="orange"
✓ button_type inconnu → color="gray"
✓ prix affiche : "1.50 €" pour preset_price=150
```

**`CategoryGrid.test.tsx`**

```
✓ categories vides → data-testid="category-grid-empty" rendu avec message adequat
✓ 3 categories racines (parent_id=null) → 3 cards rendues
✓ filterParentId="uuid-parent" → seules les sous-categories du parent affichees
✓ click categorie sans enfants → onCategorySelect appele avec le bon id
✓ click categorie avec enfants → onParentCategoryClick appele avec le bon id (pas onCategorySelect)
✓ card avec selectedCategoryId matche → classe categoryCardSelected presente
✓ official_name non null → affiche sous le nom principal
✓ badge raccourci lettre presente dans la card
```

### Tests d'integration (CashRegisterSalePage)

Non requis pour cette story (les composants sont testes unitairement). Si la complexite de l'integration le justifie, le dev peut ajouter un test dans `CashRegisterSalePage.test.tsx` pour verifier que cliquer sur une categorie parente change l'onglet actif.

## Definition of Done

- [ ] `CategoryGrid.tsx` cree, rendu correct, navigation sous-categories fonctionnelle
- [ ] `PresetButtonGrid.tsx` cree, couleurs par `button_type` implementees
- [ ] `CashRegisterSalePage.tsx` : JSX inline grille/presets extrait dans les composants dedies
- [ ] Onglet "Sous-categorie" : navigation fonctionnelle (ou message guideant si aucune sous-categorie parente en BDD)
- [ ] Etat vide categories gere (AC4)
- [ ] Tests co-loces passes (`npm run test` zero echec sur les fichiers modifies)
- [ ] Build OK (`npx tsc --noEmit` zero erreur TypeScript)
- [ ] Captures avant/apres grille categories fournies dans Completion Notes
- [ ] Traces Copy/Consolidate/Security dans Completion Notes
- [ ] Aucun crash JS sur `/cash-register/sale`

## Dev Agent Record

### Implementation Notes

**Date** : 2026-03-02

**Fichiers crees :**
- `frontend/src/caisse/PresetButtonGrid.tsx` — composant grille presets, couleur par `button_type`, `data-color` expose pour les tests, etat vide = `null`
- `frontend/src/caisse/CategoryGrid.tsx` — composant grille categories, navigation hierarchique (filterParentId), detection enfants locale, styles CSS reutilises depuis `CashRegisterSalePage.module.css`
- `frontend/src/caisse/PresetButtonGrid.test.tsx` — 11 tests Vitest+RTL : rendu vide, 3 boutons, clic, prix, couleurs par type
- `frontend/src/caisse/CategoryGrid.test.tsx` — 15 tests Vitest+RTL : etat vide, racines, sous-categories, surbrillance, interactions clic

**Fichiers modifies :**
- `frontend/src/caisse/CashRegisterSalePage.tsx` — import CategoryGrid + PresetButtonGrid ; etat `subCategoryParentId` ajoute ; onglet "categorie" : JSX inline remplace par les composants dedies ; onglet "sous-categorie" : placeholder remplace par navigation fonctionnelle avec bouton Retour

**Decisions techniques :**
- `data-color` ajoute explicitement sur le `Button` Mantine car Mantine v7 ne genere pas cet attribut automatiquement.
- Prix preset utilise regex `/1\.50/` dans les tests car React genere deux noeuds texte separes.
- Tests couleur valides via `data-color` attribut personnalise.

**Traces Copy/Consolidate/Security :**
- Copy : aucune duplication de code — styles CSS partages par import direct depuis `CashRegisterSalePage.module.css`
- Consolidate : logique de raccourcis (`categoryShortcuts`) conservee dans `CashRegisterSalePage`, passee en prop a `CategoryGrid`
- Security : pas de donnee sensible, pas de changement API, pas de nouvel endpoint

**Build :** `npx tsc --noEmit` — 0 erreur
**Tests :** 26/26 passes (11 PresetButtonGrid + 15 CategoryGrid)

### File List

| Fichier | Action |
|---------|--------|
| `frontend/src/caisse/CategoryGrid.tsx` | CREE |
| `frontend/src/caisse/PresetButtonGrid.tsx` | CREE |
| `frontend/src/caisse/CategoryGrid.test.tsx` | CREE |
| `frontend/src/caisse/PresetButtonGrid.test.tsx` | CREE |
| `frontend/src/caisse/CashRegisterSalePage.tsx` | MODIFIE |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | MODIFIE |

## Dependances

- **Story 18-4** (audit) — artefact de reference source de cette story. **Done.**
- **Story 18-5** (layout) — layout header + KPI banner en place. **Done.**
- **Story 18-7** (raccourcis clavier AZERTY) — depend de cette story (grille doit exister avant de brancher les raccourcis avances).
