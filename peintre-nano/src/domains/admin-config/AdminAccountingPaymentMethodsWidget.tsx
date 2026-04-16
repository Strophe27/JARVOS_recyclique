import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  PasswordInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { ArrowDown, ArrowUp, Pencil, Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type AccountingExpertPaymentMethod,
  type AccountingExpertPaymentMethodCreate,
  type AccountingExpertPaymentMethodKind,
  type AccountingExpertPaymentMethodPatch,
  createAccountingExpertPaymentMethod,
  getAccountingExpertLatestRevisionDetail,
  listAccountingExpertPaymentMethods,
  patchAccountingExpertPaymentMethod,
  publishAccountingExpertRevision,
  setAccountingExpertPaymentMethodActive,
} from '../../api/admin-accounting-expert-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { ADMIN_SUPER_PAGE_MANIFEST_GUARDS } from './admin-super-page-guards';

const KIND_OPTIONS: { value: AccountingExpertPaymentMethodKind; label: string }[] = [
  { value: 'cash', label: 'Espèces' },
  { value: 'bank', label: 'Banque' },
  { value: 'third_party', label: 'Tiers' },
  { value: 'other', label: 'Autre' },
];

function signatureFromMethods(methods: readonly AccountingExpertPaymentMethod[]): string {
  const norm = methods
    .map((m) => ({
      id: m.id,
      code: m.code,
      label: m.label,
      kind: m.kind,
      active: m.active,
      paheko_debit_account: m.paheko_debit_account,
      paheko_refund_credit_account: m.paheko_refund_credit_account,
      min_amount: m.min_amount,
      max_amount: m.max_amount,
      display_order: m.display_order,
      notes: m.notes,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(norm);
}

function signatureFromRevisionSnapshot(snapshot: Record<string, unknown> | undefined): string | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const raw = snapshot.payment_methods;
  if (!Array.isArray(raw)) return null;
  const norm = raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as Record<string, unknown>;
      return {
        id: typeof o.id === 'string' ? o.id : String(o.id ?? ''),
        code: o.code,
        label: o.label,
        kind: o.kind,
        active: o.active,
        paheko_debit_account: o.paheko_debit_account,
        paheko_refund_credit_account: o.paheko_refund_credit_account,
        min_amount: o.min_amount ?? null,
        max_amount: o.max_amount ?? null,
        display_order: o.display_order,
        notes: o.notes ?? null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(norm);
}

export function AdminAccountingPaymentMethodsWidget(props: RegisteredWidgetProps) {
  const hideStandaloneNav = props.widgetProps?.hideStandaloneNav === true;
  const auth = useAuthPort();
  const envelope = auth.getContextEnvelope();
  const isSuperAdminUi = ADMIN_SUPER_PAGE_MANIFEST_GUARDS.requiredPermissionKeys.every((key) =>
    envelope.permissions.permissionKeys.includes(key),
  );

  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [methods, setMethods] = useState<readonly AccountingExpertPaymentMethod[]>([]);
  const [revisionSeq, setRevisionSeq] = useState<number | null>(null);
  const [revisionSnapshotSig, setRevisionSnapshotSig] = useState<string | null>(null);
  const [noRevisionYet, setNoRevisionYet] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<AccountingExpertPaymentMethod | null>(null);
  const [activeRow, setActiveRow] = useState<AccountingExpertPaymentMethod | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [stepUpPin, setStepUpPin] = useState('');
  const [publishNote, setPublishNote] = useState('');

  const [formCode, setFormCode] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formKind, setFormKind] = useState<AccountingExpertPaymentMethodKind>('cash');
  const [formDebit, setFormDebit] = useState('');
  const [formCredit, setFormCredit] = useState('');
  const [formMin, setFormMin] = useState<number | string>('');
  const [formMax, setFormMax] = useState<number | string>('');
  const [formOrder, setFormOrder] = useState<number | string>(0);
  const [formNotes, setFormNotes] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setLoadError(null);
    const [listRes, revRes] = await Promise.all([
      listAccountingExpertPaymentMethods(auth),
      getAccountingExpertLatestRevisionDetail(auth),
    ]);
    if (!listRes.ok) {
      setLoadError(listRes.detail);
      setBusy(false);
      return;
    }
    setMethods(listRes.data);
    if (revRes.ok) {
      setRevisionSeq(revRes.data.revision_seq);
      setRevisionSnapshotSig(signatureFromRevisionSnapshot(revRes.data.snapshot));
      setNoRevisionYet(false);
    } else {
      setRevisionSeq(null);
      setRevisionSnapshotSig(null);
      setNoRevisionYet(Boolean(revRes.notFound));
      if (!revRes.notFound) {
        setLoadError(revRes.detail);
      }
    }
    setBusy(false);
  }, [auth]);

  useEffect(() => {
    if (!isSuperAdminUi) return;
    void load();
  }, [load, isSuperAdminUi]);

  const currentSig = useMemo(() => signatureFromMethods(methods), [methods]);
  /** Snapshot publié sans tableau `payment_methods` : comparaison impossible → exiger publication pour resynchroniser. */
  const revisionSnapshotUnusable =
    revisionSeq !== null && revisionSnapshotSig === null && methods.length > 0;
  const needsPublish =
    methods.length > 0 &&
    (noRevisionYet ||
      revisionSnapshotUnusable ||
      (revisionSnapshotSig !== null && revisionSnapshotSig !== currentSig));

  const resetForm = () => {
    setFormCode('');
    setFormLabel('');
    setFormKind('cash');
    setFormDebit('');
    setFormCredit('');
    setFormMin('');
    setFormMax('');
    setFormOrder(0);
    setFormNotes('');
    setFormActive(true);
    setFormError(null);
    setStepUpPin('');
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (m: AccountingExpertPaymentMethod, orderOverride?: number) => {
    setEditRow(m);
    setFormLabel(m.label);
    setFormKind(m.kind);
    setFormDebit(m.paheko_debit_account);
    setFormCredit(m.paheko_refund_credit_account);
    setFormMin(m.min_amount ?? '');
    setFormMax(m.max_amount ?? '');
    setFormOrder(orderOverride ?? m.display_order);
    setFormNotes(m.notes ?? '');
    setFormActive(m.active);
    setFormError(null);
    setStepUpPin('');
  };

  const submitCreate = async () => {
    setFormError(null);
    const order = typeof formOrder === 'number' ? formOrder : Number(formOrder);
    const body: AccountingExpertPaymentMethodCreate = {
      code: formCode.trim(),
      label: formLabel.trim(),
      kind: formKind,
      paheko_debit_account: formDebit.trim(),
      paheko_refund_credit_account: formCredit.trim(),
      display_order: Number.isFinite(order) ? order : 0,
      active: formActive,
      notes: formNotes.trim() || null,
    };
    if (formMin !== '' && formMin !== null) body.min_amount = typeof formMin === 'number' ? formMin : Number(formMin);
    if (formMax !== '' && formMax !== null) body.max_amount = typeof formMax === 'number' ? formMax : Number(formMax);
    const res = await createAccountingExpertPaymentMethod(auth, body, { stepUpPin });
    if (!res.ok) {
      setFormError(res.detail);
      return;
    }
    setCreateOpen(false);
    resetForm();
    await load();
  };

  const submitEdit = async () => {
    if (!editRow) return;
    setFormError(null);
    const body: AccountingExpertPaymentMethodPatch = {
      label: formLabel.trim(),
      kind: formKind,
      paheko_debit_account: formDebit.trim(),
      paheko_refund_credit_account: formCredit.trim(),
      display_order: typeof formOrder === 'number' ? formOrder : Number(formOrder),
      notes: formNotes.trim() || null,
    };
    if (formMin !== '' && formMin !== null) body.min_amount = typeof formMin === 'number' ? formMin : Number(formMin);
    else body.min_amount = null;
    if (formMax !== '' && formMax !== null) body.max_amount = typeof formMax === 'number' ? formMax : Number(formMax);
    else body.max_amount = null;

    const res = await patchAccountingExpertPaymentMethod(auth, editRow.id, body, { stepUpPin });
    if (!res.ok) {
      setFormError(res.detail);
      return;
    }
    setEditRow(null);
    resetForm();
    await load();
  };

  const submitToggleActive = async () => {
    if (!activeRow) return;
    const next = !activeRow.active;
    const res = await setAccountingExpertPaymentMethodActive(auth, activeRow.id, next, { stepUpPin });
    if (!res.ok) {
      setFormError(res.detail);
      return;
    }
    setActiveRow(null);
    setStepUpPin('');
    await load();
  };

  const submitPublish = async () => {
    setFormError(null);
    const res = await publishAccountingExpertRevision(auth, { stepUpPin, note: publishNote.trim() || null });
    if (!res.ok) {
      setFormError(res.detail);
      return;
    }
    setPublishOpen(false);
    setPublishNote('');
    setStepUpPin('');
    await load();
  };

  const nudgeDisplayOrder = (m: AccountingExpertPaymentMethod, delta: number) => {
    openEdit(m, m.display_order + delta);
  };

  if (!isSuperAdminUi) {
    return (
      <Alert color="gray" title="Accès réservé" data-testid="admin-accounting-payment-methods-denied">
        <Text size="sm">Cette page est réservée au profil super-admin terrain (proxy permission aligné paramétrage comptable).</Text>
      </Alert>
    );
  }

  return (
    <Stack gap="md" data-testid="admin-accounting-payment-methods">
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <div>
          <Title order={1} size="h2" m={0}>
            Moyens de paiement (expert)
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Référentiel courant : lecture API, mutations avec PIN step-up (X-Step-Up-Pin), pas de suppression HTTP.
          </Text>
        </div>
        <Group gap="xs">
          <Button
            variant="default"
            leftSection={<RefreshCw size={16} />}
            loading={busy}
            onClick={() => void load()}
            data-testid="admin-accounting-payment-methods-refresh"
          >
            Actualiser
          </Button>
          <Button leftSection={<Plus size={16} />} onClick={openCreate}>
            Nouveau moyen
          </Button>
          {!hideStandaloneNav ? (
            <Button variant="light" onClick={() => spaNavigateTo('/admin/compta')}>
              Retour au cockpit comptable
            </Button>
          ) : null}
        </Group>
      </Group>

      {needsPublish ? (
        <Alert color="orange" title="Publication de révision" data-testid="admin-accounting-payment-methods-drift">
          <Text size="sm" mb="sm">
            {noRevisionYet
              ? 'Aucune révision comptable n’a encore été publiée, ou le référentiel courant a évolué depuis la dernière publication.'
              : 'Le référentiel courant diffère de la dernière révision publiée — publiez une révision pour figer la chaîne comptable.'}
          </Text>
          <Button
            onClick={() => {
              setFormError(null);
              setStepUpPin('');
              setPublishOpen(true);
            }}
            data-testid="admin-accounting-payment-methods-open-publish"
          >
            Publier une révision…
          </Button>
        </Alert>
      ) : null}

      {revisionSeq !== null ? (
        <Text size="sm" c="dimmed" data-testid="admin-accounting-payment-methods-rev-seq">
          Dernière révision publiée : #{revisionSeq}
        </Text>
      ) : null}

      {loadError ? (
        <Alert color="red" title="Chargement">
          {loadError}
        </Alert>
      ) : null}

      <Table striped highlightOnHover data-testid="admin-accounting-payment-methods-table">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Ordre</Table.Th>
            <Table.Th>Code</Table.Th>
            <Table.Th>Libellé</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Actif</Table.Th>
            <Table.Th>Comptes Paheko</Table.Th>
            <Table.Th> </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {methods.map((m) => (
            <Table.Tr key={m.id}>
              <Table.Td>
                <Group gap={4}>
                  <Button
                    size="compact-xs"
                    variant="default"
                    onClick={() => nudgeDisplayOrder(m, -1)}
                    aria-label="Diminuer l’ordre d’affichage"
                  >
                    <ArrowUp size={14} />
                  </Button>
                  <Text size="sm">{m.display_order}</Text>
                  <Button
                    size="compact-xs"
                    variant="default"
                    onClick={() => nudgeDisplayOrder(m, 1)}
                    aria-label="Augmenter l’ordre d’affichage"
                  >
                    <ArrowDown size={14} />
                  </Button>
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="sm" ff="monospace">
                  {m.code}
                </Text>
              </Table.Td>
              <Table.Td>{m.label}</Table.Td>
              <Table.Td>{m.kind}</Table.Td>
              <Table.Td>
                <Badge color={m.active ? 'teal' : 'gray'}>{m.active ? 'Oui' : 'Non'}</Badge>
              </Table.Td>
              <Table.Td>
                <Text size="xs">
                  Débit {m.paheko_debit_account} · Crédit remb. {m.paheko_refund_credit_account}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Button size="compact-sm" variant="light" leftSection={<Pencil size={14} />} onClick={() => openEdit(m)}>
                    Modifier
                  </Button>
                  <Button
                    size="compact-sm"
                    variant="outline"
                    color={m.active ? 'orange' : 'teal'}
                    onClick={() => {
                      setActiveRow(m);
                      setStepUpPin('');
                      setFormError(null);
                    }}
                  >
                    {m.active ? 'Désactiver' : 'Activer'}
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {methods.length === 0 && !busy ? (
        <Text size="sm" c="dimmed" data-testid="admin-accounting-payment-methods-empty">
          Aucun moyen de paiement (liste vide).
        </Text>
      ) : null}

      <Modal opened={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau moyen de paiement" size="lg">
        <Stack gap="sm">
          <TextInput label="Code" required value={formCode} onChange={(e) => setFormCode(e.currentTarget.value)} />
          <TextInput label="Libellé" required value={formLabel} onChange={(e) => setFormLabel(e.currentTarget.value)} />
          <Select label="Type" data={KIND_OPTIONS} value={formKind} onChange={(v) => v && setFormKind(v as AccountingExpertPaymentMethodKind)} />
          <TextInput label="Compte Paheko (débit)" required value={formDebit} onChange={(e) => setFormDebit(e.currentTarget.value)} />
          <TextInput
            label="Compte Paheko (crédit remboursement)"
            required
            value={formCredit}
            onChange={(e) => setFormCredit(e.currentTarget.value)}
          />
          <Group grow>
            <NumberInput label="Montant min (optionnel)" value={formMin} onChange={setFormMin} decimalScale={2} />
            <NumberInput label="Montant max (optionnel)" value={formMax} onChange={setFormMax} decimalScale={2} />
          </Group>
          <NumberInput label="Ordre d’affichage" required value={formOrder} onChange={setFormOrder} />
          <TextInput label="Notes" value={formNotes} onChange={(e) => setFormNotes(e.currentTarget.value)} />
          <Switch label="Actif" checked={formActive} onChange={(e) => setFormActive(e.currentTarget.checked)} />
          <PasswordInput
            label="PIN step-up"
            description="Obligatoire pour les mutations (en-tête X-Step-Up-Pin)."
            value={stepUpPin}
            onChange={(e) => setStepUpPin(e.currentTarget.value)}
            autoComplete="off"
          />
          {formError ? (
            <Alert color="red" title="Action impossible">
              {formError}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void submitCreate()}>Créer</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={editRow !== null} onClose={() => setEditRow(null)} title="Modifier le moyen de paiement" size="lg">
        <Stack gap="sm">
          {editRow ? (
            <Text size="sm" c="dimmed">
              Code « {editRow.code} » (non modifiable)
            </Text>
          ) : null}
          <TextInput label="Libellé" required value={formLabel} onChange={(e) => setFormLabel(e.currentTarget.value)} />
          <Select label="Type" data={KIND_OPTIONS} value={formKind} onChange={(v) => v && setFormKind(v as AccountingExpertPaymentMethodKind)} />
          <TextInput label="Compte Paheko (débit)" required value={formDebit} onChange={(e) => setFormDebit(e.currentTarget.value)} />
          <TextInput
            label="Compte Paheko (crédit remboursement)"
            required
            value={formCredit}
            onChange={(e) => setFormCredit(e.currentTarget.value)}
          />
          <Group grow>
            <NumberInput label="Montant min (optionnel)" value={formMin} onChange={setFormMin} decimalScale={2} />
            <NumberInput label="Montant max (optionnel)" value={formMax} onChange={setFormMax} decimalScale={2} />
          </Group>
          <NumberInput label="Ordre d’affichage" required value={formOrder} onChange={setFormOrder} />
          <TextInput label="Notes" value={formNotes} onChange={(e) => setFormNotes(e.currentTarget.value)} />
          <PasswordInput
            label="PIN step-up"
            description="Obligatoire pour enregistrer."
            value={stepUpPin}
            onChange={(e) => setStepUpPin(e.currentTarget.value)}
            autoComplete="off"
          />
          {formError ? (
            <Alert color="red" title="Action impossible">
              {formError}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setEditRow(null)}>
              Annuler
            </Button>
            <Button onClick={() => void submitEdit()}>Enregistrer</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={activeRow !== null}
        onClose={() => setActiveRow(null)}
        title={activeRow ? (activeRow.active ? 'Désactiver le moyen' : 'Activer le moyen') : ''}
      >
        <Stack gap="sm">
          <Text size="sm" mb="sm">
            {activeRow
              ? activeRow.active
                ? 'La désactivation est refusée si le moyen est utilisé dans une session ouverte.'
                : 'Activation du moyen.'
              : null}
          </Text>
          <PasswordInput
            label="PIN step-up"
            value={stepUpPin}
            onChange={(e) => setStepUpPin(e.currentTarget.value)}
            autoComplete="off"
          />
          {formError ? (
            <Alert color="red" title="Action impossible">
              {formError}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setActiveRow(null)}>
              Annuler
            </Button>
            <Button onClick={() => void submitToggleActive()}>Confirmer</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={publishOpen} onClose={() => setPublishOpen(false)} title="Publier une révision comptable" size="md">
        <Stack gap="sm">
          <TextInput
            label="Note (optionnelle)"
            value={publishNote}
            onChange={(e) => setPublishNote(e.currentTarget.value)}
          />
          <PasswordInput
            label="PIN step-up"
            value={stepUpPin}
            onChange={(e) => setStepUpPin(e.currentTarget.value)}
            autoComplete="off"
          />
          {formError ? (
            <Alert color="red" title="Action impossible">
              {formError}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPublishOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void submitPublish()}>Publier</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
