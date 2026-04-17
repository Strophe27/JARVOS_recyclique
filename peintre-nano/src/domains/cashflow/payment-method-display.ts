import type { SalePaymentMethodOption } from '../../api/sales-client';

/** Libellé UI du mode gratuit / don sans encaissement (hors table `payment_methods`). */
export const DEFAULT_FREE_PAYMENT_LABEL = 'Gratuit / don';

/** Carte code expert → libellé issu de `GET /v1/sales/payment-method-options`. */
export type PaymentMethodLabelMap = ReadonlyMap<string, string>;

export function paymentMethodLabelMapFromOptions(
  options: readonly SalePaymentMethodOption[],
): PaymentMethodLabelMap {
  const m = new Map<string, string>();
  for (const o of options) {
    m.set(o.code, o.label);
  }
  return m;
}

export function unknownPaymentMethodLabel(code: string): string {
  const c = code.trim().length > 0 ? code.trim() : '(vide)';
  return `Libellé inconnu (${c})`;
}

/**
 * Résout l'affichage d'un code : pas de repli inventé espèces/chèque/carte ;
 * code absent de la carte → message minimal ; `free` → libellé dédié.
 */
export function labelForCode(
  code: string,
  map: PaymentMethodLabelMap,
  freeLabel: string = DEFAULT_FREE_PAYMENT_LABEL,
): string {
  if (code === 'free') return freeLabel;
  const fromMap = map.get(code);
  if (fromMap !== undefined) return fromMap;
  return unknownPaymentMethodLabel(code);
}
