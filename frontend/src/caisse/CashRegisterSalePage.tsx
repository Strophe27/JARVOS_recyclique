/**
 * Page saisie vente — parité flux / UI Recyclique 1.4.4 (Sale.tsx + SaleWizard).
 * Grille 3 colonnes : pavé numérique | assistant | ticket ; étapes Poids → Quantité → Prix.
 * Raccourcis AZERTY sur catégories (sans préfixe quantité sur l’onglet Catégorie, comme la V1).
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
import {
  getCategoryFixedUnitPriceCents,
  resolvePresetUnitPriceCents,
} from './categorySalePrice';
import { CashKeyboardShortcutHandler } from './utils/cashKeyboardShortcuts';
import { handleAZERTYInput, mapAZERTYToNumeric } from './utils/azertyKeyboard';
import { CaisseNumpad } from './CaisseNumpad';
import { Ticket } from './Ticket';
import { FinalizationScreen } from './FinalizationScreen';
import styles from './CashRegisterSalePage.module.css';

type NumpadMode = 'idle' | 'quantity' | 'price' | 'weight';

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
  const [presetsLoadError, setPresetsLoadError] = useState<string | null>(null);
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
  /** Quantité étape dédiée (1.4.4) — chaîne pour pavé numérique, défaut "1" remplaçable au 1er chiffre */
  const [quantityStr, setQuantityStr] = useState('1');
  const [quantityIsDefault, setQuantityIsDefault] = useState(true);
  const [pricePrefilled, setPricePrefilled] = useState(false);
  const [weightError, setWeightError] = useState('');
  const [quantityError, setQuantityError] = useState('');
  const [priceError, setPriceError] = useState('');
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

  const catQuantity = useMemo(
    () => Math.max(1, parseInt(quantityStr, 10) || 1),
    [quantityStr],
  );

  const numpadMode: NumpadMode = useMemo(() => {
    if (activeTab === 'poids') return 'weight';
    if (activeTab === 'quantite') return 'quantity';
    if (activeTab === 'prix') return 'price';
    return 'idle';
  }, [activeTab]);

  const weightNumOk = useMemo(() => {
    const w = parseFloat(catWeight);
    return !Number.isNaN(w) && w > 0;
  }, [catWeight]);

  const canOpenQuantiteTab = Boolean(selectedCategoryId && weightNumOk);
  const canOpenPrixTab = Boolean(canOpenQuantiteTab && catQuantity >= 1);

  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

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
  const cartRef = useRef(cart);
  const showFinalizationRef = useRef(showFinalization);
  const handleFinalizeRef = useRef<() => void>(() => {});

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    setPresetsLoadError(null);
    try {
      const current = await getCurrentCashSession(accessToken);
      setSession(current);
      if (current && current.current_step !== 'sale') {
        await updateCashSessionStep(accessToken, current.id, 'sale');
      }
      let presetsList: PresetItem[] = [];
      try {
        presetsList = await getPresetsActive(accessToken);
      } catch (pe) {
        setPresetsLoadError(pe instanceof Error ? pe.message : 'Erreur reseau');
      }
      setPresets(presetsList);
      const categoriesList = await getCategoriesSaleTickets(accessToken);
      setCategories(categoriesList);
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

  // --- Raccourcis clavier AZERTY : liste = catégories du niveau affiché (racine / sous-cat) — Story 19-8 ---

  const visibleCategoriesForShortcuts = useMemo(() => {
    if (activeTab === 'categorie') {
      return categories.filter((c) => c.parent_id === null);
    }
    if (activeTab === 'sous-categorie' && subCategoryParentId != null) {
      return categories.filter((c) => c.parent_id === subCategoryParentId);
    }
    return [];
  }, [categories, activeTab, subCategoryParentId]);

  const categoryShortcuts = useMemo(() => {
    const handler = shortcutHandlerRef.current;
    handler.initialize(visibleCategoriesForShortcuts, () => {});
    return categories.map((c) => ({
      category: c,
      letter: handler.getKeyForCategory(c.id) ?? '',
    }));
  }, [categories, visibleCategoriesForShortcuts]);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    showFinalizationRef.current = showFinalization;
  }, [showFinalization]);

  const handleNumpadDigit = useCallback(
    (digit: string) => {
      if (numpadMode === 'quantity') {
        let newValue: string;
        const shouldReplace = quantityIsDefault && quantityStr === '1';
        if (shouldReplace) newValue = digit;
        else newValue = quantityStr + digit;
        setQuantityIsDefault(false);
        if (/^\d*$/.test(newValue)) {
          const numValue = parseInt(newValue || '0', 10);
          if (numValue >= 1 && numValue <= 9999) {
            setQuantityStr(newValue);
            setQuantityError('');
          }
        }
        return;
      }
      if (numpadMode === 'price') {
        const newValue = pricePrefilled ? digit : catPriceEur + digit;
        if (/^\d*\.?\d{0,2}$/.test(newValue) && parseFloat(newValue || '0') <= 9999.99) {
          setCatPriceEur(newValue);
          setPriceError('');
          setPricePrefilled(false);
        }
        return;
      }
      if (numpadMode === 'weight') {
        const newValue = catWeight + digit;
        if (/^\d*\.?\d{0,2}$/.test(newValue) && parseFloat(newValue || '0') <= 9999.99) {
          setCatWeight(newValue);
          setWeightError('');
        }
      }
    },
    [numpadMode, quantityIsDefault, quantityStr, pricePrefilled, catPriceEur, catWeight],
  );

  const handleNumpadClear = useCallback(() => {
    if (numpadMode === 'quantity') {
      setQuantityStr('1');
      setQuantityIsDefault(true);
      setQuantityError('');
    } else if (numpadMode === 'price') {
      setCatPriceEur('');
      setPricePrefilled(false);
      setPriceError('');
    } else if (numpadMode === 'weight') {
      setCatWeight('');
      setWeightError('');
    }
  }, [numpadMode]);

  const handleNumpadBackspace = useCallback(() => {
    if (numpadMode === 'price' && pricePrefilled) {
      setCatPriceEur('');
      setPricePrefilled(false);
      return;
    }
    if (numpadMode === 'quantity') {
      const newValue = quantityStr.slice(0, -1);
      if (newValue === '' || newValue === '0') {
        setQuantityStr('1');
        setQuantityIsDefault(true);
      } else {
        setQuantityStr(newValue);
        setQuantityIsDefault(false);
      }
      setQuantityError('');
      return;
    }
    if (numpadMode === 'price') {
      setCatPriceEur(catPriceEur.slice(0, -1));
      setPriceError('');
      return;
    }
    if (numpadMode === 'weight') {
      setCatWeight(catWeight.slice(0, -1));
      setWeightError('');
    }
  }, [numpadMode, pricePrefilled, quantityStr, catPriceEur, catWeight]);

  const handleNumpadDecimal = useCallback(() => {
    if (numpadMode !== 'price' && numpadMode !== 'weight') return;
    const current = numpadMode === 'price' ? catPriceEur : catWeight;
    if (current.includes('.')) return;
    if (numpadMode === 'price' && pricePrefilled) {
      setCatPriceEur('0.');
      setPricePrefilled(false);
      return;
    }
    const next = `${current}.`;
    if (numpadMode === 'price') setCatPriceEur(next);
    else setCatWeight(next);
  }, [numpadMode, catPriceEur, catWeight, pricePrefilled]);

  const gateQuantiteRef = useRef(canOpenQuantiteTab);
  gateQuantiteRef.current = canOpenQuantiteTab;
  const gatePrixRef = useRef(canOpenPrixTab);
  gatePrixRef.current = canOpenPrixTab;
  const numpadModeRef = useRef(numpadMode);
  numpadModeRef.current = numpadMode;

  useEffect(() => {
    const AZERTY_NUMERIC_MAP: Record<string, string> = {
      '&': '1',
      é: '2',
      '"': '3',
      "'": '4',
      '(': '5',
      '-': '6',
      è: '7',
      _: '8',
      ç: '9',
      à: '0',
    };

    function shouldPrevent(target: EventTarget | null): boolean {
      if (!target || !(target instanceof HTMLElement)) return false;
      const el = target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return true;
      if (el.contentEditable === 'true') return true;
      if (el.getAttribute('role') === 'textbox') return true;
      if (el.hasAttribute('data-prevent-shortcuts')) return true;
      return false;
    }

    function keyEventToDigit(e: KeyboardEvent): string | null {
      if (e.key >= '0' && e.key <= '9') return e.key;
      const numpadMatch = e.code.match(/^Numpad(\d)$/);
      if (numpadMatch) return numpadMatch[1];
      const digitMatch = e.code.match(/^Digit(\d)$/);
      if (digitMatch) return digitMatch[1];
      const m = AZERTY_NUMERIC_MAP[e.key];
      return m ?? null;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (showFinalizationRef.current) return;
      if (shouldPrevent(e.target)) return;

      if (e.ctrlKey && !e.altKey && !e.metaKey) {
        const tabByCode: Record<string, string> = {
          Digit1: 'categorie',
          Digit2: 'sous-categorie',
          Digit3: 'poids',
          Digit4: 'quantite',
          Digit5: 'prix',
          Numpad1: 'categorie',
          Numpad2: 'sous-categorie',
          Numpad3: 'poids',
          Numpad4: 'quantite',
          Numpad5: 'prix',
        };
        const nextTab = tabByCode[e.code];
        if (nextTab) {
          e.preventDefault();
          if (nextTab === 'quantite' && !gateQuantiteRef.current) return;
          if (nextTab === 'prix' && !gatePrixRef.current) return;
          setActiveTab(nextTab);
          return;
        }
      }

      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const mode = numpadModeRef.current;
      if (mode === 'quantity' || mode === 'price' || mode === 'weight') {
        const digit = keyEventToDigit(e);
        if (digit) {
          e.preventDefault();
          handleNumpadDigit(digit);
          return;
        }
        if (e.key === '.' || e.key === ',') {
          e.preventDefault();
          handleNumpadDecimal();
          return;
        }
        if (e.key === 'Backspace') {
          e.preventDefault();
          handleNumpadBackspace();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          handleNumpadClear();
          return;
        }
      }

      const key = e.key;
      const hasCategoryShortcuts = shortcutHandlerRef.current.getAvailableKeys().length > 0;

      if (hasCategoryShortcuts && (activeTabRef.current === 'categorie' || activeTabRef.current === 'sous-categorie')) {
        const shortcut = shortcutHandlerRef.current.getShortcut(key);
        if (shortcut) {
          e.preventDefault();
          const cats = categoriesRef.current;
          const id = shortcut.categoryId;
          const hasChildren = cats.some((c) => c.parent_id === id);
          if (hasChildren) {
            setSubCategoryParentId(id);
            setSelectedCategoryId(null);
            setQuantityStr('1');
            setQuantityIsDefault(true);
            setActiveTab('sous-categorie');
          } else {
            setSelectedCategoryId(id);
            setQuantityStr('1');
            setQuantityIsDefault(true);
            setActiveTab('poids');
            const cat = cats.find((c) => c.id === id);
            const fixed = cat ? getCategoryFixedUnitPriceCents(cat) : null;
            setCatPriceEur(fixed != null ? (fixed / 100).toFixed(2) : '');
          }
          return;
        }
      }

      if (key === 'Enter') {
        const idle =
          activeTabRef.current === 'categorie' || activeTabRef.current === 'sous-categorie';
        if (idle && cartRef.current.length > 0) {
          e.preventDefault();
          handleFinalizeRef.current();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNumpadDigit, handleNumpadBackspace, handleNumpadClear, handleNumpadDecimal]);

  // --- Panier ---
  const addPresetToCart = useCallback(
    (preset: PresetItem) => {
      const unitCents = resolvePresetUnitPriceCents(preset, categories);
      const linked =
        preset.category_id != null
          ? categories.find((c) => c.id === preset.category_id)
          : undefined;
      setCart((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          category_id: preset.category_id,
          preset_id: preset.id,
          preset_name: preset.name,
          category_name: linked?.name,
          quantity: 1,
          unit_price: unitCents,
          total_price: unitCents,
          weight: null,
        },
      ]);
    },
    [categories]
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

  /** Feuille choisie : enchaînement 1.4.4 vers onglet Poids (puis Quantité → Prix). */
  const onLeafCategorySelected = useCallback(
    (categoryId: string) => {
      setSelectedCategoryId(categoryId);
      setQuantityStr('1');
      setQuantityIsDefault(true);
      setActiveTab('poids');
      const cat = categories.find((c) => c.id === categoryId);
      const fixed = cat ? getCategoryFixedUnitPriceCents(cat) : null;
      setCatPriceEur(fixed != null ? (fixed / 100).toFixed(2) : '');
      setPricePrefilled(fixed != null);
    },
    [categories]
  );

  const removeCartLine = useCallback((id: string) => {
    setCart((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateCartLine = useCallback(
    (id: string, quantity: number, unitPriceCents: number) => {
      const q = Math.max(1, Math.floor(quantity));
      const unit = Math.max(0, Math.round(unitPriceCents));
      setCart((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, quantity: q, unit_price: unit, total_price: q * unit } : l
        )
      );
    },
    []
  );

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
    // Ligne catégorie uniquement depuis l'onglet Prix après parcours poids → prix (19.9, audit §8).
    if (activeTabRef.current !== 'prix') return;
    if (!selectedCategoryId) return;
    const cat = categories.find((c) => c.id === selectedCategoryId);
    if (cat) {
      const fixedCents = getCategoryFixedUnitPriceCents(cat);
      const priceCents =
        fixedCents != null
          ? fixedCents
          : Math.round(parseFloat(catPriceEur || '0') * 100);
      const weightVal = catWeight ? parseFloat(catWeight) : null;
      addCategoryToCart(cat, catQuantity, priceCents, weightVal);
      setSelectedCategoryId(null);
      setCatWeight('');
      setCatPriceEur('');
      setQuantityStr('1');
      setQuantityIsDefault(true);
      setPricePrefilled(false);
      setSubCategoryParentId(null);
      setActiveTab('categorie');
    }
  }, [categories, selectedCategoryId, catQuantity, catPriceEur, catWeight, addCategoryToCart]);

  /** Prix fixe : affichage onglet Prix (1.4.4 — premier chiffre remplace le préremplissage). */
  useEffect(() => {
    if (activeTab !== 'prix' || !selectedCategoryId) return;
    const cat = categories.find((c) => c.id === selectedCategoryId);
    if (!cat) return;
    const fixed = getCategoryFixedUnitPriceCents(cat);
    if (fixed != null) {
      setCatPriceEur((fixed / 100).toFixed(2));
      setPricePrefilled(true);
    } else {
      setPricePrefilled(false);
    }
  }, [activeTab, selectedCategoryId, categories]);

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

  const subcategoriesExist = useMemo(
    () => categories.some((c) => c.parent_id != null),
    [categories],
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
  const selectedCategoryFixedCents =
    selectedCat != null ? getCategoryFixedUnitPriceCents(selectedCat) : null;

  const numpadDisplayValue =
    numpadMode === 'weight' ? catWeight : numpadMode === 'quantity' ? quantityStr : catPriceEur;
  const numpadDisplayError =
    numpadMode === 'weight'
      ? weightError
      : numpadMode === 'quantity'
        ? quantityError
        : numpadMode === 'price'
          ? priceError
          : undefined;

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

      <div
        className={styles.saleKioskMain}
        data-numpad-mode={numpadMode}
        data-testid="sale-kiosk-layout"
      >
        <aside className={styles.leftNumpad}>
          {numpadMode !== 'idle' ? (
            <CaisseNumpad
              value={numpadDisplayValue}
              error={numpadDisplayError}
              onDigit={handleNumpadDigit}
              onClear={handleNumpadClear}
              onBackspace={handleNumpadBackspace}
              onDecimal={
                numpadMode === 'price' || numpadMode === 'weight'
                  ? handleNumpadDecimal
                  : undefined
              }
              unit={numpadMode === 'price' ? '\u20AC' : numpadMode === 'weight' ? 'kg' : ''}
              showDecimal={numpadMode === 'price' || numpadMode === 'weight'}
            />
          ) : (
            <div className={styles.numpadPlaceholder}>
              <Text size="sm" c="dimmed" ta="center">
                Etape numerique : onglets Poids, Quantite ou Prix (comme la caisse 1.4.4).
              </Text>
            </div>
          )}
        </aside>

        <div className={styles.centerWizard}>
          <div className={styles.contentArea}>
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            variant="pills"
            data-testid="caisse-sale-tabs"
            activateTabWithKeyboard
            keepMounted={false}
          >
            <Tabs.List className={styles.tabsList} aria-label="Etapes de saisie vente">
              <Tabs.Tab value="categorie" color="green">
                Categorie
              </Tabs.Tab>
              <Tabs.Tab value="sous-categorie" color="green" disabled={!subcategoriesExist}>
                Sous-categorie
              </Tabs.Tab>
              <Tabs.Tab value="poids" color="green" disabled={!selectedCategoryId}>
                Poids
              </Tabs.Tab>
              <Tabs.Tab value="quantite" color="green" disabled={!canOpenQuantiteTab}>
                Quantite
              </Tabs.Tab>
              <Tabs.Tab value="prix" color="green" disabled={!canOpenPrixTab}>
                Prix
              </Tabs.Tab>
            </Tabs.List>

            <div className={styles.currentItem} data-testid="caisse-current-item">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                ARTICLE EN COURS DE SAISIE
              </Text>
              <Text size="sm" fw={500}>
                {selectedCat ? selectedCat.name : '—'} | Qté : {quantityStr}
              </Text>
            </div>

            <Tabs.Panel value="categorie">
              <PresetButtonGrid
                presets={presets}
                categories={categories}
                loadError={presetsLoadError}
                onPresetClick={addPresetToCart}
              />
              <CategoryGrid
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onCategorySelect={onLeafCategorySelected}
                onParentCategoryClick={(parentId) => {
                  setSubCategoryParentId(parentId);
                  setSelectedCategoryId(null);
                  setQuantityStr('1');
                  setQuantityIsDefault(true);
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
                    onCategorySelect={onLeafCategorySelected}
                    onParentCategoryClick={(parentId) => {
                      setSubCategoryParentId(parentId);
                      setSelectedCategoryId(null);
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
                <Text fw={500}>Poids (kg)</Text>
                <Text size="sm" c="dimmed">
                  Pavé à gauche ou champ ci-dessous. Ensuite : Quantite puis Prix avant d&apos;ajouter au
                  ticket (flux 1.4.4).
                </Text>
                <Stack gap="xs" align="flex-start">
                  <NumberInput
                    decimalScale={3}
                    min={0}
                    value={catWeight}
                    onChange={(v) => {
                      setCatWeight(String(v ?? ''));
                      setWeightError('');
                    }}
                    onKeyDown={(ke) => {
                      if (ke.ctrlKey || ke.altKey || ke.metaKey) return;
                      const next = handleAZERTYInput(catWeight, ke.key, ke.nativeEvent, 16, true);
                      if (next !== catWeight) {
                        ke.preventDefault();
                        setCatWeight(next);
                      }
                    }}
                    data-testid="cat-weight"
                    placeholder="Poids kg"
                    w={120}
                  />
                  <Button
                    variant="filled"
                    color="green"
                    size="sm"
                    data-testid="goto-quantite-from-poids"
                    onClick={() => {
                      const w = parseFloat(catWeight);
                      if (Number.isNaN(w) || w <= 0) {
                        setWeightError('Poids requis (superieur a 0)');
                        return;
                      }
                      setWeightError('');
                      setActiveTab('quantite');
                    }}
                  >
                    Continuer vers Quantite
                  </Button>
                </Stack>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="quantite">
              <Stack gap="xs" py="md">
                <Text fw={500}>Quantite</Text>
                <Text size="sm" c="dimmed">
                  Utilisez le pavé numérique à gauche ou les chiffres du clavier (mode 1.4.4).
                </Text>
                <Button
                  variant="filled"
                  color="green"
                  size="sm"
                  data-testid="goto-prix-from-quantite"
                  onClick={() => {
                    const q = parseInt(quantityStr, 10);
                    if (Number.isNaN(q) || q < 1) {
                      setQuantityError('Quantite minimale : 1');
                      return;
                    }
                    setQuantityError('');
                    setActiveTab('prix');
                  }}
                >
                  Continuer vers Prix
                </Button>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="prix">
              <Stack gap="xs" py="md">
                <Text fw={500}>Prix unitaire</Text>
                <Stack gap="xs" align="flex-start">
                  <NumberInput
                    decimalScale={2}
                    min={0}
                    value={catPriceEur}
                    onChange={(v) => {
                      setCatPriceEur(String(v ?? ''));
                      setPricePrefilled(false);
                      setPriceError('');
                    }}
                    onKeyDown={(ke) => {
                      if (ke.ctrlKey || ke.altKey || ke.metaKey) return;
                      const next = handleAZERTYInput(catPriceEur, ke.key, ke.nativeEvent, 16, true);
                      if (next !== catPriceEur) {
                        ke.preventDefault();
                        setCatPriceEur(next);
                        setPricePrefilled(false);
                      }
                    }}
                    data-testid="cat-price"
                    placeholder="Prix EUR"
                    w={120}
                    readOnly={selectedCategoryFixedCents != null}
                  />
                  <Button variant="light" size="sm" onClick={handleAddCategoryLine}>
                    Ajouter
                  </Button>
                </Stack>
              </Stack>
            </Tabs.Panel>
          </Tabs>
          </div>
        </div>

        {/* Panneau ticket (colonne droite — comme Sale.tsx 1.4.4) */}
        <Ticket
          cart={cart}
          onRemoveLine={removeCartLine}
          onUpdateLine={updateCartLine}
          onFinalize={handleFinalize}
          total={cartTotal}
          note={note}
          onNoteChange={setNote}
          saleDate={saleDate}
          onSaleDateChange={setSaleDate}
          error={error}
          resolveCategoryFixedUnitPriceCents={(categoryId) => {
            const c = categories.find((x) => x.id === categoryId);
            return c ? getCategoryFixedUnitPriceCents(c) : null;
          }}
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
