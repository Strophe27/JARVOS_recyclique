/**
 * Page saisie vente (etape sale) — Story 15.3 (layout parite 1.4.4).
 * Layout plein ecran : CaisseHeader + StatsBar + zone principale (tabs + grille + ticket).
 * Logique metier conservee intacte (Stories 5.2, 5.4, 11.2).
 * Raccourcis clavier AZERTY positionnels — Story 18-7.
 * Ticket dedié + FinalizationScreen — Story 18-8.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Badge,
  Button,
  NumberInput,
  Tabs,
  Loader,
} from '@mantine/core';
import { CaisseHeader } from './CaisseHeader';
import { CaisseStatsBar } from './CaisseStatsBar';
import { useVirtualCashSessionStore } from './virtualCashSessionStore';
import { useDeferredCashSessionStore } from './deferredCashSessionStore';
import { CategoryGrid } from './CategoryGrid';
import { PresetButtonGrid } from './PresetButtonGrid';
import { CashKeyboardShortcutHandler } from './utils/cashKeyboardShortcuts';
import { mapAZERTYToNumeric } from './utils/azertyKeyboard';
import { Ticket } from './Ticket';
import { FinalizationScreen } from './FinalizationScreen';
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
  const [subCategoryParentId, setSubCategoryParentId] = useState<string | null>(null);
  const [showFinalization, setShowFinalization] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Accumulateurs KPI locaux (Story 18-5 T3)
  const [localTicketCount, setLocalTicketCount] = useState<number>(0);
  const [localCaJour, setLocalCaJour] = useState<number>(0);
  const [lastTicketTotal, setLastTicketTotal] = useState<number | null>(null);
  const [donsJourLocal, setDonsJourLocal] = useState<number>(0);
  const [poidsSortisLocal, setPoidsSortisLocal] = useState<number>(0);
  const [kpiMode, setKpiMode] = useState<'live' | 'session'>('live');

  // --- Détection du mode virtual/deferred (Story 18-10) ---
  const virtualSession = useVirtualCashSessionStore((s) => s.currentSession);
  const deferredSession = useDeferredCashSessionStore((s) => s.currentSession);
  const deferredDateMode = useDeferredCashSessionStore((s) => s.deferredDate);
  const sessionMode = virtualSession ? 'virtual' : deferredSession ? 'deferred' : 'real';

  // Pré-remplir saleDate depuis deferredDate en mode différé (y compris après remise à zéro post-vente)
  useEffect(() => {
    if (sessionMode === 'deferred' && deferredDateMode && !saleDate) {
      setSaleDate(deferredDateMode);
    }
  }, [sessionMode, deferredDateMode, saleDate]);

  const modeIndicator =
    sessionMode === 'virtual' ? (
      <Badge color="blue" variant="filled" size="sm" data-testid="sale-virtual-mode-badge">
        SIMULATION
      </Badge>
    ) : sessionMode === 'deferred' && deferredDateMode ? (
      <Badge color="orange" variant="filled" size="sm" data-testid="sale-deferred-mode-badge">
        DIFFÉRÉ — {deferredDateMode.split('-').reverse().join('/')}
      </Badge>
    ) : undefined;

  // Refs pour les raccourcis clavier (évite les stale closures dans le useEffect)
  const shortcutHandlerRef = useRef(new CashKeyboardShortcutHandler());
  const pendingQuantityRef = useRef('');
  const cartRef = useRef(cart);
  const showFinalizationRef = useRef(showFinalization);
  const handleFinalizeRef = useRef<() => void>(() => {});

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

  // --- Raccourcis clavier AZERTY positionnels (Story 18-7) ---

  const categoryShortcuts = useMemo(() => {
    const handler = shortcutHandlerRef.current;
    handler.initialize(categories, () => {});
    return categories.map((c) => ({
      category: c,
      letter: handler.getKeyForCategory(c.id) ?? '',
    }));
  }, [categories]);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    showFinalizationRef.current = showFinalization;
  }, [showFinalization]);

  useEffect(() => {
    function shouldPrevent(target: EventTarget | null): boolean {
      if (!target || !(target instanceof HTMLElement)) return false;
      const el = target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return true;
      if (el.contentEditable === 'true') return true;
      if (el.getAttribute('role') === 'textbox') return true;
      if (el.hasAttribute('data-prevent-shortcuts')) return true;
      return false;
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Laisser FinalizationScreen gérer ses propres raccourcis
      if (showFinalizationRef.current) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (shouldPrevent(e.target)) return;

      const key = e.key;

      if (!e.shiftKey) {
        const numeric = mapAZERTYToNumeric(key);
        if (numeric !== null) {
          pendingQuantityRef.current += numeric;
          e.preventDefault();
          return;
        }
      }

      const shortcut = shortcutHandlerRef.current.getShortcut(key);
      if (shortcut) {
        e.preventDefault();
        const qty = parseInt(pendingQuantityRef.current, 10) || 1;
        setCatQuantity(qty);
        setSelectedCategoryId(shortcut.categoryId);
        pendingQuantityRef.current = '';
        return;
      }

      if (key === 'Escape') {
        pendingQuantityRef.current = '';
        return;
      }

      if (key === 'Enter') {
        handleFinalizeRef.current();
        return;
      }

      if (key === 'Backspace') {
        setCart((prev) => prev.slice(0, -1));
        e.preventDefault();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleFinalize = useCallback(() => {
    if (cart.length === 0) {
      setError('Panier vide \u2014 ajoutez au moins un article');
      return;
    }
    setError(null);
    setShowFinalization(true);
  }, [cart.length]);

  const handleConfirmSale = useCallback(async () => {
    if (!session) return;
    if (cart.length === 0) {
      setError('Panier vide \u2014 ajoutez au moins un article');
      return;
    }
    if (paymentsTotal !== cartTotal) {
      setError('La somme des paiements doit etre egale au total du panier');
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
        const offlineMsg = 'Ticket enregistre hors ligne \u2014 sera synchronise au retour en ligne';
        setSuccessMessage(offlineMsg);
        await refreshPendingCount();
        setSubmitting(false);
        setTimeout(() => {
          setSuccessMessage(null);
          setShowFinalization(false);
          setCart([]);
          setPayments([]);
          setNote('');
          setSaleDate('');
        }, 2000);
        return;
      }
      if (!accessToken) return;
      await postSale(accessToken, payload);
      const ticketTotalCents = cartTotal;
      const donsInTicket = cart
        .filter(
          (l) =>
            l.unit_price === 0 ||
            l.category_name?.toLowerCase().includes('don') ||
            l.preset_name?.toLowerCase().includes('don')
        )
        .reduce((sum, l) => sum + l.total_price, 0);
      const poidsInTicket = cart
        .filter((l) => l.weight !== null)
        .reduce((sum, l) => sum + (l.weight ?? 0), 0);
      setLocalTicketCount((prev) => prev + 1);
      setLocalCaJour((prev) => prev + ticketTotalCents);
      setLastTicketTotal(ticketTotalCents);
      setDonsJourLocal((prev) => prev + donsInTicket);
      setPoidsSortisLocal((prev) => prev + poidsInTicket);
      const successMsg = `Ticket enregistre \u2014 ${items.length} articles, ${(ticketTotalCents / 100).toFixed(2)} EUR`;
      setSuccessMessage(successMsg);
      setTimeout(() => {
        setSuccessMessage(null);
        setShowFinalization(false);
        setCart([]);
        setPayments([]);
        setNote('');
        setSaleDate('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur enregistrement');
    } finally {
      setSubmitting(false);
    }
  }, [
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
  ]);

  useEffect(() => {
    handleFinalizeRef.current = handleFinalize;
  }, [handleFinalize]);

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
      <CaisseHeader user={user} sessionId={session.id} modeIndicator={modeIndicator} />
      <CaisseStatsBar
        ticketCount={localTicketCount}
        lastTicketAmount={lastTicketTotal}
        caJour={localCaJour}
        donsJour={donsJourLocal}
        poidsSortis={poidsSortisLocal}
        poidsRentres={0}
        mode={kpiMode}
        onModeChange={setKpiMode}
        sessionTicketCount={session.total_items ?? 0}
        sessionCaJour={session.total_sales ?? 0}
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
              <PresetButtonGrid presets={presets} onPresetClick={addPresetToCart} />
              <CategoryGrid
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onCategorySelect={setSelectedCategoryId}
                onParentCategoryClick={(parentId) => {
                  setSubCategoryParentId(parentId);
                  setActiveTab('sous-categorie');
                }}
                categoryShortcuts={categoryShortcuts}
              />
            </Tabs.Panel>

            <Tabs.Panel value="sous-categorie">
              {subCategoryParentId ? (
                <Stack gap="sm">
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<span>←</span>}
                    data-testid="subcategory-back-btn"
                    onClick={() => {
                      setSubCategoryParentId(null);
                      setActiveTab('categorie');
                    }}
                  >
                    Retour aux categories
                  </Button>
                  <CategoryGrid
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onCategorySelect={(id) => {
                      setSelectedCategoryId(id);
                    }}
                    categoryShortcuts={categoryShortcuts}
                    filterParentId={subCategoryParentId}
                  />
                </Stack>
              ) : (
                <Stack align="center" justify="center" py="xl">
                  <Text c="dimmed">Cliquez sur une categorie parente pour voir ses sous-categories</Text>
                </Stack>
              )}
            </Tabs.Panel>

            <Tabs.Panel value="poids">
              <Stack gap="xs" py="md">
                <Text fw={500}>Saisie directe du poids</Text>
                <Stack gap="xs" align="flex-start">
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
                </Stack>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="prix">
              <Stack gap="xs" py="md">
                <Text fw={500}>Saisie directe du prix</Text>
                <Stack gap="xs" align="flex-start">
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
                </Stack>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </div>

        {/* Panneau ticket lateral (Story 18-8 T1) */}
        <Ticket
          cart={cart}
          onRemoveLine={removeCartLine}
          onFinalize={handleFinalize}
          total={cartTotal}
          note={note}
          onNoteChange={setNote}
          saleDate={saleDate}
          onSaleDateChange={setSaleDate}
          error={error}
        />
      </div>

      {/* Ecran de finalisation (Story 18-8 T2) */}
      {showFinalization && (
        <FinalizationScreen
          cart={cart}
          cartTotal={cartTotal}
          payments={payments}
          paymentMethod={paymentMethod}
          paymentAmountEur={paymentAmountEur}
          onPaymentMethodChange={setPaymentMethod}
          onPaymentAmountChange={setPaymentAmountEur}
          onAddPayment={addPayment}
          onRemovePayment={removePayment}
          onConfirm={handleConfirmSale}
          onCancel={() => {
            setShowFinalization(false);
            setError(null);
          }}
          submitting={submitting}
          error={error}
          successMessage={successMessage}
        />
      )}
    </div>
  );
}
