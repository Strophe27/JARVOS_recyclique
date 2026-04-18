/**
 * Réponses GET `/v1/sales/payment-method-options` pour Vitest.
 * L’ordre du tableau reflète `display_order` côté serveur (testé ici tel quel).
 */
export const PAYMENT_METHOD_OPTIONS_FIXTURE_ORDERED = [
  { code: 'transfer', label: 'Virement SEPA', kind: 'bank' as const },
  { code: 'cheque_cadeau', label: 'Chèque cadeau', kind: 'other' as const },
  { code: 'cash', label: 'Espèces caisse', kind: 'cash' as const },
] as const;

export function paymentMethodOptionsJsonBody(): typeof PAYMENT_METHOD_OPTIONS_FIXTURE_ORDERED {
  return [...PAYMENT_METHOD_OPTIONS_FIXTURE_ORDERED];
}

export function isPaymentMethodOptionsUrl(url: string): boolean {
  return url.includes('/v1/sales/payment-method-options');
}
