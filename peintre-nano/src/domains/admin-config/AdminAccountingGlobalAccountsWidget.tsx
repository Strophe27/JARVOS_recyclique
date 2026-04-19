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
  cash_journal_code: 'Code du journal Paheko',
  default_entry_label_prefix: 'Préfixe des libellés d’écriture',
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
  const [cashJournalCode, setCashJournalCode] = useState('');
  const [entryLabelPrefix, setEntryLabelPrefix] = useState('Z caisse');
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
    setCashJournalCode(res.data.cash_journal_code ?? '');
    setEntryLabelPrefix(res.data.default_entry_label_prefix ?? 'Z caisse');
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
      cash_journal_code: cashJournalCode.trim(),
      default_entry_label_prefix: entryLabelPrefix.trim() || 'Z caisse',
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
    setCashJournalCode(res.data.cash_journal_code ?? '');
    setEntryLabelPrefix(res.data.default_entry_label_prefix ?? 'Z caisse');
    setUpdatedAt(res.data.updated_at);
  }, [auth, cashJournalCode, defaultDonation, defaultSales, entryLabelPrefix, priorRefund, stepUpPin]);

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
              description="Compte de produit / ventes global (ex. 707 ou 7070). Clé API : default_sales_account"
              placeholder="707"
              value={defaultSales}
              onChange={(e) => setDefaultSales(e.currentTarget.value)}
              data-testid="admin-global-accounts-sales"
            />
            <TextInput
              label={FIELD_LABELS.default_donation_account}
              description="Dons manuels reçus en caisse (ex. don volontaire ou complément de don). Compte recommandé : 7541. Clé API : default_donation_account"
              placeholder="7541"
              value={defaultDonation}
              onChange={(e) => setDefaultDonation(e.currentTarget.value)}
              data-testid="admin-global-accounts-donation"
            />
            <TextInput
              label={FIELD_LABELS.prior_year_refund_account}
              description="Utilisé uniquement pour les remboursements d'une vente dont l'exercice comptable est déjà clos. Candidat recommandé : 672 (Charges sur exercices antérieurs). À valider avec votre expert-comptable. Clé API : prior_year_refund_account"
              placeholder="672"
              value={priorRefund}
              onChange={(e) => setPriorRefund(e.currentTarget.value)}
              data-testid="admin-global-accounts-refund"
            />
            <Alert color="yellow" title="Remboursements sur exercice clos">
              Ce compte est activé automatiquement lors d&apos;un remboursement sur exercice clos. Vérifiez sa valeur avec
              votre expert-comptable avant la première clôture.
            </Alert>
            <TextInput
              label={FIELD_LABELS.cash_journal_code}
              description="Code du journal comptable dans lequel Recyclique dépose les écritures de clôture. Exemple : CA pour journal de caisse. Visible dans Paheko (Comptabilité → Journaux). Le serveur refuse un enregistrement vide si PAHEKO_API_BASE_URL est configuré sur le backend (intégration sortante). Clé API : cash_journal_code"
              placeholder="CA"
              value={cashJournalCode}
              onChange={(e) => setCashJournalCode(e.currentTarget.value)}
              data-testid="admin-global-accounts-journal"
            />
            <TextInput
              label={FIELD_LABELS.default_entry_label_prefix}
              description="Recyclique complète le libellé côté Paheko à partir de ce préfixe si le réglage de clôture ne fournit pas de préfixe. Exemple : « Z caisse ». Clé API : default_entry_label_prefix"
              placeholder="Z caisse"
              value={entryLabelPrefix}
              onChange={(e) => setEntryLabelPrefix(e.currentTarget.value)}
              data-testid="admin-global-accounts-label-prefix"
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
