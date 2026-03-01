/**
 * Page admin Sites — Story 8.2.
 * Route : /admin/sites. Liste + CRUD sites (GET/POST/PATCH/DELETE /v1/sites).
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
  Checkbox,
  Card,
} from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import {
  getSites,
  createSite,
  updateSite,
  deleteSite,
  type Site,
  type SiteCreateBody,
  type SiteUpdateBody,
} from '../api/admin';
import { PageContainer } from '../shared/layout';

export function AdminSitesPage() {
  const { accessToken, permissions, user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin' || permissions.includes('super_admin');
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadSites = useCallback(async () => {
    if (!accessToken || !isSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const list = await getSites(accessToken);
      setSites(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [accessToken, isSuperAdmin]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormActive(true);
    setModalOpen(true);
  };

  const openEdit = (s: Site) => {
    setEditingId(s.id);
    setFormName(s.name);
    setFormActive(s.is_active);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        const body: SiteUpdateBody = { name: formName, is_active: formActive };
        await updateSite(accessToken, editingId, body);
      } else {
        const body: SiteCreateBody = { name: formName, is_active: formActive };
        await createSite(accessToken, body);
      }
      setModalOpen(false);
      loadSites();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken || !window.confirm('Supprimer ce site ?')) return;
    setError(null);
    try {
      await deleteSite(accessToken, id);
      loadSites();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur suppression');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div data-testid="admin-sites-forbidden">
        <p>Acces reserve aux super-administrateurs.</p>
      </div>
    );
  }

  return (
    <PageContainer title="Sites" maxWidth={1200} testId="admin-sites-page">
      <Group justify="flex-end">
        <Button data-testid="admin-sites-new" variant="filled" onClick={openCreate}>
          Nouveau site
        </Button>
      </Group>

      {error && <Alert color="red">{error}</Alert>}
      {loading ? (
        <Loader size="sm" data-testid="admin-sites-loading" />
      ) : (
        <Card withBorder padding="md" radius="md">
        <Table striped highlightOnHover data-testid="admin-sites-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Actif</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sites.map((s) => (
              <Table.Tr key={s.id}>
                <Table.Td>{s.name}</Table.Td>
                <Table.Td>{s.is_active ? 'Oui' : 'Non'}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button variant="light" size="xs" onClick={() => openEdit(s)} data-testid={`edit-${s.id}`}>
                      Modifier
                    </Button>
                    <Button variant="light" size="xs" color="red" onClick={() => handleDelete(s.id)} data-testid={`delete-${s.id}`}>
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
      {!loading && sites.length === 0 && (
        <p data-testid="admin-sites-empty">Aucun site.</p>
      )}

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Modifier le site' : 'Nouveau site'}>
        <Stack gap="sm">
          <TextInput
            label="Nom"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            data-testid="site-form-name"
            required
          />
          <Checkbox
            label="Actif"
            checked={formActive}
            onChange={(e) => setFormActive(e.currentTarget.checked)}
            data-testid="site-form-active"
          />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button loading={submitting} onClick={handleSubmit} data-testid="site-form-submit">
              {editingId ? 'Enregistrer' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </PageContainer>
  );
}
