import { describe, expect, it } from 'vitest';
import {
  SALE_PAYMENT_METHOD_OPTION_MAX_CODE_LEN,
  parseSalePaymentMethodOptionsJson,
} from '../../src/api/sales-client';

describe('parseSalePaymentMethodOptionsJson', () => {
  it('accepte des lignes valides', () => {
    const rows = [
      { code: 'cash', label: 'Espèces', kind: 'cash' },
      { code: 'wire', label: 'Virement', kind: 'bank' },
    ];
    expect(parseSalePaymentMethodOptionsJson(rows)).toEqual(rows);
  });

  it('ignore les lignes trop longues (mode lenient)', () => {
    const longCode = 'x'.repeat(SALE_PAYMENT_METHOD_OPTION_MAX_CODE_LEN + 1);
    const rows = [{ code: longCode, label: 'L', kind: 'cash' }];
    expect(parseSalePaymentMethodOptionsJson(rows)).toEqual([]);
  });

  it('rejette les doublons de code (réponse vide)', () => {
    const rows = [
      { code: 'dup', label: 'A', kind: 'cash' },
      { code: 'dup', label: 'B', kind: 'bank' },
    ];
    expect(parseSalePaymentMethodOptionsJson(rows)).toEqual([]);
  });
});
