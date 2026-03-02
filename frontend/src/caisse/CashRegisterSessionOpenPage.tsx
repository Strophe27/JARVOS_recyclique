/**
 * Page ouverture de session de caisse — Story 5.1, 11.2, 18-9.
 * Réécrite Story 18-9 : store Zustand, vérification session existante,
 * format montant français (virgule acceptée), step='sale' après ouverture.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getCashRegisters,
  getCashSessionDeferredCheck,
  getCashSessionStatus,
  updateCashSessionStep,
} from '../api/caisse';
import type { CashRegisterItem } from '../api/caisse';
import { useAuth } from '../auth/AuthContext';
import { useCashSessionStore } from './useCashSessionStore';
import { Stack, Text, TextInput, Select, Button, Alert } from '@mantine/core';
import { PageContainer, PageSection } from '../shared/layout';

export function CashRegisterSessionOpenPage() {
  const { accessToken } = useAuth();
  const [searchParams] = useSearchParams();
  const registerIdParam = searchParams.get('register_id');
  const navigate = useNavigate();

  const { openSession, resumeSession, loading, error, clearError } = useCashSessionStore();

  const [registers, setRegisters] = useState<CashRegisterItem[]>([]);
  const [registerId, setRegisterId] = useState(registerIdParam ?? '');
  const [initialAmountEur, setInitialAmountEur] = useState('');
  const [sessionType, setSessionType] = useState<'real' | 'virtual' | 'deferred'>('real');
  const [deferredDate, setDeferredDate] = useState('');
  const [deferredCheckMessage, setDeferredCheckMessage] = useState<string | null>(null);
  const [registersLoading, setRegistersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasOpenSession, setHasOpenSession] = useState(false);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (registerIdParam) setRegisterId(registerIdParam);
  }, [registerIdParam]);

  const loadRegisters = useCallback(async () => {
    if (!accessToken) return;
    setRegistersLoading(true);
    try {
      const list = await getCashRegisters(accessToken);
      setRegisters(list);
      // Forme fonctionnelle pour éviter une dépendance sur registerId (évite un double appel API)
      if (list.length > 0) setRegisterId((prev) => prev || list[0].id);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Erreur chargement caisses');
    } finally {
      setRegistersLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadRegisters();
  }, [loadRegisters]);

  // Vérification session existante sur ce poste (mode réel uniquement)
  useEffect(() => {
    if (!accessToken || !registerId || sessionType !== 'real') {
      setHasOpenSession(false);
      setOpenSessionId(null);
      return;
    }
    getCashSessionStatus(accessToken, registerId)
      .then((status) => {
        setHasOpenSession(status.has_open_session);
        setOpenSessionId(status.session_id);
      })
      .catch(() => {
        setHasOpenSession(false);
        setOpenSessionId(null);
      });
  }, [accessToken, registerId, sessionType]);

  const checkDeferred = useCallback(async () => {
    if (sessionType !== 'deferred' || !deferredDate || !accessToken) return;
    setDeferredCheckMessage(null);
    try {
      const result = await getCashSessionDeferredCheck(accessToken, deferredDate);
      setDeferredCheckMessage(
        result.has_session
          ? 'Une session différée existe déjà pour cette date.'
          : 'Aucune session pour cette date, vous pouvez continuer.'
      );
    } catch (e) {
      setDeferredCheckMessage(e instanceof Error ? e.message : 'Erreur vérification');
    }
  }, [sessionType, deferredDate, accessToken]);

  // Format français : virgule ou point acceptés, conversion en centimes
  const parseAmountToCents = (amountStr: string): number => {
    const normalized = amountStr.replace(',', '.');
    const val = parseFloat(normalized || '0');
    if (isNaN(val)) return NaN;
    return Math.round(val * 100);
  };

  const handleAmountChange = (value: string) => {
    // Accepter chiffres, virgule, point — max 2 décimales
    let sanitized = value.replace(/[^\d.,]/g, '').replace(/\./g, ',');
    const parts = sanitized.split(',');
    if (parts.length > 2) sanitized = parts[0] + ',' + parts.slice(1).join('');
    if (parts.length === 2 && parts[1].length > 2) {
      sanitized = parts[0] + ',' + parts[1].substring(0, 2);
    }
    setInitialAmountEur(sanitized);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!accessToken || !registerId) return;

      setSubmitting(true);
      setLocalError(null);
      clearError();

      try {
        // Session existante sur le poste → reprendre
        if (hasOpenSession && openSessionId && sessionType === 'real') {
          const ok = await resumeSession(accessToken, openSessionId);
          if (ok) {
            navigate('/cash-register/sale');
          } else {
            setLocalError('Impossible de reprendre la session existante.');
          }
          return;
        }

        const amount = parseAmountToCents(initialAmountEur);
        if (isNaN(amount) || amount < 0) {
          setLocalError('Montant invalide');
          return;
        }

        const body: {
          initial_amount: number;
          register_id: string;
          opened_at?: string;
          session_type: string;
        } = {
          initial_amount: amount,
          register_id: registerId,
          session_type: sessionType,
        };
        if (sessionType === 'deferred' && deferredDate) {
          body.opened_at = `${deferredDate}T00:00:00.000Z`;
        }

        const session = await openSession(accessToken, body);
        if (session) {
          // Mettre à jour le step à 'sale'
          try {
            await updateCashSessionStep(accessToken, session.id, 'sale');
          } catch {
            // non-bloquant
          }
          navigate('/cash-register/sale');
        } else {
          setLocalError(error || 'Erreur lors de l\'ouverture de la session.');
        }
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : 'Erreur ouverture session');
      } finally {
        setSubmitting(false);
      }
    },
    [
      accessToken,
      registerId,
      initialAmountEur,
      sessionType,
      deferredDate,
      navigate,
      hasOpenSession,
      openSessionId,
      openSession,
      resumeSession,
      clearError,
      error,
    ]
  );

  const displayError = localError || error;
  const isSubmitting = submitting || loading;

  if (registersLoading && registers.length === 0) {
    return (
      <PageContainer title="Ouverture de session" maxWidth={560} testId="page-session-open">
        <Text size="sm">Chargement…</Text>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Ouverture de session" maxWidth={560} testId="page-session-open">
      <PageSection>
        {hasOpenSession && (
          <Alert color="blue" mb="sm" data-testid="session-existing-alert">
            Une session est déjà ouverte sur ce poste.
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <Select
              label="Poste"
              id="register"
              data-testid="session-open-register"
              value={registerId}
              onChange={(v) => setRegisterId(v ?? '')}
              data={[
                { value: '', label: '— Choisir —' },
                ...registers.map((r) => ({ value: r.id, label: r.name })),
              ]}
              required
            />
            <Select
              label="Type"
              id="session-type"
              data-testid="session-open-type"
              value={sessionType}
              onChange={(v) => setSessionType((v as 'real' | 'virtual' | 'deferred') ?? 'real')}
              data={[
                { value: 'real', label: 'Réelle' },
                { value: 'virtual', label: 'Virtuelle' },
                { value: 'deferred', label: 'Différée' },
              ]}
            />
            {!hasOpenSession && (
              <TextInput
                label="Fond de caisse (€)"
                id="initial-amount"
                type="text"
                placeholder="0.00"
                data-testid="session-open-initial-amount"
                value={initialAmountEur}
                onChange={(e) => handleAmountChange(e.target.value)}
                required
              />
            )}
            {sessionType === 'deferred' && (
              <>
                <TextInput
                  label="Date réelle (YYYY-MM-DD)"
                  id="deferred-date"
                  type="date"
                  data-testid="session-open-deferred-date"
                  value={deferredDate}
                  onChange={(e) => setDeferredDate(e.target.value)}
                />
                <Button
                  type="button"
                  variant="light"
                  onClick={checkDeferred}
                  data-testid="session-open-deferred-check"
                >
                  Vérifier doublon
                </Button>
                {deferredCheckMessage && (
                  <Alert
                    data-testid="session-open-deferred-message"
                    color={deferredCheckMessage.includes('existe déjà') ? 'red' : 'blue'}
                  >
                    {deferredCheckMessage}
                  </Alert>
                )}
              </>
            )}
            {displayError && (
              <Alert color="red" data-testid="session-open-error">
                {displayError}
              </Alert>
            )}
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
              data-testid="session-open-submit"
            >
              {isSubmitting
                ? 'Chargement…'
                : hasOpenSession
                ? 'Reprendre la session'
                : 'Ouvrir la session'}
            </Button>
          </Stack>
        </form>
      </PageSection>
    </PageContainer>
  );
}
