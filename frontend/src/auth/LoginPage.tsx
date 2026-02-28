/**
 * Page Login — Story 11.1.
 * Route /login : formulaire connexion, POST /v1/auth/login, redirection après succès.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Anchor } from '@mantine/core';
import { LoginForm } from './LoginForm';
import { useAuth } from './AuthContext';
import { PageContainer } from '../shared/layout';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  useEffect(() => {
    if (user) {
      navigate(from || '/', { replace: true });
    }
  }, [user, from, navigate]);

  const handleSubmit = async (username: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate(from || '/', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Connexion" maxWidth={420} gap="lg" topMargin="xl">
      <LoginForm onSubmit={handleSubmit} error={error ?? undefined} loading={loading} />
      <Anchor component={Link} to="/forgot-password" size="sm">
        Mot de passe oublié ?
      </Anchor>
      <Anchor component={Link} to="/signup" size="sm">
        Créer un compte
      </Anchor>
    </PageContainer>
  );
}
