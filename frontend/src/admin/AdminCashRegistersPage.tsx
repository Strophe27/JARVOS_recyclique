/**
 * Page admin Postes de caisse — Story 8.2.
 * Route : /admin/cash-registers. Liste + CRUD postes (GET/POST/PATCH/DELETE /v1/cash-registers, GET /v1/sites).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Table,
  Button,
  Stack,
  Group,
  Alert,
  Loader,
  Modal,
  TextInput,
  Select,
  Checkbox,
  Card,
} from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import {
  getSites,
  getCashRegisters,
  createCashRegister,
  updateCashRegister,
  deleteCashRegister,
  type Site,
  type CashRegister,
  type CashRegisterCreateBody,
  type CashRegisterUpdateBody,
} from '../api/admin';
import { PageContainer } from '../shared/layout';

export function AdminCashRegistersPage() {
  const { accessToken, permissions } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formSiteId, setFormSiteId] = useState<string | null>(null);
  const [formActive, setFormActive] = useState(true);
  const [formVirtual, setFormVirtual] = useState(false);
  const [formDeferred, setFormDeferred] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken || !permissions.includes('admin')) return;
    setLoading(true);
    setError(null);
    try {
      const [sitesList, regsList] = await Promise.all([
        getSites(accessToken),
        getCashRegisters(accessToken),
      ]);
      setSites(sitesList);
      setRegisters(regsList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, permissions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const siteById = (id: string) => sites.find((s) => s.id === id)?.name ?? id;

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormLocation('');
    setFormSiteId(sites[0]?.id ?? null);
    setFormActive(true);
    setFormVirtual(false);
    setFormDeferred(false);
    setModalOpen(true);
  };

  const openEdit = (r: CashRegister) => {
    setEditingId(r.id);
    setFormName(r.name);
    setFormLocation(r.location ?? '');
    setFormSiteId(r.site_id);
    setFormActive(r.is_active);
    setFormVirtual(r.enable_virtual ?? false);
    setFormDeferred(r.enable_deferred ?? false);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!accessToken || !formSiteId && !editingId) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        const body: CashRegisterUpdateBody = {
          name: formName,
          location: formLocation || null,
          is_active: formActive,
          enable_virtual: formVirtual,
          enable_deferred: formDeferred,
        };
        await updateCashRegister(accessToken, editingId, body);
      } else {
        if (!formSiteId) throw new Error('Site requis');
        const body: CashRegisterCreateBody = {
          site_id: formSiteId,
          name: formName,
          location: formLocation || null,
          is_active: formActive,
          enable_virtual: formVirtual,
          enable_deferred: formDeferred,
        };
        await createCashRegister(accessToken, body);
      }
      setModalOpen(false);
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken || !window.confirm('Supprimer ce poste ?')) return;
    setError(null);
    try {
      await deleteCashRegister(accessToken, id);
      loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur suppression');
    }
  };

  if (!permissions.includes('admin')) {
    return (
      <div data-testid="admin-cash-registers-forbidden">
        <p>Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <PageContainer title="Postes de caisse" maxWidth={1200} testId="admin-cash-registers-page">
      <Group justify="flex-end">
        <Button data-testid="admin-registers-new" variant="filled" onClick={openCreate} disabled={sites.length === 0}>
          Nouveau poste
        </Button>
      </Group>

      {error && <Alert color="red">{error}</Alert>}
      {loading ? (
        <Loader size="sm" data-testid="admin-registers-loading" />
      ) : (
        <Card withBorder padding="md" radius="md">
        <Table striped highlightOnHover data-testid="admin-registers-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Site</Table.Th>
              <Table.Th>Emplacement</Table.Th>
              <Table.Th>Actif</Table.Th>
              <Table.Th>Virtuelle</Table.Th>
              <Table.Th>Différée</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {registers.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>{r.name}</Table.Td>
                <Table.Td>{siteById(r.site_id)}</Table.Td>
                <Table.Td>{r.location ?? '—'}</Table.Td>
                <Table.Td>{r.is_active ? 'Oui' : 'Non'}</Table.Td>
                <Table.Td>{r.enable_virtual ? 'Oui' : 'Non'}</Table.Td>
                <Table.Td>{r.enable_deferred ? 'Oui' : 'Non'}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button variant="light" size="xs" onClick={() => openEdit(r)} data-testid={`edit-${r.id}`}>
                      Modifier
                    </Button>
                    <Button variant="light" size="xs" color="red" onClick={() => handleDelete(r.id)} data-testid={`delete-${r.id}`}>
                      Supprimer
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        </Card>
      )}
      {!loading && registers.length === 0 && (
        <p data-testid="admin-registers-empty">Aucun poste de caisse.</p>
      )}

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Modifier le poste' : 'Nouveau poste'}>
        <Stack gap="sm">
          {!editingId && (
            <Select
              label="Site"
              data={sites.map((s) => ({ value: s.id, label: s.name }))}
              value={formSiteId}
              onChange={setFormSiteId}
              data-testid="register-form-site"
              required
            />
          )}
          <TextInput
            label="Nom"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            data-testid="register-form-name"
            required
          />
          <TextInput
            label="Emplacement"
            value={formLocation}
            onChange={(e) => setFormLocation(e.target.value)}
            data-testid="register-form-location"
          />
          <Checkbox label="Actif" checked={formActive} onChange={(e) => setFormActive(e.currentTarget.checked)} data-testid="register-form-active" />
          <Checkbox label="Virtuelle" checked={formVirtual} onChange={(e) => setFormVirtual(e.currentTarget.checked)} data-testid="register-form-virtual" />
          <Checkbox label="Différée" checked={formDeferred} onChange={(e) => setFormDeferred(e.currentTarget.checked)} data-testid="register-form-deferred" />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button loading={submitting} onClick={handleSubmit} data-testid="register-form-submit">
              {editingId ? 'Enregistrer' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </PageContainer>
  );
}
