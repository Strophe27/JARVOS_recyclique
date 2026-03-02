# Story 18-10 — Caisse virtuelle et saisie différée

## Story

**Titre :** Caisse virtuelle et saisie différée — pages dédiées + stores isolés

**User Story :**
En tant qu'opérateur caisse,
je veux utiliser la caisse virtuelle (simulation) et la saisie différée (cahiers anciens) avec le même workflow que la caisse réelle mais clairement identifiés visuellement,
afin de pouvoir m'entraîner sans impacter les données réelles ou saisir des ventes passées avec leur date exacte.

---

## Status

`done`

---

## Context

### Résumé

L'Epic 18 aligne l'app JARVOS_recyclique sur la parité fonctionnelle 1.4.4.
Les stories 18.5 à 18.9 ont livré la caisse réelle complète (layout, catégories, raccourcis, ticket, paiements, ouverture/fermeture de session).

Cette story 18.10 complète l'Epic 18 en implémentant les deux modes spéciaux :

1. **Caisse virtuelle** (`/cash-register/virtual`) : flux identique à la caisse réelle, mais session de type `virtual`. Aucun impact sur les données de production. Store Zustand **en mémoire** (pas de persistence localStorage) pour isoler le state virtuel.

2. **Saisie différée** (`/cash-register/deferred`) : flux identique à la caisse réelle, mais session de type `deferred` avec une date réelle passée. Store Zustand dédié trackant la `deferredDate`. Indicateur visuel permanent "MODE DIFFÉRÉ — Date : JJ/MM/AAAA".

### Ce qui existe déjà (ne pas recréer)

- Boutons "Simuler" (`/cash-register/virtual`) et "Accéder" (`/cash-register/deferred`) dans `CaisseDashboardPage.tsx` ✓
- Routes autorisées `/cash-register/virtual` et `/cash-register/deferred` dans `cashRegisterRoutes.ts` ✓
- Store base `useCashSessionStore.ts` (Story 18-9) avec `openSession(token, { session_type })` ✓
- `CashRegisterSessionOpenPage.tsx` gère déjà `session_type = 'virtual' | 'deferred'` et `opened_at` pour le différé ✓
- `CashRegisterSalePage.tsx` (Stories 18.5–18.8) : page de vente complète ✓
- `CashRegisterSessionClosePage.tsx` (Story 18-9) ✓

### Ce qui n'existe pas et doit être créé

- `VirtualCashRegisterPage.tsx` : page dédiée caisse virtuelle avec indicateur visuel SIMULATION
- `virtualCashSessionStore.ts` : store Zustand in-memory, `isVirtual: true`, isolation du state
- `DeferredCashRegisterPage.tsx` : page dédiée saisie différée avec indicateur visuel MODE DIFFÉRÉ
- `deferredCashSessionStore.ts` : store Zustand avec `deferredDate` et `isDeferred: true`
- Tests co-locés pour les deux pages et les deux stores

### Dépendances

- **Stories 18.5–18.9** : caisse de base complète (header, grille, raccourcis, ticket, paiements, ouverture/fermeture) — toutes `done`
- **Story 18-9** : `useCashSessionStore.ts` (store session réelle) — modèle pour les stores virtual/deferred
- `CashRegisterItem.enable_virtual` et `CashRegisterItem.enable_deferred` : flags API pour activer/désactiver les modes par poste
- Route `/cash-register/session/open?session_type=virtual` ou `?session_type=deferred` : passage du type de session à `CashRegisterSessionOpenPage`

---

## Estimation

**5 story points** — deux flux complets (virtual + deferred) partageant l'architecture de la caisse réelle, mais nécessitant chacun un store dédié, une page dédiée et des tests co-locés.

---

## Acceptance Criteria

### AC1 — Caisse virtuelle : accès et session

**Given** l'opérateur clique "Simuler" sur le dashboard caisse  
**When** il arrive sur `/cash-register/virtual`  
**Then** une page dédiée `VirtualCashRegisterPage` s'affiche avec un indicateur visuel permanent "MODE VIRTUEL — SIMULATION" (Badge blue dans le header)  
**And** le flux d'ouverture de session utilise `session_type = 'virtual'` (pré-rempli, non modifiable)

### AC2 — Caisse virtuelle : isolation des données

**Given** l'opérateur effectue des ventes en mode virtuel  
**When** des tickets sont créés  
**Then** `virtualCashSessionStore` (store Zustand in-memory, sans persist localStorage) est utilisé  
**And** les données de la session virtuelle n'apparaissent pas dans le store réel `useCashSessionStore`  
**And** à la fermeture de la page/session virtuelle, le store virtuel est remis à zéro

### AC3 — Caisse virtuelle : workflow complet

**Given** une session virtuelle est ouverte  
**When** l'opérateur saisit des ventes  
**Then** il accède à `CashRegisterSalePage` avec un badge "SIMULATION" dans `CaisseHeader`  
**And** il peut fermer la session virtuelle via `CashRegisterSessionClosePage`  
**And** le flow retourne sur `/cash-register/virtual` (ou `/caisse`) après fermeture

### AC4 — Saisie différée : accès et sélection de date

**Given** l'opérateur clique "Accéder" (saisie différée) sur le dashboard  
**When** il arrive sur `/cash-register/deferred`  
**Then** une page dédiée `DeferredCashRegisterPage` s'affiche  
**And** un champ de sélection de la date réelle du cahier est présent et obligatoire  
**And** après sélection de la date, le flux d'ouverture utilise `session_type = 'deferred'` et `opened_at = <date sélectionnée>`

### AC5 — Saisie différée : indicateur visuel et store dédié

**Given** une session différée est ouverte  
**When** l'opérateur saisit des ventes  
**Then** `deferredCashSessionStore` stocke `deferredDate` et `isDeferred: true`  
**And** un indicateur permanent "MODE DIFFÉRÉ — Date : JJ/MM/AAAA" est visible dans `CaisseHeader` ou en bannière  
**And** le champ `sale_date` dans `CashRegisterSalePage` est pré-rempli avec `deferredDate` (modifiable par ticket)

### AC6 — Tests co-locés passants

**Given** l'implémentation est terminée  
**When** `npm test` s'exécute  
**Then** les tests suivants passent :
- `VirtualCashRegisterPage.test.tsx` (render, navigation, badge SIMULATION)
- `virtualCashSessionStore.test.ts` (actions, isolation, reset)
- `DeferredCashRegisterPage.test.tsx` (render, sélection date, navigation)
- `deferredCashSessionStore.test.ts` (actions, deferredDate, isDeferred)

---

## Technical Notes

### Architecture des stores

**`virtualCashSessionStore.ts`** — Zustand in-memory (PAS de `persist`)

```ts
interface VirtualCashSessionState {
  currentSession: CashSessionItem | null;
  isVirtual: true;
  loading: boolean;
  error: string | null;
  openSession(token: string, body: { initial_amount: number; register_id: string }): Promise<CashSessionItem | null>;
  closeSession(token: string, sessionId: string, body: CloseBody): Promise<boolean>;
  reset(): void;
  clearError(): void;
}
// Créer avec create<VirtualCashSessionState>()(devtools(...)) SANS persist
// La clé devtools : 'virtual-cash-session-store'
// openSession force session_type = 'virtual' (pas de override possible)
```

**`deferredCashSessionStore.ts`** — Zustand avec persist (clé `deferredCashSession`)

```ts
interface DeferredCashSessionState {
  currentSession: CashSessionItem | null;
  deferredDate: string | null;      // ISO date "YYYY-MM-DD"
  isDeferred: true;
  loading: boolean;
  error: string | null;
  setDeferredDate(date: string): void;
  openSession(token: string, body: { initial_amount: number; register_id: string; opened_at: string }): Promise<CashSessionItem | null>;
  closeSession(token: string, sessionId: string, body: CloseBody): Promise<boolean>;
  reset(): void;
  clearError(): void;
}
// persist partielle : { currentSession, deferredDate }
// onRehydrateStorage : si currentSession?.status !== 'open', reset currentSession
```

### Architecture des pages

**`VirtualCashRegisterPage.tsx`**
- Composant page à `/cash-register/virtual`
- Deux phases : 
  1. Si `virtualStore.currentSession` est null → formulaire d'ouverture (fond de caisse + poste) via `CashRegisterSessionOpenPage` ou inline, avec `session_type='virtual'` pré-fixé
  2. Si session ouverte → redirige vers `/cash-register/sale` (la page de vente existante) en injectant le contexte virtuel
- Badge "SIMULATION" (blue, `variant="filled"`) dans le header ou via prop vers `CaisseHeader`
- Utilise `virtualCashSessionStore` exclusivement (ne touche pas `useCashSessionStore`)

**`DeferredCashRegisterPage.tsx`**
- Composant page à `/cash-register/deferred`
- Deux phases :
  1. Si `deferredStore.currentSession` est null → formulaire de sélection de date + fond de caisse + poste, `session_type='deferred'` pré-fixé
  2. Si session ouverte → redirige vers `/cash-register/sale` en passant le contexte différé
- Badge "DIFFÉRÉ" (orange, `variant="filled"`) + date affichée
- Utilise `deferredCashSessionStore` exclusivement

### Indicateur visuel dans CaisseHeader

`CaisseHeader.tsx` devra accepter une prop optionnelle `modeIndicator?: React.ReactNode` pour afficher un badge SIMULATION ou DIFFÉRÉ.

Alternativement : passer une prop `sessionMode?: 'virtual' | 'deferred' | 'real'` et afficher le badge en interne.

Choisir la solution la plus légère sans réécrire le header.

### Isolation des données

- La session virtuelle crée bien une session en BDD avec `session_type='virtual'` — c'est l'API qui gère l'isolation côté données. Le frontend isole uniquement le state Zustand (pas de pollution du store réel).
- La session différée crée une vraie session BDD avec `session_type='deferred'` et `opened_at` dans le passé. Isolation Zustand aussi.

### Routeur

Vérifier que les routes `/cash-register/virtual` et `/cash-register/deferred` sont enregistrées dans `App.tsx` (ou le routeur principal) avec les nouveaux composants page. Ces routes sont déjà dans `cashRegisterRoutes.ts` comme autorisées ; il faut ajouter les `<Route>` React Router.

### Références 1.4.4

Les fichiers source 1.4.4 (`VirtualCashRegister.tsx`, `virtualCashSessionStore.ts`, `deferredCashSessionStore.ts`) **ne sont pas présents physiquement** dans le repo (confirmé par l'audit 18-4). S'appuyer sur :
- L'audit `18-4-audit-caisse-inventaire.md` §8 et §9 pour les spécifications fonctionnelles
- `useCashSessionStore.ts` (Story 18-9) comme modèle direct pour les deux nouveaux stores

---

## File List

### Fichiers à créer

| Fichier | Type | Description |
|---------|------|-------------|
| `frontend/src/caisse/virtualCashSessionStore.ts` | Store Zustand | Store in-memory session virtuelle |
| `frontend/src/caisse/virtualCashSessionStore.test.ts` | Test | Tests store virtuel |
| `frontend/src/caisse/VirtualCashRegisterPage.tsx` | Composant page | Page `/cash-register/virtual` |
| `frontend/src/caisse/VirtualCashRegisterPage.test.tsx` | Test | Tests page virtuelle |
| `frontend/src/caisse/deferredCashSessionStore.ts` | Store Zustand | Store session différée avec deferredDate |
| `frontend/src/caisse/deferredCashSessionStore.test.ts` | Test | Tests store différé |
| `frontend/src/caisse/DeferredCashRegisterPage.tsx` | Composant page | Page `/cash-register/deferred` |
| `frontend/src/caisse/DeferredCashRegisterPage.test.tsx` | Test | Tests page différée |

### Fichiers à modifier

| Fichier | Modification | Raison |
|---------|-------------|--------|
| `frontend/src/caisse/CaisseHeader.tsx` | Ajouter prop `modeIndicator?: React.ReactNode` (ou `sessionMode`) | Afficher badge SIMULATION/DIFFÉRÉ |
| `frontend/src/App.tsx` (ou routeur principal) | Ajouter `<Route path="/cash-register/virtual">` et `<Route path="/cash-register/deferred">` | Enregistrer les nouvelles routes |
| `frontend/src/caisse/index.ts` | Exporter les nouveaux composants et stores | Convention projet |
| `frontend/src/caisse/CashRegisterSalePage.tsx` | Detecter le mode (virtual/deferred) via stores Zustand globaux ; passer `modeIndicator` a `CaisseHeader` ; pre-remplir `sale_date` depuis `deferredCashSessionStore.deferredDate` | Badge mode visible + `sale_date` pre-rempli en mode differe |
| `frontend/src/caisse/CashRegisterSessionClosePage.tsx` | Lire le mode courant pour rediriger vers `/cash-register/virtual` ou `/cash-register/deferred` apres fermeture ; appeler le bon store selon le mode | AC3 : retour vers la route source apres fermeture |
| `frontend/src/caisse/CashRegisterSessionOpenPage.tsx` *(conditionnel)* | Si approche query param choisie : accepter `?session_type=virtual` ou `deferred` et verrouiller le champ type ; sinon formulaire inline dans les pages dediees | Dev Notes : choisir UNE approche et s y tenir |

---

## Tasks

### T1 — Store `virtualCashSessionStore.ts`

- [ ] Créer `frontend/src/caisse/virtualCashSessionStore.ts`
- [ ] Modéliser l'interface `VirtualCashSessionState` (currentSession, isVirtual: true, loading, error)
- [ ] Implémenter `openSession` : force `session_type = 'virtual'`, appelle `openCashSession` depuis `../api/caisse`
- [ ] Implémenter `closeSession` : appelle `closeCashSession`, puis reset `currentSession`
- [ ] Implémenter `reset()` : remet tout à null (pas de persist, simple set)
- [ ] Implémenter `clearError()`
- [ ] PAS de middleware `persist` (store in-memory intentionnel)
- [ ] Ajouter devtools avec name `'virtual-cash-session-store'`

### T2 — Tests `virtualCashSessionStore.test.ts`

- [ ] Créer `frontend/src/caisse/virtualCashSessionStore.test.ts`
- [ ] Test : état initial (currentSession null, loading false)
- [ ] Test : `openSession` success → currentSession mise à jour, isVirtual reste true
- [ ] Test : `openSession` error → error mise à jour, loading false
- [ ] Test : `closeSession` success → currentSession null
- [ ] Test : `reset()` → remet tout à l'état initial
- [ ] Test : `openSession` force bien `session_type = 'virtual'` dans le payload (mock fetch)

### T3 — Store `deferredCashSessionStore.ts`

- [ ] Créer `frontend/src/caisse/deferredCashSessionStore.ts`
- [ ] Modéliser l'interface `DeferredCashSessionState` (currentSession, deferredDate, isDeferred: true, loading, error)
- [ ] Implémenter `setDeferredDate(date: string)` : met à jour deferredDate
- [ ] Implémenter `openSession` : force `session_type = 'deferred'`, passe `opened_at = deferredDate` dans le payload
- [ ] Implémenter `closeSession` : appelle `closeCashSession`, puis reset currentSession (garder deferredDate pour éventuelle reprise)
- [ ] Implémenter `reset()` : remet currentSession et deferredDate à null
- [ ] Implémenter `clearError()`
- [ ] Ajouter `persist` avec clé `'deferredCashSession'`, partialize `{ currentSession, deferredDate }`
- [ ] `onRehydrateStorage` : si `currentSession?.status !== 'open'`, reset currentSession

### T4 — Tests `deferredCashSessionStore.test.ts`

- [ ] Créer `frontend/src/caisse/deferredCashSessionStore.test.ts`
- [ ] Test : état initial
- [ ] Test : `setDeferredDate` → deferredDate mise à jour, isDeferred reste true
- [ ] Test : `openSession` force `session_type = 'deferred'` et `opened_at = deferredDate`
- [ ] Test : `openSession` sans deferredDate → erreur ou rejet (guard)
- [ ] Test : `closeSession` success → currentSession null, deferredDate conservée
- [ ] Test : `reset()` → deferredDate et currentSession à null

### T5 — Modifier `CaisseHeader.tsx` : prop indicateur mode

- [ ] Lire `CaisseHeader.tsx` pour comprendre la structure actuelle
- [ ] Ajouter prop optionnelle `modeIndicator?: React.ReactNode`
- [ ] Afficher `modeIndicator` dans le header (ex : à côté du nom de la session ou en Badge sous le nom)
- [ ] Ne pas casser les tests existants de `CaisseHeader` (ajouter valeur par défaut `undefined`)

### T6 — Page `VirtualCashRegisterPage.tsx`

- [ ] Créer `frontend/src/caisse/VirtualCashRegisterPage.tsx`
- [ ] Utiliser `virtualCashSessionStore`
- [ ] Phase 1 (pas de session) : formulaire inline ou via `CashRegisterSessionOpenPage` avec `defaultSessionType='virtual'`
  - Champs : sélection poste (GET `/v1/cash-registers` filtrés sur `enable_virtual = true`), fond de caisse (défaut 0)
  - Bouton "Démarrer la simulation" → appelle `virtualStore.openSession(...)`
  - Badge "SIMULATION" (blue, `variant="filled"`) bien visible en haut de page
- [ ] Phase 2 (session ouverte) : naviguer vers `/cash-register/sale` (le store virtuel est accessible globalement)
- [ ] Passer `modeIndicator={<Badge color="blue" variant="filled">SIMULATION</Badge>}` à `CaisseHeader` si intégré
- [ ] Nettoyage : appeler `virtualStore.reset()` sur démontage si session fermée

### T7 — Tests `VirtualCashRegisterPage.test.tsx`

- [ ] Créer `frontend/src/caisse/VirtualCashRegisterPage.test.tsx`
- [ ] Mock `virtualCashSessionStore` (vi.mock)
- [ ] Test : rendu page sans session → formulaire affiché, badge "SIMULATION" visible
- [ ] Test : badge "SIMULATION" avec `data-testid="virtual-mode-badge"` présent dans le DOM
- [ ] Test : soumission formulaire → `openSession` appelée avec `session_type = 'virtual'`
- [ ] Test : avec session ouverte → navigation vers `/cash-register/sale`
- [ ] Test : seuls les postes avec `enable_virtual = true` sont listés

### T8 — Page `DeferredCashRegisterPage.tsx`

- [ ] Créer `frontend/src/caisse/DeferredCashRegisterPage.tsx`
- [ ] Utiliser `deferredCashSessionStore`
- [ ] Phase 1 (pas de session) : formulaire avec :
  - Champ date "Date réelle du cahier" (obligatoire, `DateInput` Mantine ou `<input type="date">`) → appelle `deferredStore.setDeferredDate(...)`
  - Sélection poste (`enable_deferred = true`)
  - Fond de caisse (défaut 0)
  - Vérification doublon : GET `/v1/cash-sessions/deferred/check?date=<date>` (appel existant dans `CashRegisterSessionOpenPage`)
  - Bouton "Ouvrir la session différée" → appelle `deferredStore.openSession(...)`
  - Badge "DIFFÉRÉ" (orange) bien visible
- [ ] Phase 2 (session ouverte) : naviguer vers `/cash-register/sale`
- [ ] Passer `modeIndicator={<Badge color="orange" variant="filled">DIFFÉRÉ — {formatDate(deferredDate)}</Badge>}` à `CaisseHeader`

### T9 — Tests `DeferredCashRegisterPage.test.tsx`

- [ ] Créer `frontend/src/caisse/DeferredCashRegisterPage.test.tsx`
- [ ] Mock `deferredCashSessionStore` (vi.mock)
- [ ] Test : rendu → champ date visible, badge "DIFFÉRÉ" présent
- [ ] Test : saisie date → `setDeferredDate` appelée
- [ ] Test : soumission → `openSession` appelée avec `session_type = 'deferred'` et `opened_at` correct
- [ ] Test : message d'erreur doublon si vérification doublon retourne conflit
- [ ] Test : avec session ouverte → navigation vers `/cash-register/sale`

### T10 — Enregistrement des routes dans le routeur principal

- [ ] Localiser `App.tsx` ou le fichier de définition des routes React Router
- [ ] Ajouter `<Route path="/cash-register/virtual" element={<VirtualCashRegisterPage />} />`
- [ ] Ajouter `<Route path="/cash-register/deferred" element={<DeferredCashRegisterPage />} />`
- [ ] Vérifier que les routes sont protégées par `CashRegisterGuard` si applicable

### T11 — Export `index.ts`

- [ ] Ajouter dans `frontend/src/caisse/index.ts` les exports :
  - `export { VirtualCashRegisterPage } from './VirtualCashRegisterPage'`
  - `export { DeferredCashRegisterPage } from './DeferredCashRegisterPage'`
  - `export { useVirtualCashSessionStore } from './virtualCashSessionStore'`
  - `export { useDeferredCashSessionStore } from './deferredCashSessionStore'`

### T13 — Modifier `CashRegisterSalePage.tsx` : detection du mode

- [ ] Lire `CashRegisterSalePage.tsx` pour comprendre comment la session courante est obtenue
- [ ] Detecter le mode en lisant `useVirtualCashSessionStore().currentSession` et `useDeferredCashSessionStore().currentSession` (Zustand globaux)
- [ ] Construire `modeIndicator` selon le mode : Badge blue `SIMULATION` / Badge orange `DIFFERE — {date}` / undefined
- [ ] Passer `modeIndicator` a `CaisseHeader`
- [ ] En mode differe : initialiser `saleDate` avec `deferredStore.deferredDate` (modifiable par ticket)
- [ ] Ne pas casser les tests existants de `CashRegisterSalePage` (le mode `real` = comportement actuel inchange)

### T14 — Modifier `CashRegisterSessionClosePage.tsx` : redirection selon le mode

- [ ] Detecter le mode courant (virtual/deferred) au montage de la page
- [ ] Apres fermeture reussie : rediriger vers `/cash-register/virtual` si mode virtual, `/cash-register/deferred` si mode deferred, `/caisse` sinon
- [ ] Appeler `virtualStore.reset()` apres fermeture session virtuelle
- [ ] Appeler `deferredStore.reset()` apres fermeture session differee (si besoin de vider la date)
- [ ] Ne pas casser le comportement fermeture session reelle

### T12 — Validation build et tests

- [ ] `npm run build` dans `frontend/` → 0 erreur TypeScript
- [ ] `npm test` → tous les nouveaux tests passants
- [ ] Vérifier visuellement `/cash-register/virtual` depuis le dashboard (badge SIMULATION visible)
- [ ] Vérifier visuellement `/cash-register/deferred` (badge DIFFÉRÉ visible, champ date présent)

---

## Dev Notes

### Pattern de référence pour les stores

S'appuyer directement sur `useCashSessionStore.ts` (Story 18-9) comme modèle.

- `virtualCashSessionStore` = copier `useCashSessionStore` + supprimer le bloc `persist` + ajouter `isVirtual: true as const` + forcer `session_type = 'virtual'` dans `openSession`
- `deferredCashSessionStore` = copier `useCashSessionStore` + adapter `persist` (clé `deferredCashSession`) + ajouter `deferredDate` + `setDeferredDate` + `isDeferred: true as const` + forcer `session_type = 'deferred'` et `opened_at = deferredDate` dans `openSession`

### Réutilisation maximale

- Ne pas recréer le formulaire d'ouverture de session from scratch. Option recommandée : passer `defaultSessionType` en query param (`/cash-register/session/open?session_type=virtual`) et modifier `CashRegisterSessionOpenPage` pour pré-remplir et verrouiller le type de session. Cela évite de dupliquer le formulaire.
  - Alternative : formulaire léger inline dans les pages virtual/deferred (fond de caisse + poste uniquement, le type étant fixé).
  - **Choisir l'approche la plus légère** selon l'état de `CashRegisterSessionOpenPage`.

### Import `openCashSession` / `closeCashSession`

Ces fonctions existent déjà dans `../api/caisse`. Les stores virtual et deferred les appellent directement (même pattern que `useCashSessionStore`).

### Champ `sale_date` pour le différé

Dans `CashRegisterSalePage`, le champ `sale_date` est déjà présent. En mode différé, pré-remplir ce champ avec `deferredStore.deferredDate` (lire le store depuis la page de vente). L'utilisateur peut modifier la date par ticket si besoin.

### Vérification doublon session différée

`GET /v1/cash-sessions/deferred/check?date=YYYY-MM-DD` est déjà appelé dans `CashRegisterSessionOpenPage.tsx`. Réutiliser la même logique dans `DeferredCashRegisterPage`.

### enable_virtual / enable_deferred

`CashRegisterItem` expose `enable_virtual: boolean` et `enable_deferred: boolean`. Filtrer les postes dans les formulaires d'ouverture (ne proposer que les postes qui supportent le mode demandé).

### Detection du mode dans CashRegisterSalePage

Les stores Zustand sont globaux. Pattern pour detecter le mode actif :

```ts
const virtualSession = useVirtualCashSessionStore(s => s.currentSession);
const deferredSession = useDeferredCashSessionStore(s => s.currentSession);
const deferredDate = useDeferredCashSessionStore(s => s.deferredDate);

const sessionMode = virtualSession ? 'virtual' : deferredSession ? 'deferred' : 'real';
```

Attention : si la session reelle (`useCashSessionStore`) est aussi ouverte simultanement, privilegier la logique de la page qui a initie la navigation. En pratique, un seul mode est actif a la fois.

### Tests

- Utiliser `vi.mock('../caisse/virtualCashSessionStore')` / `vi.mock('../caisse/deferredCashSessionStore')` dans les tests de pages
- Pour les tests de stores : mocker `fetch` avec `vi.stubGlobal('fetch', vi.fn(...))` ou `msw` si déjà configuré dans le projet
- Convention co-localisation : fichiers `.test.ts` et `.test.tsx` dans le même dossier `frontend/src/caisse/`

---

## Completion Notes

**Implémenté le 2026-03-02 — build OK, 32 nouveaux tests passants (0 régression).**

### Fichiers créés

| Fichier | Description |
|---------|-------------|
| `frontend/src/caisse/virtualCashSessionStore.ts` | Store Zustand in-memory, `isVirtual: true`, force `session_type = 'virtual'` |
| `frontend/src/caisse/virtualCashSessionStore.test.ts` | 9 tests unitaires store virtuel |
| `frontend/src/caisse/VirtualCashRegisterPage.tsx` | Page `/cash-register/virtual` : badge SIMULATION, formulaire inline |
| `frontend/src/caisse/VirtualCashRegisterPage.test.tsx` | 6 tests page virtuelle |
| `frontend/src/caisse/deferredCashSessionStore.ts` | Store Zustand persist `deferredCashSession`, `isDeferred: true`, `setDeferredDate` |
| `frontend/src/caisse/deferredCashSessionStore.test.ts` | 10 tests unitaires store différé |
| `frontend/src/caisse/DeferredCashRegisterPage.tsx` | Page `/cash-register/deferred` : badge DIFFÉRÉ, champ date obligatoire, vérification doublon |
| `frontend/src/caisse/DeferredCashRegisterPage.test.tsx` | 7 tests page différée |

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `frontend/src/caisse/CaisseHeader.tsx` | Prop `modeIndicator?: ReactNode` ajoutée, affichée dans le Group du header |
| `frontend/src/caisse/CashRegisterSalePage.tsx` | Détection mode via stores Zustand globaux, badge SIMULATION/DIFFÉRÉ passé à CaisseHeader, pré-remplissage `saleDate` en mode différé |
| `frontend/src/caisse/CashRegisterSessionClosePage.tsx` | Détection mode, redirection dynamique après fermeture (virtual → `/cash-register/virtual`, deferred → `/cash-register/deferred`, real → `/caisse`), reset des stores après fermeture |
| `frontend/src/App.tsx` | Routes `/cash-register/virtual` et `/cash-register/deferred` pointent vers les nouvelles pages |
| `frontend/src/caisse/index.ts` | Exports `VirtualCashRegisterPage`, `DeferredCashRegisterPage`, `useVirtualCashSessionStore`, `useDeferredCashSessionStore` |

### Trace Copy
Fichiers 1.4.4 de référence documentaires (non présents physiquement dans le repo — confirmé audit 18-4) :
- `VirtualCashRegister.tsx`, `virtualCashSessionStore.ts`, `deferredCashSessionStore.ts` → spec §8 et §9 de `18-4-audit-caisse-inventaire.md` utilisée.
- Modèle direct : `useCashSessionStore.ts` (Story 18-9).

### Trace Consolidate
- **Approche formulaire inline** choisie (vs query param sur `CashRegisterSessionOpenPage`) : plus légère, isolation propre des stores. La page open existante reste inchangée.
- **Filtre postes** : `VirtualCashRegisterPage` filtre sur `enable_virtual = true` ; `DeferredCashRegisterPage` filtre sur `enable_deferred = true`.
- **closeSession** dans la page de fermeture : l'API `getCurrentCashSession` retourne la session virtuelle/différée (session DB réelle) → `useCashSessionStore.refreshSession` fonctionne pour les 3 modes. Après fermeture, les stores virtual/deferred sont resettés.
- **`deferredDate` conservée après `closeSession`** pour éventuelle reprise (spec T3).
- **Badge dans CashRegisterSalePage** : ajout de `data-testid="sale-virtual-mode-badge"` et `"sale-deferred-mode-badge"` pour les tests futurs.

### Trace Security
- **Isolation données virtual** : le frontend utilise `virtualCashSessionStore` (in-memory, jamais persisté), sans toucher `useCashSessionStore`. L'API gère l'isolation côté DB via `session_type = 'virtual'`.
- **Isolation données deferred** : `deferredCashSessionStore` persist uniquement `currentSession` + `deferredDate` (clé `deferredCashSession`). Au rehydrate, si session non ouverte → reset automatique.
- **Cross-contamination** : les 3 stores (real, virtual, deferred) sont complètement indépendants. La détection du mode dans CashRegisterSalePage/ClosePage lit les stores globaux en read-only.

### Scénario caisse virtuelle
1. Dashboard caisse → "Simuler" → `/cash-register/virtual`
2. Badge "MODE VIRTUEL — SIMULATION" visible
3. Sélection poste (filtre `enable_virtual = true`) + fond de caisse → "Démarrer la simulation"
4. `virtualCashSessionStore.openSession()` avec `session_type = 'virtual'` → session créée en DB
5. Redirection automatique → `/cash-register/sale` avec badge "SIMULATION" dans CaisseHeader
6. Saisie ventes normales
7. "Fermer la Caisse" → `/cash-register/session/close` → fermeture → `virtualStore.reset()` → retour `/cash-register/virtual`

### Scénario saisie différée
1. Dashboard caisse → "Accéder" → `/cash-register/deferred`
2. Badge "MODE DIFFÉRÉ" visible
3. Saisie date réelle (obligatoire) → vérification doublon optionnelle → sélection poste + fond
4. `deferredCashSessionStore.openSession()` avec `session_type = 'deferred'` + `opened_at`
5. Redirection → `/cash-register/sale` avec badge "DIFFÉRÉ — JJ/MM/AAAA" + `saleDate` pré-remplie
6. Saisie ventes avec date pré-remplie (modifiable par ticket)
7. Fermeture → `deferredStore.reset()` → retour `/cash-register/deferred`
