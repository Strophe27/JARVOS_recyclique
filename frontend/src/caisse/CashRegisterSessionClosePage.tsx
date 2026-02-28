/**
 * Page fermeture de session de caisse — Story 5.1, 5.3, 11.2.
 * GET /v1/cash-sessions/current (totaux total_sales, total_items), formulaire closing_amount,
 * actual_amount, variance_comment, POST /v1/cash-sessions/{id}/close, redirection dashboard.
 * Rendu Mantine aligné 1.4.4.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentCashSession, closeCashSession } from '../api/caisse';
import type { CashSessionItem } from '../api/caisse';
import { useAuth } from '../auth/AuthContext';
import { Stack, Text, TextInput, Button, Alert, Loader } from '@mantine/core';
import { PageContainer, PageSection } from '../shared/layout';

export function CashRegisterSessionClosePage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<CashSessionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [closingAmount, setClosingAmount] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [varianceComment, setVarianceComment] = useState('');

  const loadCurrent = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const current = await getCurrentCashSession(accessToken);
      setSession(current);
      if (current) {
        setClosingAmount((current.current_amount / 100).toFixed(2));
        setActualAmount((current.current_amount / 100).toFixed(2));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!accessToken || !session) return;
      setSubmitting(true);
      setError(null);
      try {
        const closingCents = Math.round(parseFloat(closingAmount || '0') * 100);
        const actualCents = Math.round(parseFloat(actualAmount || '0') * 100);
        await closeCashSession(accessToken, session.id, {
          closing_amount: closingCents,
          actual_amount: actualCents,
          variance_comment: varianceComment || undefined,
        });
        navigate('/caisse');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erreur fermeture');
      } finally {
        setSubmitting(false);
      }
    },
    [accessToken, session, closingAmount, actualAmount, varianceComment, navigate]
  );

  if (loading) {
    return (
      <PageContainer title="Fermeture de session" maxWidth={560} testId="cash-register-session-close-page">
        <Loader size="sm" />
        <Text size="sm">Chargement…</Text>
      </PageContainer>
    );
  }

  if (!session) {
    return (
      <PageContainer title="Fermeture de session" maxWidth={560} testId="cash-register-session-close-page">
        <Text>Aucune session en cours.</Text>
        <Button variant="light" onClick={() => navigate('/caisse')}>
          Retour dashboard
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Fermeture de session" maxWidth={560} testId="cash-register-session-close-page">
      <Text size="sm">Session ouverte le {new Date(session.opened_at).toLocaleString()}</Text>
      <Text size="sm">Fond de caisse : {(session.initial_amount / 100).toFixed(2)} €</Text>
      {(session.total_sales != null || session.total_items != null) && (
        <Text size="sm" data-testid="session-close-totals">
          Total ventes : {((session.total_sales ?? 0) / 100).toFixed(2)} € — Nombre de lignes : {session.total_items ?? 0}
        </Text>
      )}
      <PageSection>
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
          <TextInput
            label="Montant de clôture (€)"
            id="closing-amount"
            type="number"
            step={0.01}
            data-testid="session-close-closing-amount"
            value={closingAmount}
            onChange={(e) => setClosingAmount(e.target.value)}
          />
          <TextInput
            label="Montant compté (€)"
            id="actual-amount"
            type="number"
            step={0.01}
            data-testid="session-close-actual-amount"
            value={actualAmount}
            onChange={(e) => setActualAmount(e.target.value)}
          />
          <TextInput
            label="Commentaire écart"
            id="variance-comment"
            type="text"
            data-testid="session-close-variance-comment"
            value={varianceComment}
            onChange={(e) => setVarianceComment(e.target.value)}
          />
          {error && (
            <Alert color="red" data-testid="session-close-error">
              {error}
            </Alert>
          )}
          <Button type="submit" loading={submitting} disabled={submitting} data-testid="session-close-submit">
            {submitting ? 'Fermeture…' : 'Fermer la session'}
          </Button>
          </Stack>
        </form>
      </PageSection>
    </PageContainer>
  );
}
