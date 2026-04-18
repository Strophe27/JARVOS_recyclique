import {
  Alert,
  Anchor,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createPahekoCashSessionCloseMapping,
  listPahekoCashSessionCloseMappings,
  resolvePahekoCashSessionCloseMapping,
  updatePahekoCashSessionCloseMapping,
  type PahekoCashSessionCloseMappingDto,
} from '../../api/admin-paheko-mappings-client';
import { listCashRegistersForAdmin, type CashRegisterAdminRowDto } from '../../api/admin-cash-registers-client';
import { listSitesForAdmin, type SiteAdminRowDto } from '../../api/admin-sites-client';
import { recycliqueClientFailureFromSalesHttp } from '../../api/recyclique-api-error';
import { useAuthPort, useContextEnvelope } from '../../app/auth/AuthRuntimeProvider';
import { spaNavigateTo } from '../../app/demo/spa-navigate';
import { CashflowClientErrorAlert } from '../cashflow/CashflowClientErrorAlert';
import type { CashflowSubmitSurfaceError } from '../cashflow/cashflow-submit-error';

type MappingFormState = {
  readonly mode: 'create' | 'edit';
  readonly mapping: PahekoCashSessionCloseMappingDto | null;
  readonly siteId: string | null;
  readonly registerId: string | null;
  readonly enabled: boolean;
  readonly label: string;
  readonly accountingYearId: string;
  readonly debitAccountCode: string;
  readonly creditAccountCode: string;
  readonly labelPrefix: string;
  readonly referencePrefix: string;
  readonly notes: string;
  readonly extraDestinationParams: Readonly<Record<string, unknown>>;
};

function defaultFormState(siteId?: string | null): MappingFormState {
  return {
    mode: 'create',
    mapping: null,
    siteId: siteId?.trim() || null,
    registerId: null,
    enabled: true,
    label: '',
    accountingYearId: '',
    debitAccountCode: '',
    creditAccountCode: '',
    labelPrefix: '',
    referencePrefix: '',
    notes: '',
    extraDestinationParams: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractDestinationFields(raw: unknown): {
  readonly accountingYearId: string;
  readonly debitAccountCode: string;
  readonly creditAccountCode: string;
  readonly labelPrefix: string;
  readonly referencePrefix: string;
  readonly notes: string;
  readonly extraDestinationParams: Readonly<Record<string, unknown>>;
} {
  if (!isRecord(raw)) {
    return {
      accountingYearId: '',
      debitAccountCode: '',
      creditAccountCode: '',
      labelPrefix: '',
      referencePrefix: '',
      notes: '',
      extraDestinationParams: {},
    };
  }
  const { id_year, debit, credit, label_prefix, reference_prefix, notes, ...extraDestinationParams } = raw;
  return {
    accountingYearId:
      typeof id_year === 'number' ? String(id_year) : typeof id_year === 'string' ? id_year.trim() : '',
    debitAccountCode: typeof debit === 'string' ? debit : '',
    creditAccountCode: typeof credit === 'string' ? credit : '',
    labelPrefix: typeof label_prefix === 'string' ? label_prefix : '',
    referencePrefix: typeof reference_prefix === 'string' ? reference_prefix : '',
    notes: typeof notes === 'string' ? notes : '',
    extraDestinationParams,
  };
}

function buildEditState(mapping: PahekoCashSessionCloseMappingDto): MappingFormState {
  const destination = extractDestinationFields(mapping.destination_params);
  return {
    mode: 'edit',
    mapping,
    siteId: mapping.site_id,
    registerId: mapping.register_id ?? null,
    enabled: mapping.enabled,
    label: mapping.label ?? '',
    accountingYearId: destination.accountingYearId,
    debitAccountCode: destination.debitAccountCode,
    creditAccountCode: destination.creditAccountCode,
    labelPrefix: destination.labelPrefix,
    referencePrefix: destination.referencePrefix,
    notes: destination.notes,
    extraDestinationParams: destination.extraDestinationParams,
  };
}

function buildDestinationParams(form: MappingFormState): { ok: true; value: Record<string, unknown> } | { ok: false; message: string } {
  const accountingYearId = form.accountingYearId.trim();
  if (!accountingYearId) {
    return { ok: false, message: 'Renseignez l’exercice Paheko.' };
  }
  const idYear = Number(accountingYearId);
  if (!Number.isInteger(idYear) || idYear <= 0) {
    return { ok: false, message: 'Utilisez un identifiant d’exercice Paheko valide.' };
  }
  const debit = form.debitAccountCode.trim();
  if (!debit) {
    return { ok: false, message: 'Renseignez le compte de débit.' };
  }
  const credit = form.creditAccountCode.trim();
  if (!credit) {
    return { ok: false, message: 'Renseignez le compte de crédit.' };
  }
  const destination: Record<string, unknown> = {
    ...form.extraDestinationParams,
    id_year: idYear,
    debit,
    credit,
  };
  const labelPrefix = form.labelPrefix.trim();
  const referencePrefix = form.referencePrefix.trim();
  const notes = form.notes.trim();
  if (labelPrefix) destination.label_prefix = labelPrefix;
  if (referencePrefix) destination.reference_prefix = referencePrefix;
  if (notes) destination.notes = notes;
  return { ok: true, value: destination };
}

function formatDestinationSummary(destinationParams: unknown): string {
  const destination = extractDestinationFields(destinationParams);
  const bits = [
    destination.accountingYearId ? `Exercice ${destination.accountingYearId}` : null,
    destination.debitAccountCode ? `Débit ${destination.debitAccountCode}` : null,
    destination.creditAccountCode ? `Crédit ${destination.creditAccountCode}` : null,
  ].filter(Boolean);
  return bits.join(' · ') || 'Comptes à compléter';
}

function formatScope(
  mapping: PahekoCashSessionCloseMappingDto,
  siteNameById: ReadonlyMap<string, string>,
  registerNameById: ReadonlyMap<string, string>,
): string {
  const siteLabel = siteNameById.get(mapping.site_id) ?? mapping.site_id;
  const registerLabel = mapping.register_id
    ? registerNameById.get(mapping.register_id) ?? mapping.register_id
    : 'Défaut site';
  return `${siteLabel} / ${registerLabel}`;
}

export function AdminPahekoCashSessionCloseMappingsSection() {
  const auth = useAuthPort();
  const envelope = useContextEnvelope();
  const [sites, setSites] = useState<readonly SiteAdminRowDto[]>([]);
  const [registers, setRegisters] = useState<readonly CashRegisterAdminRowDto[]>([]);
  const [mappings, setMappings] = useState<readonly PahekoCashSessionCloseMappingDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<CashflowSubmitSurfaceError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<MappingFormState>(() => defaultFormState(envelope.siteId));
  const [resolverSiteId, setResolverSiteId] = useState<string | null>(envelope.siteId?.trim() || null);
  const [resolverRegisterId, setResolverRegisterId] = useState<string | null>(envelope.activeRegisterId?.trim() || null);
  const [showDisabled, setShowDisabled] = useState(true);

  const siteNameById = useMemo(() => {
    const out = new Map<string, string>();
    for (const site of sites) out.set(site.id, site.name);
    return out;
  }, [sites]);

  const registerNameById = useMemo(() => {
    const out = new Map<string, string>();
    for (const register of registers) out.set(register.id, register.name);
    return out;
  }, [registers]);

  const siteOptions = useMemo(
    () => sites.map((site) => ({ value: site.id, label: site.name })),
    [sites],
  );

  const registerOptionsForSite = useMemo(() => {
    const selectedSiteId = form.siteId?.trim() || '';
    return registers
      .filter((register) => !selectedSiteId || (register.site_id ?? '') === selectedSiteId)
      .map((register) => ({ value: register.id, label: register.name }));
  }, [form.siteId, registers]);

  const resolverRegisterOptions = useMemo(() => {
    const selectedSiteId = resolverSiteId?.trim() || '';
    return [
      { value: '', label: 'Défaut site (sans poste précis)' },
      ...registers
        .filter((register) => !selectedSiteId || (register.site_id ?? '') === selectedSiteId)
        .map((register) => ({ value: register.id, label: register.name })),
    ];
  }, [registers, resolverSiteId]);

  const visibleMappings = useMemo(
    () => (showDisabled ? mappings : mappings.filter((mapping) => mapping.enabled)),
    [mappings, showDisabled],
  );

  const resolvedMapping = useMemo(
    () => resolvePahekoCashSessionCloseMapping(mappings, resolverSiteId, resolverRegisterId),
    [mappings, resolverRegisterId, resolverSiteId],
  );

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const [sitesRes, registersRes, mappingsRes] = await Promise.all([
      listSitesForAdmin(auth, { limit: 200, only_active: true }),
      listCashRegistersForAdmin(auth, { limit: 200 }),
      listPahekoCashSessionCloseMappings(auth, { limit: 200 }),
    ]);
    if (!sitesRes.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(sitesRes) });
      setBusy(false);
      return;
    }
    if (!registersRes.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(registersRes) });
      setBusy(false);
      return;
    }
    if (!mappingsRes.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(mappingsRes) });
      setBusy(false);
      return;
    }
    setSites(sitesRes.data);
    setRegisters(registersRes.data);
    setMappings(mappingsRes.data);
    setBusy(false);
  }, [auth]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm(defaultFormState(envelope.siteId));
    setFormOpen(true);
    setSuccess(null);
  };

  const openEdit = (mapping: PahekoCashSessionCloseMappingDto) => {
    setForm(buildEditState(mapping));
    setFormOpen(true);
    setSuccess(null);
  };

  const saveForm = async () => {
    const siteId = form.siteId?.trim() ?? '';
    if (!siteId) {
      setError({ kind: 'local', message: 'Choisissez un site.' });
      return;
    }
    const parsedDestination = buildDestinationParams(form);
    if (!parsedDestination.ok) {
      setError({ kind: 'local', message: parsedDestination.message });
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    const body = {
      label: form.label.trim() || null,
      enabled: form.enabled,
      destination_params: parsedDestination.value,
    };
    const result =
      form.mode === 'create'
        ? await createPahekoCashSessionCloseMapping(auth, {
            site_id: siteId,
            register_id: form.registerId?.trim() || null,
            enabled: form.enabled,
            label: form.label.trim() || null,
            destination_params: parsedDestination.value,
          })
        : await updatePahekoCashSessionCloseMapping(auth, form.mapping?.id ?? '', body);
    setSaving(false);
    if (!result.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(result) });
      return;
    }
    setFormOpen(false);
    setSuccess(form.mode === 'create' ? 'Mapping créé.' : 'Mapping mis à jour.');
    await load();
  };

  const toggleEnabled = async (mapping: PahekoCashSessionCloseMappingDto, enabled: boolean) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    const res = await updatePahekoCashSessionCloseMapping(auth, mapping.id, { enabled });
    setSaving(false);
    if (!res.ok) {
      setError({ kind: 'api', failure: recycliqueClientFailureFromSalesHttp(res) });
      return;
    }
    setMappings((prev) => prev.map((item) => (item.id === mapping.id ? res.mapping : item)));
    setSuccess(enabled ? 'Mapping activé.' : 'Mapping désactivé.');
  };

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Définissez ici où part l’écriture comptable de clôture. Recyclique cherche d’abord un réglage précis site/poste,
        puis utilise le réglage par défaut du site si besoin.
      </Text>
      <Alert color="blue" title="Réservé au super-admin">
        Dans le paramétrage comptable, vous indiquez ici l’exercice et les comptes Paheko à utiliser pour les clôtures.
      </Alert>

      <Alert color="cyan" title="Comptes de débit / crédit et moyens de paiement">
        <Text size="sm">
          Quand la clôture est ventilée par moyen de paiement (politique serveur recommandée), les encaissements sont
          répartis sur les comptes Paheko configurés pour chaque moyen (ex. 530 espèces, 5112 chèques) dans l’onglet{' '}
          <Anchor
            component="button"
            type="button"
            onClick={() => spaNavigateTo('/admin/compta/parametrage?tab=payment-methods')}
          >
            Moyens de paiement
          </Anchor>
          . Les comptes de vente et de dons proviennent des comptes globaux de la révision. Le couple débit / crédit
          ci-dessous reste utilisé pour les tranches remboursement envoyées vers Paheko et pour le mode agrégé
          historique (une seule ligne ventes+dons).
        </Text>
      </Alert>

      <Alert color="gray" title="Si aucun réglage ne correspond au site ou au poste">
        <Text size="sm">
          Si aucun réglage actif ne correspond au site et au poste de la session, la clôture est bloquée côté serveur et
          un message d’erreur est renvoyé à l’opérateur. Prévoyez au minimum un réglage actif au niveau « Défaut site »
          (sans poste précis) pour chaque site qui encaisse.
        </Text>
      </Alert>

      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Group gap="sm">
          <Button
            variant="default"
            leftSection={<RefreshCw size={16} />}
            onClick={() => void load()}
            loading={busy}
            data-testid="admin-paheko-close-mappings-refresh"
          >
            Actualiser
          </Button>
          <Button onClick={openCreate} disabled={busy} data-testid="admin-paheko-close-mappings-create-open">
            Ajouter un réglage
          </Button>
        </Group>
        <Checkbox
          checked={showDisabled}
          onChange={(e) => setShowDisabled(e.currentTarget.checked)}
          label="Voir aussi les réglages désactivés"
          data-testid="admin-paheko-close-mappings-show-disabled"
        />
      </Group>

      {error ? <CashflowClientErrorAlert error={error} /> : null}
      {success ? <Alert color="green">{success}</Alert> : null}

      <Paper withBorder p="md">
        <Stack gap="sm">
          <Text fw={600}>Vérifier le réglage appliqué</Text>
          <Group grow align="end">
            <Select
              label="Site"
              data={siteOptions}
              value={resolverSiteId}
              onChange={(value) => {
                setResolverSiteId(value);
                setResolverRegisterId('');
              }}
              clearable={false}
              searchable
              data-testid="admin-paheko-close-mappings-resolver-site"
            />
            <Select
              label="Poste"
              data={resolverRegisterOptions}
              value={resolverRegisterId ?? ''}
              onChange={(value) => setResolverRegisterId(value ?? '')}
              searchable
              data-testid="admin-paheko-close-mappings-resolver-register"
            />
          </Group>
          {resolvedMapping ? (
            <Alert color="teal" title="Réglage trouvé" data-testid="admin-paheko-close-mappings-resolver-hit">
              <Text size="sm">
                {resolvedMapping.label?.trim() || 'Sans libellé'} ({formatScope(resolvedMapping, siteNameById, registerNameById)})
              </Text>
              <Text size="sm" c="dimmed">
                {formatDestinationSummary(resolvedMapping.destination_params)}
              </Text>
            </Alert>
          ) : (
            <Alert color="orange" title="Aucun réglage actif" data-testid="admin-paheko-close-mappings-resolver-miss">
              <Text size="sm">
                Aucun réglage actif ne correspond à ce couple site/poste. La clôture risque alors d’être bloquée côté
                intégration Paheko.
              </Text>
            </Alert>
          )}
        </Stack>
      </Paper>

      <Paper withBorder p={0}>
        <Table striped highlightOnHover verticalSpacing="sm" data-testid="admin-paheko-close-mappings-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Libellé</Table.Th>
              <Table.Th>S’applique à</Table.Th>
              <Table.Th>Statut</Table.Th>
              <Table.Th>Écriture comptable</Table.Th>
              <Table.Th> </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleMappings.length === 0 && !busy ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text size="sm" c="dimmed" py="md" ta="center" data-testid="admin-paheko-close-mappings-empty">
                    Aucun réglage Paheko de clôture n’est encore configuré.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : null}
            {visibleMappings.map((mapping) => (
              <Table.Tr key={mapping.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {mapping.label?.trim() || 'Sans libellé'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatScope(mapping, siteNameById, registerNameById)}</Text>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Badge color={mapping.enabled ? 'green' : 'gray'} variant="light">
                      {mapping.enabled ? 'Actif' : 'Désactivé'}
                    </Badge>
                    <Switch
                      checked={mapping.enabled}
                      onChange={(e) => void toggleEnabled(mapping, e.currentTarget.checked)}
                      disabled={saving}
                      aria-label={`Activer le mapping ${mapping.label ?? mapping.id}`}
                    />
                  </Group>
                </Table.Td>
                <Table.Td>
                  {(() => {
                    const destination = extractDestinationFields(mapping.destination_params);
                    const hasExtras = Object.keys(destination.extraDestinationParams).length > 0;
                    return (
                      <Stack gap={2}>
                        <Text size="sm">{formatDestinationSummary(mapping.destination_params)}</Text>
                        {destination.labelPrefix ? (
                          <Text size="xs" c="dimmed">
                            Libellé: {destination.labelPrefix}
                          </Text>
                        ) : null}
                        {destination.referencePrefix ? (
                          <Text size="xs" c="dimmed">
                            Référence: {destination.referencePrefix}
                          </Text>
                        ) : null}
                        {hasExtras ? (
                          <Badge size="xs" color="gray" variant="light">
                            Options avancées conservées
                          </Badge>
                        ) : null}
                      </Stack>
                    );
                  })()}
                </Table.Td>
                <Table.Td>
                  <Button size="xs" variant="light" onClick={() => openEdit(mapping)}>
                    Modifier
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        title={form.mode === 'create' ? 'Ajouter un réglage Paheko' : 'Modifier le réglage Paheko'}
        size="lg"
      >
        <Stack gap="sm">
          <Select
            label="Site"
            data={siteOptions}
            value={form.siteId}
            onChange={(value) => setForm((prev) => ({ ...prev, siteId: value, registerId: null }))}
            searchable
            disabled={form.mode === 'edit'}
            data-testid="admin-paheko-close-mappings-form-site"
          />
          <Select
            label="Poste (facultatif)"
            data={[{ value: '', label: 'Défaut site' }, ...registerOptionsForSite]}
            value={form.registerId ?? ''}
            onChange={(value) => setForm((prev) => ({ ...prev, registerId: value || null }))}
            searchable
            disabled={!form.siteId || form.mode === 'edit'}
            data-testid="admin-paheko-close-mappings-form-register"
          />
          <TextInput
            label="Libellé"
            value={form.label}
            onChange={(e) => setForm((prev) => ({ ...prev, label: e.currentTarget.value }))}
            description="Nom libre pour vous repérer dans la liste."
            data-testid="admin-paheko-close-mappings-form-label"
          />
          <Switch
            checked={form.enabled}
            onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.currentTarget.checked }))}
            label="Réglage actif"
            data-testid="admin-paheko-close-mappings-form-enabled"
          />
          <Alert color="gray" title="Ce que vous réglez ici">
            Recyclique calcule le montant automatiquement. Vous indiquez seulement l’exercice Paheko et les comptes à
            utiliser pour l’écriture de clôture.
          </Alert>
          <Group grow align="start">
            <TextInput
              label="Exercice Paheko"
              value={form.accountingYearId}
              onChange={(e) => setForm((prev) => ({ ...prev, accountingYearId: e.currentTarget.value }))}
              description="Option livrée : saisie manuelle de l’ID exercice Paheko (Option B). Option A : alimenter ce champ depuis l’API Paheko — non implémenté ; voir commentaire dans PahekoAccountingClient (backend). Identifiant dans Paheko : Comptabilité → Exercices."
              data-testid="admin-paheko-close-mappings-form-id-year"
            />
            <TextInput
              label="Compte de débit"
              value={form.debitAccountCode}
              onChange={(e) => setForm((prev) => ({ ...prev, debitAccountCode: e.currentTarget.value }))}
              description="Compte Paheko côté débit pour les sous-écritures qui utilisent encore ce couple (ex. remboursements, mode agrégé). Pas un doublon des comptes par moyen de paiement."
              data-testid="admin-paheko-close-mappings-form-debit"
            />
            <TextInput
              label="Compte de crédit"
              value={form.creditAccountCode}
              onChange={(e) => setForm((prev) => ({ ...prev, creditAccountCode: e.currentTarget.value }))}
              description="Contrepartie Paheko associée au débit ci-dessus pour ces mêmes tranches."
              data-testid="admin-paheko-close-mappings-form-credit"
            />
          </Group>
          <Group grow align="start">
            <TextInput
              label="Préfixe du libellé"
              value={form.labelPrefix}
              onChange={(e) => setForm((prev) => ({ ...prev, labelPrefix: e.currentTarget.value }))}
              description="Optionnel. Recyclique ajoute ensuite la session automatiquement."
              data-testid="admin-paheko-close-mappings-form-label-prefix"
            />
            <TextInput
              label="Préfixe de référence"
              value={form.referencePrefix}
              onChange={(e) => setForm((prev) => ({ ...prev, referencePrefix: e.currentTarget.value }))}
              description="Optionnel. Permet de reconnaître l’origine de l’écriture."
              data-testid="admin-paheko-close-mappings-form-reference-prefix"
            />
          </Group>
          <Textarea
            label="Note complémentaire"
            minRows={3}
            autosize
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.currentTarget.value }))}
            description="Optionnel. Ajoutée aux notes techniques envoyées avec l’écriture."
            data-testid="admin-paheko-close-mappings-form-notes"
          />
          {Object.keys(form.extraDestinationParams).length > 0 ? (
            <Alert color="gray" title="Options avancées conservées">
              Les paramètres avancés déjà présents sur ce réglage sont gardés automatiquement lors de l’enregistrement.
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setFormOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void saveForm()} loading={saving} data-testid="admin-paheko-close-mappings-form-save">
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
