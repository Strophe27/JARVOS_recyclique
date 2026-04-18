import { describe, expect, it } from 'vitest';
import { buildRefundWizardPaymentMethodSelectData } from '../../src/domains/cashflow/cashflow-refund-payment-method-options';

describe('buildRefundWizardPaymentMethodSelectData', () => {
  it('sans options API : libellés statiques cash / card / check', () => {
    const rows = buildRefundWizardPaymentMethodSelectData([]);
    expect(rows.map((r) => r.value)).toEqual(['cash', 'card', 'check']);
    expect(rows[0].label).toMatch(/Espèces/i);
  });

  it('si les trois codes legacy sont présents dans le référentiel : libellés API', () => {
    const rows = buildRefundWizardPaymentMethodSelectData([
      { code: 'cash', label: 'Caisse espèces', kind: 'cash' },
      { code: 'card', label: 'TPE', kind: 'bank' },
      { code: 'check', label: 'Chèque associatif', kind: 'other' },
    ]);
    expect(rows.map((r) => r.value)).toEqual(['cash', 'card', 'check']);
    expect(rows.find((r) => r.value === 'card')?.label).toBe('TPE');
  });

  it('codes expert seuls (sans cash/card/check) : repli statique', () => {
    const rows = buildRefundWizardPaymentMethodSelectData([
      { code: 'VIREMENT', label: 'Virement', kind: 'bank' },
    ]);
    expect(rows.find((r) => r.value === 'cash')?.label).toMatch(/Espèces/i);
  });
});
