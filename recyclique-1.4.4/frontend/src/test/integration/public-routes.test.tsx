import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import App from '../../App.jsx'

// Mock authStore to simulate unauthenticated state
const mockAuthStore: Record<string, unknown> = {
  isAuthenticated: false,
  currentUser: null,
  loading: false,
  token: null,
  hasPermission: vi.fn(() => false),
  isAdmin: vi.fn(() => false),
  hasCashAccess: vi.fn(() => false),
  hasReceptionAccess: vi.fn(() => false),
  error: null,
  login: vi.fn(async () => ({ success: true })),
  logout: vi.fn(async () => ({ success: true })),
  signup: vi.fn(async () => ({ success: true })),
  forgotPassword: vi.fn(async () => ({ success: true })),
  resetPassword: vi.fn(async () => ({ success: true })),
  setUser: vi.fn(),
  initializeAuth: vi.fn(),
}

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector?: (s: typeof mockAuthStore) => unknown) =>
    typeof selector === 'function' ? selector(mockAuthStore) : mockAuthStore,
}))

const renderAppWithRoute = (route: string) => {
  let container = document.getElementById('root') as HTMLElement | null
  if (!container) {
    container = document.createElement('div')
    container.id = 'root'
    document.body.appendChild(container)
  }
  return render(
    <MantineProvider>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </MantineProvider>,
    { container, legacyRoot: true }
  )
}

describe('Public Routes Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Registration Route Accessibility', () => {
    it('should render registration page when accessing /inscription without authentication', async () => {
      renderAppWithRoute('/inscription')

      await waitFor(() => {
        expect(screen.getByText('📝 Inscription RecyClique')).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/id telegram/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/prénom/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/nom de famille/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /envoyer la demande/i })).toBeInTheDocument()
    })

    it('should render registration page with telegram_id parameter without authentication', async () => {
      renderAppWithRoute('/inscription?telegram_id=123456789')

      await waitFor(() => {
        expect(screen.getByText('📝 Inscription RecyClique')).toBeInTheDocument()
      })

      const telegramInput = screen.getByLabelText(/id telegram/i) as HTMLInputElement
      expect(telegramInput.value).toBe('123456789')
      expect(telegramInput).toBeDisabled()
    })

    it('should not redirect to login page when accessing registration route', async () => {
      renderAppWithRoute('/inscription')

      await waitFor(() => {
        expect(screen.getByText('📝 Inscription RecyClique')).toBeInTheDocument()
      })

      expect(screen.queryByText(/connexion/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/mot de passe/i)).not.toBeInTheDocument()
    })
  })

  describe('Other Public Routes', () => {
    it('should render login page when accessing /login', async () => {
      renderAppWithRoute('/login')

      await waitFor(() => {
        expect(screen.getByText(/connexion/i)).toBeInTheDocument()
      })
    })

    it('should render signup page when accessing /signup', async () => {
      renderAppWithRoute('/signup')

      await waitFor(() => {
        expect(screen.getByText(/créer un compte/i)).toBeInTheDocument()
      })
    })

    it('should render forgot password page when accessing /forgot-password', async () => {
      renderAppWithRoute('/forgot-password')

      await waitFor(() => {
        expect(screen.getByText(/mot de passe oublié/i)).toBeInTheDocument()
      })
    })

    it('should render reset password page when accessing /reset-password', async () => {
      renderAppWithRoute('/reset-password')

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /réinitialiser le mot de passe/i })).toBeInTheDocument()
      })
    })
  })

  describe('Protected Routes Behavior', () => {
    it('should redirect to login when accessing protected routes without authentication', async () => {
      renderAppWithRoute('/')

      await waitFor(() => {
        expect(screen.getByText(/connexion/i)).toBeInTheDocument()
      })
    })

    it('should redirect to login when accessing admin routes without authentication', async () => {
      renderAppWithRoute('/admin/dashboard')

      await waitFor(() => {
        expect(screen.getByText(/connexion/i)).toBeInTheDocument()
      })
    })

    it('should redirect to login when accessing cash routes without authentication', async () => {
      renderAppWithRoute('/caisse')

      await waitFor(() => {
        expect(screen.getByText(/connexion/i)).toBeInTheDocument()
      })
    })
  })

  describe('Registration Route Edge Cases', () => {
    it('should handle API errors gracefully on registration page', async () => {
      renderAppWithRoute('/inscription')

      await waitFor(() => {
        expect(screen.getByText('📝 Inscription RecyClique')).toBeInTheDocument()
      })

      expect(screen.getByLabelText(/id telegram/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /envoyer la demande/i })).toBeInTheDocument()
    })

    it('should preserve URL parameters on registration page load', async () => {
      renderAppWithRoute('/inscription?telegram_id=987654321&ref=telegram')

      await waitFor(() => {
        expect(screen.getByText('📝 Inscription RecyClique')).toBeInTheDocument()
      })

      const telegramInput = screen.getByLabelText(/id telegram/i) as HTMLInputElement
      expect(telegramInput.value).toBe('987654321')
    })
  })
})
