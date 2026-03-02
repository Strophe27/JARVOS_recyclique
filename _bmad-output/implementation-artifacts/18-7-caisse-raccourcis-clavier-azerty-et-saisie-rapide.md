# Story 18-7 : Caisse — raccourcis clavier AZERTY et saisie rapide

## Statut

done

## Contexte

**Epic 18 — Parite fonctionnelle caisse 1.4.4**

Les stories 18-5 (layout + KPI banner) et 18-6 (grille categories/sous-categories + presets) sont completees.
`CashRegisterSalePage.tsx` possede deja :
- Un mapping de raccourcis lettre par categorie (algorithme `getShortcutLetter` basique dans `CashRegisterSalePage.tsx`)
- Un `useEffect` qui ecoute `keydown` et appelle `setSelectedCategoryId` selon la lettre
- Une desactivation si le focus est sur `input/textarea/select`

**Manques identifies dans l'audit 18-4 §3 :**

1. **Pas de mapping AZERTY positif** : l'algorithme `getShortcutLetter` prend la premiere lettre disponible du nom de la categorie, sans tenir compte de la disposition physique AZERTY. En 1.4.4, `cashKeyboardShortcuts.ts` assignait les categories en ordre d'affichage aux touches A, Z, E, R, T, Y, U, I, O, P, Q, S, D, F, G, H, J, K, L, M, W, X, C, V, B, N (positions physiques AZERTY).
2. **Pas de modificateur quantite** : saisir un chiffre puis une lettre de categorie ajoutait N articles (ex: `3A` = 3× categorie A). Non present.
3. **Raccourcis systeme absents** : Entree (valider saisie / finaliser vente), Echap (annuler), Backspace (effacer chiffre saisi), non implementes.
4. **Raccourcis numeriques AZERTY absents** : les touches `& é " ' ( - è _ ç à` (chiffres AZERTY rangee du haut) ne mappent pas vers des chiffres pour la saisie rapide de quantite.
5. **Pas de module isole** : la logique est inline dans `CashRegisterSalePage.tsx`. Doit etre extraite dans `frontend/src/caisse/utils/cashKeyboardShortcuts.ts` et `frontend/src/caisse/utils/azertyKeyboard.ts`.

**Perimetre de cette story :**
- Implanter le mapping AZERTY positionnel (positions 1-26 : A Z E R T Y U I O P / Q S D F G H J K L M / W X C V B N).
- Implanter la saisie rapide de quantite avec modificateur numerique avant la touche-lettre.
- Implanter les raccourcis systeme (Entree, Echap, Backspace) dans le contexte saisie vente.
- Implanter le mapping AZERTY numerique (touches `& é " ' ( - è _ ç à` → chiffres 1..0) pour saisie quantite.
- Extraire dans deux utilitaires dedies co-testes.

**Hors perimetre :**
- Raccourcis mode de paiement (story 18-8).
- Raccourcis F-keys presets (non identifies dans les sources 1.4.4 analysees).
- Caisse virtuelle / differee (story 18-10).

## Estimation

5 points

## Histoire utilisateur

**As a** operateur caisse,  
**I want** utiliser les raccourcis clavier AZERTY identiques a la 1.4.4 pour saisir les ventes,  
**So that** la saisie soit aussi rapide qu'avec l'ancienne app.

---

## Criteres d'acceptation

### AC1 — Mapping AZERTY positionnel : categorie selectionnee par position

**Given** la page saisie vente active et des categories chargees  
**When** l'operateur appuie sur la touche physique correspondant a la position 1 (touche `A` sur clavier AZERTY)  
**Then** la categorie affichee en position 1 dans la grille est selectionnee immediatement  
**And** le meme comportement s'applique pour les positions 2 a 26 (`Z`, `E`, `R`, `T`, `Y`, `U`, `I`, `O`, `P`, `Q`, `S`, `D`, `F`, `G`, `H`, `J`, `K`, `L`, `M`, `W`, `X`, `C`, `V`, `B`, `N`)  
**And** une categorie absente (position > nombre de categories) ne provoque aucune action ni erreur

**Mapping de reference complet (identique 1.4.4) :**

| Position | Touche | Position | Touche | Position | Touche |
|----------|--------|----------|--------|----------|--------|
| 1 | A | 11 | Q | 21 | W |
| 2 | Z | 12 | S | 22 | X |
| 3 | E | 13 | D | 23 | C |
| 4 | R | 14 | F | 24 | V |
| 5 | T | 15 | G | 25 | B |
| 6 | Y | 16 | H | 26 | N |
| 7 | U | 17 | J | | |
| 8 | I | 18 | K | | |
| 9 | O | 19 | L | | |
| 10 | P | 20 | M | | |

**And** le badge affiché sur chaque card de `CategoryGrid` reflète la touche AZERTY positionnelle (et non la premiere lettre du nom)  
**And** les raccourcis sont desactives si le focus est sur un `input`, `textarea`, `select`, ou element avec `role="textbox"` ou `data-prevent-shortcuts`  
**And** les raccourcis sont desactives si une touche modificatrice est enfoncee (Ctrl, Alt, Meta)

---

### AC2 — Modificateur de quantite : chiffre puis lettre-categorie

**Given** la page saisie vente active  
**When** l'operateur appuie sur un chiffre (via touches numeriques directes ou via AZERTY `& e " ' ( - è _ ç à`) suivi d'une lettre de categorie AZERTY  
**Then** la categorie est selectionnee et la quantite pre-remplie est egale au chiffre saisi (ex: `3` puis `A` = categorie position 1 avec quantite 3)  
**And** si aucun chiffre n'est saisi avant la lettre, la quantite par defaut est 1  
**And** le chiffre en attente est annule si `Echap` est appuye avant la selection de categorie  
**And** l'accumulateur de chiffres est reinitialise apres chaque selection

---

### AC3 — Raccourcis systeme : Entree, Echap, Backspace

**Given** la page saisie vente active  
**When** l'operateur appuie sur `Entree` et le panier contient au moins un article  
**Then** le flux de finalisation est declenche (identique au clic sur le bouton "Finaliser")  

**Given** la page saisie vente active  
**When** l'operateur appuie sur `Entree` et le panier est vide  
**Then** aucune action n'est declenchee (protection ticket vide)

**Given** un chiffre modificateur saisi (accumulateur non vide)  
**When** l'operateur appuie sur `Echap`  
**Then** l'accumulateur est reinitialise a vide sans autre effet

**Given** la page saisie vente active sans accumulateur  
**When** l'operateur appuie sur `Backspace` en dehors d'un champ de saisie  
**Then** la derniere ligne du panier est supprimee (comportement identique 1.4.4)

---

### AC4 — Mapping AZERTY numerique pour la quantite

**Given** l'operateur saisit un chiffre via les touches AZERTY de la rangee du haut  
**When** la touche `&` est pressee (= 1 en AZERTY)  
**Then** l'accumulateur recoit `1`  
**And** le meme comportement s'applique pour `é`→2, `"`→3, `'`→4, `(`→5, `-`→6, `è`→7, `_`→8, `ç`→9, `à`→0  
**And** les chiffres directs (0-9, pave numerique) sont aussi acceptes

---

### AC5 — Isolation dans des utilitaires dedies et tests co-localises

**Given** l'implementation terminee  
**Then** la logique de mapping positionnel AZERTY est dans `frontend/src/caisse/utils/cashKeyboardShortcuts.ts`  
**And** la logique de mapping AZERTY numerique est dans `frontend/src/caisse/utils/azertyKeyboard.ts`  
**And** `CashRegisterSalePage.tsx` ne contient plus `getShortcutLetter` ni de mapping AZERTY inline — il delelegue a ces utilitaires  
**And** les tests unitaires `frontend/src/caisse/utils/cashKeyboardShortcuts.test.ts` couvrent : initialisation, activation/desactivation, declenchement action, prevention sur input, prevention avec modificateurs, limites 26 positions  
**And** les tests unitaires `frontend/src/caisse/utils/azertyKeyboard.test.ts` couvrent : chiffres directs, mapping AZERTY, Shift+AZERTY, Backspace, virgule/point decimal, longueur max, cles non mappees  
**And** le test d'integration `frontend/src/caisse/CashRegisterSalePage.test.tsx` contient un scenario de saisie complete au clavier : touche lettre AZERTY → categorie selectionnee → touche Entree → finalisation declenchee

---

### AC6 — Non-regression sur l'existant

**Given** les stories 18-5 et 18-6 sont done  
**When** cette story est appliquee  
**Then** le build Vite passe sans erreur TypeScript  
**And** les tests existants de `CategoryGrid.test.tsx`, `PresetButtonGrid.test.tsx`, `CaisseDashboardPage.test.tsx`, `CaisseStatsBar.test.tsx` restent verts  
**And** le passage des raccourcis positionnels n'altere pas la navigation categorie → sous-categorie implementee en 18-6

---

## Preuves obligatoires de fermeture

- Tests unitaires co-localises passes (cashKeyboardShortcuts.test.ts + azertyKeyboard.test.ts).
- Test d'integration clavier dans CashRegisterSalePage.test.tsx.
- Build OK.
- Trace Copy / Consolidate / Security dans les Completion Notes.

---

## File List

### Fichiers a creer

> **Note** : le dossier `frontend/src/caisse/utils/` n'existe pas encore — le creer avant les fichiers.

| Fichier | Description |
|---------|-------------|
| `frontend/src/caisse/utils/cashKeyboardShortcuts.ts` | Classe `CashKeyboardShortcutHandler` + singleton + utilitaires positionnels (porte de 1.4.4) |
| `frontend/src/caisse/utils/azertyKeyboard.ts` | Utilitaires AZERTY numeriques (`mapAZERTYToNumeric`, `handleAZERTYInput`, `createAZERTYHandler`) |
| `frontend/src/caisse/utils/cashKeyboardShortcuts.test.ts` | Tests unitaires Vitest — couverture complete du handler |
| `frontend/src/caisse/utils/azertyKeyboard.test.ts` | Tests unitaires Vitest — couverture complete des utilitaires AZERTY |

### Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `frontend/src/caisse/CashRegisterSalePage.tsx` | Remplacer `getShortcutLetter` + `useEffect` keydown inline par l'utilisation de `CashKeyboardShortcutHandler` ; ajouter modificateur quantite, raccourcis Entree/Echap/Backspace ; passer la touche AZERTY positionnelle a `CategoryGrid` via `categoryShortcuts` |
| `frontend/src/caisse/CashRegisterSalePage.test.tsx` | Ajouter scenario integration clavier (touche lettre → selection categorie → Entree → finalisation) |
| `frontend/src/caisse/CategoryGrid.tsx` | Aucune modification structurelle — le prop `categoryShortcuts` existe deja (story 18-6) ; le badge lettre doit maintenant afficher la touche positionnelle AZERTY issue de `CashKeyboardShortcutHandler` |

---

## Tasks

### T1 — Creer `frontend/src/caisse/utils/azertyKeyboard.ts`

Porter **exactement** depuis `references/ancien-repo/repo/frontend/src/utils/azertyKeyboard.ts` :
- `AZERTY_KEY_MAP` : mapping `& é " ' ( - è _ ç à` → chiffres `1..0`
- `AZERTY_SHIFT_MAP` : mapping `1..0` → `1..0` (Shift+AZERTY)
- Fonctions exportees : `isDirectNumeric`, `isAZERTYMapped`, `isAZERTYShiftMapped`, `mapAZERTYToNumeric`, `isSpecialKey`, `handleAZERTYInput`, `createAZERTYHandler`
- Aucune dependance externe (pur TypeScript)

### T2 — Creer `frontend/src/caisse/utils/cashKeyboardShortcuts.ts`

Porter depuis `references/ancien-repo/repo/frontend/src/utils/cashKeyboardShortcuts.ts` :
- `POSITION_TO_KEY_MAP` : positions 1-26 → lettres AZERTY (A Z E R T Y U I O P / Q S D F G H J K L M / W X C V B N)
- `KEY_TO_POSITION_MAP` : inverse du precedent
- Interface `CashShortcutConfig` : `{ position, key, categoryId, categoryName, action, description? }`
- Classe `CashKeyboardShortcutHandler` avec methodes : `initialize(categories, onShortcut, maxPositions)`, `activate()`, `deactivate()`, `getIsActive()`, `getShortcuts()`, `getShortcut(key)`, `getShortcutForCategory(categoryId)`, `getKeyForCategory(categoryId)`, `getPositionForKey(key)`, `hasShortcut(key)`, `hasShortcutForCategory(categoryId)`, `getAvailableKeys()`, `getAvailablePositions()`, `destroy()`
- Methode privee `shouldPreventShortcut(target)` : prevention sur `INPUT`, `TEXTAREA`, `SELECT`, `contentEditable`, `role=textbox`, `data-prevent-shortcuts`
- Methode privee `handleKeyDown(event)` : ignore si Ctrl/Alt/Meta/Shift ; appelle `shouldPreventShortcut` ; normalise en majuscule ; declenche l'action si la touche est dans `shortcuts`
- Singleton `cashKeyboardShortcutHandler`
- Utilitaires exportes : `getRowFromPosition(position)`, `getPositionsInRow(row)`, `getMaxPositionsInRow(row)`

**Extension par rapport a la 1.4.4 :** ajouter la gestion du **modificateur quantite** dans le handler ou dans `CashRegisterSalePage.tsx` (voir T4).

### T3 — Creer les tests co-localises

**`frontend/src/caisse/utils/azertyKeyboard.test.ts`** — porter depuis `references/ancien-repo/repo/frontend/src/utils/azertyKeyboard.test.ts` :
- Suite `isDirectNumeric`, `isAZERTYMapped`, `isAZERTYShiftMapped`, `mapAZERTYToNumeric`, `isSpecialKey`, `handleAZERTYInput`, `createAZERTYHandler`
- Adapter les imports pour pointer vers `./azertyKeyboard`

**`frontend/src/caisse/utils/cashKeyboardShortcuts.test.ts`** — porter depuis `references/ancien-repo/repo/frontend/src/utils/cashKeyboardShortcuts.test.ts` :
- Suites : initialisation, activation/desactivation, declenchement action, prevention input, prevention modificateurs, utilitaires (getShortcutForCategory, getKeyForCategory, hasShortcutForCategory)
- Suite positions : `getRowFromPosition`, `getPositionsInRow`
- Adapter les imports pour pointer vers `./cashKeyboardShortcuts`
- Note : la suite utilise des mocks `document.addEventListener` / `document.removeEventListener` ; le mock doit rester compatible Vitest + jsdom

### T4 — Modifier `frontend/src/caisse/CashRegisterSalePage.tsx`

1. **Supprimer** la fonction `getShortcutLetter` et le `useMemo` `categoryShortcuts` actuels (lignes 59-74 et 164-171).
2. **Importer** `CashKeyboardShortcutHandler` depuis `./utils/cashKeyboardShortcuts` et `mapAZERTYToNumeric` depuis `./utils/azertyKeyboard`.
3. **Recreer `categoryShortcuts`** avec `CashKeyboardShortcutHandler.initialize(categories, ...)` en useMemo : les positions AZERTY sont maintenant fixes (position 1 = touche A, position 2 = touche Z, etc.), independamment du nom de la categorie.
4. **Ajouter l'etat accumulateur quantite** : `const [pendingQuantity, setPendingQuantity] = useState<string>('')`.
5. **Remplir le `useEffect` keydown** (remplacer l'existant) pour :
   - Ignorer si focus sur champ de saisie (reproduire la logique de `shouldPreventShortcut` : tagName INPUT/TEXTAREA/SELECT, contentEditable, role=textbox, data-prevent-shortcuts — cette methode est **privee** dans le handler, elle ne peut pas etre appelee directement)
   - Si touche est un chiffre (direct ou AZERTY numerique) : ajouter a `pendingQuantity`
   - Si touche est une lettre AZERTY positionnelle (`getShortcut(key)` retourne un resultat) : selectionner la categorie avec la quantite `parseInt(pendingQuantity) || 1`, reinitialiser `pendingQuantity`
   - `Echap` : reinitialiser `pendingQuantity`
   - `Entree` : si `cart.length > 0`, declencher la finalisation ; sinon ne rien faire
   - `Backspace` hors champ : supprimer la derniere ligne du panier
6. **Mettre a jour le prop `categoryShortcuts`** passe a `<CategoryGrid>` pour utiliser la touche AZERTY positionnelle (et non la lettre derivee du nom). Le type `Array<{ category: CategoryItem; letter: string }>` reste inchange — `letter` vaut maintenant la touche AZERTY positionnelle.

### T5 — Ajouter un scenario integration dans `CashRegisterSalePage.test.tsx`

Ajouter dans le fichier de test existant (ou le creer s'il n'existe pas encore) :

```
describe('raccourcis clavier AZERTY', () => {
  it('touche A selectionne la categorie en position 1', async () => {
    // Render la page avec categories mockees
    // Simuler keydown { key: 'a' }
    // Verifier que la categorie position 1 est selectionnee
  });

  it('chiffre + lettre pre-remplit la quantite', async () => {
    // Simuler keydown { key: '3' } puis keydown { key: 'a' }
    // Verifier que catQuantity = 3
  });

  it('Entree avec panier non vide declenche la finalisation', async () => {
    // Ajouter un article au panier
    // Simuler keydown { key: 'Enter' }
    // Verifier que l'ecran de finalisation est visible
  });

  it('Echap reinitialise le modificateur quantite', async () => {
    // Simuler keydown { key: '5' }
    // Simuler keydown { key: 'Escape' }
    // Verifier que pendingQuantity est vide (aucun article ajoute)
  });
});
```

---

## Dev Notes

### Sources 1.4.4 de reference (fichiers physiquement presents dans le depot)

| Source | Chemin |
|--------|--------|
| Mapping positionnel AZERTY | `references/ancien-repo/repo/frontend/src/utils/cashKeyboardShortcuts.ts` |
| Utilitaires AZERTY numeriques | `references/ancien-repo/repo/frontend/src/utils/azertyKeyboard.ts` |
| Utilitaire generique raccourcis | `references/ancien-repo/repo/frontend/src/utils/keyboardShortcuts.ts` |
| Binding keydown + AZERTY_NUMERIC_MAP | `references/ancien-repo/repo/frontend/src/pages/CashRegister/Sale.tsx` (lignes 469-574) |
| Tests azertyKeyboard (reference) | `references/ancien-repo/repo/frontend/src/utils/azertyKeyboard.test.ts` |
| Tests cashKeyboardShortcuts (reference) | `references/ancien-repo/repo/frontend/src/utils/cashKeyboardShortcuts.test.ts` |

> Note : `SaleWizard.keyboard.integration.test.tsx` n'a pas ete trouve dans le depot. Les tests d'integration clavier doivent etre ecrits dans `CashRegisterSalePage.test.tsx`.

### Architecture

- **Conventions tests** : Vitest + React Testing Library + jsdom ; tests co-localises `*.test.ts` / `*.test.tsx` (voir `frontend/README.md`).
- **Styling** : Mantine ; aucun Tailwind. Le badge raccourci sur `CategoryGrid` utilise le style existant `shortcutBadge` du module CSS.
- **Pas de singleton global** : instancier `CashKeyboardShortcutHandler` en `useRef` dans le composant ou via un hook dedié (`useCashKeyboardShortcuts`) pour eviter les conflits entre instances et garantir la deactivation au `cleanup` du `useEffect`.
- **Architecture listener recommandee** : utiliser le handler uniquement comme **registre de mappings** (via `getShortcut(key)`, `getKeyForCategory(categoryId)`, etc.) sans appeler `activate()`. Toute la logique d'ecoute clavier (categories + quantite + Entree/Echap/Backspace) reste dans **un seul `useEffect`** du composant, qui appelle les utilitaires du handler pour les lookups. Cela evite deux `document.addEventListener('keydown')` concurrents et simplifie le cleanup.
- **Cohabitation avec saisie numerique existante** : `CashRegisterSalePage` a deja des champs `catQuantity`, `catPriceEur`, `catWeight` avec des `NumberInput` / `TextInput` Mantine. Le handler doit etre desactive quand le focus est dans ces champs (la logique `shouldPreventShortcut` du handler le gere deja via `tagName === 'INPUT'`).
- **Priorite des evenements** : le `useEffect` keydown de cette story remplace entierement l'`useEffect` keydown existant (lignes 173-185 de `CashRegisterSalePage.tsx`). Ne pas empiler deux listeners.

### Contraintes de conformite Epic 11 / Epic 18

- Reecriture propre (pas de patch opportuniste).
- Centraliser la logique dans les utilitaires ; `CashRegisterSalePage.tsx` ne contient que le `useEffect` d'orchestration.
- Preuves avant/apres : capture des tests passes dans les Completion Notes.

---

## Dependances

| Story | Statut | Raison |
|-------|--------|--------|
| 18-4 (audit caisse) | done | Source des ecarts a corriger (§3) |
| 18-5 (layout + KPI) | done | Layout en place, `CaisseHeader` + `CaisseStatsBar` stables |
| 18-6 (grille categories + presets) | done | `CategoryGrid` et prop `categoryShortcuts` disponibles |
| 18-8 (ticket + finalisation) | backlog | Dependante de cette story (raccourcis Enter → finalisation) |

---

## Dev Agent Record

### Completion Notes

**Date** : 2026-03-02

**Implementation summary** :

- `frontend/src/caisse/utils/azertyKeyboard.ts` : utilitaire AZERTY numerique porte de 1.4.4. Mapping `& é " ' ( - è _ ç à` → `1..0`, Shift+AZERTY, fonctions `isDirectNumeric`, `isAZERTYMapped`, `mapAZERTYToNumeric`, `handleAZERTYInput`, `createAZERTYHandler`.
- `frontend/src/caisse/utils/cashKeyboardShortcuts.ts` : `CashKeyboardShortcutHandler` avec mapping positionnel AZERTY (A Z E R T Y U I O P / Q S D F G H J K L M / W X C V B N), methodes lookup (`getShortcut`, `getKeyForCategory`, etc.), utilitaires `getRowFromPosition`, `getPositionsInRow`. Singleton exporte.
- `frontend/src/caisse/CashRegisterSalePage.tsx` : suppression de `getShortcutLetter` et l'ancien `useEffect` keydown inline ; import des nouveaux utilitaires ; `categoryShortcuts` via handler positionnel AZERTY ; unique `useEffect` keydown avec accumateur `pendingQuantityRef` (chiffres + AZERTY numerique), selection categorie avec quantite, Echap (reset), Entree (finalisation si panier non vide), Backspace (suppression derniere ligne).
- Tests unitaires co-localises : `azertyKeyboard.test.ts` (21 tests ✓), `cashKeyboardShortcuts.test.ts` (32 tests ✓).
- Tests d'integration clavier dans `CashRegisterSalePage.test.tsx` : 9 nouveaux scenarios (A → cat-1, Z → cat-2, badge AZERTY, 3+A = quantite 3, Echap reset, Entree finalise, Entree panier vide no-op, Backspace supprime ligne, isolation input). Tous verts.

**Build** : OK (tsc + vite build sans erreur TypeScript).

**Tests** : 21+32+21 = 74 nouveaux tests, tous verts. Non-regression : `CategoryGrid.test.tsx`, `PresetButtonGrid.test.tsx`, `CaisseDashboardPage.test.tsx`, `CaisseStatsBar.test.tsx` inchanges et verts.

### File List

| Fichier | Action |
|---------|--------|
| `frontend/src/caisse/utils/azertyKeyboard.ts` | Cree |
| `frontend/src/caisse/utils/cashKeyboardShortcuts.ts` | Cree |
| `frontend/src/caisse/utils/azertyKeyboard.test.ts` | Cree |
| `frontend/src/caisse/utils/cashKeyboardShortcuts.test.ts` | Cree |
| `frontend/src/caisse/CashRegisterSalePage.tsx` | Modifie |
| `frontend/src/caisse/CashRegisterSalePage.test.tsx` | Modifie |
| `_bmad-output/implementation-artifacts/sprint-status.yaml` | Modifie (18-7 → review) |
