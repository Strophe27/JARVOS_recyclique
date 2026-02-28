/**
 * Page ouverture de session de caisse — Story 5.1, 11.2.
 * GET /v1/cash-registers, pour différée GET /v1/cash-sessions/deferred/check,
 * POST /v1/cash-sessions avec initial_amount, register_id, optionnel opened_at.
 * Rendu Mantine aligné 1.4.4.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getCashRegisters,
  getCashSessionDeferredCheck,
  openCashSession,
} from '../api/caisse';
import type { CashRegisterItem } from '../api/caisse';
import { useAuth } from '../auth/AuthContext';
import { Stack, Text, TextInput, Select, Button, Alert } from '@mantine/core';
import { PageContainer, PageSection } from '../shared/layout';

export function CashRegisterSessionOpenPage() {
  const { accessToken } = useAuth();
  const [searchParams] = useSearchParams();
  const registerIdParam = searchParams.get('register_id');
  const navigate = useNavigate();
  const [registers, setRegisters] = useState<CashRegisterItem[]>([]);
  const [registerId, setRegisterId] = useState(registerIdParam ?? '');
  const [initialAmountEur, setInitialAmountEur] = useState('');
  const [sessionType, setSessionType] = useState<'real' | 'virtual' | 'deferred'>('real');
  const [deferredDate, setDeferredDate] = useState('');
  const [deferredCheckMessage, setDeferredCheckMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (registerIdParam) setRegisterId(registerIdParam);
  }, [registerIdParam]);

  const loadRegisters = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getCashRegisters(accessToken);
      setRegisters(list);
      if (list.length > 0 && !registerId) setRegisterId(list[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, registerId]);

  useEffect(() => {
    loadRegisters();
  }, [loadRegisters]);

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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!accessToken || !registerId) return;
      const amount = Math.round(parseFloat(initialAmountEur || '0') * 100);
      if (amount < 0 || Number.isNaN(amount)) {
        setError('Montant invalide');
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
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
        await openCashSession(accessToken, body);
        navigate('/cash-register/sale');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur ouverture session');
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
    ]
  );

  if (loading) {
    return (
      <PageContainer title="Ouverture de session" maxWidth={560} testId="page-session-open">
        <Text size="sm">Chargement…</Text>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Ouverture de session" maxWidth={560} testId="page-session-open">
      <PageSection>
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
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
          <TextInput
            label="Fond de caisse (€)"
            id="initial-amount"
            type="number"
            min={0}
            step={0.01}
            data-testid="session-open-initial-amount"
            value={initialAmountEur}
            onChange={(e) => setInitialAmountEur(e.target.value)}
            required
          />
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
              <Button type="button" variant="light" onClick={checkDeferred} data-testid="session-open-deferred-check">
                Vérifier doublon
              </Button>
              {deferredCheckMessage && (
                <Alert data-testid="session-open-deferred-message" color={deferredCheckMessage.includes('existe déjà') ? 'red' : 'blue'}>
                  {deferredCheckMessage}
                </Alert>
              )}
            </>
          )}
          {error && (
            <Alert color="red" data-testid="session-open-error">
              {error}
            </Alert>
          )}
            <Button type="submit" loading={submitting} disabled={submitting} data-testid="session-open-submit">
              {submitting ? 'Ouverture…' : 'Ouvrir la session'}
            </Button>
          </Stack>
        </form>
      </PageSection>
    </PageContainer>
  );
}
