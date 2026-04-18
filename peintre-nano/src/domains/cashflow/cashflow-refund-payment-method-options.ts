import type { SalePaymentMethodOption, SaleReversalRefundPaymentMethod } from '../../api/sales-client';

const LEGACY_REFUND_CODES: readonly SaleReversalRefundPaymentMethod[] = ['cash', 'card', 'check'];

const STATIC_REFUND_LABELS: Record<SaleReversalRefundPaymentMethod, string> = {
  cash: 'Espèces',
  card: 'Carte bancaire',
  check: 'Chèque',
};

/**
 * `SaleReversalCreate.refund_payment_method` est limité à l'enum OpenAPI `PaymentMethod` (cash|card|check).
 * On réutilise les libellés du référentiel expert uniquement lorsque le `code` actif correspond à ces trois clés.
 */
export function buildRefundWizardPaymentMethodSelectData(
  apiOptions: readonly SalePaymentMethodOption[],
): { value: SaleReversalRefundPaymentMethod; label: string }[] {
  const norm = (c: string) => c.trim().toLowerCase();
  const picked: { value: SaleReversalRefundPaymentMethod; label: string }[] = [];
  for (const code of LEGACY_REFUND_CODES) {
    const row = apiOptions.find((o) => norm(o.code) === code);
    if (row) {
      const label = row.label.trim() || STATIC_REFUND_LABELS[code];
      picked.push({ value: code, label });
    }
  }
  if (picked.length === LEGACY_REFUND_CODES.length) {
    return picked;
  }
  return LEGACY_REFUND_CODES.map((code) => ({ value: code, label: STATIC_REFUND_LABELS[code] }));
}
