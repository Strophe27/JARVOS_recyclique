# Story B50-P10: Refactoring - Unification Stores Caisse

**Statut:** Todo  
**Épopée:** [EPIC-50 – Améliorations Exports, Permissions et Statistiques](../prd/epic-50-ameliorations-exports-permissions-stats.md)  
**Module:** Frontend Stores + Architecture  
**Priorité:** P2  
**Estimation:** 8-12 points  
**Dépendance:** B50-P9 (doit être complétée d'abord)

---

## 1. Contexte

Suite à B50-P9 (correction bugs critiques), il est nécessaire de refactorer l'architecture des stores caisse pour éviter la duplication de code et garantir la cohérence entre les 3 stores (`cashSessionStore`, `virtualCashSessionStore`, `deferredCashSessionStore`).

**Problème actuel :** Chaque ajout de fonctionnalité doit être fait 3 fois (1 par store), créant des risques de bugs silencieux et rendant la maintenance impossible.

**Objectif :** Créer une interface commune et factoriser la logique partagée pour garantir la cohérence et faciliter la maintenance.

---

## 2. User Story

En tant que **développeur**, je veux **une architecture unifiée pour les stores caisse**, afin de garantir la cohérence entre les 3 modes et faciliter la maintenance.

---

## 3. Recommandations de Refactoring

### R1 — Interface commune obligatoire

Créer une interface TypeScript `ICashSessionStore` qui définit **toutes** les méthodes avec leurs signatures exactes.

**Bénéfice :** TypeScript forcera l'implémentation complète dans chaque store.

### R2 — Factoriser la logique commune

Extraire la logique partagée (validation UUID, calcul `total_amount`, création payload API) dans des fonctions utilitaires ou une classe de base.

**Bénéfice :** Éviter la duplication et garantir la cohérence.

### R3 — Un seul point d'entrée

Tous les composants doivent utiliser `useCashStores()` (via `CashStoreProvider`), jamais `useCashSessionStore()` directement.

**Bénéfice :** Centraliser la logique de sélection du store et éviter les incohérences.

### R4 — Tests de non-régression

Ajouter des tests unitaires vérifiant que tous les stores implémentent correctement l'interface commune.

**Bénéfice :** Détecter les divergences avant qu'elles ne causent des bugs.

---

## 4. Critères d'acceptation

- [ ] **AC1 : Interface commune définie**
  - Interface `ICashSessionStore` créée avec toutes les méthodes
  - Tous les stores implémentent cette interface
  - TypeScript compile sans erreur

- [ ] **AC2 : Logique commune factorisée**
  - Fonctions utilitaires créées dans `cashSessionStoreUtils.ts`
  - Validation UUID, calcul `total_amount`, création payload API factorisés
  - Les 3 stores utilisent ces fonctions utilitaires

- [ ] **AC3 : Point d'entrée unique**
  - Aucun composant n'importe directement un store spécifique
  - Tous utilisent `useCashStores()` via `CashStoreProvider`
  - Audit de code : 0 import direct de `useCashSessionStore`, `useVirtualCashSessionStore`, `useDeferredCashSessionStore`

- [ ] **AC4 : Tests de non-régression**
  - Tests unitaires vérifiant que `submitSale` avec `overrideTotalAmount=50` enregistre 50 (pas le sous-total) dans les 3 stores
  - Tests unitaires vérifiant que `submitSale` sans `overrideTotalAmount` calcule le total depuis les items dans les 3 stores
  - Tests unitaires vérifiant que `closeSession` retourne `false` si l'API échoue dans les 3 stores
  - Tests unitaires vérifiant que `closeSession` met `currentSession` à `null` si succès dans les 3 stores

- [ ] **AC5 : Pas de régression fonctionnelle**
  - Tous les tests E2E existants passent
  - Les 3 modes (réel, virtuel, différé) fonctionnent correctement
  - Aucune régression détectée en test manuel

---

## 5. Intégration & Compatibilité

**Fichiers à créer :**
- `frontend/src/stores/interfaces/ICashSessionStore.ts` : Interface commune
- `frontend/src/stores/cashSessionStoreUtils.ts` : Fonctions utilitaires

**Fichiers à modifier :**
- `frontend/src/stores/cashSessionStore.ts` : Implémenter interface + utiliser utils
- `frontend/src/stores/virtualCashSessionStore.ts` : Implémenter interface + utiliser utils
- `frontend/src/stores/deferredCashSessionStore.ts` : Implémenter interface + utiliser utils
- Tous les composants utilisant directement un store : Remplacer par `useCashStores()`

**Références :**
- Story B50-P9 : Correction bugs (prérequis)
- `frontend/src/hooks/useCashStores.ts` : Hook existant pour sélection store

---

## 6. Dev Notes

### Architecture Cible

```
ICashSessionStore (interface)
  ├── cashSessionStore (implémentation)
  ├── virtualCashSessionStore (implémentation)
  └── deferredCashSessionStore (implémentation)

cashSessionStoreUtils.ts
  ├── validateUUID()
  ├── calculateTotalAmount()
  ├── createSalePayload()
  └── ...

useCashStores() → Retourne le bon store selon le mode
```

### R1 - Interface Commune

**Fichier :** `frontend/src/stores/interfaces/ICashSessionStore.ts` (à créer)

```typescript
import { SaleItem, CashSession, CashSessionCreate, CashSessionUpdate } from '../types';

export interface FinalizationData {
  donation: number;
  paymentMethod: 'cash' | 'card' | 'check' | 'free';
  cashGiven?: number;
  change?: number;
  note?: string;
  overrideTotalAmount?: number; // OBLIGATOIRE dans l'interface
}

export interface CloseSessionData {
  actual_amount?: number;
  variance_comment?: string;
}

export interface ICashSessionStore {
  // State
  currentSession: CashSession | null;
  currentSaleItems: SaleItem[];
  currentSaleNote: string | null;
  loading: boolean;
  error: string | null;

  // Methods
  submitSale(items: SaleItem[], finalization?: FinalizationData): Promise<boolean>;
  closeSession(sessionId: string, closeData?: CloseSessionData): Promise<boolean>;
  openSession(data: CashSessionCreate): Promise<CashSession | null>;
  refreshSession(): Promise<void>;
  // ... autres méthodes communes
}
```

**Modification des stores :** Implémenter `ICashSessionStore` :

```typescript
// cashSessionStore.ts
export const useCashSessionStore = create<CashSessionState & ICashSessionStore>()(
  // ...
);
```

### R2 - Factorisation Logique Commune

**Fichier :** `frontend/src/stores/cashSessionStoreUtils.ts` (à créer)

```typescript
import { SaleItem, SaleCreate, FinalizationData } from '../types';

/**
 * Valide si une chaîne est un UUID valide
 */
export function isValidUUID(str: string | undefined | null): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Calcule le montant total final (avec override si fourni)
 */
export function calculateTotalAmount(
  items: SaleItem[],
  finalization?: FinalizationData
): number {
  const calculatedTotal = items.reduce((sum, item) => sum + item.total, 0);
  return finalization?.overrideTotalAmount !== undefined 
    ? finalization.overrideTotalAmount 
    : calculatedTotal;
}

/**
 * Crée le payload API pour une vente
 */
export function createSalePayload(
  cashSessionId: string,
  items: SaleItem[],
  finalization?: FinalizationData,
  note?: string | null
): SaleCreate {
  return {
    cash_session_id: cashSessionId,
    items: items.map(item => {
      const presetId = item.presetId && isValidUUID(item.presetId) ? item.presetId : null;
      let notes = item.notes || null;
      
      if (item.presetId && !isValidUUID(item.presetId)) {
        const presetTypeNote = `preset_type:${item.presetId}`;
        notes = notes ? `${presetTypeNote}; ${notes}` : presetTypeNote;
      }
      
      return {
        category: item.category,
        quantity: item.quantity,
        weight: item.weight,
        unit_price: item.price,
        total_price: item.total,
        preset_id: presetId,
        notes: notes
      };
    }),
    total_amount: calculateTotalAmount(items, finalization),
    donation: finalization?.donation ?? 0,
    payment_method: finalization?.paymentMethod ?? 'cash',
    note: note || finalization?.note || null
  };
}
```

**Utilisation dans les stores :**

```typescript
// virtualCashSessionStore.ts
import { createSalePayload, calculateTotalAmount } from './cashSessionStoreUtils';

submitSale: async (items: SaleItem[], finalization?: FinalizationData): Promise<boolean> => {
  // ...
  const salePayload = createSalePayload(currentSession.id, items, finalization, get().currentSaleNote);
  // ...
}
```

### R3 - Audit Imports

**Script d'audit automatique :**

Créer `scripts/audit-store-imports.sh` :
```bash
#!/bin/bash
# audit-store-imports.sh
echo "🔍 Recherche des imports directs de stores..."
echo ""
echo "Imports à remplacer par useCashStores():"
grep -r "from.*useCashSessionStore\|from.*useVirtualCashSessionStore\|from.*useDeferredCashSessionStore" frontend/src --exclude-dir=node_modules --exclude="*.test.*" --exclude="*.spec.*" | grep -v "useCashStores" | grep -v "CashStoreProvider" || echo "✅ Aucun import direct trouvé"
echo ""
echo "✅ Audit terminé"
```

**Commande pour trouver les imports directs :**

```bash
./scripts/audit-store-imports.sh
```

**Fichiers à modifier :** Remplacer tous les imports directs par `useCashStores()`.

**Exemple :**

```typescript
// AVANT :
import { useCashSessionStore } from '../stores/cashSessionStore';
const { submitSale } = useCashSessionStore();

// APRÈS :
import { useCashStores } from '../hooks/useCashStores';
const { cashSessionStore } = useCashStores();
const { submitSale } = cashSessionStore;
```

### R4 - Tests de Non-Régression

**Fichier :** `frontend/src/test/stores/cashSessionStoreInterface.test.ts` (à créer)

```typescript
import { useCashSessionStore } from '../stores/cashSessionStore';
import { useVirtualCashSessionStore } from '../stores/virtualCashSessionStore';
import { useDeferredCashSessionStore } from '../stores/deferredCashSessionStore';
import { ICashSessionStore } from '../stores/interfaces/ICashSessionStore';

describe('ICashSessionStore Implementation', () => {
  it('should implement ICashSessionStore in cashSessionStore', () => {
    const store = useCashSessionStore.getState();
    expect(store).toHaveProperty('submitSale');
    expect(store).toHaveProperty('closeSession');
    expect(store).toHaveProperty('openSession');
    // Vérifier que toutes les méthodes de l'interface sont présentes
  });

  it('should use overrideTotalAmount in all stores', async () => {
    const stores = [
      useCashSessionStore.getState(),
      useVirtualCashSessionStore.getState(),
      useDeferredCashSessionStore.getState()
    ];

    for (const store of stores) {
      const items = [{ id: '1', category: 'EEE-1', quantity: 1, weight: 2.5, price: 0, total: 0 }];
      const finalization = {
        donation: 0,
        paymentMethod: 'cash' as const,
        overrideTotalAmount: 50
      };

      // Mock ou spy selon le store
      const result = await store.submitSale(items, finalization);
      // Vérifier que total_amount = 50 dans le payload
    }
  });
});
```

---

## 7. Tests

### Tests Unitaires

- **Interface commune** : Vérifier que tous les stores implémentent `ICashSessionStore`
- **Fonctions utilitaires** : Tester `calculateTotalAmount`, `createSalePayload`, `isValidUUID`
- **Non-régression** : Vérifier que `overrideTotalAmount` fonctionne dans les 3 stores

### Tests E2E

- Vérifier que les 3 modes fonctionnent correctement après refactoring
- Vérifier qu'aucune régression n'a été introduite
- **Test workflow clavier après refactoring** : Vérifier que le workflow clavier (B49-P5) fonctionne toujours correctement après refactoring

**Fichier :** `frontend/src/test/integration/finalization-keyboard-workflow-after-refactoring-e2e.test.tsx` (à créer)

```typescript
describe('FinalizationScreen - Keyboard Workflow After Refactoring', () => {
  it('should complete full keyboard workflow after store refactoring', async () => {
    // Test E2E complet : Total → Enter → Moyen paiement → Enter → Montant reçu → Enter → Don → Enter → Validation
    // Vérifier que le workflow clavier fonctionne toujours après refactoring
    // À implémenter selon le contexte des stores refactorisés
  });
});
```

### Audit de Code

- Script pour vérifier qu'aucun import direct n'existe (voir R3)
- Vérifier que tous les composants utilisent `useCashStores()`

---

## 8. Tasks / Subtasks

- [ ] **T1 - Créer interface commune** (AC: 1)
  - [ ] Créer `frontend/src/stores/interfaces/ICashSessionStore.ts`
  - [ ] Définir `FinalizationData` et `CloseSessionData`
  - [ ] Définir toutes les méthodes communes
  - [ ] Faire implémenter l'interface par les 3 stores
  - [ ] Vérifier compilation TypeScript

- [ ] **T2 - Factoriser logique commune** (AC: 2)
  - [ ] Créer `frontend/src/stores/cashSessionStoreUtils.ts`
  - [ ] Extraire `isValidUUID`
  - [ ] Extraire `calculateTotalAmount`
  - [ ] Extraire `createSalePayload`
  - [ ] Modifier les 3 stores pour utiliser les utils
  - [ ] Vérifier que la logique est identique

- [ ] **T3 - Audit et remplacement imports directs** (AC: 3)
  - [ ] Créer script `scripts/audit-store-imports.sh`
  - [ ] Exécuter script pour trouver tous les imports directs
  - [ ] Lister tous les fichiers à modifier
  - [ ] Remplacer par `useCashStores()` dans chaque fichier
  - [ ] Vérifier qu'aucun import direct ne reste (réexécuter script)
  - [ ] Tester que tout fonctionne

- [ ] **T4 - Tests de non-régression** (AC: 4)
  - [ ] Créer `cashSessionStoreInterface.test.ts`
  - [ ] Tester que tous les stores implémentent l'interface
  - [ ] Tester `overrideTotalAmount` dans les 3 stores
  - [ ] Tester `closeSession` dans les 3 stores
  - [ ] Vérifier que tous les tests passent

- [ ] **T5 - Tests E2E et validation** (AC: 5)
  - [ ] Exécuter tous les tests E2E existants
  - [ ] Créer test E2E workflow clavier après refactoring (`finalization-keyboard-workflow-after-refactoring-e2e.test.tsx`)
  - [ ] Tester manuellement les 3 modes
  - [ ] Vérifier qu'aucune régression n'a été introduite
  - [ ] Vérifier que le workflow clavier (B49-P5) fonctionne toujours
  - [ ] Documenter les changements

---

## 9. Risques

**Risques de régression :**
- Modifier l'architecture des stores peut impacter de nombreux composants
- Les tests E2E doivent être mis à jour si nécessaire

**Mitigation :**
- Faire le refactoring après B50-P9 (bugs critiques corrigés)
- Tests de non-régression complets avant merge
- Review de code approfondie

**Bénéfices :**
- Maintenance facilitée (1 seul endroit pour modifier la logique)
- Cohérence garantie entre les 3 stores
- Détection précoce des divergences (TypeScript + tests)

---

## 10. Références

- **Story B50-P9** : Correction bugs critiques (prérequis)
- **Story B49-P2** : Mode prix global (contexte `overrideTotalAmount`)
- **Recommandations DEV** : Analyse détaillée du refactoring

