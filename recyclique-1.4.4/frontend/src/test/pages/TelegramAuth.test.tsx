import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TelegramAuth from '../../pages/TelegramAuth.jsx';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

function renderWithRouter(initialPath = '/telegram-auth') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/telegram-auth" element={<TelegramAuth />} />
        <Route path="/inscription" element={<div>Inscription page</div>} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TelegramAuth', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('affiche le message de desactivation sans formulaire de liaison', () => {
    renderWithRouter();

    expect(screen.getByRole('heading', { name: /Liaison via Telegram indisponible/i })).toBeInTheDocument();
    expect(
      screen.getByText(/La liaison automatique de compte depuis Telegram n'est plus proposée/i)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/mot de passe/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/identifiant/i)).not.toBeInTheDocument();
  });

  it("redirige vers l'inscription en conservant les paramètres d'URL", async () => {
    const user = userEvent.setup();
    renderWithRouter('/telegram-auth?telegram_id=12345&source=bot');

    await user.click(screen.getByRole('button', { name: /S'inscrire/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/inscription?telegram_id=12345&source=bot');
  });

  it('redirige vers la page de connexion', async () => {
    const user = userEvent.setup();
    renderWithRouter();

    await user.click(screen.getByRole('button', { name: /Se connecter/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
