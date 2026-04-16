import { Alert, Button, Group, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import {
  getGlobalAccounts,
  patchGlobalAccounts,
  type GlobalAccountsPatchPayload,
} from '../../api/admin-accounting-expert-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { ADMIN_SUPER_PAGE_MANIFEST_GUARDS } from './admin-super-page-guards';

/** Libellés terrain ↔ clés API (OpenAPI). */
const FIELD_LABELS: Readonly<Record<keyof GlobalAccountsPatchPayload, string>> = {
  default_sales_account: 'Compte ventes (par défaut)',
  default_donation_account: 'Compte dons (par défaut)',
  prior_year_refund_account: 'Compte remboursements exercice antérieur',
};

function formatUpdatedAt(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString('fr-FR');
}

export function AdminAccountingGlobalAccountsWidget(_props: RegisteredWidgetProps) {
  const auth = useAuthPort();
  const envelope = auth.getContextEnvelope();
  const isSuperAdminUi = ADMIN_SUPER_PAGE_MANIFEST_GUARDS.requiredPermissionKeys.every((key) =>
    envelope.permissions.permissionKeys.includes(key),
  );

  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [defaultSales, setDefaultSales] = useState('');
  const [defaultDonation, setDefaultDonation] = useState('');
  const [priorRefund, setPriorRefund] = useState('');
  const [stepUpPin, setStepUpPin] = useState('');

  const load = useCallback(async () => {
    if (!isSuperAdminUi) return;
    setBusy(true);
    setLoadError(null);
    setSaveOk(null);
    const res = await getGlobalAccounts(auth);
    setBusy(false);
    if (!res.ok) {
      setLoadError(res.detail);
      return;
    }
    setDefaultSales(res.data.default_sales_account);
    setDefaultDonation(res.data.default_donation_account);
    setPriorRefund(res.data.prior_year_refund_account);
    setUpdatedAt(res.data.updated_at);
  }, [auth, isSuperAdminUi]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = useCallback(async () => {
    setSaveError(null);
    setSaveOk(null);
    const payload: GlobalAccountsPatchPayload = {
      default_sales_account: defaultSales.trim(),
      default_donation_account: defaultDonation.trim(),
      prior_year_refund_account: priorRefund.trim(),
    };
    setBusy(true);
    const res = await patchGlobalAccounts(auth, payload, { stepUpPin });
    setBusy(false);
    if (!res.ok) {
      setSaveError(res.detail);
      return;
    }
    setSaveOk('Enregistrement effectué. Les comptes seront pris en compte selon la gouvernance des révisions publiées.');
    setStepUpPin('');
    setDefaultSales(res.data.default_sales_account);
    setDefaultDonation(res.data.default_donation_account);
    setPriorRefund(res.data.prior_year_refund_account);
    setUpdatedAt(res.data.updated_at);
  }, [auth, defaultDonation, defaultSales, priorRefund, stepUpPin]);

  return (
    <Stack gap="md" data-testid="admin-accounting-global-accounts">
      <div>
        <Title order={1} size="h2" m={0}>
          Comptabilité caisse (comptes globaux)
        </Title>
        <Text size="sm" c="dimmed" mt={4}>
          Référentiel global des comptes Paheko pour la caisse — distinct du paramétrage des moyens de paiement (expert).
        </Text>
      </div>

      {!isSuperAdminUi ? (
        <Alert color="gray" title="Accès réservé">
          La consultation et la modification des comptes globaux sont réservées au profil super-admin terrain prévu par
          le produit (permissions effectives et contexte site).
        </Alert>
      ) : null}

      {isSuperAdminUi && loadError ? (
        <Alert color="red" title="Chargement impossible">
          {loadError}
        </Alert>
      ) : null}

      {isSuperAdminUi && saveError ? (
        <Alert color="red" title="Enregistrement refusé ou incomplet">
          {saveError}
        </Alert>
      ) : null}

      {isSuperAdminUi && saveOk ? (
        <Alert color="teal" title="Succès">
          {saveOk}
        </Alert>
      ) : null}

      {isSuperAdminUi && !loadError ? (
        <Paper withBorder p="md">
          <Stack gap="sm">
            <TextInput
              label={FIELD_LABELS.default_sales_account}
              description="Clé API : default_sales_account"
              value={defaultSales}
              onChange={(e) => setDefaultSales(e.currentTarget.value)}
              data-testid="admin-global-accounts-sales"
            />
            <TextInput
              label={FIELD_LABELS.default_donation_account}
              description="Clé API : default_donation_account"
              value={defaultDonation}
              onChange={(e) => setDefaultDonation(e.currentTarget.value)}
              data-testid="admin-global-accounts-donation"
            />
            <TextInput
              label={FIELD_LABELS.prior_year_refund_account}
              description="Clé API : prior_year_refund_account"
              value={priorRefund}
              onChange={(e) => setPriorRefund(e.currentTarget.value)}
              data-testid="admin-global-accounts-refund"
            />
            <Text size="sm" c="dimmed" data-testid="admin-global-accounts-updated-at">
              Dernière mise à jour (lecture seule) :{' '}
              {updatedAt ? formatUpdatedAt(updatedAt) : '—'}
            </Text>
            <PasswordInput
              label="PIN de vérification (step-up)"
              description="Obligatoire pour enregistrer — en-tête X-Step-Up-Pin, comme les autres mutations accounting-expert."
              value={stepUpPin}
              onChange={(e) => setStepUpPin(e.currentTarget.value)}
              data-testid="admin-global-accounts-step-up"
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => void load()} loading={busy} data-testid="admin-global-accounts-reload">
                Recharger
              </Button>
              <Button onClick={() => void onSave()} loading={busy} data-testid="admin-global-accounts-save">
                Enregistrer
              </Button>
            </Group>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
