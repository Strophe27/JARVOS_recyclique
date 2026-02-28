/**
 * Page Signup — Story 11.1.
 * Routes /signup et /inscription : formulaire inscription, POST /v1/auth/signup.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Stack, Alert, Anchor } from '@mantine/core';
import { postSignup } from '../api/auth';
import { PageContainer, PageSection } from '../shared/layout';

export function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await postSignup({
        username,
        email,
        password,
        first_name: first_name || null,
        last_name: last_name || null,
      });
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur d\'inscription');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PageContainer title="Inscription" maxWidth={420} gap="lg" topMargin="xl">
        <Alert color="green" title="Demande envoyée">
          Votre demande d'inscription a été enregistrée. Un administrateur doit l'approuver. Vous serez notifié par email.
        </Alert>
        <Anchor component={Link} to="/login" size="sm">
          Retour à la connexion
        </Anchor>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Inscription" maxWidth={420} gap="lg" topMargin="xl">
      <PageSection>
        <form onSubmit={handleSubmit} data-testid="signup-form">
          <Stack gap="md">
            {error && (
              <Alert role="alert" color="red" title="Erreur" data-testid="signup-error">
                {error}
              </Alert>
            )}
            <TextInput
              label="Identifiant"
              placeholder="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              data-testid="signup-username"
            />
            <TextInput
              label="Email"
              type="email"
              placeholder="email@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              data-testid="signup-email"
            />
            <PasswordInput
              label="Mot de passe"
              placeholder="Minimum 8 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              data-testid="signup-password"
            />
            <TextInput
              label="Prénom"
              placeholder="Prénom"
              value={first_name}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              data-testid="signup-first-name"
            />
            <TextInput
              label="Nom"
              placeholder="Nom"
              value={last_name}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              data-testid="signup-last-name"
            />
            <Button type="submit" data-testid="signup-submit" loading={loading}>
              S'inscrire
            </Button>
          </Stack>
        </form>
      </PageSection>
      <Anchor component={Link} to="/login" size="sm">
        Déjà un compte ? Se connecter
      </Anchor>
    </PageContainer>
  );
}
