import { UNIFIED_LIVE_KPI_POLL_INTERVAL_MS } from './use-unified-live-kpi-poll';

export const KPI_LIVE_BANNER_SETTINGS_STORAGE_KEY = 'pn.kpiLiveBanner.settings.v1';

/** Événement same-onglet après `localStorage.setItem` (l’événement `storage` natif n’y remonte pas). */
export const KPI_LIVE_BANNER_SETTINGS_EVENT = 'pn-kpi-live-banner-settings';

export type KpiLiveBannerSettings = {
  showOnCaisse: boolean;
  showOnReception: boolean;
  refreshIntervalMs: number;
};

export const KPI_LIVE_BANNER_REFRESH_MIN_MS = UNIFIED_LIVE_KPI_POLL_INTERVAL_MS;
export const KPI_LIVE_BANNER_REFRESH_MAX_MS = 600_000;

export const KPI_LIVE_BANNER_DEFAULTS: KpiLiveBannerSettings = {
  showOnCaisse: true,
  showOnReception: true,
  refreshIntervalMs: UNIFIED_LIVE_KPI_POLL_INTERVAL_MS,
};

function clampInterval(ms: number): number {
  if (!Number.isFinite(ms)) return KPI_LIVE_BANNER_DEFAULTS.refreshIntervalMs;
  return Math.min(
    KPI_LIVE_BANNER_REFRESH_MAX_MS,
    Math.max(KPI_LIVE_BANNER_REFRESH_MIN_MS, Math.round(ms)),
  );
}

function parseStored(raw: string | null): KpiLiveBannerSettings {
  if (!raw) return { ...KPI_LIVE_BANNER_DEFAULTS };
  try {
    const o = JSON.parse(raw) as Partial<KpiLiveBannerSettings>;
    return {
      showOnCaisse: typeof o.showOnCaisse === 'boolean' ? o.showOnCaisse : KPI_LIVE_BANNER_DEFAULTS.showOnCaisse,
      showOnReception:
        typeof o.showOnReception === 'boolean' ? o.showOnReception : KPI_LIVE_BANNER_DEFAULTS.showOnReception,
      refreshIntervalMs: clampInterval(
        typeof o.refreshIntervalMs === 'number' ? o.refreshIntervalMs : KPI_LIVE_BANNER_DEFAULTS.refreshIntervalMs,
      ),
    };
  } catch {
    return { ...KPI_LIVE_BANNER_DEFAULTS };
  }
}

/** Lecture brute `localStorage` sans cache module — utilisée pour fusion à l’écriture et pour le Provider. */
export function readKpiLiveBannerSettingsFromStorage(): KpiLiveBannerSettings {
  if (typeof window === 'undefined') return { ...KPI_LIVE_BANNER_DEFAULTS };
  try {
    return parseStored(window.localStorage.getItem(KPI_LIVE_BANNER_SETTINGS_STORAGE_KEY));
  } catch {
    return { ...KPI_LIVE_BANNER_DEFAULTS };
  }
}

/** Alias lecture (tests, diagnostics). */
export function readKpiLiveBannerSettings(): KpiLiveBannerSettings {
  return readKpiLiveBannerSettingsFromStorage();
}

export function writeKpiLiveBannerSettings(partial: Partial<KpiLiveBannerSettings>): void {
  if (typeof window === 'undefined') return;
  const prev = readKpiLiveBannerSettingsFromStorage();
  const next: KpiLiveBannerSettings = {
    showOnCaisse: partial.showOnCaisse ?? prev.showOnCaisse,
    showOnReception: partial.showOnReception ?? prev.showOnReception,
    refreshIntervalMs:
      partial.refreshIntervalMs !== undefined ? clampInterval(partial.refreshIntervalMs) : prev.refreshIntervalMs,
  };
  try {
    window.localStorage.setItem(KPI_LIVE_BANNER_SETTINGS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(KPI_LIVE_BANNER_SETTINGS_EVENT));
  } catch {
    /* quota / privacy mode */
  }
}
