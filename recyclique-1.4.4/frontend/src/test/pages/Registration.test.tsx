import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, renderWithRouter } from '../test-utils'
import userEvent from '@testing-library/user-event'
import { mockApiResponses } from '../test-utils'
import api from '../../services/api'

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

import Registration from '../../pages/Registration'

describe('Registration Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.post).mockResolvedValue(mockApiResponses.registrationSuccess)
  })

  it('should render registration form with expected fields', () => {
    render(<Registration />)

    expect(screen.getByText('📝 Inscription RecyClique')).toBeInTheDocument()
    expect(screen.getByLabelText(/^identifiant$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/prénom/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nom de famille/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^téléphone$/i)).toBeInTheDocument()
  })

  it('should show required indicators for prénom and nom', () => {
    render(<Registration />)

    expect(screen.getByText(/prénom \*/i)).toBeInTheDocument()
    expect(screen.getByText(/nom de famille \*/i)).toBeInTheDocument()
  })

  it('should handle form input changes', async () => {
    render(<Registration />)

    const usernameInput = screen.getByLabelText(/^identifiant$/i)
    const firstNameInput = screen.getByLabelText(/prénom/i)
    const lastNameInput = screen.getByLabelText(/nom de famille/i)

    fireEvent.change(usernameInput, { target: { value: '@john' } })
    fireEvent.change(firstNameInput, { target: { value: 'John' } })
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } })

    expect(usernameInput).toHaveValue('@john')
    expect(firstNameInput).toHaveValue('John')
    expect(lastNameInput).toHaveValue('Doe')
  })

  it('should ignore legacy telegram_id query param (no field)', () => {
    renderWithRouter(<Registration />, '/inscription?telegram_id=123456789')
    expect(screen.queryByLabelText(/telegram/i)).not.toBeInTheDocument()
  })

  it('should submit form with correct data', async () => {
    const user = userEvent.setup()
    render(<Registration />)

    await user.type(screen.getByLabelText(/^identifiant$/i), '@jane')
    await user.type(screen.getByLabelText(/prénom/i), 'Jane')
    await user.type(screen.getByLabelText(/nom de famille/i), 'Doe')
    await user.type(screen.getByLabelText(/^email$/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/^téléphone$/i), '+33123456789')

    await user.click(screen.getByRole('button', { name: /envoyer la demande/i }))

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/users/registration-requests', {
        username: '@jane',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@example.com',
        phone: '+33123456789',
      })
    })
  })

  it('should show success message after successful submission', async () => {
    render(<Registration />)

    fireEvent.change(screen.getByLabelText(/prénom/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/nom de famille/i), { target: { value: 'Doe' } })

    fireEvent.click(screen.getByRole('button', { name: /envoyer la demande/i }))

    await waitFor(() => {
      expect(screen.getByText(/votre demande d'inscription a été envoyée avec succès/i)).toBeInTheDocument()
    })
  })

  it('should reset form after successful submission', async () => {
    const user = userEvent.setup()
    render(<Registration />)

    await user.type(screen.getByLabelText(/prénom/i), 'John')
    await user.type(screen.getByLabelText(/nom de famille/i), 'Doe')

    await user.click(screen.getByRole('button', { name: /envoyer la demande/i }))

    await waitFor(() => {
      expect(screen.getByText(/votre demande d'inscription a été envoyée avec succès/i)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByLabelText(/prénom/i)).toHaveValue('')
      expect(screen.getByLabelText(/nom de famille/i)).toHaveValue('')
    })
  })

  it('should show error message on submission failure', async () => {
    vi.mocked(api.post).mockRejectedValue(mockApiResponses.registrationError)
    render(<Registration />)

    fireEvent.change(screen.getByLabelText(/prénom/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/nom de famille/i), { target: { value: 'Doe' } })

    fireEvent.click(screen.getByRole('button', { name: /envoyer la demande/i }))

    await waitFor(() => {
      expect(screen.getByText(/validation error/i)).toBeInTheDocument()
    })
  })

  it('should show loading state during submission', async () => {
    vi.mocked(api.post).mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)))
    render(<Registration />)

    fireEvent.change(screen.getByLabelText(/prénom/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/nom de famille/i), { target: { value: 'Doe' } })

    fireEvent.click(screen.getByRole('button', { name: /envoyer la demande/i }))

    expect(screen.getByText(/envoi en cours/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /envoi en cours/i })).toBeDisabled()
  })

  it('should not call API when required names empty', async () => {
    render(<Registration />)
    fireEvent.click(screen.getByRole('button', { name: /envoyer la demande/i }))
    await waitFor(() => {
      expect(screen.getByText(/veuillez remplir tous les champs obligatoires/i)).toBeInTheDocument()
    })
    expect(vi.mocked(api.post)).not.toHaveBeenCalled()
  })

  it('should display placeholder text correctly', () => {
    render(<Registration />)

    expect(screen.getByPlaceholderText(/@votre_nom_utilisateur/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/votre prénom/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/votre nom de famille/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/votre@email.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/\+33 6 12 34 56 78/i)).toBeInTheDocument()
  })
})
