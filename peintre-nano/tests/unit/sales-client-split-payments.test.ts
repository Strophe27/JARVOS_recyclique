import { describe, expect, it } from 'vitest';
import { splitSalePaymentsByNature } from '../../src/api/sales-client';

describe('splitSalePaymentsByNature', () => {
  it('répartit sale_payment vs donation_surplus selon nature', () => {
    const r = splitSalePaymentsByNature([
      {
        nature: 'sale_payment',
        payment_method_code: 'cash',
        amount: 7,
      },
      {
        nature: 'donation_surplus',
        payment_method_code: 'check',
        amount: 2,
      },
    ]);
    expect(r.sale_payment).toEqual([{ payment_method: 'cash', amount: 7 }]);
    expect(r.donation_surplus).toEqual([{ payment_method: 'check', amount: 2 }]);
  });

  it('sans nature explicite : traité comme règlement', () => {
    const r = splitSalePaymentsByNature([
      { payment_method: 'card', amount: 4 },
    ]);
    expect(r.sale_payment).toEqual([{ payment_method: 'card', amount: 4 }]);
    expect(r.donation_surplus).toEqual([]);
  });
});
