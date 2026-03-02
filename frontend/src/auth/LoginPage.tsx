/**
 * Page Login — Story 11.1, 17-HF-3.
 * Route /login : formulaire connexion, POST /v1/auth/login, redirection après succès.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const redirectTo = from || '/dashboard';

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, redirectTo, navigate]);

  const handleSubmit = async (username: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Connexion" maxWidth={420} gap="lg" topMargin="xl">
      <LoginForm onSubmit={handleSubmit} error={error ?? undefined} loading={loading} />
    </PageContainer>
  );
}
