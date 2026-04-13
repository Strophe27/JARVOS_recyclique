import { Alert, Button, NumberInput, Paper, Stack, Text, Title } from '@mantine/core';
import { Settings } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAdminSettingsSession,
  putAdminSettingsSession,
} from '../../api/admin-advanced-settings-client';
import { useAuthPort } from '../../app/auth/AuthRuntimeProvider';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';

const MIN_MINUTES = 1;
const MAX_MINUTES = 10080;

export function AdminAdvancedSettingsWidget(_props: RegisteredWidgetProps) {
  const auth = useAuthPort();
  const [minutes, setMinutes] = useState<number | string>(480);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  /** Dernier port auth pour le PUT (token à jour sans resynchroniser tout le callback). */
  const authRef = useRef(auth);
  authRef.current = auth;

  useEffect(() => {
    const ac = new AbortController();
    let stale = false;

    const run = async () => {
      setLoading(true);
      setLoadError(null);
      setSaveOk(false);
      try {
        const res = await fetchAdminSettingsSession(auth, ac.signal);
        if (stale) return;
        if (!res.ok) {
          setLoadError(res.detail);
          setMinutes(480);
        } else {
          const v = res.data.token_expiration_minutes;
          setMinutes(typeof v === 'number' && Number.isFinite(v) ? v : 480);
        }
      } finally {
        if (!stale) setLoading(false);
      }
    };

    void run();
    return () => {
      stale = true;
      ac.abort();
    };
  }, [auth]);

  const onSave = useCallback(async () => {
    setSaveError(null);
    setSaveOk(false);
    const n = typeof minutes === 'number' ? minutes : Number(minutes);
    if (!Number.isFinite(n) || n < MIN_MINUTES || n > MAX_MINUTES) {
      setSaveError(`Indiquez une durée entre ${MIN_MINUTES} et ${MAX_MINUTES} minutes.`);
      return;
    }
    setSaving(true);
    const res = await putAdminSettingsSession(authRef.current, { token_expiration_minutes: Math.floor(n) });
    setSaving(false);
    if (!res.ok) {
      setSaveError(res.detail);
      return;
    }
    setSaveOk(true);
    const v = res.data.token_expiration_minutes;
    if (typeof v === 'number' && Number.isFinite(v)) setMinutes(v);
  }, [minutes]);

  return (
    <Paper p="md" withBorder radius="md" data-testid="admin-advanced-settings-widget">
      <Stack gap="md">
        <div>
          <GroupTitle />
          <Text size="sm" c="dimmed" mt={4}>
            Durée des jetons de session (JWT). Opération réservée au super-administrateur côté API ; les autres
            rôles reçoivent une erreur 403.
          </Text>
        </div>

        {loadError ? (
          <Alert color="red" title="Chargement impossible">
            {loadError}
          </Alert>
        ) : null}
        {saveError ? (
          <Alert color="red" title="Enregistrement refusé">
            {saveError}
          </Alert>
        ) : null}
        {saveOk ? (
          <Alert color="green" title="Enregistré">
            Les paramètres de session ont été mis à jour.
          </Alert>
        ) : null}

        <NumberInput
          label="Expiration du jeton (minutes)"
          description={`Entre ${MIN_MINUTES} et ${MAX_MINUTES} minutes (aligné sur l'écran legacy).`}
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          value={minutes}
          onChange={setMinutes}
          disabled={loading || !!loadError}
          data-testid="admin-advanced-settings-token-minutes"
        />

        <Button
          leftSection={<Settings size={18} />}
          onClick={() => void onSave()}
          loading={saving}
          disabled={loading || !!loadError}
          data-testid="admin-advanced-settings-save"
        >
          Enregistrer
        </Button>
      </Stack>
    </Paper>
  );
}

function GroupTitle() {
  return (
    <Title order={3} size="h4" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Settings size={22} aria-hidden />
      Paramètres avancés — session
    </Title>
  );
}
