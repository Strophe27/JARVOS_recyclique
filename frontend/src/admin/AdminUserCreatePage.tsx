/**
 * Page création utilisateur par admin — Story 8.1.
 * Route : /admin/users/new. POST /v1/users.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Stack, Button, TextInput, Select, Alert } from '@mantine/core';
import { useAuth } from '../auth/AuthContext';
import { createUser } from '../api/adminUsers';

export function AdminUserCreatePage() {
  const { accessToken, permissions } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [first_name, setFirst_name] = useState('');
  const [last_name, setLast_name] = useState('');
  const [role, setRole] = useState('operator');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !permissions.includes('admin')) return;
    setLoading(true);
    setError(null);
    try {
      await createUser(accessToken, {
        username,
        email,
        password,
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        role,
        status,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur création');
    } finally {
      setLoading(false);
    }
  };

  if (!permissions.includes('admin')) {
    return (
      <div data-testid="admin-user-create-forbidden">
        <p>Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  if (done) {
    return (
      <Stack data-testid="admin-user-create-done">
        <Alert color="green">Utilisateur créé.</Alert>
        <Button component={Link} to="/admin/users">Retour à la liste</Button>
      </Stack>
    );
  }

  return (
    <Stack gap="md" data-testid="admin-user-create-page">
      <Button component={Link} to="/admin/users" variant="subtle" size="sm">
        ← Utilisateurs
      </Button>
      <h2>Nouvel utilisateur</h2>
      {error && <Alert color="red">{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <TextInput
            label="Username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            data-testid="input-username"
          />
          <TextInput
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="input-email"
          />
          <TextInput
            label="Mot de passe"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="input-password"
          />
          <TextInput
            label="Prénom"
            value={first_name}
            onChange={(e) => setFirst_name(e.target.value)}
          />
          <TextInput
            label="Nom"
            value={last_name}
            onChange={(e) => setLast_name(e.target.value)}
          />
          <Select
            label="Rôle"
            value={role}
            onChange={(v) => v && setRole(v)}
            data={[
              { value: 'operator', label: 'Opérateur' },
                { value: 'admin', label: 'Admin' },
                { value: 'super_admin', label: 'Super Admin' },
            ]}
          />
          <Select
            label="Statut"
            value={status}
            onChange={(v) => v && setStatus(v)}
            data={[
              { value: 'active', label: 'Actif' },
              { value: 'pending', label: 'En attente' },
            ]}
          />
          <Button type="submit" loading={loading} data-testid="submit-create-user">
            Créer
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
