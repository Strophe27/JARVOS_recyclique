/**
 * Page Mot de passe oublié — Story 11.1.
 * Route /forgot-password : formulaire email, POST /v1/auth/forgot-password.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TextInput, Button, Stack, Alert, Anchor } from '@mantine/core';
import { postForgotPassword } from '../api/auth';
import { PageContainer, PageSection } from '../shared/layout';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postForgotPassword(email);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PageContainer title="Mot de passe oublié" maxWidth={420} gap="lg" topMargin="xl">
        <Alert color="green" title="Demande envoyée">
          Si cet email correspond à un compte, un lien de réinitialisation vous a été envoyé.
        </Alert>
        <Anchor component={Link} to="/login" size="sm">
          Retour à la connexion
        </Anchor>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Mot de passe oublié" maxWidth={420} gap="lg" topMargin="xl">
      <PageSection>
        <form onSubmit={handleSubmit} data-testid="forgot-password-form">
          <Stack gap="md">
            {error && (
              <Alert role="alert" color="red" title="Erreur" data-testid="forgot-password-error">
                {error}
              </Alert>
            )}
            <TextInput
              label="Email"
              type="email"
              placeholder="email@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              data-testid="forgot-password-email"
            />
            <Button type="submit" data-testid="forgot-password-submit" loading={loading}>
              Envoyer le lien
            </Button>
          </Stack>
        </form>
      </PageSection>
      <Anchor component={Link} to="/login" size="sm">
        Retour à la connexion
      </Anchor>
    </PageContainer>
  );
}
