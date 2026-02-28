/**
 * Page Profil — Story 11.1.
 * Route /profil : GET /v1/users/me, formulaires mise à jour profil, mot de passe, PIN.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Alert,
  Loader,
  Center,
  Text,
} from '@mantine/core';
import { useAuth } from './AuthContext';
import { getMe, putMe, putMePassword, putMePin, type UserMe } from '../api/users';
import { PageContainer, PageSection } from '../shared/layout';

export function ProfilPage() {
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state — profil
  const [first_name, setFirstName] = useState('');
  const [last_name, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Form state — mot de passe
  const [current_password, setCurrentPassword] = useState('');
  const [new_password, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Form state — PIN
  const [new_pin, setNewPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  useEffect(() => {
    if (!user || !accessToken) {
      navigate('/login', { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe(accessToken);
        if (!cancelled) {
          setProfile(me);
          setFirstName(me.first_name ?? '');
          setLastName(me.last_name ?? '');
          setEmail(me.email ?? '');
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, navigate]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setProfileError(null);
    setProfileSuccess(false);
    setProfileSaving(true);
    try {
      const updated = await putMe(accessToken, {
        first_name: first_name || null,
        last_name: last_name || null,
        email: email || null,
      });
      setProfile(updated);
      setProfileSuccess(true);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setPasswordError(null);
    setPasswordSuccess(false);
    setPasswordSaving(true);
    try {
      await putMePassword(accessToken, current_password, new_password);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSuccess(true);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (new_pin.length < 4 || new_pin.length > 6) {
      setPinError('Le PIN doit contenir 4 à 6 chiffres.');
      return;
    }
    setPinError(null);
    setPinSuccess(false);
    setPinSaving(true);
    try {
      await putMePin(accessToken, new_pin);
      setNewPin('');
      setPinSuccess(true);
    } catch (e) {
      setPinError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setPinSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <Center h={200}>
        <Loader data-testid="profil-loading" />
      </Center>
    );
  }

  if (error || !profile) {
    return (
      <PageContainer title="Profil" maxWidth={560} topMargin="xl">
        <Alert color="red" title="Erreur">
          {error ?? 'Profil introuvable'}
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Profil" maxWidth={560} gap="xl" topMargin="xl" testId="page-profil">
      <div>
        <strong>Identifiant :</strong> {profile.username}
      </div>

      <PageSection>
        <Text fw={700} size="lg" mb="md">Informations personnelles</Text>
        <form onSubmit={handleProfileSubmit} data-testid="profil-form">
          <Stack gap="md">
            {profileError && (
              <Alert role="alert" color="red" data-testid="profil-error">
                {profileError}
              </Alert>
            )}
            {profileSuccess && (
              <Alert color="green" data-testid="profil-success">
                Profil mis à jour.
              </Alert>
            )}
            <TextInput
              label="Prénom"
              value={first_name}
              onChange={(e) => setFirstName(e.target.value)}
              data-testid="profil-first-name"
            />
            <TextInput
              label="Nom"
              value={last_name}
              onChange={(e) => setLastName(e.target.value)}
              data-testid="profil-last-name"
            />
            <TextInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="profil-email"
            />
            <Button type="submit" loading={profileSaving} data-testid="profil-submit">
              Enregistrer
            </Button>
          </Stack>
        </form>
      </PageSection>

      <PageSection>
        <Text fw={700} size="lg" mb="md">Changer le mot de passe</Text>
        <form onSubmit={handlePasswordSubmit} data-testid="profil-password-form">
          <Stack gap="md">
            {passwordError && (
              <Alert role="alert" color="red" data-testid="profil-password-error">
                {passwordError}
              </Alert>
            )}
            {passwordSuccess && (
              <Alert color="green" data-testid="profil-password-success">
                Mot de passe modifié.
              </Alert>
            )}
            <PasswordInput
              label="Mot de passe actuel"
              value={current_password}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              data-testid="profil-current-password"
            />
            <PasswordInput
              label="Nouveau mot de passe"
              value={new_password}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              data-testid="profil-new-password"
            />
            <Button type="submit" loading={passwordSaving} data-testid="profil-password-submit">
              Changer le mot de passe
            </Button>
          </Stack>
        </form>
      </PageSection>

      <PageSection>
        <Text fw={700} size="lg" mb="md">Code PIN caisse</Text>
        <form onSubmit={handlePinSubmit} data-testid="profil-pin-form">
          <Stack gap="md">
            {pinError && (
              <Alert role="alert" color="red" data-testid="profil-pin-error">
                {pinError}
              </Alert>
            )}
            {pinSuccess && (
              <Alert color="green" data-testid="profil-pin-success">
                PIN mis à jour.
              </Alert>
            )}
            <PasswordInput
              label="Nouveau PIN (4 à 6 chiffres)"
              value={new_pin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              data-testid="profil-new-pin"
            />
            <Button type="submit" loading={pinSaving} data-testid="profil-pin-submit">
              Mettre à jour le PIN
            </Button>
          </Stack>
        </form>
      </PageSection>

      <Button variant="light" color="red" onClick={handleLogout} data-testid="profil-logout">
        Se déconnecter
      </Button>
    </PageContainer>
  );
}
