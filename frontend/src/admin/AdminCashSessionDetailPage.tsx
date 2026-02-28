/**
 * Page admin Détail session caisse — Story 8.2 (écran 5.5).
 * Route : /admin/cash-sessions/:id. GET /v1/cash-sessions/{id}, lien rapport.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Stack, Alert, Loader, Button, Group, Text, Title } from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import { getCashSession, type CashSessionItem } from '../api/caisse';
import { getReportBySession } from '../api/adminReports';
import { PageContainer, PageSection } from '../shared/layout';

export function AdminCashSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, permissions } = useAuth();
  const [session, setSession] = useState<CashSessionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    if (!accessToken || !id || !permissions.includes('admin')) return;
    setLoading(true);
    setError(null);
    try {
      const s = await getCashSession(accessToken, id);
      setSession(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Session introuvable');
    } finally {
      setLoading(false);
    }
  }, [accessToken, id, permissions]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleDownloadReport = async () => {
    if (!accessToken || !id) return;
    setError(null);
    try {
      const blob = await getReportBySession(accessToken, id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-session-${id}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur téléchargement');
    }
  };

  if (!permissions.includes('admin')) {
    return (
      <PageContainer title="Détail session caisse" maxWidth={760} testId="admin-session-detail-forbidden">
        <Alert color="orange" title="Accès réservé">
          Accès réservé aux administrateurs.
        </Alert>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer title="Détail session caisse" maxWidth={760}>
        <Loader size="sm" data-testid="admin-session-detail-loading" />
      </PageContainer>
    );
  }

  if (error && !session) {
    return (
      <PageContainer title="Détail session caisse" maxWidth={760}>
        <Alert color="red">{error}</Alert>
      </PageContainer>
    );
  }

  if (!session) {
    return (
      <PageContainer title="Détail session caisse" maxWidth={760}>
        <Text component="p" data-testid="admin-session-detail-not-found">Session introuvable.</Text>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={`Session caisse ${session.id.slice(0, 8)}`} maxWidth={760} testId="admin-session-detail-page">
      <Group justify="space-between">
        <Title order={2}>Détail de session</Title>
        <Button component={Link} to="/admin/session-manager" variant="subtle" size="sm">
          Retour liste
        </Button>
      </Group>

      {error && <Alert color="red">{error}</Alert>}

      <PageSection>
        <Stack gap="xs">
          <Text><strong>Ouverture :</strong> {new Date(session.opened_at).toLocaleString()}</Text>
          <Text><strong>Clôture :</strong> {session.closed_at ? new Date(session.closed_at).toLocaleString() : '—'}</Text>
          <Text><strong>Statut :</strong> {session.status}</Text>
          <Text><strong>Type :</strong> {session.session_type}</Text>
          <Text><strong>Fond de caisse :</strong> {(session.initial_amount / 100).toFixed(2)} €</Text>
          {session.closing_amount != null && <Text><strong>Montant clôture :</strong> {(session.closing_amount / 100).toFixed(2)} €</Text>}
          {session.actual_amount != null && <Text><strong>Montant compté :</strong> {(session.actual_amount / 100).toFixed(2)} €</Text>}
          {session.variance != null && <Text><strong>Écart :</strong> {(session.variance / 100).toFixed(2)} €</Text>}
          {session.variance_comment && <Text><strong>Commentaire écart :</strong> {session.variance_comment}</Text>}
          {session.total_sales != null && <Text><strong>Total ventes :</strong> {(session.total_sales / 100).toFixed(2)} €</Text>}
          {session.total_items != null && <Text><strong>Nombre d'articles :</strong> {session.total_items}</Text>}
        </Stack>
      </PageSection>

      {session.status === 'closed' && (
        <Button onClick={handleDownloadReport} data-testid="download-report">
          Télécharger le rapport
        </Button>
      )}
    </PageContainer>
  );
}
