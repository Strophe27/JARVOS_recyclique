/**
 * Tests ProfilPage — Story 11.1. Smoke : non connecté redirige vers /login.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { ProfilPage } from './ProfilPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const orig = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...orig,
    useNavigate: () => mockNavigate,
  };
});
vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: null,
    accessToken: null,
    logout: vi.fn(),
  }),
}));

function renderProfilPage() {
  return render(
    <MantineProvider>
      <MemoryRouter>
        <ProfilPage />
      </MemoryRouter>
    </MantineProvider>
  );
}

describe('ProfilPage', () => {
  it('sans utilisateur connecté redirige vers /login', () => {
    renderProfilPage();
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
