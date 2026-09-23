import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  buildKpiLiveBannerModuleDocument,
  getSiteModuleConfig,
  KPI_LIVE_BANNER_MODULE_KEY,
  parseKpiLiveBannerPayload,
  patchSiteModuleConfig,
} from '../../api/module-config-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import {
  KPI_LIVE_BANNER_DEFAULTS,
  kpiLiveBannerPayloadToSettings,
  kpiLiveBannerSettingsToPayload,
  mergeKpiLiveBannerSettings,
  type KpiLiveBannerSettings,
} from './kpi-live-banner-settings';

export type KpiLiveBannerSettingsUpdateOptions = {
  /** Motif saisi en UI admin (traçabilité locale jusqu’à journalisation serveur P2). */
  readonly motif?: string;
};

export type KpiLiveBannerSettingsContextValue = {
  readonly settings: KpiLiveBannerSettings;
  readonly updateSettings: (
    partial: Partial<KpiLiveBannerSettings>,
    options?: KpiLiveBannerSettingsUpdateOptions,
  ) => Promise<boolean>;
  readonly isLoading: boolean;
  readonly saveError: string | null;
  /** `true` lorsque les réglages proviennent du GET module-config (site connu). */
  readonly isServerSource: boolean;
  /** `true` quand un PATCH peut être tenté sans risquer d'écraser la vérité serveur. */
  readonly canSave: boolean;
  readonly lastSavedAt: number | null;
  readonly lastSaveMotif: string | null;
};

const KpiLiveBannerSettingsReactContext = createContext<KpiLiveBannerSettingsContextValue | null>(null);

/**
 * Source unique pour la visibilité / intervalle du bandeau KPI — charge l’API module-config par site
 * quand `siteId` est présent dans l’enveloppe ; défauts locaux sinon.
 */
export type KpiLiveBannerSettingsProviderProps = {
  readonly children: ReactNode;
  /**
   * Tests / harness : évite un `GET module-config` parasite quand la suite compte les appels `fetch`
   * (live snapshot, présence, etc.).
   */
  readonly skipServerModuleConfigLoad?: boolean;
};

export function KpiLiveBannerSettingsProvider({
  children,
  skipServerModuleConfigLoad = false,
}: KpiLiveBannerSettingsProviderProps): ReactNode {
  const auth = useAuthPort();
  const siteId = auth.getContextEnvelope().siteId;
  const [settings, setSettings] = useState<KpiLiveBannerSettings>(KPI_LIVE_BANNER_DEFAULTS);
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isServerSource, setIsServerSource] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [lastSaveMotif, setLastSaveMotif] = useState<string | null>(null);
  const etagRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteId || skipServerModuleConfigLoad) {
      setSettings({ ...KPI_LIVE_BANNER_DEFAULTS });
      setIsServerSource(false);
      setCanSave(false);
      etagRef.current = null;
      setSaveError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();
    setIsLoading(true);
    setSaveError(null);

    void (async () => {
      let res: Awaited<ReturnType<typeof getSiteModuleConfig>>;
      try {
        res = await getSiteModuleConfig(auth, siteId, KPI_LIVE_BANNER_MODULE_KEY, ac.signal);
      } catch {
        if (cancelled) return;
        etagRef.current = null;
        setSettings({ ...KPI_LIVE_BANNER_DEFAULTS });
        setIsServerSource(false);
        setCanSave(false);
        setIsLoading(false);
        return;
      }
      if (cancelled) return;
      if (res.ok) {
        etagRef.current = res.etag;
        const payload = parseKpiLiveBannerPayload(res.data.payload);
        if (payload) {
          setSettings(kpiLiveBannerPayloadToSettings(payload));
          setIsServerSource(true);
          setCanSave(Boolean(res.etag));
        } else {
          setSettings({ ...KPI_LIVE_BANNER_DEFAULTS });
          setIsServerSource(false);
          setCanSave(false);
          setSaveError(
            'Configuration bandeau KPI invalide côté serveur. Rechargez avant toute tentative d’enregistrement.',
          );
        }
      } else {
        etagRef.current = null;
        setSettings({ ...KPI_LIVE_BANNER_DEFAULTS });
        setIsServerSource(false);
        setCanSave(false);
        setSaveError(`${res.detail} Rechargez avant toute tentative d’enregistrement.`);
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [auth, siteId, skipServerModuleConfigLoad]);

  const updateSettings = useCallback(
    async (
      partial: Partial<KpiLiveBannerSettings>,
      options?: KpiLiveBannerSettingsUpdateOptions,
    ): Promise<boolean> => {
      const next = mergeKpiLiveBannerSettings(settings, partial);
      if (!siteId) {
        setSettings(next);
        setSaveError('Aucun site actif — enregistrement serveur impossible.');
        return false;
      }
      if (!etagRef.current || !canSave) {
        setSaveError(
          'Configuration serveur non chargée. Rechargez les réglages avant toute tentative d’enregistrement.',
        );
        return false;
      }

      setSaveError(null);
      const payload = kpiLiveBannerSettingsToPayload(next);
      const body = buildKpiLiveBannerModuleDocument(payload);
      const res = await patchSiteModuleConfig(auth, siteId, KPI_LIVE_BANNER_MODULE_KEY, body, {
        ifMatch: etagRef.current,
        changeReason: options?.motif,
      });
      if (!res.ok) {
        setSaveError(res.detail);
        return false;
      }
      etagRef.current = res.etag;
      const parsed = parseKpiLiveBannerPayload(res.data.payload);
      if (parsed) {
        setSettings(kpiLiveBannerPayloadToSettings(parsed));
      } else {
        setSettings(next);
      }
      setIsServerSource(true);
      setCanSave(true);
      setLastSavedAt(Date.now());
      setLastSaveMotif(options?.motif?.trim() ? options.motif.trim() : null);
      return true;
    },
    [auth, canSave, settings, siteId],
  );

  const value = useMemo<KpiLiveBannerSettingsContextValue>(
    () => ({
      settings,
      updateSettings,
      isLoading,
      saveError,
      isServerSource,
      canSave,
      lastSavedAt,
      lastSaveMotif,
    }),
    [settings, updateSettings, isLoading, saveError, isServerSource, canSave, lastSavedAt, lastSaveMotif],
  );

  return (
    <KpiLiveBannerSettingsReactContext.Provider value={value}>{children}</KpiLiveBannerSettingsReactContext.Provider>
  );
}

export function useKpiLiveBannerSettings(): KpiLiveBannerSettingsContextValue {
  const ctx = useContext(KpiLiveBannerSettingsReactContext);
  if (!ctx) {
    throw new Error(
      'useKpiLiveBannerSettings : enveloppez l’application avec <KpiLiveBannerSettingsProvider> (voir RootProviders).',
    );
  }
  return ctx;
}
