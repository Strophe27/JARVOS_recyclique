import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test-utils'
import Registration from '../../pages/Registration'
import { mockApiResponses } from '../test-utils'
import api from '../../services/api'

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('Registration Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should complete registration and POST payload without telegram_id', async () => {
    vi.mocked(api.post).mockResolvedValue(mockApiResponses.registrationSuccess)
    render(<Registration />)

    fireEvent.change(screen.getByLabelText(/^identifiant$/i), {
      target: { value: '@volunteer' },
    })
    fireEvent.change(screen.getByLabelText(/prénom/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/nom de famille/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'john.doe@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^téléphone$/i), {
      target: { value: '06 12 34 56 78' },
    })

    fireEvent.click(screen.getByRole('button', { name: /envoyer la demande/i }))

    await waitFor(() => {
      expect(screen.getByText(/votre demande d'inscription a été envoyée avec succès/i)).toBeInTheDocument()
    })

    expect(vi.mocked(api.post)).toHaveBeenCalledWith('/users/registration-requests', {
      username: '@volunteer',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '06 12 34 56 78',
    })
  })

  it('should show client error when prénom or nom missing', async () => {
    vi.mocked(api.post).mockResolvedValue(mockApiResponses.registrationSuccess)
    render(<Registration />)

    fireEvent.click(screen.getByRole('button', { name: /envoyer la demande/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/veuillez remplir tous les champs obligatoires/i),
      ).toBeInTheDocument()
    })
    expect(vi.mocked(api.post)).not.toHaveBeenCalled()
  })

  it('should handle registration API error', async () => {
    vi.mocked(api.post).mockRejectedValue(mockApiResponses.registrationError)
    render(<Registration />)

    fireEvent.change(screen.getByLabelText(/prénom/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/nom de famille/i), { target: { value: 'Doe' } })
    fireEvent.click(screen.getByRole('button', { name: /envoyer la demande/i }))

    await waitFor(() => {
      expect(screen.getByText(/validation error/i)).toBeInTheDocument()
    })
  })
})
