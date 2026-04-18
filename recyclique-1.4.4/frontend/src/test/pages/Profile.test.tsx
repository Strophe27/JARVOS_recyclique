import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import Profile from '../../pages/Profile';
import type { User } from '../../stores/authStore';
import { UserRole } from '../../generated/types';

const mockUser: User = {
  id: '1',
  username: 'test@example.com',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  phone_number: '+33123456789',
  address: '123 Rue de la Paix',
  role: UserRole.USER,
  status: 'approved',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const mePayload = {
  ...mockUser,
  role: 'user',
  status: 'approved',
};

vi.mock('../../api/axiosClient', () => ({
  default: {
    get: vi.fn((path: string) => {
      if (path === '/v1/users/me') {
        return Promise.resolve({ data: mePayload });
      }
      return Promise.resolve({ data: {} });
    }),
    put: vi.fn(() => Promise.resolve({ data: mePayload })),
    defaults: { headers: { common: {} as Record<string, string> } },
  },
}));

const storeState = {
  currentUser: mockUser,
  setCurrentUser: vi.fn(),
};

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (s: typeof storeState) => unknown) => selector(storeState),
}));

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState.currentUser = { ...mockUser };
  });

  it('affiche Mon profil et le champ téléphone', async () => {
    const axiosClient = (await import('../../api/axiosClient')).default;
    render(
      <MantineProvider>
        <Profile />
      </MantineProvider>
    );

    expect(screen.getByRole('heading', { name: /mon profil/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(axiosClient.get).toHaveBeenCalledWith('/v1/users/me');
    });
    expect(screen.getByDisplayValue('+33123456789')).toBeInTheDocument();
  });
});
