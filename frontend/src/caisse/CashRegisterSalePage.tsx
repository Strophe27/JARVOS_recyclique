/**
 * Page saisie vente (etape sale) — Story 15.3 (layout parite 1.4.4).
 * Layout plein ecran : CaisseHeader + StatsBar + zone principale (tabs + grille + ticket).
 * Logique metier conservee intacte (Stories 5.2, 5.4, 11.2).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Tabs,
  Loader,
} from '@mantine/core';
import { CaisseHeader } from './CaisseHeader';
import { CaisseStatsBar } from './CaisseStatsBar';
import styles from './CashRegisterSalePage.module.css';

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

function getShortcutLetter(name: string, index: number, taken: Set<string>): string {
  const first = name.charAt(0).toUpperCase();
  if (first && !taken.has(first)) {
    taken.add(first);
    return first;
  }
  for (const ch of name.toUpperCase()) {
    if (/[A-Z]/.test(ch) && !taken.has(ch)) {
      taken.add(ch);
      return ch;
    }
  }
  const fallback = String.fromCharCode(65 + (index % 26));
  taken.add(fallback);
  return fallback;
}

export function CashRegisterSalePage() {
  const { accessToken, user } = useAuth();
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
  const [activeTab, setActiveTab] = useState<string | null>('categorie');

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

  // --- Raccourcis clavier par categorie (AC#4) ---
  const categoryShortcuts = useMemo(() => {
    const taken = new Set<string>();
    return categories.map((c, i) => ({
      category: c,
      letter: getShortcutLetter(c.name, i, taken),
    }));
  }, [categories]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const key = e.key.toUpperCase();
      const match = categoryShortcuts.find((s) => s.letter === key);
      if (match) {
        setSelectedCategoryId(match.category.id);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [categoryShortcuts]);

  // --- Panier ---
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
        setError('La somme des paiements doit etre egale au total du panier');
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

  // --- Etats de chargement / erreur ---
  if (loading) {
    return (
      <div className={styles.pageRoot} data-testid="page-cash-register-sale">
        <Stack align="center" justify="center" className={styles.fallbackCenter} gap="sm">
          <Loader size="sm" />
          <Text size="sm">Chargement...</Text>
        </Stack>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.pageRoot} data-testid="page-cash-register-sale">
        <Stack align="center" justify="center" className={styles.fallbackCenter} gap="sm">
          <Text>Aucune session en cours.</Text>
          <Button variant="light" onClick={() => navigate('/caisse')}>
            Retour dashboard
          </Button>
        </Stack>
      </div>
    );
  }

  const selectedCat = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className={styles.pageRoot} data-testid="page-cash-register-sale">
      <CaisseHeader user={user} sessionId={session.id} />
      <CaisseStatsBar
        ticketCount={session.total_items ?? 0}
        lastTicketAmount={null}
        caJour={session.total_sales ?? 0}
        donsJour={0}
        poidsSortis={0}
        poidsRentres={0}
      />

      {(!online || pendingOfflineCount > 0 || syncing) && (
        <div className={styles.bannerArea}>
          {!online && (
            <Alert color="yellow" role="status" aria-live="polite" data-testid="offline-banner">
              Hors ligne — Les ventes sont enregistrees localement et seront envoyees au retour en ligne.
            </Alert>
          )}
          {online && (pendingOfflineCount > 0 || syncing) && (
            <Alert color="blue" role="status" aria-live="polite" data-testid="sync-pending-banner">
              {syncing
                ? `Synchronisation en cours... (${pendingOfflineCount} ticket(s) en attente)`
                : `Synchronisation en attente : ${pendingOfflineCount} ticket(s) a envoyer.`}
            </Alert>
          )}
        </div>
      )}

      <div className={styles.mainArea}>
        {/* Zone contenu : tabs + grille */}
        <div className={styles.contentArea}>
          <Tabs value={activeTab} onChange={setActiveTab} variant="pills" data-testid="caisse-sale-tabs">
            <Tabs.List className={styles.tabsList}>
              <Tabs.Tab value="categorie" color="green">Categorie</Tabs.Tab>
              <Tabs.Tab value="sous-categorie" color="green">Sous-categorie</Tabs.Tab>
              <Tabs.Tab value="poids" color="green">Poids</Tabs.Tab>
              <Tabs.Tab value="prix" color="green">Prix</Tabs.Tab>
            </Tabs.List>

            <div className={styles.currentItem} data-testid="caisse-current-item">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                ARTICLE EN COURS DE SAISIE
              </Text>
              <Text size="sm" fw={500}>
                {selectedCat ? selectedCat.name : '—'} | Qté : {catQuantity}
              </Text>
            </div>

            <Tabs.Panel value="categorie">
              {/* Boutons rapides presets */}
              {presets.length > 0 && (
                <Group gap="xs" mb="sm">
                  {presets.map((p) => (
                    <Button
                      key={p.id}
                      variant="light"
                      size="xs"
                      data-testid={`preset-${p.id}`}
                      onClick={() => addPresetToCart(p)}
                    >
                      {p.name} ({(p.preset_price / 100).toFixed(2)} \u20ac)
                    </Button>
                  ))}
                </Group>
              )}

              <div className={styles.categoryGrid} data-testid="caisse-category-grid">
                {categoryShortcuts.map(({ category, letter }) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`${styles.categoryCard}${selectedCategoryId === category.id ? ` ${styles.categoryCardSelected}` : ''}`}
                    data-testid={`category-card-${category.id}`}
                    onClick={() => setSelectedCategoryId(category.id)}
                  >
                    <Text size="sm" fw={500}>{category.name}</Text>
                    <span className={styles.shortcutBadge}>{letter}</span>
                  </button>
                ))}
              </div>
            </Tabs.Panel>

            <Tabs.Panel value="sous-categorie">
              <Stack align="center" justify="center" py="xl">
                <Text c="dimmed">Sous-categories — a venir</Text>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="poids">
              <Stack gap="xs" py="md">
                <Text fw={500}>Saisie directe du poids</Text>
                <Group gap="xs" align="flex-end">
                  <NumberInput
                    decimalScale={3}
                    min={0}
                    value={catWeight}
                    onChange={(v) => setCatWeight(String(v ?? ''))}
                    data-testid="cat-weight"
                    placeholder="Poids kg"
                    w={120}
                  />
                  <Button variant="light" size="sm" onClick={handleAddCategoryLine}>
                    Ajouter
                  </Button>
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="prix">
              <Stack gap="xs" py="md">
                <Text fw={500}>Saisie directe du prix</Text>
                <Group gap="xs" align="flex-end">
                  <NumberInput
                    decimalScale={2}
                    min={0}
                    value={catPriceEur}
                    onChange={(v) => setCatPriceEur(String(v ?? ''))}
                    data-testid="cat-price"
                    placeholder="Prix EUR"
                    w={120}
                  />
                  <NumberInput
                    min={1}
                    value={catQuantity}
                    onChange={(v) => setCatQuantity(Number(v) || 1)}
                    data-testid="cat-quantity"
                    placeholder="Qte"
                    w={80}
                  />
                  <Button variant="light" size="sm" onClick={handleAddCategoryLine}>
                    Ajouter
                  </Button>
                </Group>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </div>

        {/* Panneau ticket lateral (AC#5) */}
        <aside className={styles.ticketPanel} data-testid="caisse-ticket-panel">
          <div className={styles.ticketHeader}>
            <Text fw={700} size="md">Ticket de Caisse</Text>
          </div>

          <div className={styles.ticketBody}>
            {cart.length === 0 ? (
              <Text size="sm" c="dimmed" data-testid="cart-empty">
                Aucun article ajoute
              </Text>
            ) : (
              <Stack gap={0}>
                {cart.map((l) => (
                  <div key={l.id} className={styles.ticketLine}>
                    <div>
                      <Text size="sm">{l.preset_name ?? l.category_name}</Text>
                      <Text size="xs" c="dimmed">
                        x{l.quantity}{l.weight != null ? ` — ${l.weight} kg` : ''}
                      </Text>
                    </div>
                    <Group gap={4} align="center" wrap="nowrap">
                      <Text size="sm" fw={500}>{(l.total_price / 100).toFixed(2)} \u20ac</Text>
                      <button
                        type="button"
                        className={styles.ticketLineRemove}
                        data-testid={`remove-line-${l.id}`}
                        aria-label={`Supprimer ${l.preset_name ?? l.category_name ?? 'l\'article'}`}
                        onClick={() => removeCartLine(l.id)}
                      >
                        x
                      </button>
                    </Group>
                  </div>
                ))}
              </Stack>
            )}

            {/* Paiements */}
            <div className={styles.paymentSection}>
              <Text size="xs" fw={600} tt="uppercase" c="dimmed" mb={4}>
                Paiements
              </Text>
              <Group gap="xs" align="flex-end" wrap="nowrap">
                <Select
                  size="xs"
                  data-testid="payment-method"
                  value={paymentMethod}
                  onChange={(v) => setPaymentMethod(v ?? 'especes')}
                  data={[
                    { value: 'especes', label: 'Especes' },
                    { value: 'cheque', label: 'Cheque' },
                    { value: 'cb', label: 'Carte bancaire' },
                  ]}
                  w={100}
                />
                <NumberInput
                  size="xs"
                  decimalScale={2}
                  min={0}
                  value={paymentAmountEur}
                  onChange={(v) => setPaymentAmountEur(String(v ?? ''))}
                  data-testid="payment-amount"
                  placeholder="EUR"
                  w={70}
                />
                <Button size="xs" variant="light" data-testid="add-payment" onClick={addPayment}>
                  +
                </Button>
              </Group>
              {payments.length > 0 && (
                <Stack gap={0} mt={4}>
                  {payments.map((p, i) => (
                    <Group key={i} justify="space-between" gap={4}>
                      <Text size="xs">{p.payment_method} : {(p.amount / 100).toFixed(2)} \u20ac</Text>
                      <button
                        type="button"
                        className={styles.ticketLineRemove}
                        data-testid={`remove-payment-${i}`}
                        aria-label={`Supprimer le paiement ${p.payment_method}`}
                        onClick={() => removePayment(i)}
                      >
                        x
                      </button>
                    </Group>
                  ))}
                  <Text size="xs" c="dimmed">
                    Total paiements : {(paymentsTotal / 100).toFixed(2)} \u20ac
                  </Text>
                </Stack>
              )}
            </div>

            {/* Note + date */}
            <Stack gap="xs" mt="sm">
              <TextInput
                size="xs"
                label="Note"
                id="sale-note"
                data-testid="sale-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <TextInput
                size="xs"
                label="Date (opt.)"
                id="sale-date"
                type="date"
                data-testid="sale-date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </Stack>
          </div>

          <form onSubmit={handleSubmit} className={styles.ticketFooter}>
            {error && (
              <Alert color="red" p="xs" data-testid="sale-error">
                {error}
              </Alert>
            )}
            <Group justify="space-between">
              <Text size="sm">{cart.length} articles</Text>
              <Text size="md" fw={700} data-testid="cart-total">
                {(cartTotal / 100).toFixed(2)} \u20ac
              </Text>
            </Group>
            <Button
              type="submit"
              color="green"
              fullWidth
              loading={submitting}
              disabled={submitting || cart.length === 0 || paymentsTotal !== cartTotal}
              data-testid="caisse-ticket-submit"
            >
              {submitting ? 'Enregistrement...' : 'Entree'}
            </Button>
          </form>
        </aside>
      </div>
    </div>
  );
}
