import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import React from 'react'
import App from '../../App.jsx'
import { UserRole } from '../../generated/types'

// Icônes utilisées par PendingUsers mais absentes du mock global setup.ts
vi.mock('@tabler/icons-react', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@tabler/icons-react')>()
  const stub = (name: string, testId: string) =>
    React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) =>
      React.createElement('div', { ...props, ref, 'data-testid': testId, 'data-icon-name': name }),
    )
  return {
    ...mod,
    IconUsers: stub('IconUsers', 'icon-users'),
    IconRefresh: stub('IconRefresh', 'icon-refresh'),
  }
})

vi.mock('../../services/adminService', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../services/adminService')>()
  return {
    ...mod,
    adminService: {
      ...mod.adminService,
      getPendingUsers: vi.fn().mockResolvedValue([]),
    },
  }
})

const mockAuthStore: Record<string, unknown> = {
  isAuthenticated: true,
  currentUser: {
    id: 'admin-1',
    role: UserRole.ADMIN,
    username: 'admin',
  },
  loading: false,
  token: null,
  tokenExpiration: null as number | null,
  refreshPending: false,
  hasPermission: vi.fn(() => true),
  isAdmin: vi.fn(() => true),
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
  refreshToken: vi.fn(async () => true),
}

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector?: (s: typeof mockAuthStore) => unknown) =>
    typeof selector === 'function' ? selector(mockAuthStore) : mockAuthStore,
}))

const renderAppAsAdmin = (route: string) => {
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
    { container, legacyRoot: true },
  )
}

describe('Admin /admin/pending (App integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('affiche la page des inscriptions en attente pour un admin authentifié', async () => {
    renderAppAsAdmin('/admin/pending')

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /demandes d'inscription/i }),
      ).toBeInTheDocument()
    })

    expect(
      screen.getByText(/gérez les demandes d'inscription en attente d'approbation/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/connexion/i)).not.toBeInTheDocument()
  })
})
