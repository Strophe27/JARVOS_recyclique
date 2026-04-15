import { Button, Modal, Text, Textarea, TextInput } from '@mantine/core';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { postCreateSale, postFinalizeHeldSale } from '../../api/sales-client';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import { CashflowClientErrorAlert } from './CashflowClientErrorAlert';
import {
  bumpHeldTicketsListRefresh,
  clearCashflowDraftSubmitError,
  setAfterSuccessfulSale,
  setCashSessionIdInput,
  setCashflowDraftApiSubmitError,
  setPaymentMethod,
  useCashflowDraft,
} from './cashflow-draft-store';
import wizardClasses from './CashflowNominalWizard.module.css';
import dockClasses from './KioskFinalizeSaleDock.module.css';

const KIOSK_FINALIZE_FOCUS_EVENT = 'cashflow:kiosk-finalize-focus';

type FinalizePaymentMethod = 'cash' | 'card' | 'check' | 'free';
type FinalizePaymentLine = {
  readonly payment_method: Exclude<FinalizePaymentMethod, 'free'>;
  readonly amount: number;
  readonly cash_given?: number;
  readonly change?: number;
};

function isInteractiveActionTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  const interactive = target.closest(
    'button, a, summary, [role="button"], [role="link"], [data-disallow-finalize-enter="true"]',
  );
  return interactive !== null;
}

function normalizeFinalizeDecimalInput(raw: string): string {
  const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replaceAll('.', '')}`;
}

const FINALIZE_AZERTY_TOP_ROW_DIGIT_BY_KEY: Record<string, string> = {
  '&': '1',
  'é': '2',
  '"': '3',
  "'": '4',
  '(': '5',
  '-': '6',
  'è': '7',
  '_': '8',
  'ç': '9',
  'à': '0',
};

function decodeFinalizeNumericKeyboardKey(key: string, code: string): string | null {
  if (key >= '0' && key <= '9') return key;
  if (code.startsWith('Digit')) {
    const digitFromCode = code.slice('Digit'.length);
    if (digitFromCode >= '0' && digitFromCode <= '9') return digitFromCode;
  }
  if (code.startsWith('Numpad')) {
    const digitFromCode = code.slice('Numpad'.length);
    if (digitFromCode >= '0' && digitFromCode <= '9') return digitFromCode;
    if (digitFromCode === 'Decimal') return '.';
  }
  return FINALIZE_AZERTY_TOP_ROW_DIGIT_BY_KEY[key] ?? null;
}

function isFinalizeDecimalSeparatorKey(key: string, code: string): boolean {
  if (key === '.' || key === ',') return true;
  return code === 'NumpadDecimal' || code === 'Period' || code === 'Comma' || code === 'Semicolon';
}

function replaceFinalizeInputSlice(
  currentValue: string,
  selectionStart: number,
  selectionEnd: number,
  replacement: string,
): { readonly nextValue: string; readonly nextCaret: number } {
  const raw = `${currentValue.slice(0, selectionStart)}${replacement}${currentValue.slice(selectionEnd)}`;
  const normalized = normalizeFinalizeDecimalInput(raw);
  const nextCaret = Math.min(normalized.length, selectionStart + replacement.length);
  return { nextValue: normalized, nextCaret };
}

function parseFinalizeAmount(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized.length === 0) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function paymentMethodLabel(method: FinalizePaymentMethod): string {
  if (method === 'cash') return 'Espèces';
  if (method === 'check') return 'Chèque';
  if (method === 'card') return 'Carte';
  return 'Gratuit / don';
}

function coerceLegacyAvailableFinalizeMethod(method: FinalizePaymentMethod): Exclude<FinalizePaymentMethod, 'card'> {
  if (method === 'card') return 'cash';
  return method;
}

function nextLoopPaymentMethod(
  current: Exclude<FinalizePaymentMethod, 'free'>,
): Exclude<FinalizePaymentMethod, 'free'> {
  if (current === 'cash') return 'check';
  return 'cash';
}

function amountReceivedLabel(method: Exclude<FinalizePaymentMethod, 'free'>): string {
  if (method === 'cash') return 'Montant reçu';
  if (method === 'check') return 'Montant du paiement';
  return 'Montant carte';
}

/**
 * Bloc d’encaissement toujours visible (colonne ticket kiosque) — logique métier CREOS conservée,
 * structure visuelle et workflow rapprochés du legacy.
 */
export function KioskFinalizeSaleDock(): ReactNode {
  const draft = useCashflowDraft();
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const stale = draft.widgetDataState === 'DATA_STALE';
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [donation, setDonation] = useState('0');
  const [saleNote, setSaleNote] = useState('');
  const [payments, setPayments] = useState<FinalizePaymentLine[]>([]);
  const [loopPaymentMethod, setLoopPaymentMethod] = useState<Exclude<FinalizePaymentMethod, 'free'>>('cash');
  const [loopAmount, setLoopAmount] = useState('');
  const amountReceivedInputRef = useRef<HTMLInputElement | null>(null);
  const donationInputRef = useRef<HTMLInputElement | null>(null);
  const paymentMethodSelectRef = useRef<HTMLSelectElement | null>(null);
  const loopPaymentSelectRef = useRef<HTMLSelectElement | null>(null);
  const loopPaymentInputRef = useRef<HTMLInputElement | null>(null);
  const saleNoteInputRef = useRef<HTMLTextAreaElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const openButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const fromEnv = envelope.cashSessionId?.trim();
    if (fromEnv && !draft.cashSessionIdInput) {
      setCashSessionIdInput(fromEnv);
    }
  }, [draft.cashSessionIdInput, envelope.cashSessionId]);

  const canSubmit =
    !stale &&
    draft.cashSessionIdInput.trim().length > 0 &&
    draft.lines.length > 0 &&
    draft.totalAmount > 0;
  const parsedAmountReceived = parseFinalizeAmount(amountReceived);
  const parsedDonation = parseFinalizeAmount(donation) ?? 0;
  const parsedLoopAmount = parseFinalizeAmount(loopAmount);
  const paymentMethodNeedsAmount = draft.paymentMethod !== 'free';
  const subtotal = draft.totalAmount;
  const amountDue = subtotal + parsedDonation;
  const totalPaid = useMemo(() => payments.reduce((sum, payment) => sum + payment.amount, 0), [payments]);
  const remainingAmount = Math.max(0, amountDue - totalPaid);
  const hasPayments = payments.length > 0;
  const currentPendingAmount = hasPayments ? parsedLoopAmount : parsedAmountReceived;
  const currentPendingMethod = hasPayments ? loopPaymentMethod : draft.paymentMethod;
  const currentCoverageTarget = hasPayments ? remainingAmount : amountDue;
  const canAddCurrentPayment =
    currentPendingMethod !== 'free' &&
    currentPendingAmount !== null &&
    currentPendingAmount > 0 &&
    currentCoverageTarget > 0;
  const canStartMixedPayment =
    paymentMethodNeedsAmount &&
    !hasPayments &&
    parsedAmountReceived !== null &&
    parsedAmountReceived > 0 &&
    parsedAmountReceived < amountDue;
  const showMixedPaymentBlock = paymentMethodNeedsAmount && remainingAmount > 0 && (hasPayments || canStartMixedPayment);
  const canConfirmPayment =
    canSubmit &&
    (!paymentMethodNeedsAmount
      ? true
      : hasPayments
        ? remainingAmount <= 0
        : parsedAmountReceived !== null && parsedAmountReceived >= amountDue);
  const paymentBalanceDelta =
    !paymentMethodNeedsAmount
      ? null
      : hasPayments
        ? currentPendingMethod === 'cash' && parsedLoopAmount !== null
          ? parsedLoopAmount - remainingAmount
          : null
        : parsedAmountReceived !== null
          ? parsedAmountReceived - amountDue
          : null;
  const currentChange =
    paymentMethodNeedsAmount &&
    currentPendingMethod === 'cash' &&
    paymentBalanceDelta !== null &&
    paymentBalanceDelta > 0
      ? paymentBalanceDelta
      : 0;

  const focusAndSelectInput = (input: HTMLInputElement | null) => {
    window.setTimeout(() => {
      input?.focus();
      input?.select();
    }, 0);
  };

  const focusFinalizeField = (element: HTMLElement | null) => {
    window.setTimeout(() => element?.focus(), 0);
  };

  const focusLoopPaymentSelect = () => {
    window.setTimeout(() => {
      loopPaymentSelectRef.current?.focus();
    }, 0);
  };

  const updateFinalizeNumericInput = (
    input: HTMLInputElement,
    setValue: (next: string) => void,
    replacement: string,
  ) => {
    const selectionStart = input.selectionStart ?? input.value.length;
    const selectionEnd = input.selectionEnd ?? input.value.length;
    const { nextValue, nextCaret } = replaceFinalizeInputSlice(input.value, selectionStart, selectionEnd, replacement);
    setValue(nextValue);
    window.setTimeout(() => {
      input.focus();
      input.setSelectionRange(nextCaret, nextCaret);
    }, 0);
  };

  const backspaceFinalizeNumericInput = (input: HTMLInputElement, setValue: (next: string) => void) => {
    const selectionStart = input.selectionStart ?? input.value.length;
    const selectionEnd = input.selectionEnd ?? input.value.length;
    if (selectionStart === 0 && selectionEnd === 0) return;
    if (selectionStart !== selectionEnd) {
      const { nextValue, nextCaret } = replaceFinalizeInputSlice(input.value, selectionStart, selectionEnd, '');
      setValue(nextValue);
      window.setTimeout(() => {
        input.focus();
        input.setSelectionRange(nextCaret, nextCaret);
      }, 0);
      return;
    }
    const { nextValue, nextCaret } = replaceFinalizeInputSlice(input.value, selectionStart - 1, selectionEnd, '');
    setValue(nextValue);
    window.setTimeout(() => {
      input.focus();
      input.setSelectionRange(nextCaret, nextCaret);
    }, 0);
  };

  const addPaymentLine = useCallback((): { readonly added: boolean; readonly nextRemaining: number } => {
    if (!canAddCurrentPayment || currentPendingAmount === null) {
      return { added: false, nextRemaining: currentCoverageTarget };
    }
    const amount = Math.min(currentPendingAmount, currentCoverageTarget);
    const method = currentPendingMethod as Exclude<FinalizePaymentMethod, 'free'>;
    const nextRemaining = Math.max(0, currentCoverageTarget - amount);
    setPayments((prev) => [
      ...prev,
      {
        payment_method: method,
        amount,
        cash_given: method === 'cash' ? currentPendingAmount : undefined,
        change: method === 'cash' && currentPendingAmount > amount ? currentPendingAmount - amount : undefined,
      },
    ]);
    if (hasPayments) {
      setLoopAmount('');
      if (nextRemaining > 0) {
        setLoopPaymentMethod(nextLoopPaymentMethod(method));
      }
    } else {
      setAmountReceived('');
      setLoopPaymentMethod(nextLoopPaymentMethod(method));
    }
    return { added: true, nextRemaining };
  }, [canAddCurrentPayment, currentCoverageTarget, currentPendingAmount, currentPendingMethod, hasPayments]);

  useEffect(() => {
    if (!confirmOpen) return;
    if (draft.paymentMethod === 'card') {
      setPaymentMethod('cash');
    }
    setAmountReceived('');
    setDonation('0');
    setSaleNote('');
    setPayments([]);
    setLoopAmount('');
    setLoopPaymentMethod(coerceLegacyAvailableFinalizeMethod(draft.paymentMethod));
    const timer = window.setTimeout(() => {
      paymentMethodSelectRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [confirmOpen, draft.paymentMethod, draft.totalAmount]);

  const handleFinalizeTabNavigation = (target: EventTarget | null, reverse: boolean): boolean => {
    const targetElement = target instanceof HTMLElement ? target : null;
    if (!targetElement) return false;
    if (targetElement === paymentMethodSelectRef.current) {
      if (reverse) return true;
      if (draft.paymentMethod === 'free') focusAndSelectInput(donationInputRef.current);
      else focusAndSelectInput(amountReceivedInputRef.current);
      return true;
    }
    if (targetElement === amountReceivedInputRef.current) {
      if (reverse) focusFinalizeField(paymentMethodSelectRef.current);
      else focusAndSelectInput(donationInputRef.current);
      return true;
    }
    if (targetElement === donationInputRef.current) {
      if (reverse) {
        if (paymentMethodNeedsAmount) focusAndSelectInput(amountReceivedInputRef.current);
        else focusFinalizeField(paymentMethodSelectRef.current);
        return true;
      }
      if (hasPayments && remainingAmount > 0) {
        focusFinalizeField(loopPaymentSelectRef.current);
        return true;
      }
      if (!hasPayments && canStartMixedPayment) {
        const outcome = addPaymentLine();
        if (outcome.added && outcome.nextRemaining > 0) {
          focusLoopPaymentSelect();
          return true;
        }
      }
      if (saleNoteInputRef.current) {
        focusFinalizeField(saleNoteInputRef.current);
        return true;
      }
      focusFinalizeField(confirmButtonRef.current);
      return true;
    }
    if (targetElement === loopPaymentSelectRef.current) {
      if (reverse) focusAndSelectInput(donationInputRef.current);
      else focusAndSelectInput(loopPaymentInputRef.current);
      return true;
    }
    if (targetElement === loopPaymentInputRef.current) {
      if (reverse) {
        focusFinalizeField(loopPaymentSelectRef.current);
        return true;
      }
      if (canAddCurrentPayment) {
        const outcome = addPaymentLine();
        if (outcome.added && outcome.nextRemaining > 0) {
          focusFinalizeField(loopPaymentSelectRef.current);
          return true;
        }
        if (outcome.added) {
          focusAndSelectInput(donationInputRef.current);
          return true;
        }
      }
      focusAndSelectInput(donationInputRef.current);
      return true;
    }
    if (targetElement === saleNoteInputRef.current) {
      if (reverse) {
        if (hasPayments && remainingAmount > 0) {
          focusAndSelectInput(loopPaymentInputRef.current);
        } else {
          focusAndSelectInput(donationInputRef.current);
        }
      } else {
        focusFinalizeField(confirmButtonRef.current);
      }
      return true;
    }
    if (targetElement === confirmButtonRef.current && reverse) {
      if (saleNoteInputRef.current) {
        focusFinalizeField(saleNoteInputRef.current);
      } else if (hasPayments && remainingAmount > 0) {
        focusAndSelectInput(loopPaymentInputRef.current);
      } else {
        focusAndSelectInput(donationInputRef.current);
      }
      return true;
    }
    return false;
  };

  const busyRef = useRef(busy);
  busyRef.current = busy;

  const onSubmit = async () => {
    clearCashflowDraftSubmitError();
    setBusy(true);
    try {
      if (draft.activeHeldSaleId) {
        const res = await postFinalizeHeldSale(
          draft.activeHeldSaleId,
          payments.length > 0
            ? { payments, donation: parsedDonation, ...(saleNote.trim() ? { note: saleNote.trim() } : {}) }
            : { payment_method: draft.paymentMethod, donation: parsedDonation, ...(saleNote.trim() ? { note: saleNote.trim() } : {}) },
          auth,
        );
        if (!res.ok) {
          setCashflowDraftApiSubmitError(recycliqueClientFailureFromSalesHttp(res));
          return;
        }
        setConfirmOpen(false);
        setAfterSuccessfulSale(res.saleId);
        bumpHeldTicketsListRefresh();
        return;
      }
      const body = {
        cash_session_id: draft.cashSessionIdInput.trim(),
        items: draft.lines.map((l) => ({
          category: l.category,
          quantity: l.quantity,
          weight: l.weight,
          unit_price: l.unitPrice,
          total_price: l.totalPrice,
        })),
        total_amount: draft.totalAmount,
        donation: parsedDonation,
        ...(saleNote.trim() ? { note: saleNote.trim() } : {}),
        ...(payments.length > 0 ? { payments } : { payment_method: draft.paymentMethod }),
      };
      const res = await postCreateSale(body, auth);
      if (!res.ok) {
        setCashflowDraftApiSubmitError(recycliqueClientFailureFromSalesHttp(res));
        return;
      }
      setConfirmOpen(false);
      setAfterSuccessfulSale(res.saleId);
    } finally {
      setBusy(false);
    }
  };

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const finalizeEnterHintId = useId();

  useEffect(() => {
    if (!canSubmit || busy) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      if (busyRef.current) return;
      const targetElement = e.target instanceof HTMLElement ? e.target : null;
      if (!targetElement) return;
      const tag = targetElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || targetElement.isContentEditable) return;
      if (isInteractiveActionTarget(targetElement)) return;
      const unified = document.querySelector('[data-testid="cashflow-kiosk-unified-layout"]');
      if (unified?.contains(targetElement)) return;
      if (targetElement.closest('[data-testid="cashflow-submit-sale"]')) return;
      e.preventDefault();
      setConfirmOpen(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, canSubmit]);

  useEffect(() => {
    const onFocusRequest = () => {
      if (!canSubmit || busyRef.current) return;
      openButtonRef.current?.focus();
    };
    window.addEventListener(KIOSK_FINALIZE_FOCUS_EVENT, onFocusRequest);
    return () => window.removeEventListener(KIOSK_FINALIZE_FOCUS_EVENT, onFocusRequest);
  }, [canSubmit]);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      const numericTarget =
        target === amountReceivedInputRef.current
          ? { input: amountReceivedInputRef.current, setValue: setAmountReceived }
          : target === donationInputRef.current
            ? { input: donationInputRef.current, setValue: setDonation }
            : target === loopPaymentInputRef.current
              ? { input: loopPaymentInputRef.current, setValue: setLoopAmount }
              : null;
      if (numericTarget?.input) {
        const numericKey = decodeFinalizeNumericKeyboardKey(e.key, e.code);
        if (numericKey && numericKey !== '.') {
          e.preventDefault();
          updateFinalizeNumericInput(numericTarget.input, numericTarget.setValue, numericKey);
          return;
        }
        if (isFinalizeDecimalSeparatorKey(e.key, e.code) || numericKey === '.') {
          e.preventDefault();
          updateFinalizeNumericInput(numericTarget.input, numericTarget.setValue, '.');
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          backspaceFinalizeNumericInput(numericTarget.input, numericTarget.setValue);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!busyRef.current) setConfirmOpen(false);
        return;
      }
      if (e.key === 'Tab') {
        if (handleFinalizeTabNavigation(e.target, e.shiftKey)) {
          e.preventDefault();
        }
        return;
      }
      if (e.key !== 'Enter' || e.shiftKey) return;
      if (busyRef.current) return;
      if (target?.tagName === 'TEXTAREA') return;
      if (
        target &&
        (target.closest('[data-testid="cashflow-finalize-add-payment"]') ||
          target.closest('[data-testid="cashflow-finalize-remove-payment"]'))
      ) {
        return;
      }
      if (target === paymentMethodSelectRef.current) {
        e.preventDefault();
        if (draft.paymentMethod === 'free') focusAndSelectInput(donationInputRef.current);
        else focusAndSelectInput(amountReceivedInputRef.current);
        return;
      }
      if (target === amountReceivedInputRef.current) {
        e.preventDefault();
        focusAndSelectInput(donationInputRef.current);
        return;
      }
      if (target === donationInputRef.current && !hasPayments && canStartMixedPayment) {
        e.preventDefault();
        const outcome = addPaymentLine();
        if (!outcome.added) return;
        if (outcome.nextRemaining > 0) focusLoopPaymentSelect();
        else if (saleNoteInputRef.current) focusFinalizeField(saleNoteInputRef.current);
        else focusFinalizeField(confirmButtonRef.current);
        return;
      }
      if (target === loopPaymentSelectRef.current) {
        e.preventDefault();
        focusAndSelectInput(loopPaymentInputRef.current);
        return;
      }
      if (target === loopPaymentInputRef.current && hasPayments && remainingAmount > 0) {
        const outcome = addPaymentLine();
        if (outcome.added) {
          e.preventDefault();
          if (outcome.nextRemaining > 0) focusFinalizeField(loopPaymentSelectRef.current);
          else focusAndSelectInput(donationInputRef.current);
        }
        return;
      }
      if (!canConfirmPayment) return;
      if (target && target.closest('[data-testid="cashflow-submit-sale-confirm"]')) return;
      e.preventDefault();
      void onSubmitRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [addPaymentLine, canConfirmPayment, canStartMixedPayment, confirmOpen, draft.paymentMethod, hasPayments, remainingAmount]);

  return (
    <div className={dockClasses.root} data-testid="cashflow-kiosk-finalize-dock">
      <Modal
        opened={confirmOpen}
        onClose={() => {
          if (!busy) setConfirmOpen(false);
        }}
        title="Finaliser la vente"
        data-testid="cashflow-kiosk-finalize-modal"
        withCloseButton={false}
        size="lg"
      >
        <div className={dockClasses.modalBody}>
          <Text size="sm" c="dimmed" className={dockClasses.modalLead}>
            Vérifiez le règlement, les montants et les notes éventuelles avant validation.
          </Text>

          <div className={dockClasses.summaryGrid}>
            <div className={dockClasses.summaryCard}>
              <div className={dockClasses.summaryLabel}>Sous-total</div>
              <div className={dockClasses.summaryValue} data-testid="cashflow-finalize-subtotal">
                {subtotal.toFixed(2)} €
              </div>
            </div>
            <div className={`${dockClasses.summaryCard} ${dockClasses.summaryCardStrong}`}>
              <div className={dockClasses.summaryLabel}>Total à payer</div>
              <div className={dockClasses.summaryValue} data-testid="cashflow-finalize-amount-due">
                {amountDue.toFixed(2)} €
              </div>
            </div>
          </div>

          <div className={dockClasses.row}>
            <label className={dockClasses.field}>
              <span className={dockClasses.fieldLabel}>Moyen de paiement</span>
              <select
                ref={paymentMethodSelectRef}
                className={`${wizardClasses.nativeSelect} ${dockClasses.nativeSelect}`}
                data-testid="cashflow-select-payment-dock-modal"
                value={draft.paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value === 'check' || e.target.value === 'free' ? e.target.value : 'cash',
                  )
                }
                disabled={hasPayments || busy}
              >
                <option value="cash">Espèces</option>
                <option value="check">Chèque</option>
                <option value="card" disabled>
                  Carte (indisponible)
                </option>
                <option value="free">Gratuit / don</option>
              </select>
            </label>

            {paymentMethodNeedsAmount ? (
              <TextInput
                ref={amountReceivedInputRef}
                label={amountReceivedLabel(draft.paymentMethod as Exclude<FinalizePaymentMethod, 'free'>)}
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.currentTarget.value)}
                data-testid="cashflow-finalize-amount-received"
                classNames={{ root: dockClasses.field, label: dockClasses.fieldLabel }}
                disabled={hasPayments || busy}
              />
            ) : (
              <div className={`${dockClasses.field} ${dockClasses.readonlyPanel}`}>
                <span className={dockClasses.fieldLabel}>Montant reçu</span>
                <span className={dockClasses.readonlyValue}>Aucun montant requis</span>
              </div>
            )}
          </div>

          <div className={dockClasses.row}>
            <TextInput
              ref={donationInputRef}
              label="Don"
              value={donation}
              onChange={(e) => setDonation(e.currentTarget.value)}
              data-testid="cashflow-finalize-donation"
              classNames={{ root: dockClasses.field, label: dockClasses.fieldLabel }}
              disabled={busy}
            />
            <div className={`${dockClasses.field} ${dockClasses.readonlyPanel}`}>
              <span className={dockClasses.fieldLabel}>Monnaie à rendre</span>
              <span
                className={`${dockClasses.readonlyValue} ${currentChange > 0 ? dockClasses.positiveValue : ''}`}
                data-testid="cashflow-finalize-change"
              >
                {currentChange.toFixed(2)} €
              </span>
            </div>
          </div>

          <div className={dockClasses.statusPanel}>
            <Text size="sm" fw={600} data-testid="cashflow-finalize-payment-balance">
              {!paymentMethodNeedsAmount
                ? 'Gratuit / don : aucun montant reçu requis'
                : paymentBalanceDelta === null
                  ? `Reste à payer : ${hasPayments ? remainingAmount.toFixed(2) : 'montant à renseigner'}`
                  : paymentBalanceDelta > 0
                    ? `Monnaie à rendre : ${paymentBalanceDelta.toFixed(2)} €`
                    : paymentBalanceDelta < 0
                      ? `Reste à payer : ${Math.abs(paymentBalanceDelta).toFixed(2)} €`
                      : 'Montant exact : aucun rendu'}
            </Text>
          </div>

          {payments.length > 0 ? (
            <div className={dockClasses.paymentsBlock}>
              <div className={dockClasses.blockTitleRow}>
                <div className={dockClasses.blockTitle}>Paiements ajoutes</div>
                <Text size="sm" fw={600} data-testid="cashflow-finalize-payments-total">
                  Total encaissé : {totalPaid.toFixed(2)} €
                  {remainingAmount > 0 ? ` · reste : ${remainingAmount.toFixed(2)} €` : ' · ticket couvert'}
                </Text>
              </div>
              <div className={dockClasses.paymentsList} data-testid="cashflow-finalize-payments-list">
                {payments.map((payment, index) => (
                  <div key={`${payment.payment_method}-${index}`} className={dockClasses.paymentRow}>
                    <div>
                      <div className={dockClasses.paymentTitle}>
                        {paymentMethodLabel(payment.payment_method)} : {payment.amount.toFixed(2)} €
                      </div>
                      <div className={dockClasses.paymentMeta}>
                        {payment.change && payment.change > 0 ? `Monnaie : ${payment.change.toFixed(2)} €` : ''}
                      </div>
                    </div>
                    <Button
                      variant="subtle"
                      color="red"
                      size="compact-xs"
                      data-testid="cashflow-finalize-remove-payment"
                      onClick={() => {
                        setPayments((prev) => prev.filter((_, i) => i !== index));
                      }}
                    >
                      Retirer
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {showMixedPaymentBlock ? (
            <div className={dockClasses.paymentsBlock} data-testid="cashflow-finalize-mixed-payment-block">
              <div className={dockClasses.blockTitle}>Ajouter un autre paiement</div>
              {!hasPayments ? (
                <Text size="sm" c="dimmed" className={dockClasses.mixedKickoff}>
                  Le paiement partiel saisi ci-dessus sera ajouté d&apos;abord, puis ce bloc permet de continuer le
                  règlement comme dans le legacy.
                </Text>
              ) : null}
              <div className={dockClasses.row}>
                <label className={dockClasses.field}>
                  <span className={dockClasses.fieldLabel}>
                    {hasPayments ? 'Moyen de paiement supplémentaire' : 'Moyen de paiement'}
                  </span>
                  <select
                    ref={loopPaymentSelectRef}
                    className={`${wizardClasses.nativeSelect} ${dockClasses.nativeSelect}`}
                    data-testid="cashflow-select-payment-dock-loop"
                    value={loopPaymentMethod}
                    onChange={(e) =>
                      setLoopPaymentMethod(e.target.value === 'check' ? 'check' : 'cash')
                    }
                    disabled={busy}
                  >
                    <option value="cash">Espèces</option>
                    <option value="check">Chèque</option>
                    <option value="card" disabled>
                      Carte (indisponible)
                    </option>
                  </select>
                </label>
                <TextInput
                  ref={loopPaymentInputRef}
                  label="Montant du paiement"
                  value={loopAmount}
                  onChange={(e) => setLoopAmount(e.currentTarget.value)}
                  data-testid="cashflow-finalize-loop-amount"
                  classNames={{ root: dockClasses.field, label: dockClasses.fieldLabel }}
                  disabled={busy}
                />
              </div>
              <Text size="sm" fw={600} mt="xs" data-testid="cashflow-finalize-loop-balance">
                {paymentBalanceDelta === null
                  ? `Reste à payer : ${remainingAmount.toFixed(2)} €`
                  : paymentBalanceDelta > 0
                    ? `Monnaie à rendre : ${paymentBalanceDelta.toFixed(2)} €`
                    : paymentBalanceDelta < 0
                      ? `Reste à payer : ${Math.abs(paymentBalanceDelta).toFixed(2)} €`
                      : 'Montant exact : aucun rendu'}
              </Text>
              <div className={dockClasses.inlineActions}>
                <Button
                  variant="light"
                  onClick={() => {
                    const outcome = addPaymentLine();
                    if (!outcome.added) return;
                    if (outcome.nextRemaining > 0) focusLoopPaymentSelect();
                    else focusAndSelectInput(donationInputRef.current);
                  }}
                  disabled={!canAddCurrentPayment || busy}
                  data-testid="cashflow-finalize-add-payment"
                >
                  Ajouter
                </Button>
              </div>
            </div>
          ) : null}

          <Textarea
            ref={saleNoteInputRef}
            label="Note contextuelle (optionnel)"
            placeholder="Ajouter une note contextuelle pour ce ticket"
            value={saleNote}
            onChange={(e) => setSaleNote(e.currentTarget.value)}
            minRows={2}
            maxRows={4}
            data-testid="cashflow-finalize-note"
            classNames={{ root: dockClasses.field, label: dockClasses.fieldLabel }}
          />

          <CashflowClientErrorAlert error={draft.submitError} />

          <div className={dockClasses.footerActions}>
            <Button
              variant="default"
              onClick={() => {
                if (!busy) setConfirmOpen(false);
              }}
            >
              Annuler
            </Button>
            <Button
              ref={confirmButtonRef}
              size="md"
              color="green"
              onClick={() => void onSubmit()}
              disabled={!canConfirmPayment || busy}
              loading={busy}
              data-testid="cashflow-submit-sale-confirm"
            >
              Valider la vente
            </Button>
          </div>
        </div>
      </Modal>
      <div className={dockClasses.title}>Finaliser la vente</div>
      <Text size="sm" mb="sm" c="dimmed">
        {draft.activeHeldSaleId
          ? 'Reprise : contrôlez le total dans le ticket, puis encaissez.'
          : 'Moyen de paiement puis enregistrement dans la même colonne ticket.'}
      </Text>
      <Button
        ref={openButtonRef}
        mt="md"
        size="md"
        color="green"
        onClick={() => setConfirmOpen(true)}
        disabled={!canSubmit || busy}
        data-testid="cashflow-submit-sale"
        aria-label={
          canSubmit && !busy ? 'Finaliser la vente, touche Entrée pour ouvrir la finalisation' : undefined
        }
        {...(canSubmit && !busy
          ? { 'aria-keyshortcuts': 'Enter', 'aria-describedby': finalizeEnterHintId }
          : {})}
      >
        Ouvrir la finalisation
      </Button>
      {canSubmit && !busy ? (
        <Text
          component="p"
          size="xs"
          c="dimmed"
          mt="xs"
          id={finalizeEnterHintId}
          data-testid="cashflow-kiosk-finalize-enter-hint"
        >
          Touche <span className={dockClasses.kbd}>Entrée</span> pour ouvrir la finalisation (depuis le ticket ou hors
          zone de saisie à gauche).
        </Text>
      ) : null}
    </div>
  );
}
