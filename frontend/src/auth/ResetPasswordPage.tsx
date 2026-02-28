/**
 * Page Réinitialisation mot de passe — Story 11.1.
 * Route /reset-password : token depuis ?token=..., formulaire nouveau mot de passe, POST /v1/auth/reset-password.
 */
import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PasswordInput, Button, Stack, Alert, Anchor } from '@mantine/core';
import { postResetPassword } from '../api/auth';
import { PageContainer, PageSection } from '../shared/layout';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [new_password, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (new_password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    if (new_password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (!token) {
      setError('Lien invalide : token manquant.');
      return;
    }
    setLoading(true);
    try {
      await postResetPassword(token, new_password);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Token invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PageContainer title="Réinitialisation du mot de passe" maxWidth={420} gap="lg" topMargin="xl">
        <Alert color="green" title="Mot de passe modifié">
          Votre mot de passe a été réinitialisé. Vous pouvez vous connecter.
        </Alert>
        <Anchor component={Link} to="/login" size="sm">
          Se connecter
        </Anchor>
      </PageContainer>
    );
  }

  if (!token) {
    return (
      <PageContainer title="Réinitialisation du mot de passe" maxWidth={420} gap="lg" topMargin="xl">
        <Alert color="red" title="Lien invalide">
          Ce lien est invalide ou incomplet. Demandez un nouveau lien depuis la page « Mot de passe oublié ».
        </Alert>
        <Anchor component={Link} to="/forgot-password" size="sm">
          Mot de passe oublié
        </Anchor>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Réinitialisation du mot de passe" maxWidth={420} gap="lg" topMargin="xl">
      <PageSection>
        <form onSubmit={handleSubmit} data-testid="reset-password-form">
          <Stack gap="md">
            {error && (
              <Alert role="alert" color="red" title="Erreur" data-testid="reset-password-error">
                {error}
              </Alert>
            )}
            <PasswordInput
              label="Nouveau mot de passe"
              placeholder="Minimum 8 caractères"
              value={new_password}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              data-testid="reset-password-new"
            />
            <PasswordInput
              label="Confirmer le mot de passe"
              placeholder="Confirmer"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              data-testid="reset-password-confirm"
            />
            <Button type="submit" data-testid="reset-password-submit" loading={loading}>
              Réinitialiser le mot de passe
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
