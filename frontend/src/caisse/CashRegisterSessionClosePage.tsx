/**
 * Page fermeture de session de caisse — Story 5.1, 5.3, 11.2, 18-9.
 * Réécrite Story 18-9 : store Zustand, récapitulatif session, variance temps réel,
 * avertissement session vide, step='exit', sync Paheko best-effort.
 * Tous les hooks sont appelés avant les early returns (Rules of Hooks).
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateCashSessionStep } from '../api/caisse';
import { useAuth } from '../auth/AuthContext';
import { useCashSessionStore } from './useCashSessionStore';
import { useVirtualCashSessionStore } from './virtualCashSessionStore';
import { useDeferredCashSessionStore } from './deferredCashSessionStore';
import {
  Stack,
  Text,
  NumberInput,
  Textarea,
  Button,
  Alert,
  Loader,
  Group,
  SimpleGrid,
  Paper,
  Badge,
} from '@mantine/core';
import { PageContainer, PageSection } from '../shared/layout';

const VARIANCE_TOLERANCE_CENTS = 5;

export function CashRegisterSessionClosePage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const { currentSession, loading, error, refreshSession, closeSession, clearError } =
    useCashSessionStore();

  const virtualSessionExists = useVirtualCashSessionStore((s) => s.currentSession);
  const deferredSessionExists = useDeferredCashSessionStore((s) => s.currentSession);
  const virtualReset = useVirtualCashSessionStore((s) => s.reset);
  const deferredReset = useDeferredCashSessionStore((s) => s.reset);

  const sessionMode = virtualSessionExists
    ? 'virtual'
    : deferredSessionExists
    ? 'deferred'
    : 'real';
  const postCloseRedirect =
    sessionMode === 'virtual'
      ? '/cash-register/virtual'
      : sessionMode === 'deferred'
      ? '/cash-register/deferred'
      : '/caisse';

  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [actualAmount, setActualAmount] = useState<number | string>('');
  const [closingAmount, setClosingAmount] = useState<number | string>('');
  const [varianceComment, setVarianceComment] = useState('');

  // Charger la session au montage — HOOK, doit être avant les early returns
  useEffect(() => {
    if (accessToken) {
      refreshSession(accessToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Pré-remplir les montants quand la session charge — HOOK, avant early returns
  useEffect(() => {
    if (!currentSession) return;
    const theoreticalCents =
      (currentSession.initial_amount ?? 0) +
      (currentSession.total_sales ?? 0) +
      ((currentSession.total_donations ?? 0) as number);
    const theoreticalEur = (theoreticalCents / 100).toFixed(2);
    setClosingAmount(theoreticalEur);
    setActualAmount(theoreticalEur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.id]);

  // Rediriger si pas de session (après chargement) — HOOK, avant early returns
  useEffect(() => {
    if (!loading && !currentSession) {
      navigate(postCloseRedirect);
    }
  }, [loading, currentSession, navigate, postCloseRedirect]);

  // Calculs (peuvent utiliser des valeurs nulles — session peut être null ici)
  const initialCents = currentSession?.initial_amount ?? 0;
  const salesCents = currentSession?.total_sales ?? 0;
  const donationsCents = (currentSession?.total_donations ?? 0) as number;
  const theoreticalCents = initialCents + salesCents + donationsCents;

  const actualAmountNum =
    typeof actualAmount === 'number'
      ? actualAmount
      : parseFloat(String(actualAmount) || '0') || 0;
  const actualCents = Math.round(actualAmountNum * 100);
  const varianceCents = actualCents - theoreticalCents;
  const hasVariance = Math.abs(varianceCents) > VARIANCE_TOLERANCE_CENTS;

  const isEmpty =
    currentSession != null &&
    (salesCents === 0) &&
    ((currentSession.total_items ?? 0) === 0);

  // handleCloseEmpty — HOOK useCallback, avant early returns
  const handleCloseEmpty = useCallback(async () => {
    if (!accessToken || !currentSession) return;
    setSubmitting(true);
    setLocalError(null);
    clearError();
    try {
      await updateCashSessionStep(accessToken, currentSession.id, 'exit').catch(() => {});
      const ok = await closeSession(accessToken, currentSession.id, {
        closing_amount: initialCents,
        actual_amount: initialCents,
      });
      if (ok) {
        if (sessionMode === 'virtual') virtualReset();
        if (sessionMode === 'deferred') deferredReset();
        navigate(postCloseRedirect);
      } else {
        setLocalError(error || 'Erreur lors de la fermeture.');
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Erreur fermeture');
    } finally {
      setSubmitting(false);
    }
  }, [accessToken, currentSession, initialCents, closeSession, clearError, error, navigate, sessionMode, virtualReset, deferredReset, postCloseRedirect]);

  // handleSubmit — HOOK useCallback, avant early returns
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!accessToken || !currentSession) return;

      if (hasVariance && !varianceComment.trim()) {
        setLocalError("Un commentaire est obligatoire en cas d'écart.");
        return;
      }

      setSubmitting(true);
      setLocalError(null);
      clearError();

      try {
        const closingAmountNum =
          typeof closingAmount === 'number'
            ? closingAmount
            : parseFloat(String(closingAmount) || '0') || 0;
        const closingCents = Math.round(closingAmountNum * 100);

        await updateCashSessionStep(accessToken, currentSession.id, 'exit').catch(() => {});

        const ok = await closeSession(accessToken, currentSession.id, {
          closing_amount: closingCents,
          actual_amount: actualCents,
          variance_comment: varianceComment.trim() || undefined,
        });

        if (ok) {
          if (sessionMode === 'virtual') virtualReset();
          if (sessionMode === 'deferred') deferredReset();
          navigate(postCloseRedirect);
        } else {
          setLocalError(error || 'Erreur lors de la fermeture de la session.');
        }
      } catch (e) {
        setLocalError(e instanceof Error ? e.message : 'Erreur fermeture session');
      } finally {
        setSubmitting(false);
      }
    },
    [
      accessToken,
      currentSession,
      closingAmount,
      actualCents,
      varianceComment,
      hasVariance,
      closeSession,
      clearError,
      error,
      navigate,
      sessionMode,
      virtualReset,
      deferredReset,
      postCloseRedirect,
    ]
  );

  const displayError = localError || error;

  // ——— Early returns après tous les hooks ———

  if (loading && !currentSession) {
    return (
      <PageContainer
        title="Fermeture de session"
        maxWidth={680}
        testId="cash-register-session-close-page"
      >
        <Group gap="sm">
          <Loader size="sm" />
          <Text size="sm">Chargement de la session…</Text>
        </Group>
      </PageContainer>
    );
  }

  if (!currentSession) {
    return (
      <PageContainer
        title="Fermeture de session"
        maxWidth={680}
        testId="cash-register-session-close-page"
      >
        <Text>Aucune session en cours.</Text>
        <Button variant="light" mt="sm" onClick={() => navigate('/caisse')}>
          Retour dashboard
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Fermeture de session"
      maxWidth={680}
      testId="cash-register-session-close-page"
    >
      {/* Récapitulatif session */}
      <Paper withBorder p="md" mb="md" data-testid="session-close-recap">
        <Text fw={600} mb="xs">
          Résumé de la session
        </Text>
        <SimpleGrid cols={2} spacing="xs">
          <Text size="sm">
            Date ouverture :{' '}
            <strong>{new Date(currentSession.opened_at).toLocaleString('fr-FR')}</strong>
          </Text>
          <Text size="sm">
            Articles vendus : <strong>{currentSession.total_items ?? 0}</strong>
          </Text>
          <Text size="sm">
            Fond de caisse initial :{' '}
            <strong>{(initialCents / 100).toFixed(2)} €</strong>
          </Text>
          <Text size="sm">
            Montant théorique :{' '}
            <strong>{(theoreticalCents / 100).toFixed(2)} €</strong>
          </Text>
        </SimpleGrid>

        {/* Totaux ventes — data-testid conservé pour compatibilité tests existants */}
        {(currentSession.total_sales != null || currentSession.total_items != null) && (
          <Text size="sm" mt="xs" data-testid="session-close-totals">
            Total ventes : {(salesCents / 100).toFixed(2)} € — Nombre de lignes :{' '}
            {currentSession.total_items ?? 0}
          </Text>
        )}

        {donationsCents > 0 && (
          <Text size="sm" mt="xs">
            Total dons : {(donationsCents / 100).toFixed(2)} €
          </Text>
        )}

        {/* Récap par mode de paiement si disponible */}
        {(currentSession.total_cash != null ||
          currentSession.total_card != null ||
          currentSession.total_check != null) && (
          <SimpleGrid cols={3} spacing="xs" mt="xs">
            {currentSession.total_cash != null && (
              <Text size="xs">Espèces : {(currentSession.total_cash / 100).toFixed(2)} €</Text>
            )}
            {currentSession.total_card != null && (
              <Text size="xs">CB : {(currentSession.total_card / 100).toFixed(2)} €</Text>
            )}
            {currentSession.total_check != null && (
              <Text size="xs">Chèques : {(currentSession.total_check / 100).toFixed(2)} €</Text>
            )}
          </SimpleGrid>
        )}
      </Paper>

      {/* Session vide */}
      {isEmpty ? (
        <Alert color="orange" mb="md">
          <Text fw={600} mb="xs">
            Session sans transaction — cette session n'a eu aucune vente.
          </Text>
          <Text size="sm" mb="sm">
            Vous pouvez fermer cette session sans saisir de montant.
          </Text>
          <Button
            color="orange"
            loading={submitting}
            disabled={submitting}
            onClick={handleCloseEmpty}
            data-testid="session-close-empty-confirm"
          >
            Fermer quand même
          </Button>
        </Alert>
      ) : (
        <PageSection>
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <NumberInput
                label="Montant de clôture (€)"
                id="closing-amount"
                min={0}
                step={0.01}
                decimalScale={2}
                data-testid="session-close-closing-amount"
                value={closingAmount}
                onChange={setClosingAmount}
              />
              <NumberInput
                label="Montant physique compté (€)"
                id="actual-amount"
                min={0}
                step={0.01}
                decimalScale={2}
                data-testid="session-close-actual-amount"
                value={actualAmount}
                onChange={setActualAmount}
              />

              {/* Indicateur variance temps réel */}
              {actualAmount !== '' && (
                <>
                  {!hasVariance ? (
                    <Alert color="green" data-testid="variance-indicator-ok">
                      Aucun écart —{' '}
                      {varianceCents === 0 ? '0,00' : (varianceCents / 100).toFixed(2)} €
                    </Alert>
                  ) : (
                    <Alert color="orange" data-testid="variance-indicator-warn">
                      Écart détecté : {varianceCents > 0 ? '+' : ''}
                      {(varianceCents / 100).toFixed(2)} €
                    </Alert>
                  )}
                </>
              )}

              {hasVariance ? (
                <Textarea
                  label="Commentaire sur l'écart *"
                  id="variance-comment"
                  data-testid="session-close-variance-comment"
                  value={varianceComment}
                  onChange={(e) => setVarianceComment(e.target.value)}
                  placeholder="Expliquez la raison de l'écart…"
                  required
                  minRows={2}
                />
              ) : (
                <Textarea
                  label="Commentaire (optionnel)"
                  id="variance-comment"
                  data-testid="session-close-variance-comment"
                  value={varianceComment}
                  onChange={(e) => setVarianceComment(e.target.value)}
                  placeholder="Commentaire optionnel…"
                  minRows={2}
                />
              )}

              {displayError && (
                <Alert color="red" data-testid="session-close-error">
                  {displayError}
                </Alert>
              )}

              <Group justify="flex-end">
                <Button variant="light" onClick={() => navigate('/cash-register/sale')}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  loading={submitting}
                  disabled={submitting || (hasVariance && !varianceComment.trim())}
                  data-testid="session-close-submit"
                >
                  {submitting ? 'Fermeture…' : 'Fermer la session'}
                </Button>
              </Group>

              {hasVariance && !varianceComment.trim() && (
                <Badge color="orange" size="sm">
                  Commentaire obligatoire pour cet écart
                </Badge>
              )}
            </Stack>
          </form>
        </PageSection>
      )}
    </PageContainer>
  );
}
