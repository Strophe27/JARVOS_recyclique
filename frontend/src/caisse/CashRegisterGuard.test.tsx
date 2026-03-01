/**
 * Tests CashRegisterGuard — Story 3.5.
 * En mode verrouillé, redirection vers /caisse si route non autorisée.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { CaisseProvider, useCaisse } from './CaisseContext';
import { CashRegisterGuard } from './CashRegisterGuard';

function LocationDisplay() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname}</div>;
}

function SetRegisterOnMount() {
  const { setCurrentRegister } = useCaisse();
  React.useEffect(() => {
    setCurrentRegister('r1', true);
  }, [setCurrentRegister]);
  return null;
}

function renderGuard(initialPath: string) {
  return render(
    <AuthProvider>
      <CaisseProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <SetRegisterOnMount />
          <CashRegisterGuard>
            <LocationDisplay />
          </CashRegisterGuard>
        </MemoryRouter>
      </CaisseProvider>
    </AuthProvider>
  );
}

describe('CashRegisterGuard', () => {
  it('redirige vers /caisse quand mode verrouillé et path /admin', async () => {
    const { unmount } = renderGuard('/admin');
    await vi.waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/caisse');
    });
    unmount();
  });

  it('redirige vers /caisse quand mode verrouillé et path /reception', async () => {
    const { unmount } = renderGuard('/reception');
    await vi.waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/caisse');
    });
    unmount();
  });

  it('ne redirige pas quand path autorisé (/caisse)', async () => {
    const { unmount } = renderGuard('/caisse');
    await vi.waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/caisse');
    });
    unmount();
  });

  it('ne redirige pas quand path autorisé (/cash-register/pin)', async () => {
    const { unmount } = renderGuard('/cash-register/pin');
    await vi.waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/cash-register/pin');
    });
    unmount();
  });
});
