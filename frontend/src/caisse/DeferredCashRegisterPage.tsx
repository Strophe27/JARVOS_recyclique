/**
 * Page saisie différée — Story 18-10.
 * Phase 1 : formulaire avec date réelle obligatoire + poste + fond de caisse.
 * Phase 2 (session ouverte) : redirige vers /cash-register/sale.
 * Store deferredCashSessionStore (persist localStorage).
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCashRegisters,
  getCashSessionDeferredCheck,
  updateCashSessionStep,
} from '../api/caisse';
import type { CashRegisterItem } from '../api/caisse';
import { useAuth } from '../auth/AuthContext';
import { useDeferredCashSessionStore } from './deferredCashSessionStore';
import {
  Stack,
  Text,
  TextInput,
  Select,
  Button,
  Alert,
  Badge,
  Group,
} from '@mantine/core';
import { PageContainer, PageSection } from '../shared/layout';

function formatDeferredDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function DeferredCashRegisterPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const {
    currentSession,
    deferredDate,
    loading,
    error,
    openSession,
    setDeferredDate,
    clearError,
  } = useDeferredCashSessionStore();

  const [registers, setRegisters] = useState<CashRegisterItem[]>([]);
  const [registerId, setRegisterId] = useState('');
  const [initialAmountEur, setInitialAmountEur] = useState('0');
  const [registersLoading, setRegistersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [deferredCheckMessage, setDeferredCheckMessage] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState(deferredDate ?? '');

  useEffect(() => {
    if (currentSession) {
      navigate('/cash-register/sale');
    }
  }, [currentSession, navigate]);

  useEffect(() => {
    if (!accessToken) return;
    setRegistersLoading(true);
    getCashRegisters(accessToken)
      .then((list) => {
        const deferredRegisters = list.filter((r) => r.enable_deferred);
        setRegisters(deferredRegisters);
        if (deferredRegisters.length > 0) setRegisterId(deferredRegisters[0].id);
      })
      .catch((e) => setLocalError(e instanceof Error ? e.message : 'Erreur chargement postes'))
      .finally(() => setRegistersLoading(false));
  }, [accessToken]);

  const handleDateChange = (value: string) => {
    setDateInput(value);
    setDeferredDate(value);
    setDeferredCheckMessage(null);
  };

  const checkDeferred = useCallback(async () => {
    if (!dateInput || !accessToken) return;
    setDeferredCheckMessage(null);
    try {
      const result = await getCashSessionDeferredCheck(accessToken, dateInput);
      setDeferredCheckMessage(
        result.has_session
          ? 'Une session différée existe déjà pour cette date.'
          : 'Aucune session pour cette date, vous pouvez continuer.'
      );
    } catch (e) {
      setDeferredCheckMessage(e instanceof Error ? e.message : 'Erreur vérification');
    }
  }, [dateInput, accessToken]);

  const parseAmountToCents = (amountStr: string): number => {
    const normalized = amountStr.replace(',', '.');
    const val = parseFloat(normalized || '0');
    if (isNaN(val)) return NaN;
    return Math.round(val * 100);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!accessToken || !registerId || !dateInput) return;

      if (deferredCheckMessage?.includes('existe déjà')) {
        setLocalError('Une session différée existe déjà pour cette date.');
        return;
      }

      setSubmitting(true);
      setLocalError(null);
      clearError();

      try {
        const amount = parseAmountToCents(initialAmountEur);
        if (isNaN(amount) || amount < 0) {
          setLocalError('Montant invalide');
          setSubmitting(false);
          return;
        }

        const session = await openSession(accessToken, {
          initial_amount: amount,
          register_id: registerId,
          opened_at: `${dateInput}T00:00:00.000Z`,
        });

        if (session) {
          try {
            await updateCashSessionStep(accessToken, session.id, 'sale');
          } catch {
            // non-bloquant
          }
          navigate('/cash-register/sale');
        } else {
          setLocalError(error || "Erreur lors de l'ouverture de la session.");
        }
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : "Erreur ouverture session");
      } finally {
        setSubmitting(false);
      }
    },
    [
      accessToken,
      registerId,
      dateInput,
      initialAmountEur,
      deferredCheckMessage,
      openSession,
      clearError,
      error,
      navigate,
    ]
  );

  const displayError = localError || error;
  const isSubmitting = submitting || loading;

  return (
    <PageContainer title="Saisie Différée" maxWidth={560} testId="deferred-cash-register-page">
      <Group mb="md">
        <Badge
          color="orange"
          variant="filled"
          size="lg"
          data-testid="deferred-mode-badge"
        >
          {deferredDate
            ? `MODE DIFFÉRÉ — Date : ${formatDeferredDate(deferredDate)}`
            : 'MODE DIFFÉRÉ'}
        </Badge>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Saisir des ventes d&apos;anciens cahiers avec leur date réelle de vente.
      </Text>

      <PageSection>
        {registersLoading ? (
          <Text size="sm">Chargement des postes…</Text>
        ) : registers.length === 0 && !registersLoading ? (
          <Alert color="orange" data-testid="deferred-no-registers">
            Aucun poste ne supporte la saisie différée. Contactez un administrateur.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="Date réelle du cahier (YYYY-MM-DD)"
                type="date"
                required
                data-testid="deferred-session-date"
                value={dateInput}
                onChange={(e) => handleDateChange(e.target.value)}
              />
              <Button
                type="button"
                variant="light"
                size="xs"
                onClick={checkDeferred}
                data-testid="deferred-session-check"
                disabled={!dateInput}
              >
                Vérifier doublon
              </Button>
              {deferredCheckMessage && (
                <Alert
                  data-testid="deferred-session-check-message"
                  color={deferredCheckMessage.includes('existe déjà') ? 'red' : 'blue'}
                >
                  {deferredCheckMessage}
                </Alert>
              )}
              <Select
                label="Poste"
                data-testid="deferred-session-register"
                value={registerId}
                onChange={(v) => setRegisterId(v ?? '')}
                data={[
                  { value: '', label: '— Choisir —' },
                  ...registers.map((r) => ({ value: r.id, label: r.name })),
                ]}
                required
              />
              <TextInput
                label="Fond de caisse (€)"
                type="text"
                placeholder="0.00"
                data-testid="deferred-session-initial-amount"
                value={initialAmountEur}
                onChange={(e) => setInitialAmountEur(e.target.value)}
              />
              {displayError && (
                <Alert color="red" data-testid="deferred-session-error">
                  {displayError}
                </Alert>
              )}
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting || !dateInput}
                data-testid="deferred-session-submit"
              >
                {isSubmitting ? 'Chargement…' : 'Ouvrir la session différée'}
              </Button>
              <Button
                variant="subtle"
                onClick={() => navigate('/caisse')}
                data-testid="deferred-session-back"
              >
                Retour
              </Button>
            </Stack>
          </form>
        )}
      </PageSection>
    </PageContainer>
  );
}
