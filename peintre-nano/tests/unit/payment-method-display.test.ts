import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FREE_PAYMENT_LABEL,
  labelForCode,
  paymentMethodLabelMapFromOptions,
  unknownPaymentMethodLabel,
} from '../../src/domains/cashflow/payment-method-display';

describe('payment-method-display', () => {
  it('construit la carte depuis les options', () => {
    const map = paymentMethodLabelMapFromOptions([
      { code: 'wire', label: 'Virement', kind: 'bank' },
      { code: 'cash', label: 'Espèces', kind: 'cash' },
    ]);
    expect(map.get('wire')).toBe('Virement');
    expect(map.get('cash')).toBe('Espèces');
  });

  it('labelForCode : free explicite', () => {
    const map = paymentMethodLabelMapFromOptions([]);
    expect(labelForCode('free', map, 'Don gratuit')).toBe('Don gratuit');
    expect(labelForCode('free', map)).toBe(DEFAULT_FREE_PAYMENT_LABEL);
  });

  it('labelForCode : inconnu sans repli cash/card/check', () => {
    const map = paymentMethodLabelMapFromOptions([{ code: 'cash', label: 'Espèces caisse', kind: 'cash' }]);
    expect(labelForCode('card', map)).toBe(unknownPaymentMethodLabel('card'));
    expect(labelForCode('card', map)).not.toMatch(/^Carte$/i);
  });
});
