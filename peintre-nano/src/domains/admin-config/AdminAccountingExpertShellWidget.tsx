import { Alert, Stack, Tabs, Text, Title } from '@mantine/core';
import { BookOpen, CreditCard, Link2, Wrench } from 'lucide-react';
import { useCallback, useEffect, useReducer } from 'react';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { AdminAccountingGlobalAccountsWidget } from './AdminAccountingGlobalAccountsWidget';
import { AdminAccountingPaymentMethodsWidget } from './AdminAccountingPaymentMethodsWidget';
import { AdminPahekoCashSessionCloseMappingsSection } from './AdminPahekoCashSessionCloseMappingsSection';
import { AdminPahekoDiagnosticsSection } from './AdminPahekoDiagnosticsSection';
import { ADMIN_SUPER_PAGE_MANIFEST_GUARDS } from './admin-super-page-guards';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';

const DEFAULT_TAB = 'payment-methods' as const;

const ALLOWED_TABS = new Set<string>([
  'payment-methods',
  'global-accounts',
  'paheko-cloture',
  'paheko-support',
]);

function normalizeTab(raw: string | null): string {
  if (raw && ALLOWED_TABS.has(raw)) return raw;
  return DEFAULT_TAB;
}

function readTabFromLocation(): string {
  if (typeof window === 'undefined') return DEFAULT_TAB;
  return normalizeTab(new URLSearchParams(window.location.search).get('tab'));
}

function pushTabToLocation(tab: string): void {
  if (typeof window === 'undefined') return;
  const next = normalizeTab(tab);
  const u = new URL(window.location.href);
  u.searchParams.set('tab', next);
  window.history.replaceState({}, '', `${u.pathname}${u.search}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function AdminAccountingExpertShellWidget(_props: RegisteredWidgetProps) {
  const auth = useAuthPort();
  const envelope = auth.getContextEnvelope();
  const isSuperAdminUi = ADMIN_SUPER_PAGE_MANIFEST_GUARDS.requiredPermissionKeys.every((key) =>
    envelope.permissions.permissionKeys.includes(key),
  );

  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const onPop = () => bump();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const activeTab = readTabFromLocation();

  const onTabChange = useCallback((value: string | null) => {
    if (!value) return;
    pushTabToLocation(value);
  }, []);

  if (!isSuperAdminUi) {
    return (
      <Alert color="gray" title="Accès réservé" data-testid="admin-accounting-expert-shell-denied">
        <Text size="sm">Cette page est réservée au profil super-admin terrain (proxy aligné sur le paramétrage comptable).</Text>
      </Alert>
    );
  }

  return (
    <Stack gap="md" data-testid="admin-accounting-expert-shell">
      <div>
        <Title order={1} size="h2" m={0}>
          Paramétrage comptable
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          Moyens de paiement, comptes globaux, intégration Paheko (clôture et support) — réservé super-admin.
        </Text>
      </div>

      <Tabs value={activeTab} onChange={onTabChange} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="payment-methods" leftSection={<CreditCard size={14} />}>
            Moyens de paiement
          </Tabs.Tab>
          <Tabs.Tab value="global-accounts" leftSection={<BookOpen size={14} />}>
            Comptes globaux
          </Tabs.Tab>
          <Tabs.Tab value="paheko-cloture" leftSection={<Link2 size={14} />}>
            Paheko : clôture
          </Tabs.Tab>
          <Tabs.Tab value="paheko-support" leftSection={<Wrench size={14} />}>
            Paheko : support
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="payment-methods" pt="md">
          <AdminAccountingPaymentMethodsWidget
            widgetProps={{ hideStandaloneNav: true }}
          />
        </Tabs.Panel>
        <Tabs.Panel value="global-accounts" pt="md">
          <AdminAccountingGlobalAccountsWidget widgetProps={{}} />
        </Tabs.Panel>
        <Tabs.Panel value="paheko-cloture" pt="md">
          <AdminPahekoCashSessionCloseMappingsSection />
        </Tabs.Panel>
        <Tabs.Panel value="paheko-support" pt="md">
          <AdminPahekoDiagnosticsSection />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
