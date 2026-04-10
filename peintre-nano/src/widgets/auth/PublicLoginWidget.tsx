import { Alert, Anchor, Button, Group, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import type { RegisteredWidgetProps } from '../../registry/widget-registry';
import { useLiveAuthLoginController } from '../../app/auth/LiveAuthLoginControllerContext';
import classes from './PublicLoginWidget.module.css';

function readString(props: Readonly<Record<string, unknown>> | undefined, key: string, fallback: string): string {
  const v = props?.[key];
  return typeof v === 'string' && v.trim() ? v : fallback;
}

/**
 * Surface login public pilotée par le manifeste CREOS `page-login-public.json` (`auth.live.public-login`).
 * La logique d’auth reste dans {@link LiveAuthShell} ; ce widget ne fait que présenter et relayer le contexte.
 */
export function PublicLoginWidget({ widgetProps }: RegisteredWidgetProps) {
  const p = widgetProps;
  const brandTitle = readString(p, 'brandTitle', 'RecyClique');
  const heading = readString(p, 'heading', 'Connexion');
  const usernameLabel = readString(p, 'usernameLabel', "Nom d'utilisateur");
  const passwordLabel = readString(p, 'passwordLabel', 'Mot de passe');
  const submitLabel = readString(p, 'submitLabel', 'Se connecter');
  const forgotLabel = readString(p, 'forgotPasswordLabel', 'Mot de passe oublié ?');
  const forgotHref = readString(p, 'forgotPasswordHref', '/forgot-password');
  const footnote = typeof p?.footnote === 'string' && p.footnote.trim() ? p.footnote.trim() : null;

  const {
    username,
    password,
    setUsername,
    setPassword,
    onSubmit,
    formError,
    busy,
    hasStoredToken,
    onRetryStoredToken,
    onClearStoredSession,
  } = useLiveAuthLoginController();

  return (
    <div className={classes.page} data-testid="public-login-widget">
      <header className={classes.topBar} data-testid="public-login-banner">
        <div className={classes.brandLine}>{brandTitle}</div>
      </header>
      <main className={classes.centerWrap}>
        <div className={classes.formPanel}>
          <Title order={1} className={classes.mainTitle}>
            {heading}
          </Title>
          {footnote ? (
            <Text size="sm" c="dimmed" mb="md">
              {footnote}
            </Text>
          ) : null}
          {formError ? (
            <Alert color="red" title="Erreur" mb="md">
              {formError}
            </Alert>
          ) : null}
          {hasStoredToken ? (
            <Group gap="sm" wrap="wrap" className={classes.secondaryActions} mb="md">
              <Button type="button" variant="light" loading={busy} onClick={onRetryStoredToken}>
                Réessayer la connexion
              </Button>
              <Button type="button" variant="subtle" color="gray" onClick={onClearStoredSession}>
                Oublier la session sur cet appareil
              </Button>
            </Group>
          ) : null}
          <form onSubmit={onSubmit}>
            <Stack gap="sm">
              <TextInput
                label={usernameLabel}
                name="username"
                autoComplete="username"
                value={username}
                onChange={(ev) => setUsername(ev.currentTarget.value)}
                required
              />
              <PasswordInput
                label={passwordLabel}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(ev) => setPassword(ev.currentTarget.value)}
                required
              />
              <Button type="submit" loading={busy} variant="outline" color="gray" fullWidth>
                {submitLabel}
              </Button>
            </Stack>
          </form>
          <Text size="sm" className={classes.forgotRow}>
            <Anchor href={forgotHref} underline="hover">
              {forgotLabel}
            </Anchor>
          </Text>
        </div>
      </main>
    </div>
  );
}
