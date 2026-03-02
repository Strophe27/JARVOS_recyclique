/**
 * Page caisse virtuelle — Story 18-10.
 * Phase 1 (pas de session) : formulaire ouverture session virtuelle.
 * Phase 2 (session ouverte) : redirige vers /cash-register/sale.
 * Store in-memory virtualCashSessionStore (isolation totale du store réel).
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCashRegisters, updateCashSessionStep } from '../api/caisse';
import type { CashRegisterItem } from '../api/caisse';
import { useAuth } from '../auth/AuthContext';
import { useVirtualCashSessionStore } from './virtualCashSessionStore';
import { Stack, Text, TextInput, Select, Button, Alert, Badge, Group } from '@mantine/core';
import { PageContainer, PageSection } from '../shared/layout';

export function VirtualCashRegisterPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const { currentSession, loading, error, openSession, clearError } =
    useVirtualCashSessionStore();

  const [registers, setRegisters] = useState<CashRegisterItem[]>([]);
  const [registerId, setRegisterId] = useState('');
  const [initialAmountEur, setInitialAmountEur] = useState('0');
  const [registersLoading, setRegistersLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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
        const virtualRegisters = list.filter((r) => r.enable_virtual);
        setRegisters(virtualRegisters);
        if (virtualRegisters.length > 0) setRegisterId(virtualRegisters[0].id);
      })
      .catch((e) => setLocalError(e instanceof Error ? e.message : 'Erreur chargement postes'))
      .finally(() => setRegistersLoading(false));
  }, [accessToken]);

  const parseAmountToCents = (amountStr: string): number => {
    const normalized = amountStr.replace(',', '.');
    const val = parseFloat(normalized || '0');
    if (isNaN(val)) return NaN;
    return Math.round(val * 100);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!accessToken || !registerId) return;

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
    [accessToken, registerId, initialAmountEur, openSession, clearError, error, navigate]
  );

  const displayError = localError || error;
  const isSubmitting = submitting || loading;

  return (
    <PageContainer title="Caisse Virtuelle" maxWidth={560} testId="virtual-cash-register-page">
      <Group mb="md">
        <Badge
          color="blue"
          variant="filled"
          size="lg"
          data-testid="virtual-mode-badge"
        >
          MODE VIRTUEL — SIMULATION
        </Badge>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Mode d&apos;entraînement — aucun impact sur les données réelles.
      </Text>

      <PageSection>
        {registersLoading ? (
          <Text size="sm">Chargement des postes…</Text>
        ) : registers.length === 0 && !registersLoading ? (
          <Alert color="orange" data-testid="virtual-no-registers">
            Aucun poste ne supporte le mode virtuel. Contactez un administrateur.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <Select
                label="Poste"
                data-testid="virtual-session-register"
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
                data-testid="virtual-session-initial-amount"
                value={initialAmountEur}
                onChange={(e) => setInitialAmountEur(e.target.value)}
              />
              {displayError && (
                <Alert color="red" data-testid="virtual-session-error">
                  {displayError}
                </Alert>
              )}
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={isSubmitting}
                data-testid="virtual-session-submit"
              >
                {isSubmitting ? 'Chargement…' : 'Démarrer la simulation'}
              </Button>
              <Button
                variant="subtle"
                onClick={() => navigate('/caisse')}
                data-testid="virtual-session-back"
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
