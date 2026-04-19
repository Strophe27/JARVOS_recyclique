import { Alert, NumberInput, Paper, Stack, Switch, Text, Title } from '@mantine/core';
import { BarChart3 } from 'lucide-react';
import { ADMIN_SUPER_PAGE_MANIFEST_GUARDS } from './admin-super-page-guards';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import {
  KPI_LIVE_BANNER_REFRESH_MAX_MS,
  KPI_LIVE_BANNER_REFRESH_MIN_MS,
} from '../bandeau-live/kpi-live-banner-settings';
import { useKpiLiveBannerSettings } from '../bandeau-live/kpi-live-banner-settings-provider';

/**
 * Super-admin : visibilité du bandeau KPI unifié (caisse / réception) + période de rafraîchissement.
 * Persistance `localStorage` (même onglet + `storage` inter-onglets) — synchronisation serveur possible en itération ultérieure.
 */
export function AdminKpiLiveBannerSettingsWidget(_props: RegisteredWidgetProps) {
  const auth = useAuthPort();
  const envelope = auth.getContextEnvelope();
  const isSuperAdminUi = ADMIN_SUPER_PAGE_MANIFEST_GUARDS.requiredPermissionKeys.every((key) =>
    envelope.permissions.permissionKeys.includes(key),
  );
  const { settings, updateSettings } = useKpiLiveBannerSettings();

  if (!isSuperAdminUi) {
    return (
      <Alert color="gray" title="Accès réservé" data-testid="admin-kpi-live-settings-denied">
        Cet écran est réservé au profil super-admin.
      </Alert>
    );
  }

  const minS = KPI_LIVE_BANNER_REFRESH_MIN_MS / 1000;
  const maxS = KPI_LIVE_BANNER_REFRESH_MAX_MS / 1000;
  const intervalSeconds = settings.refreshIntervalMs / 1000;

  return (
    <Stack gap="md" data-testid="admin-kpi-live-banner-settings">
      <div>
        <Title
          order={1}
          size="h2"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          data-testid="admin-kpi-live-settings-title"
        >
          <BarChart3 size={22} aria-hidden />
          Bandeau indicateurs live (KPI)
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          Contrôlez l’affichage du bandeau unifié (mêmes indicateurs que la caisse et la réception) et la fréquence
          d’appel à l’API. Les réglages s’appliquent sur ce poste (navigateur) et se propagent aux autres onglets
          ouverts.
        </Text>
      </div>

      <Paper p="md" withBorder radius="md">
        <Stack gap="md">
          <Switch
            label="Afficher sur la caisse (kiosque vente)"
            description="Bandeau sous l’en-tête de session sur l’écran de vente."
            checked={settings.showOnCaisse}
            onChange={(e) => updateSettings({ showOnCaisse: e.currentTarget.checked })}
            data-testid="admin-kpi-live-toggle-caisse"
          />
          <Switch
            label="Afficher sur la réception"
            description="Bandeau dans le chrome de l’écran réception."
            checked={settings.showOnReception}
            onChange={(e) => updateSettings({ showOnReception: e.currentTarget.checked })}
            data-testid="admin-kpi-live-toggle-reception"
          />
          <NumberInput
            label="Période de rafraîchissement (secondes)"
            description={`Entre ${minS} et ${maxS} secondes (plancher aligné sur l’API unifiée).`}
            min={minS}
            max={maxS}
            value={intervalSeconds}
            onChange={(v) => {
              const n = typeof v === 'number' ? v : Number(v);
              if (!Number.isFinite(n)) return;
              updateSettings({ refreshIntervalMs: Math.round(n * 1000) });
            }}
            data-testid="admin-kpi-live-refresh-seconds"
          />
        </Stack>
      </Paper>
    </Stack>
  );
}
