/**
 * FinalizationScreen.tsx — Ecran de finalisation de vente (Story 18-8 T2).
 * Overlay plein ecran : recapitulatif ticket, multi-paiements, rendu monnaie,
 * raccourcis clavier E/C/Q/Escape, validation vente.
 */
import { useEffect } from 'react';
import { Stack, Text, Group, Select, NumberInput, Button, Alert } from '@mantine/core';
import type { CartLine } from './CashRegisterSalePage';
import type { PaymentPayload } from '../api/caisse';
import { isDonLine } from './Ticket';
import styles from './CashRegisterSalePage.module.css';

export interface FinalizationScreenProps {
  cart: CartLine[];
  cartTotal: number;
  payments: PaymentPayload[];
  paymentMethod: string;
  paymentAmountEur: string;
  onPaymentMethodChange: (method: string) => void;
  onPaymentAmountChange: (amount: string) => void;
  onAddPayment: () => void;
  onRemovePayment: (index: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
  error: string | null;
  successMessage: string | null;
}

export function FinalizationScreen({
  cart,
  cartTotal,
  payments,
  paymentMethod,
  paymentAmountEur,
  onPaymentMethodChange,
  onPaymentAmountChange,
  onAddPayment,
  onRemovePayment,
  onConfirm,
  onCancel,
  submitting,
  error,
  successMessage,
}: FinalizationScreenProps) {
  const paymentsTotal = payments.reduce((s, p) => s + p.amount, 0);

  const especesPaid = payments
    .filter((p) => p.payment_method === 'especes')
    .reduce((s, p) => s + p.amount, 0);
  const currentEspecesAmount =
    paymentMethod === 'especes'
      ? Math.round(parseFloat(paymentAmountEur || '0') * 100)
      : 0;
  const totalEspeces = especesPaid + currentEspecesAmount;
  const renduCents = totalEspeces > cartTotal ? totalEspeces - cartTotal : 0;

  const canConfirm = paymentsTotal === cartTotal && !submitting;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        if (target.contentEditable === 'true') return;
        if (target.getAttribute('role') === 'textbox') return;
      }

      switch (e.key.toLowerCase()) {
        case 'e':
          e.preventDefault();
          onPaymentMethodChange('especes');
          break;
        case 'c':
          e.preventDefault();
          onPaymentMethodChange('cb');
          break;
        case 'q':
          e.preventDefault();
          onPaymentMethodChange('cheque');
          break;
        case 'escape':
          e.preventDefault();
          onCancel();
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onPaymentMethodChange, onCancel]);

  return (
    <div className={styles.finalizationOverlay} data-testid="finalization-screen">
      <div
        className={styles.finalizationPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="finalization-title"
      >
        <Stack gap="md">
          <Text id="finalization-title" fw={700} size="lg">
            Finalisation de la vente
          </Text>

          {successMessage && (
            <div className={styles.successBanner} data-testid="sale-success">
              {successMessage}
            </div>
          )}

          {/* Recapitulatif ticket */}
          <Stack gap={0}>
            {cart.map((l) => (
              <div
                key={l.id}
                className={
                  isDonLine(l)
                    ? `${styles.ticketLine} ${styles.ticketLineDon}`
                    : styles.ticketLine
                }
              >
                <div>
                  <Text size="sm">{l.preset_name ?? l.category_name}</Text>
                  <Text size="xs" c="dimmed">
                    x{l.quantity}
                    {l.weight != null ? ` \u2014 ${l.weight} kg` : ''}
                  </Text>
                </div>
                <Text size="sm" fw={500}>
                  {(l.total_price / 100).toFixed(2)} €
                </Text>
              </div>
            ))}
            <Group justify="space-between" mt="xs">
              <Text size="sm" fw={600}>Total</Text>
              <Text size="md" fw={700} data-testid="finalization-cart-total">
                {(cartTotal / 100).toFixed(2)} €
              </Text>
            </Group>
          </Stack>

          {/* Section paiements */}
          <Stack gap="xs">
            <Text size="xs" fw={600} tt="uppercase" c="dimmed">Paiements</Text>
            <Group gap="xs" align="flex-end" wrap="nowrap">
              <Select
                size="xs"
                data-testid="payment-method"
                value={paymentMethod}
                onChange={(v) => onPaymentMethodChange(v ?? 'especes')}
                data={[
                  { value: 'especes', label: 'Especes' },
                  { value: 'cheque', label: 'Cheque' },
                  { value: 'cb', label: 'Carte bancaire' },
                ]}
                w={130}
              />
              <NumberInput
                size="xs"
                decimalScale={2}
                min={0}
                value={paymentAmountEur}
                onChange={(v) => onPaymentAmountChange(String(v ?? ''))}
                data-testid="payment-amount"
                placeholder="EUR"
                w={80}
              />
              <Button size="xs" variant="light" data-testid="add-payment" onClick={onAddPayment}>
                +
              </Button>
              <Button
                size="xs"
                variant="outline"
                data-testid="btn-montant-exact"
                onClick={() => onPaymentAmountChange((cartTotal / 100).toFixed(2))}
              >
                Montant exact
              </Button>
            </Group>

            {payments.length > 0 && (
              <Stack gap={0} mt={4}>
                {payments.map((p, i) => (
                  <Group key={i} justify="space-between" gap={4}>
                    <Text size="xs">
                      {p.payment_method} : {(p.amount / 100).toFixed(2)} €
                    </Text>
                    <button
                      type="button"
                      className={styles.ticketLineRemove}
                      data-testid={`remove-payment-${i}`}
                      aria-label={`Supprimer le paiement ${p.payment_method}`}
                      onClick={() => onRemovePayment(i)}
                    >
                      x
                    </button>
                  </Group>
                ))}
              </Stack>
            )}

            <Text size="xs" c="dimmed" data-testid="payments-total">
              Total paiements : {(paymentsTotal / 100).toFixed(2)} €
            </Text>
          </Stack>

          {/* Rendu monnaie (especes uniquement) */}
          {renduCents > 0 && (
            <div className={styles.rendueMonnaie} data-testid="rendu-monnaie">
              Rendu : {(renduCents / 100).toFixed(2)} €
            </div>
          )}

          {error && (
            <Alert color="red" p="xs" data-testid="sale-error">
              {error}
            </Alert>
          )}

          <Group justify="space-between">
            <Button
              variant="outline"
              color="gray"
              data-testid="finalization-cancel"
              onClick={onCancel}
            >
              Annuler
            </Button>
            <Button
              color="green"
              data-testid="finalization-confirm"
              disabled={!canConfirm}
              loading={submitting}
              onClick={onConfirm}
            >
              Valider la vente
            </Button>
          </Group>
        </Stack>
      </div>
    </div>
  );
}
