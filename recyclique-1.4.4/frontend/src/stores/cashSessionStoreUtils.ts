/**
 * Fonctions utilitaires partagées entre les stores de session de caisse
 * Story B50-P10: Unification des stores caisse
 * 
 * Ces fonctions factorisent la logique commune pour garantir la cohérence
 * entre cashSessionStore, virtualCashSessionStore et deferredCashSessionStore.
 */

import type { 
  SaleItem, 
  SaleCreate, 
  SaleItemPayload,
  FinalizationData 
} from './interfaces/ICashSessionStore';

// ============================================
// Validation
// ============================================

/**
 * Valide si une chaîne est un UUID valide (v4)
 * 
 * @param str - Chaîne à valider
 * @returns true si c'est un UUID valide
 * 
 * @example
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000') // true
 * isValidUUID('don-0') // false
 * isValidUUID(null) // false
 */
export function isValidUUID(str: string | undefined | null): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Valide un montant numérique
 * 
 * @param amount - Montant à valider
 * @returns true si le montant est un nombre valide >= 0
 */
export function isValidAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && !isNaN(amount) && amount >= 0;
}

/**
 * Parse et valide un montant (string ou number)
 * 
 * @param amount - Montant à parser
 * @returns Le montant parsé ou null si invalide
 */
export function parseAmount(amount: string | number | undefined | null): number | null {
  if (amount === undefined || amount === null) return null;
  
  const parsed = typeof amount === 'number' 
    ? amount 
    : parseFloat(String(amount).replace(',', '.'));
  
  if (isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

// ============================================
// Calculs
// ============================================

/**
 * Calcule le montant total d'une vente
 * 
 * Story B49-P2: Utilise overrideTotalAmount si fourni (mode prix global),
 * sinon calcule automatiquement depuis les items.
 * 
 * @param items - Items de la vente
 * @param finalization - Données de finalisation (optionnel)
 * @returns Le montant total
 * 
 * @example
 * // Calcul automatique
 * calculateTotalAmount([{ total: 10 }, { total: 20 }]) // 30
 * 
 * // Override manuel (mode prix global)
 * calculateTotalAmount([{ total: 0 }], { overrideTotalAmount: 50 }) // 50
 */
export function calculateTotalAmount(
  items: SaleItem[],
  finalization?: FinalizationData
): number {
  // Story B49-P2: Si overrideTotalAmount est fourni, l'utiliser
  if (finalization?.overrideTotalAmount !== undefined) {
    return finalization.overrideTotalAmount;
  }
  
  // Sinon, calculer depuis les items
  return items.reduce((sum, item) => sum + item.total, 0);
}

/**
 * Calcule le sous-total des items (sans override)
 * 
 * @param items - Items de la vente
 * @returns Le sous-total calculé depuis les items
 */
export function calculateSubtotal(items: SaleItem[]): number {
  return items.reduce((sum, item) => sum + item.total, 0);
}

// ============================================
// Création de payloads API
// ============================================

/**
 * Transforme un SaleItem en SaleItemPayload pour l'API
 * 
 * Gère la conversion du presetId:
 * - Si c'est un UUID valide → preset_id
 * - Sinon → stocké dans notes pour traçabilité
 * 
 * @param item - Item de la vente
 * @returns Payload pour l'API
 */
export function createSaleItemPayload(item: SaleItem): SaleItemPayload {
  // Si presetId est un UUID valide, l'utiliser comme preset_id
  const presetId = item.presetId && isValidUUID(item.presetId) ? item.presetId : null;
  let notes = item.notes || null;
  
  // Si presetId n'est pas un UUID valide (ex: "don-0", "don-18"),
  // l'ajouter dans notes pour préserver l'information du type de preset
  if (item.presetId && !isValidUUID(item.presetId)) {
    const presetTypeNote = `preset_type:${item.presetId}`;
    notes = notes ? `${presetTypeNote}; ${notes}` : presetTypeNote;
  }
  
  return {
    category: item.subcategory || item.category,
    quantity: item.quantity,
    weight: item.weight,
    unit_price: item.price,
    total_price: item.total,
    preset_id: presetId,
    notes: notes
  };
}

/**
 * Crée le payload complet pour soumettre une vente à l'API
 * 
 * @param cashSessionId - ID de la session de caisse
 * @param items - Items de la vente
 * @param finalization - Données de finalisation
 * @param currentSaleNote - Note de la vente (optionnel)
 * @returns Payload complet pour POST /v1/sales/
 * 
 * @example
 * const payload = createSalePayload(
 *   'session-123',
 *   items,
 *   { donation: 5, paymentMethod: 'cash', overrideTotalAmount: 50 },
 *   'Note de vente'
 * );
 * // payload.total_amount === 50 (utilise overrideTotalAmount)
 */
export function createSalePayload(
  cashSessionId: string,
  items: SaleItem[],
  finalization?: FinalizationData,
  currentSaleNote?: string | null
): SaleCreate {
  return {
    cash_session_id: cashSessionId,
    items: items.map(createSaleItemPayload),
    total_amount: calculateTotalAmount(items, finalization),
    donation: finalization?.donation ?? 0,
    payment_method: finalization?.paymentMethod ?? 'cash',
    note: finalization?.note || currentSaleNote || null
  };
}

// ============================================
// Génération d'IDs
// ============================================

/**
 * Génère un ID unique pour un item de vente
 * 
 * @param prefix - Préfixe pour l'ID (par défaut: 'item')
 * @returns ID unique
 * 
 * @example
 * generateItemId() // 'item-1702345678901-abc123def'
 * generateItemId('virtual-item') // 'virtual-item-1702345678901-xyz789'
 */
export function generateItemId(prefix: string = 'item'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Génère un ID virtuel (pour le mode virtuel/démo)
 * 
 * @param prefix - Préfixe pour l'ID
 * @returns ID virtuel unique
 */
export function generateVirtualId(prefix: string = 'virtual'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Extraction d'erreurs
// ============================================

/**
 * Extrait un message d'erreur lisible depuis une erreur API
 * 
 * Gère les erreurs de validation Pydantic (array de détails)
 * et les erreurs simples (string).
 * 
 * @param error - Erreur à traiter
 * @param defaultMessage - Message par défaut si extraction impossible
 * @returns Message d'erreur lisible
 */
export function extractErrorMessage(
  error: unknown,
  defaultMessage: string = 'Une erreur est survenue'
): string {
  if (!error) return defaultMessage;
  
  // Erreur Axios avec response.data.detail
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as { response?: { data?: { detail?: unknown } }; message?: string };
    
    if (axiosError.response?.data?.detail) {
      const detail = axiosError.response.data.detail;
      
      // Erreur de validation Pydantic (array)
      if (Array.isArray(detail)) {
        const errors = detail.map((e: { loc?: string[]; msg?: string; message?: string }) => {
          const msg = e.msg || e.message || JSON.stringify(e);
          return e.loc?.join('.') ? `${e.loc.join('.')}: ${msg}` : msg;
        });
        return errors.join(', ');
      }
      
      // Erreur simple (string)
      if (typeof detail === 'string') {
        return detail;
      }
    }
    
    // Erreur avec message
    if (axiosError.message) {
      return axiosError.message;
    }
  }
  
  // Error standard
  if (error instanceof Error) {
    return error.message;
  }
  
  return defaultMessage;
}

// ============================================
// État du scroll
// ============================================

/**
 * Crée l'état initial du scroll
 */
export function createInitialScrollState() {
  return {
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    canScrollUp: false,
    canScrollDown: false,
    isScrollable: false
  };
}

/**
 * Calcule l'état du scroll à partir de la position
 * 
 * @param scrollTop - Position actuelle du scroll
 * @param scrollHeight - Hauteur totale du contenu
 * @param clientHeight - Hauteur visible
 */
export function calculateScrollState(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
) {
  return {
    scrollTop,
    scrollHeight,
    clientHeight,
    canScrollUp: scrollTop > 0,
    canScrollDown: scrollTop < scrollHeight - clientHeight - 1,
    isScrollable: scrollHeight > clientHeight
  };
}






