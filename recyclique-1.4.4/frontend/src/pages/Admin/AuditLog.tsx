import React, { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Paper,
  Table,
  TextInput,
  Select,
  Button,
  Group,
  Pagination,
  Badge,
  Text,
  LoadingOverlay,
  Alert,
  Modal,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Grid,
  NumberInput,
  Tabs,
  Code,
} from '@mantine/core';
import { IconSearch, IconEye, IconRefresh, IconDownload } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../../stores/authStore';
import api from '../../services/api';

interface AuditEntry {
  id: string;
  timestamp: string;
  actor_id?: string;
  actor_username?: string;
  action_type: string;
  target_id?: string;
  target_username?: string;
  target_type?: string;
  details?: any;
  description?: string;
  ip_address?: string;
  user_agent?: string;
}

interface AuditLogResponse {
  entries: AuditEntry[];
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters_applied: {
    action_type?: string;
    actor_username?: string;
    target_type?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
  };
}

const AuditLog: React.FC = () => {
  const [auditData, setAuditData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const { token } = useAuthStore();

  const form = useForm({
    initialValues: {
      action_type: '',
      actor_username: '',
      target_type: '',
      start_date: '',
      end_date: '',
      search: '',
      page_size: 20
    }
  });

  const actionTypes = [
    { value: '', label: 'Tous les types' },
    { value: 'login_success', label: 'Connexion réussie' },
    { value: 'login_failed', label: 'Connexion échouée' },
    { value: 'logout', label: 'Déconnexion' },
    { value: 'user_created', label: 'Utilisateur créé' },
    { value: 'user_updated', label: 'Utilisateur modifié' },
    { value: 'user_deleted', label: 'Utilisateur supprimé' },
    { value: 'user_status_changed', label: 'Statut utilisateur changé' },
    { value: 'user_role_changed', label: 'Rôle utilisateur changé' },
    { value: 'password_forced', label: 'Mot de passe forcé' },
    { value: 'password_reset', label: 'Réinitialisation mot de passe' },
    { value: 'pin_reset', label: 'Réinitialisation PIN' },
    { value: 'permission_granted', label: 'Permission accordée' },
    { value: 'permission_revoked', label: 'Permission révoquée' },
    { value: 'group_assigned', label: 'Groupe assigné' },
    { value: 'group_removed', label: 'Groupe retiré' },
    { value: 'system_config_changed', label: 'Configuration système modifiée' },
    { value: 'data_exported', label: 'Données exportées' },
    { value: 'backup_created', label: 'Sauvegarde créée' }
  ];

  const targetTypes = [
    { value: '', label: 'Tous les types' },
    { value: 'user', label: 'Utilisateur' },
    { value: 'group', label: 'Groupe' },
    { value: 'system', label: 'Système' },
    { value: 'cash_session', label: 'Session de caisse' },
    { value: 'sale', label: 'Vente' }
  ];

  const fetchAuditLog = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: form.values.page_size.toString(),
        ...(form.values.action_type && { action_type: form.values.action_type }),
        ...(form.values.actor_username && { actor_username: form.values.actor_username }),
        ...(form.values.target_type && { target_type: form.values.target_type }),
        ...(form.values.start_date && { start_date: form.values.start_date }),
        ...(form.values.end_date && { end_date: form.values.end_date }),
        ...(form.values.search && { search: form.values.search })
      });

      const response = await api.get(`/v1/admin/audit-log?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setAuditData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement du journal d\'audit');
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger le journal d\'audit',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLog();
  }, []);

  const handleSearch = () => {
    fetchAuditLog(1);
  };

  const handleReset = () => {
    form.reset();
    fetchAuditLog(1);
  };

  const handlePageChange = (page: number) => {
    fetchAuditLog(page);
  };

  const openDetailsModal = (entry: AuditEntry) => {
    setSelectedEntry(entry);
    setDetailsModalOpen(true);
  };

  const exportToCSV = () => {
    if (!auditData) return;
    
    const headers = ['Timestamp', 'Acteur', 'Action', 'Cible', 'Description', 'IP', 'Détails'];
    const rows = auditData.entries.map(entry => [
      formatTimestamp(entry.timestamp),
      entry.actor_username || 'Système',
      formatActionType(entry.action_type),
      entry.target_type || '',
      entry.description || '',
      entry.ip_address || '',
      JSON.stringify(entry.details || {})
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-log-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('fr-FR');
  };

  const formatActionType = (actionType: string) => {
    const action = actionTypes.find(a => a.value === actionType);
    return action ? action.label : actionType;
  };

  const getActionBadgeColor = (actionType: string) => {
    if (actionType.includes('success') || actionType.includes('created')) return 'green';
    if (actionType.includes('failed') || actionType.includes('deleted')) return 'red';
    if (actionType.includes('changed') || actionType.includes('updated')) return 'blue';
    if (actionType.includes('reset') || actionType.includes('forced')) return 'orange';
    return 'gray';
  };

  if (error) {
    return (
      <Container size="xl" py="md">
        <Alert color="red" title="Erreur">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Title order={1} mb="xl">Journal d'Audit</Title>

      <Tabs defaultValue="audit" mb="md">
        <Tabs.List>
          <Tabs.Tab value="audit">Audit Log</Tabs.Tab>
          <Tabs.Tab value="transactions">Logs Transactionnels</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="audit" pt="md">

      <Paper withBorder p="md" mb="md">
        <form onSubmit={form.onSubmit(handleSearch)}>
          <Grid>
            <Grid.Col span={3}>
              <Select
                label="Type d'action"
                placeholder="Filtrer par type..."
                data={actionTypes}
                {...form.getInputProps('action_type')}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <TextInput
                label="Acteur"
                placeholder="Filtrer par acteur..."
                {...form.getInputProps('actor_username')}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <TextInput
                label="Date de début"
                placeholder="YYYY-MM-DD"
                type="date"
                {...form.getInputProps('start_date')}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <TextInput
                label="Date de fin"
                placeholder="YYYY-MM-DD"
                type="date"
                {...form.getInputProps('end_date')}
              />
            </Grid.Col>
            <Grid.Col span={2}>
              <NumberInput
                label="Taille de page"
                min={1}
                max={100}
                {...form.getInputProps('page_size')}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput
                label="Recherche"
                placeholder="Rechercher dans les descriptions..."
                {...form.getInputProps('search')}
              />
            </Grid.Col>
          </Grid>

          <Group mt="md">
            <Button type="submit" leftSection={<IconSearch size={16} />}>
              Rechercher
            </Button>
            <Button variant="outline" onClick={handleReset} leftSection={<IconRefresh size={16} />}>
              Réinitialiser
            </Button>
            <Button variant="outline" onClick={exportToCSV} leftSection={<IconDownload size={16} />}>
              Exporter CSV
            </Button>
          </Group>
        </form>
      </Paper>

      <Paper withBorder>
        <LoadingOverlay visible={loading} />
        
        {auditData && (
          <>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Timestamp</Table.Th>
                  <Table.Th>Acteur</Table.Th>
                  <Table.Th>Action</Table.Th>
                  <Table.Th>Cible</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>IP</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {auditData.entries.map((entry) => (
                  <Table.Tr key={entry.id}>
                    <Table.Td>
                      <Text size="sm">{formatTimestamp(entry.timestamp)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{entry.actor_username || 'Système'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getActionBadgeColor(entry.action_type)} size="sm">
                        {formatActionType(entry.action_type)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {entry.target_username || entry.target_type || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={2}>
                        {entry.description || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{entry.ip_address || '-'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label="Voir les détails">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => openDetailsModal(entry)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {auditData.pagination.total_pages > 1 && (
              <Group justify="center" mt="md" p="md">
                <Pagination
                  value={auditData.pagination.page}
                  onChange={handlePageChange}
                  total={auditData.pagination.total_pages}
                  size="sm"
                />
              </Group>
            )}

            <Text size="sm" c="dimmed" p="md" ta="center">
              {auditData.pagination.total_count} entrée(s) au total
            </Text>
          </>
        )}
      </Paper>

      <Modal
        opened={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Détails de l'entrée d'audit"
        size="lg"
      >
        {selectedEntry && (
          <ScrollArea h={400}>
            <Grid>
              <Grid.Col span={6}>
                <Text size="sm" fw={500}>Timestamp:</Text>
                <Text size="sm">{formatTimestamp(selectedEntry.timestamp)}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500}>Acteur:</Text>
                <Text size="sm">{selectedEntry.actor_username || 'Système'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500}>Action:</Text>
                <Badge color={getActionBadgeColor(selectedEntry.action_type)}>
                  {formatActionType(selectedEntry.action_type)}
                </Badge>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500}>Cible:</Text>
                <Text size="sm">{selectedEntry.target_type || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="sm" fw={500}>Description:</Text>
                <Text size="sm">{selectedEntry.description || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500}>IP:</Text>
                <Text size="sm">{selectedEntry.ip_address || '-'}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text size="sm" fw={500}>User-Agent:</Text>
                <Text size="sm" lineClamp={2}>{selectedEntry.user_agent || '-'}</Text>
              </Grid.Col>
              {selectedEntry.details && (
                <Grid.Col span={12}>
                  <Text size="sm" fw={500} mb="xs">Détails JSON:</Text>
                  <Paper p="sm" withBorder>
                    <Text size="xs" style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedEntry.details, null, 2)}
                    </Text>
                  </Paper>
                </Grid.Col>
              )}
            </Grid>
          </ScrollArea>
        )}
      </Modal>
        </Tabs.Panel>

        <Tabs.Panel value="transactions" pt="md">
          <TransactionLogsTab />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};

// Composant pour l'onglet des logs transactionnels
const TransactionLogsTab: React.FC = () => {
  const [transactionData, setTransactionData] = useState<{
    entries: any[];
    pagination: {
      page: number;
      page_size: number;
      total_count: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const { token } = useAuthStore();

  const form = useForm({
    initialValues: {
      event_type: '',
      user_id: '',
      session_id: '',
      start_date: '',
      end_date: '',
      page_size: 50
    }
  });

  const eventTypes = [
    { value: '', label: 'Tous les événements' },
    { value: 'SESSION_OPENED', label: 'Session ouverte' },
    { value: 'TICKET_OPENED', label: 'Ticket ouvert' },
    { value: 'TICKET_RESET', label: 'Ticket réinitialisé' },
    { value: 'PAYMENT_VALIDATED', label: 'Paiement validé' },
    { value: 'ANOMALY_DETECTED', label: 'Anomalie détectée' }
  ];

  const fetchTransactionLogs = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: form.values.page_size.toString(),
        ...(form.values.event_type && { event_type: form.values.event_type }),
        ...(form.values.user_id && { user_id: form.values.user_id }),
        ...(form.values.session_id && { session_id: form.values.session_id }),
        ...(form.values.start_date && { start_date: form.values.start_date }),
        ...(form.values.end_date && { end_date: form.values.end_date })
      });

      const response = await api.get(`/v1/admin/transaction-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTransactionData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement des logs transactionnels');
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les logs transactionnels',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactionLogs();
  }, []);

  const handleSearch = () => {
    fetchTransactionLogs(1);
  };

  const handleReset = () => {
    form.reset();
    fetchTransactionLogs(1);
  };

  const handlePageChange = (page: number) => {
    fetchTransactionLogs(page);
  };

  const openDetailsModal = (entry: any) => {
    setSelectedEntry(entry);
    setDetailsModalOpen(true);
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '-';
    try {
      // Gérer le format avec 'Z' à la fin (ISO 8601)
      // Format attendu: "2025-12-10T23:52:54.686286+00:00Z" ou "2025-12-10T23:52:54.686286Z"
      let dateStr = timestamp;
      if (dateStr.endsWith('Z')) {
        // Remplacer 'Z' par '+00:00' seulement si pas déjà de timezone
        if (!dateStr.includes('+') && !dateStr.slice(0, -1).includes('-', dateStr.lastIndexOf('T'))) {
          dateStr = dateStr.slice(0, -1) + '+00:00';
        } else if (dateStr.includes('+00:00Z')) {
          // Cas: "+00:00Z" -> remplacer par "+00:00"
          dateStr = dateStr.replace('+00:00Z', '+00:00');
        } else {
          // Cas simple: "Z" à la fin sans timezone -> remplacer par "+00:00"
          dateStr = dateStr.slice(0, -1) + '+00:00';
        }
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Si le parsing échoue, essayer sans modification
        const date2 = new Date(timestamp);
        if (isNaN(date2.getTime())) {
          return timestamp; // Retourner la chaîne originale si le parsing échoue
        }
        return date2.toLocaleString('fr-FR');
      }
      return date.toLocaleString('fr-FR');
    } catch (error) {
      return timestamp; // Retourner la chaîne originale en cas d'erreur
    }
  };

  const formatEventType = (eventType: string) => {
    const event = eventTypes.find(e => e.value === eventType);
    return event ? event.label : eventType;
  };

  const getEventBadgeColor = (eventType: string) => {
    if (eventType === 'PAYMENT_VALIDATED') return 'green';
    if (eventType === 'ANOMALY_DETECTED') return 'red';
    if (eventType === 'TICKET_RESET') return 'orange';
    return 'blue';
  };

  const exportTransactionLogsToCSV = () => {
    if (!transactionData || transactionData.entries.length === 0) {
      notifications.show({
        title: 'Aucune donnée',
        message: 'Aucun log à exporter',
        color: 'yellow'
      });
      return;
    }
    
    // Headers CSV
    const headers = [
      'Timestamp',
      'Événement',
      'User ID',
      'Session ID',
      'Transaction ID',
      'Anomalie',
      'Type Anomalie',
      'Détails',
      'Montant',
      'Méthode Paiement',
      'Items Count',
      'Cart State (JSON)',
      'Cart State Before (JSON)',
      'Cart State After (JSON)'
    ];
    
    // Convertir les entrées en lignes CSV
    const rows = transactionData.entries.map(entry => [
      formatTimestamp(entry.timestamp),
      entry.event || '',
      entry.user_id || '',
      entry.session_id || '',
      entry.transaction_id || '',
      entry.anomaly ? 'Oui' : 'Non',
      entry.anomaly_type || '',
      entry.details || '',
      entry.amount?.toString() || '',
      entry.payment_method || '',
      entry.cart_state?.items_count?.toString() || entry.cart_state_before?.items_count?.toString() || '',
      entry.cart_state ? JSON.stringify(entry.cart_state) : '',
      entry.cart_state_before ? JSON.stringify(entry.cart_state_before) : '',
      entry.cart_state_after ? JSON.stringify(entry.cart_state_after) : ''
    ]);
    
    // Créer le contenu CSV
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => {
        // Échapper les guillemets et entourer de guillemets
        const escaped = String(field).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','))
      .join('\n');
    
    // Créer et télécharger le fichier
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `transaction-logs-${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    notifications.show({
      title: 'Export réussi',
      message: `${transactionData.entries.length} log(s) exporté(s)`,
      color: 'green'
    });
  };

  return (
    <>
      <Paper withBorder p="md" mb="md">
        <form onSubmit={form.onSubmit(handleSearch)}>
          <Grid>
            <Grid.Col span={3}>
              <Select
                label="Type d'événement"
                placeholder="Filtrer par type..."
                data={eventTypes}
                {...form.getInputProps('event_type')}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <TextInput
                label="User ID"
                placeholder="Filtrer par user ID..."
                {...form.getInputProps('user_id')}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <TextInput
                label="Session ID"
                placeholder="Filtrer par session ID..."
                {...form.getInputProps('session_id')}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <TextInput
                label="Date de début"
                placeholder="YYYY-MM-DD"
                type="date"
                {...form.getInputProps('start_date')}
              />
            </Grid.Col>
            <Grid.Col span={3}>
              <TextInput
                label="Date de fin"
                placeholder="YYYY-MM-DD"
                type="date"
                {...form.getInputProps('end_date')}
              />
            </Grid.Col>
            <Grid.Col span={2}>
              <NumberInput
                label="Taille de page"
                min={1}
                max={200}
                {...form.getInputProps('page_size')}
              />
            </Grid.Col>
          </Grid>

          <Group mt="md">
            <Button type="submit" leftSection={<IconSearch size={16} />}>
              Rechercher
            </Button>
            <Button variant="outline" onClick={handleReset} leftSection={<IconRefresh size={16} />}>
              Réinitialiser
            </Button>
            <Button 
              variant="outline" 
              onClick={exportTransactionLogsToCSV} 
              leftSection={<IconDownload size={16} />}
              disabled={!transactionData || transactionData.entries.length === 0}
            >
              Exporter CSV
            </Button>
          </Group>
        </form>
      </Paper>

      <Paper withBorder>
        <LoadingOverlay visible={loading} />
        
        {transactionData && (
          <>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Timestamp</Table.Th>
                  <Table.Th>Événement</Table.Th>
                  <Table.Th>User ID</Table.Th>
                  <Table.Th>Session ID</Table.Th>
                  <Table.Th>Anomalie</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {transactionData.entries.map((entry, idx) => (
                  <Table.Tr 
                    key={idx}
                    style={{
                      backgroundColor: entry.anomaly || entry.event === 'ANOMALY_DETECTED' 
                        ? 'rgba(255, 152, 0, 0.1)' 
                        : undefined
                    }}
                  >
                    <Table.Td>
                      <Text size="sm">{formatTimestamp(entry.timestamp)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getEventBadgeColor(entry.event)} size="sm">
                        {formatEventType(entry.event)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ fontFamily: 'monospace' }}>
                        {entry.user_id || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ fontFamily: 'monospace' }}>
                        {entry.session_id || '-'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {(entry.anomaly || entry.event === 'ANOMALY_DETECTED') ? (
                        <Badge color="red" size="sm" variant="filled">
                          {entry.anomaly_type || 'Anomalie'}
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed">-</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label="Voir les détails">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => openDetailsModal(entry)}
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {transactionData.pagination.total_pages > 1 && (
              <Group justify="center" mt="md" p="md">
                <Pagination
                  value={transactionData.pagination.page}
                  onChange={handlePageChange}
                  total={transactionData.pagination.total_pages}
                  size="sm"
                />
              </Group>
            )}

            <Text size="sm" c="dimmed" p="md" ta="center">
              {transactionData.pagination.total_count} entrée(s) au total
            </Text>
          </>
        )}
      </Paper>

      <Modal
        opened={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Détails du log transactionnel"
        size="lg"
      >
        {selectedEntry && (
          <ScrollArea h={500}>
            <Paper p="sm" withBorder>
              <Code block style={{ fontSize: '12px' }}>
                {JSON.stringify(selectedEntry, null, 2)}
              </Code>
            </Paper>
          </ScrollArea>
        )}
      </Modal>
    </>
  );
};

export default AuditLog;