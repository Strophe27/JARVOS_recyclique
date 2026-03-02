/**
 * Tests AuthGuard — Story 17-HF-1.
 * Redirige vers /login si user null ; affiche children si user présent.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthGuard } from './AuthGuard';

const mockUseAuth = vi.fn();
vi.mock('./AuthContext', () => ({ useAuth: () => mockUseAuth() }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route
          path="/protected"
          element={
            <AuthGuard>
              <div data-testid="protected-content">Protected</div>
            </AuthGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthGuard', () => {
  it('redirige vers /login si user null', () => {
    mockUseAuth.mockReturnValue({ user: null, isHydrated: true });
    renderAt('/protected');
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('affiche children si user présent', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', username: 'operateur' },
      isHydrated: true,
    });
    renderAt('/protected');
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('retourne null pendant hydration pour éviter flash', () => {
    mockUseAuth.mockReturnValue({ user: null, isHydrated: false });
    renderAt('/protected');
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
