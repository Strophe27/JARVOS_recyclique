/**
 * Page saisie vente (étape sale) — Story 5.2, 5.4, 11.2 (hors ligne + sync).
 * GET /v1/cash-sessions/current, GET /v1/presets/active, GET /v1/categories/sale-tickets.
 * Panier (lignes), paiements multiples, note, option sale_date. POST /v1/sales → vidage panier.
 * Rendu Mantine aligné 1.4.4.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCurrentCashSession,
  getPresetsActive,
  getCategoriesSaleTickets,
  postSale,
  updateCashSessionStep,
} from '../api/caisse';
import type {
  CashSessionItem,
  PresetItem,
  CategoryItem,
  SaleItemPayload,
  PaymentPayload,
} from '../api/caisse';
import { useAuth } from '../auth/AuthContext';
import { useOnlineStatus } from './useOnlineStatus';
import {
  addTicket,
  syncOfflineQueue,
  getPendingCount,
} from './offlineQueue';
import {
  Stack,
  Text,
  Alert,
  Button,
  Group,
  Select,
  NumberInput,
  TextInput,
  Table,
  Loader,
  Card,
} from '@mantine/core';
import { PageContainer, PageSection } from '../shared/layout';

export interface CartLine {
  id: string;
  category_id: string | null;
  preset_id: string | null;
  preset_name?: string;
  category_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  weight: number | null;
}

export function CashRegisterSalePage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [session, setSession] = useState<CashSessionItem | null>(null);
  const [presets, setPresets] = useState<PresetItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [payments, setPayments] = useState<PaymentPayload[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('especes');
  const [paymentAmountEur, setPaymentAmountEur] = useState('');
  const [note, setNote] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [catQuantity, setCatQuantity] = useState(1);
  const [catPriceEur, setCatPriceEur] = useState('');
  const [catWeight, setCatWeight] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const [current, presetsList, categoriesList] = await Promise.all([
        getCurrentCashSession(accessToken),
        getPresetsActive(accessToken),
        getCategoriesSaleTickets(accessToken),
      ]);
      setSession(current);
      setPresets(presetsList);
      setCategories(categoriesList);
      if (current && current.current_step !== 'sale') {
        await updateCashSessionStep(accessToken, current.id, 'sale');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Story 5.4 : au retour en ligne, synchroniser la file offline.
  useEffect(() => {
    if (!online || !accessToken) return;
    let cancelled = false;
    setSyncing(true);
    syncOfflineQueue(accessToken)
      .then(() => {
        if (!cancelled) return getPendingCount();
      })
      .then((count) => {
        if (!cancelled && count !== undefined) setPendingOfflineCount(count);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [online, accessToken]);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingOfflineCount(count);
  }, []);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  const addPresetToCart = useCallback(
    (preset: PresetItem) => {
      setCart((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          category_id: preset.category_id,
          preset_id: preset.id,
          preset_name: preset.name,
          category_name: undefined,
          quantity: 1,
          unit_price: preset.preset_price,
          total_price: preset.preset_price,
          weight: null,
        },
      ]);
    },
    []
  );

  const addCategoryToCart = useCallback(
    (category: CategoryItem, quantity: number, unitPriceCents: number, weight: number | null = null) => {
      const total = quantity * unitPriceCents;
      setCart((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          category_id: category.id,
          preset_id: null,
          category_name: category.name,
          preset_name: undefined,
          quantity,
          unit_price: unitPriceCents,
          total_price: total,
          weight,
        },
      ]);
    },
    []
  );

  const removeCartLine = useCallback((id: string) => {
    setCart((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const cartTotal = cart.reduce((s, l) => s + l.total_price, 0);
  const paymentsTotal = payments.reduce((s, p) => s + p.amount, 0);

  const addPayment = useCallback(() => {
    const amount = Math.round(parseFloat(paymentAmountEur || '0') * 100);
    if (amount <= 0 || Number.isNaN(amount)) return;
    setPayments((prev) => [...prev, { payment_method: paymentMethod, amount }]);
    setPaymentAmountEur('');
  }, [paymentMethod, paymentAmountEur]);

  const removePayment = useCallback((index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddCategoryLine = useCallback(() => {
    if (!selectedCategoryId) return;
    const cat = categories.find((c) => c.id === selectedCategoryId);
    if (cat) {
      const priceCents = Math.round(parseFloat(catPriceEur || '0') * 100);
      const weightVal = catWeight ? parseFloat(catWeight) : null;
      addCategoryToCart(cat, catQuantity, priceCents, weightVal);
      setSelectedCategoryId(null);
    }
  }, [categories, selectedCategoryId, catQuantity, catPriceEur, catWeight, addCategoryToCart]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!session) return;
      if (cart.length === 0) {
        setError('Panier vide');
        return;
      }
      if (paymentsTotal !== cartTotal) {
        setError('La somme des paiements doit être égale au total du panier');
        return;
      }
      if (payments.length === 0) {
        setError('Ajoutez au moins un paiement');
        return;
      }
      setSubmitting(true);
      setError(null);
      const items: SaleItemPayload[] = cart.map((l) => ({
        category_id: l.category_id ?? undefined,
        preset_id: l.preset_id ?? undefined,
        quantity: l.quantity,
        unit_price: l.unit_price,
        total_price: l.total_price,
        weight: l.weight ?? undefined,
      }));
      const payload = {
        cash_session_id: session.id,
        items,
        payments,
        note: note || undefined,
        sale_date: saleDate ? `${saleDate}T00:00:00.000Z` : undefined,
      };

      try {
        if (!online) {
          const offlineId = crypto.randomUUID();
          await addTicket({
            ...payload,
            offline_id: offlineId,
            created_at: new Date().toISOString(),
          });
          setCart([]);
          setPayments([]);
          setNote('');
          setSaleDate('');
          await refreshPendingCount();
          setSubmitting(false);
          return;
        }
        if (!accessToken) return;
        await postSale(accessToken, payload);
        setCart([]);
        setPayments([]);
        setNote('');
        setSaleDate('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur enregistrement');
      } finally {
        setSubmitting(false);
      }
    },
    [
      session,
      cart,
      payments,
      paymentsTotal,
      cartTotal,
      note,
      saleDate,
      online,
      accessToken,
      refreshPendingCount,
    ]
  );

  if (loading) {
    return (
      <PageContainer title="Saisie vente" maxWidth={980} testId="page-sale">
        <Loader size="sm" />
        <Text size="sm">Chargement…</Text>
      </PageContainer>
    );
  }

  if (!session) {
    return (
      <PageContainer title="Saisie vente" maxWidth={980} testId="page-sale">
        <Text>Aucune session en cours.</Text>
        <Button variant="light" onClick={() => navigate('/caisse')}>
          Retour dashboard
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Saisie vente" maxWidth={980} testId="page-sale">
      {!online && (
        <Alert color="yellow" role="status" aria-live="polite" data-testid="offline-banner">
          Hors ligne — Les ventes sont enregistrées localement et seront envoyées au retour en ligne.
        </Alert>
      )}
      {online && (pendingOfflineCount > 0 || syncing) && (
        <Alert color="blue" role="status" aria-live="polite" data-testid="sync-pending-banner">
          {syncing
            ? `Synchronisation en cours… (${pendingOfflineCount} ticket(s) en attente)`
            : `Synchronisation en attente : ${pendingOfflineCount} ticket(s) à envoyer.`}
        </Alert>
      )}
      <Text size="sm">
        Session : {session.id.slice(0, 8)}… — Fond de caisse : {(session.initial_amount / 100).toFixed(2)} €
      </Text>

      <PageSection>
        <Stack gap="xs">
          <Text fw={500}>Boutons rapides</Text>
          <Group gap="xs">
            {presets.map((p) => (
              <Button
                key={p.id}
                variant="light"
                size="sm"
                data-testid={`preset-${p.id}`}
                onClick={() => addPresetToCart(p)}
              >
                {p.name} ({(p.preset_price / 100).toFixed(2)} €)
              </Button>
            ))}
          </Group>
        </Stack>
      </PageSection>

      <PageSection>
        <Stack gap="xs">
          <Text fw={500}>Panier</Text>
          {cart.length === 0 ? (
            <Text size="sm" data-testid="cart-empty">Panier vide</Text>
          ) : (
            <Table data-testid="cart-lines">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Désignation</Table.Th>
                  <Table.Th>Qté</Table.Th>
                  <Table.Th>Total</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {cart.map((l) => (
                  <Table.Tr key={l.id}>
                    <Table.Td>{l.preset_name ?? l.category_name}</Table.Td>
                    <Table.Td>{l.quantity}</Table.Td>
                    <Table.Td>{(l.total_price / 100).toFixed(2)} €{l.weight != null ? ` — ${l.weight} kg` : ''}</Table.Td>
                    <Table.Td>
                      <Button
                        type="button"
                        variant="subtle"
                        size="xs"
                        data-testid={`remove-line-${l.id}`}
                        onClick={() => removeCartLine(l.id)}
                      >
                        Retirer
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          <Text fw={500} data-testid="cart-total">
            Total : {(cartTotal / 100).toFixed(2)} €
          </Text>
        </Stack>
      </PageSection>

      <PageSection>
        <Stack gap="xs">
          <Text fw={500}>Ajouter une ligne (catégorie)</Text>
          <Group align="flex-end" gap="xs">
            <Select
              placeholder="— Choisir catégorie —"
              data-testid="category-select"
              value={selectedCategoryId}
              onChange={(v) => setSelectedCategoryId(v)}
              data={categories.map((c) => ({ value: c.id, label: c.name }))}
              clearable
            />
            <NumberInput
              min={1}
              value={catQuantity}
              onChange={(v) => setCatQuantity(Number(v) || 1)}
              data-testid="cat-quantity"
              placeholder="Qté"
              w={80}
            />
            <NumberInput
              decimalScale={2}
              min={0}
              value={catPriceEur}
              onChange={(v) => setCatPriceEur(String(v ?? ''))}
              data-testid="cat-price"
              placeholder="Prix €"
              w={100}
            />
            <NumberInput
              decimalScale={3}
              min={0}
              value={catWeight}
              onChange={(v) => setCatWeight(String(v ?? ''))}
              data-testid="cat-weight"
              placeholder="Poids kg"
              w={100}
            />
            <Button type="button" variant="light" size="sm" onClick={handleAddCategoryLine}>
              Ajouter
            </Button>
          </Group>
        </Stack>
      </PageSection>

      <PageSection>
        <Stack gap="xs">
          <Text fw={500}>Paiements</Text>
          <Group align="flex-end" gap="xs">
            <Select
              data-testid="payment-method"
              value={paymentMethod}
              onChange={(v) => setPaymentMethod(v ?? 'especes')}
              data={[
                { value: 'especes', label: 'Espèces' },
                { value: 'cheque', label: 'Chèque' },
                { value: 'cb', label: 'Carte bancaire' },
              ]}
              w={140}
            />
            <NumberInput
              decimalScale={2}
              min={0}
              value={paymentAmountEur}
              onChange={(v) => setPaymentAmountEur(String(v ?? ''))}
              data-testid="payment-amount"
              placeholder="Montant €"
              w={120}
            />
            <Button type="button" variant="light" size="sm" data-testid="add-payment" onClick={addPayment}>
              Ajouter
            </Button>
          </Group>
          {payments.length > 0 && (
            <Table data-testid="payments-list">
              <Table.Tbody>
                {payments.map((p, i) => (
                  <Table.Tr key={i}>
                    <Table.Td>{p.payment_method}</Table.Td>
                    <Table.Td>{(p.amount / 100).toFixed(2)} €</Table.Td>
                    <Table.Td>
                      <Button
                        type="button"
                        variant="subtle"
                        size="xs"
                        data-testid={`remove-payment-${i}`}
                        onClick={() => removePayment(i)}
                      >
                        Retirer
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          <Text size="sm">Total paiements : {(paymentsTotal / 100).toFixed(2)} €</Text>
        </Stack>
      </PageSection>

      <Card withBorder padding="md" radius="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="Note ticket"
              id="sale-note"
              data-testid="sale-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <TextInput
              label="Date réelle (optionnel, YYYY-MM-DD)"
              id="sale-date"
              type="date"
              data-testid="sale-date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
            {error && (
              <Alert color="red" data-testid="sale-error">
                {error}
              </Alert>
            )}
            <Button
              type="submit"
              loading={submitting}
              disabled={submitting || cart.length === 0 || paymentsTotal !== cartTotal}
              data-testid="sale-submit"
            >
              {submitting ? 'Enregistrement…' : 'Enregistrer le ticket'}
            </Button>
          </Stack>
        </form>
      </Card>

      <Button variant="light" onClick={() => navigate('/cash-register/session/close')}>
        Fermer la session
      </Button>
    </PageContainer>
  );
}
