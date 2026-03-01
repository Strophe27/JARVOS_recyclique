/**
 * Page admin Import legacy — Story 8.5.
 * Route : /admin/import/legacy. Étapes : analyze, preview, validate, execute (CSV + boutons).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Text,
  Button,
  Alert,
  Group,
  List,
} from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import {
  getAdminImportLegacyLlmModels,
  postAdminImportLegacyAnalyze,
  postAdminImportLegacyPreview,
  postAdminImportLegacyValidate,
  postAdminImportLegacyExecute,
  type LegacyAnalyzeResponse,
  type LegacyPreviewResponse,
  type LegacyValidateResponse,
  type LegacyExecuteResponse,
} from '../api/adminImportLegacy';
import { PageContainer, PageSection } from '../shared/layout';

export function AdminImportLegacyPage() {
  const { accessToken, permissions } = useAuth();
  const [llmModels, setLlmModels] = useState<string[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<LegacyAnalyzeResponse | null>(null);
  const [previewResult, setPreviewResult] = useState<LegacyPreviewResponse | null>(null);
  const [validateResult, setValidateResult] = useState<LegacyValidateResponse | null>(null);
  const [executeResult, setExecuteResult] = useState<LegacyExecuteResponse | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canAccess = permissions.includes('admin') || permissions.includes('super_admin');

  const loadLlmModels = useCallback(async () => {
    if (!accessToken || !canAccess) return;
    try {
      const res = await getAdminImportLegacyLlmModels(accessToken);
      setLlmModels(res.models ?? []);
    } catch {
      setLlmModels([]);
    }
  }, [accessToken, canAccess]);

  useEffect(() => {
    loadLlmModels();
  }, [loadLlmModels]);

  const run = useCallback(
    async <T,>(label: string, fn: () => Promise<T>, setResult: (r: T) => void) => {
      if (!accessToken || !canAccess) return;
      setLoading(label);
      setError(null);
      try {
        const res = await fn();
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : `Erreur ${label}`);
      } finally {
        setLoading(null);
      }
    },
    [accessToken, canAccess]
  );

  const handleAnalyze = useCallback(() => {
    if (!csvFile) {
      setError('Veuillez sélectionner un fichier CSV.');
      return;
    }
    run('analyze', () => postAdminImportLegacyAnalyze(accessToken!, csvFile), setAnalyzeResult);
  }, [accessToken, canAccess, csvFile, run]);

  const handlePreview = useCallback(() => {
    if (!csvFile) {
      setError('Veuillez sélectionner un fichier CSV.');
      return;
    }
    run('preview', () => postAdminImportLegacyPreview(accessToken!, csvFile), setPreviewResult);
  }, [accessToken, canAccess, csvFile, run]);

  const handleValidate = useCallback(() => {
    if (!csvFile) {
      setError('Veuillez sélectionner un fichier CSV.');
      return;
    }
    run('validate', () => postAdminImportLegacyValidate(accessToken!, csvFile), setValidateResult);
  }, [accessToken, canAccess, csvFile, run]);

  const handleExecute = useCallback(() => {
    if (!csvFile) {
      setError('Veuillez sélectionner un fichier CSV.');
      return;
    }
    run('execute', () => postAdminImportLegacyExecute(accessToken!, csvFile), setExecuteResult);
  }, [accessToken, canAccess, csvFile, run]);

  if (!canAccess) {
    return (
      <div data-testid="admin-import-legacy-forbidden">
        <p>Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <PageContainer title="Import legacy" maxWidth={1200} testId="admin-import-legacy-page">
      <Text size="sm" c="dimmed" mb="xs">
        Analyse, prévisualisation, validation et exécution d&apos;un import CSV.
      </Text>
      {error && <Alert color="red">{error}</Alert>}

      {llmModels.length > 0 && (
        <PageSection>
          <Card withBorder padding="md" radius="md" shadow="sm">
            <Text fw={500} mb="xs">Modèles LLM</Text>
            <List size="sm">
              {llmModels.map((m) => (
                <List.Item key={m}>{m}</List.Item>
              ))}
            </List>
          </Card>
        </PageSection>
      )}

      <PageSection>
        <Card withBorder padding="md" radius="md" shadow="sm">
          <Text fw={500} mb="xs">Fichier CSV</Text>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              setCsvFile(e.target.files?.[0] ?? null);
              setAnalyzeResult(null);
              setPreviewResult(null);
              setValidateResult(null);
              setExecuteResult(null);
            }}
            data-testid="input-legacy-csv"
          />
        </Card>
      </PageSection>

      <PageSection>
        <Card withBorder padding="md" radius="md" shadow="sm">
          <Text fw={500} mb="xs">Étapes</Text>
          <Group mb="md">
            <Button
              size="sm"
              loading={loading === 'analyze'}
              onClick={handleAnalyze}
              data-testid="btn-legacy-analyze"
            >
              Analyser
            </Button>
            <Button
              size="sm"
              variant="light"
              loading={loading === 'preview'}
              onClick={handlePreview}
              data-testid="btn-legacy-preview"
            >
              Prévisualisation
            </Button>
            <Button
              size="sm"
              variant="light"
              loading={loading === 'validate'}
              onClick={handleValidate}
              data-testid="btn-legacy-validate"
            >
              Valider
            </Button>
            <Button
              size="sm"
              color="green"
              loading={loading === 'execute'}
              onClick={handleExecute}
              data-testid="btn-legacy-execute"
            >
              Exécuter
            </Button>
          </Group>
          {analyzeResult && (
            <Alert color="blue" mb="xs" data-testid="result-analyze">
              <Text size="sm">Colonnes : {analyzeResult.columns.length ? analyzeResult.columns.join(', ') : '—'}. Lignes : {analyzeResult.row_count ?? 0}. Erreurs : {analyzeResult.errors.length}. Avertissements : {analyzeResult.warnings.length}.</Text>
            </Alert>
          )}
          {previewResult && (
            <Alert color="gray" mb="xs" data-testid="result-preview">
              <Text size="sm">Aperçu : {previewResult.total} ligne(s).</Text>
            </Alert>
          )}
          {validateResult && (
            <Alert color={validateResult.valid ? 'green' : 'red'} mb="xs" data-testid="result-validate">
              <Text size="sm">Validation : {validateResult.valid ? 'OK' : 'Erreurs'}. Erreurs : {validateResult.errors.length}. Avertissements : {validateResult.warnings.length}.</Text>
            </Alert>
          )}
          {executeResult && (
            <Alert color="green" data-testid="result-execute">
              <Text size="sm">Importé : {executeResult.imported_count}. Message : {executeResult.message ?? '—'}.</Text>
            </Alert>
          )}
        </Card>
      </PageSection>
    </PageContainer>
  );
}
