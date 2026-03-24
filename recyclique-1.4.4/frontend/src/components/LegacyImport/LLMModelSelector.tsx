/**
 * Composant réutilisable pour sélectionner un modèle LLM
 * Utilisé dans l'étape 1 et l'étape 2 de l'import legacy
 */

import React, { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Group,
  Button,
  Select,
  Checkbox,
  Alert,
} from '@mantine/core';
import { adminService } from '../../services/adminService';

interface LLMModel {
  id: string;
  name: string;
  provider?: string;
  is_free: boolean;
  context_length?: number;
  pricing?: Record<string, string>;
}

interface LLMModelSelectorProps {
  selectedModelId: string | null;
  onModelChange: (modelId: string | null) => void;
  showFreeOnly: boolean;
  onShowFreeOnlyChange: (show: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
  // Option pour charger les modèles en interne ou via props
  models?: LLMModel[];
  defaultModelId?: string | null;
  autoLoad?: boolean; // Si true, charge les modèles au montage
}

export const LLMModelSelector: React.FC<LLMModelSelectorProps> = ({
  selectedModelId,
  onModelChange,
  showFreeOnly,
  onShowFreeOnlyChange,
  disabled = false,
  loading: externalLoading = false,
  error: externalError = null,
  onReload,
  models: externalModels,
  defaultModelId,
  autoLoad = true,
}) => {
  // État interne si les modèles ne sont pas fournis via props
  const [internalModels, setInternalModels] = useState<LLMModel[]>([]);
  const [loadingInternal, setLoadingInternal] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Utiliser les modèles externes si fournis, sinon les modèles internes
  const models = externalModels || internalModels;
  const loading = externalLoading || loadingInternal;
  const error = externalError || internalError;

  // Charger les modèles si autoLoad est activé et qu'aucun modèle externe n'est fourni
  useEffect(() => {
    if (autoLoad && !externalModels) {
      const loadModels = async () => {
        setLoadingInternal(true);
        setInternalError(null);
        try {
          const result = await adminService.getLegacyImportLLMModels();
          if (result.error) {
            setInternalError(result.error);
            setInternalModels([]);
          } else {
            setInternalModels(result.models);
            setInternalError(null);
            // Valeur par défaut si aucun modèle n'est sélectionné
            if (result.models.length > 0 && !selectedModelId) {
              const defaultModel = defaultModelId
                ? result.models.find(m => m.id === defaultModelId)
                : result.default_model_id
                ? result.models.find(m => m.id === result.default_model_id)
                : null;
              if (defaultModel) {
                onModelChange(defaultModel.id);
              } else {
                const freeModel = result.models.find(m => m.is_free);
                onModelChange(freeModel ? freeModel.id : result.models[0].id);
              }
            }
          }
        } catch (err: any) {
          console.error('Erreur lors du chargement des modèles LLM:', err);
          setInternalError('Impossible de charger les modèles LLM');
          setInternalModels([]);
        } finally {
          setLoadingInternal(false);
        }
      };
      loadModels();
    }
  }, [autoLoad, externalModels, selectedModelId, defaultModelId, onModelChange]);

  const handleReload = async () => {
    if (onReload) {
      onReload();
    } else if (!externalModels) {
      // Recharger les modèles en interne
      setLoadingInternal(true);
      setInternalError(null);
      try {
        const result = await adminService.getLegacyImportLLMModels();
        if (result.error) {
          setInternalError(result.error);
          setInternalModels([]);
        } else {
          setInternalModels(result.models);
          setInternalError(null);
          // Réinitialiser la sélection si nécessaire
          if (result.models.length > 0 && !selectedModelId) {
            const defaultModel = defaultModelId
              ? result.models.find(m => m.id === defaultModelId)
              : result.default_model_id
              ? result.models.find(m => m.id === result.default_model_id)
              : null;
            if (defaultModel) {
              onModelChange(defaultModel.id);
            } else {
              const freeModel = result.models.find(m => m.is_free);
              onModelChange(freeModel ? freeModel.id : result.models[0].id);
            }
          }
        }
      } catch (err: any) {
        console.error('Erreur lors du rechargement des modèles LLM:', err);
        setInternalError('Impossible de charger les modèles LLM');
        setInternalModels([]);
      } finally {
        setLoadingInternal(false);
      }
    }
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start">
        <Text size="sm" fw={500}>Modèle LLM (optionnel)</Text>
        {error && (
          <Button
            size="xs"
            variant="light"
            onClick={handleReload}
            disabled={loading}
          >
            Recharger
          </Button>
        )}
      </Group>
      <Checkbox
        label="Afficher uniquement les modèles gratuits"
        checked={showFreeOnly}
        onChange={(event) => onShowFreeOnlyChange(event.currentTarget.checked)}
        disabled={loading || disabled}
      />
      <Select
        data={[
          { value: '__none__', label: 'Aucun (désactiver le LLM)' },
          ...(showFreeOnly
            ? models.filter(m => m.is_free)
            : models
          ).map(m => ({
            value: m.id,
            label: `${m.name}${m.is_free ? ' (Gratuit)' : ''}`,
          })),
        ]}
        value={selectedModelId || '__none__'}
        onChange={(value) => {
          onModelChange(value === '__none__' ? null : value);
        }}
        disabled={loading || disabled}
        loading={loading}
        placeholder={loading ? "Chargement des modèles..." : "Sélectionner un modèle ou désactiver le LLM"}
        searchable
        nothingFoundMessage="Aucun modèle trouvé"
      />
      {error && (
        <Alert color="orange" title="Erreur de chargement" size="xs">
          {error}
          {models.length === 0 && (
            <Text size="xs" mt="xs">
              Le LLM sera désactivé. Vous pouvez utiliser uniquement le fuzzy matching.
            </Text>
          )}
        </Alert>
      )}
      {!loading && !error && models.length === 0 && (
        <Alert color="yellow" title="Aucun modèle disponible" size="xs">
          Aucun modèle LLM n'a pu être chargé. Le LLM sera désactivé et seul le fuzzy matching sera utilisé.
        </Alert>
      )}
    </Stack>
  );
};

