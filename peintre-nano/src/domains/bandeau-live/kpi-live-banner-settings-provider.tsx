import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  KPI_LIVE_BANNER_SETTINGS_EVENT,
  KPI_LIVE_BANNER_SETTINGS_STORAGE_KEY,
  readKpiLiveBannerSettingsFromStorage,
  writeKpiLiveBannerSettings,
  type KpiLiveBannerSettings,
} from './kpi-live-banner-settings';

export type KpiLiveBannerSettingsContextValue = {
  readonly settings: KpiLiveBannerSettings;
  readonly updateSettings: (partial: Partial<KpiLiveBannerSettings>) => void;
};

const KpiLiveBannerSettingsReactContext = createContext<KpiLiveBannerSettingsContextValue | null>(null);

/**
 * Source unique pour la visibilité / intervalle du bandeau KPI — doit envelopper tout l’arbre qui affiche admin + caisse + réception.
 */
export function KpiLiveBannerSettingsProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const [settings, setSettings] = useState<KpiLiveBannerSettings>(() => readKpiLiveBannerSettingsFromStorage());

  useEffect(() => {
    const syncFromStorage = () => setSettings(readKpiLiveBannerSettingsFromStorage());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KPI_LIVE_BANNER_SETTINGS_STORAGE_KEY || e.key === null) {
        syncFromStorage();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(KPI_LIVE_BANNER_SETTINGS_EVENT, syncFromStorage as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(KPI_LIVE_BANNER_SETTINGS_EVENT, syncFromStorage as EventListener);
    };
  }, []);

  const updateSettings = useCallback((partial: Partial<KpiLiveBannerSettings>) => {
    writeKpiLiveBannerSettings(partial);
    setSettings(readKpiLiveBannerSettingsFromStorage());
  }, []);

  const value = useMemo<KpiLiveBannerSettingsContextValue>(
    () => ({ settings, updateSettings }),
    [settings, updateSettings],
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
