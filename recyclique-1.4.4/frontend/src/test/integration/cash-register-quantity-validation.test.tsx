import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test-utils'
import Sale from '../../pages/CashRegister/Sale'

// Mock the stores and services
vi.mock('../../stores/cashSessionStore')
vi.mock('../../stores/authStore')
vi.mock('../../stores/categoryStore')
vi.mock('../../stores/presetStore')
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

describe('Cash Register Quantity Validation (B39-P5)', () => {
  beforeEach(() => {
    // Mock stores
    const mockUseCashSessionStore = (await import('../../stores/cashSessionStore')).useCashSessionStore
    const mockUseAuthStore = (await import('../../stores/authStore')).useAuthStore
    const mockUseCategoryStore = (await import('../../stores/categoryStore')).useCategoryStore
    const mockUsePresetStore = (await import('../../stores/presetStore')).usePresetStore

    mockUseCashSessionStore.mockReturnValue({
      currentSession: {
        id: 'session-1',
        operator_id: 'user-1',
        initial_amount: 100,
        current_amount: 100,
        status: 'open',
        opened_at: '2024-01-01T00:00:00Z'
      },
      currentSaleItems: [],
      loading: false,
      error: null,
      addSaleItem: vi.fn(),
      removeSaleItem: vi.fn(),
      updateSaleItem: vi.fn(),
      submitSale: vi.fn()
    })

    mockUseAuthStore.mockReturnValue({
      currentUser: {
        id: 'user-1',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User'
      }
    })

    mockUseCategoryStore.mockReturnValue({
      activeCategories: [
        {
          id: 'EEE-1',
          name: 'Gros électroménager',
          is_active: true,
          parent_id: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          price: 10
        }
      ],
      getCategoryById: vi.fn((id) => ({
        id,
        name: 'Test Category',
        price: 10
      })),
      fetchCategories: vi.fn()
    })

    mockUsePresetStore.mockReturnValue({
      selectedPreset: null,
      presets: [],
      notes: '',
      loading: false,
      error: null,
      clearSelection: vi.fn()
    })
  })

  describe('Quantity Field Pre-filling', () => {
    it('should pre-fill quantity field with value 1 when entering quantity step', async () => {
      render(<Sale />)

      // Navigate to quantity step by selecting category and weight first
      const categoryButton = await screen.findByTestId('category-EEE-1')
      fireEvent.click(categoryButton)

      // Enter weight (simulating user input)
      const weightInput = screen.getByTestId('weight-input')
      fireEvent.click(weightInput)

      // Use numpad to enter weight
      const numpadButtons = screen.getAllByRole('button')
      const digit1Button = numpadButtons.find(btn => btn.textContent === '1')
      const digit5Button = numpadButtons.find(btn => btn.textContent === '5')

      if (digit1Button && digit5Button) {
        fireEvent.click(digit1Button)
        fireEvent.click(digit5Button)

        // Confirm weight
        const confirmWeightButton = screen.getByTestId('validate-weight-button')
        fireEvent.click(confirmWeightButton)

        // Now we should be in quantity step with quantity pre-filled to 1
        await waitFor(() => {
          const quantityDisplay = screen.getByTestId('quantity-input')
          expect(quantityDisplay).toHaveTextContent('1')
        })
      }
    })
  })

  describe('Quantity Validation UI', () => {
    it('should show error when trying to set quantity to 0', async () => {
      render(<Sale />)

      // Navigate to quantity step
      const categoryButton = await screen.findByTestId('category-EEE-1')
      fireEvent.click(categoryButton)

      // Enter and confirm weight
      const weightInput = screen.getByTestId('weight-input')
      fireEvent.click(weightInput)

      const numpadButtons = screen.getAllByRole('button')
      const digit1Button = numpadButtons.find(btn => btn.textContent === '1')
      const digit5Button = numpadButtons.find(btn => btn.textContent === '5')

      if (digit1Button && digit5Button) {
        fireEvent.click(digit1Button)
        fireEvent.click(digit5Button)

        const confirmWeightButton = screen.getByTestId('validate-weight-button')
        fireEvent.click(confirmWeightButton)

        // Now in quantity step, try to set quantity to 0
        await waitFor(() => {
          const quantityDisplay = screen.getByTestId('quantity-input')
          expect(quantityDisplay).toHaveTextContent('1')
        })

        // Try to clear quantity (simulate backspace)
        const backspaceButton = screen.getByText('⌫')
        fireEvent.click(backspaceButton)

        // Should show error message
        await waitFor(() => {
          expect(screen.getByText('La quantité minimale est 1')).toBeInTheDocument()
        })
      }
    })

    it('should prevent validation when quantity is less than 1', async () => {
      render(<Sale />)

      // Navigate to quantity step
      const categoryButton = await screen.findByTestId('category-EEE-1')
      fireEvent.click(categoryButton)

      // Enter and confirm weight
      const weightInput = screen.getByTestId('weight-input')
      fireEvent.click(weightInput)

      const numpadButtons = screen.getAllByRole('button')
      const digit1Button = numpadButtons.find(btn => btn.textContent === '1')
      const digit5Button = numpadButtons.find(btn => btn.textContent === '5')

      if (digit1Button && digit5Button) {
        fireEvent.click(digit1Button)
        fireEvent.click(digit5Button)

        const confirmWeightButton = screen.getByTestId('validate-weight-button')
        fireEvent.click(confirmWeightButton)

        // Clear quantity to make it invalid
        await waitFor(() => {
          const backspaceButton = screen.getByText('⌫')
          // Clear all digits
          for (let i = 0; i < 2; i++) {
            fireEvent.click(backspaceButton)
          }
        })

        // Validate quantity button should be disabled
        await waitFor(() => {
          const validateButton = screen.getByTestId('validate-quantity-button')
          expect(validateButton).toBeDisabled()
        })
      }
    })

    it('should allow validation when quantity is 1 or greater', async () => {
      render(<Sale />)

      // Navigate to quantity step
      const categoryButton = await screen.findByTestId('category-EEE-1')
      fireEvent.click(categoryButton)

      // Enter and confirm weight
      const weightInput = screen.getByTestId('weight-input')
      fireEvent.click(weightInput)

      const numpadButtons = screen.getAllByRole('button')
      const digit1Button = numpadButtons.find(btn => btn.textContent === '1')
      const digit5Button = numpadButtons.find(btn => btn.textContent === '5')

      if (digit1Button && digit5Button) {
        fireEvent.click(digit1Button)
        fireEvent.click(digit5Button)

        const confirmWeightButton = screen.getByTestId('validate-weight-button')
        fireEvent.click(confirmWeightButton)

        // Quantity should be pre-filled to 1 and valid
        await waitFor(() => {
          const validateButton = screen.getByTestId('validate-quantity-button')
          expect(validateButton).not.toBeDisabled()
        })

        // Try setting to 2 (should still be valid)
        const digit2Button = numpadButtons.find(btn => btn.textContent === '2')
        if (digit2Button) {
          fireEvent.click(digit2Button)

          await waitFor(() => {
            const validateButton = screen.getByTestId('validate-quantity-button')
            expect(validateButton).not.toBeDisabled()
          })
        }
      }
    })
  })

  describe('Error Message Display', () => {
    it('should display Reception-aligned error message for minimum quantity', async () => {
      render(<Sale />)

      // Navigate to quantity step and create error condition
      const categoryButton = await screen.findByTestId('category-EEE-1')
      fireEvent.click(categoryButton)

      // Enter and confirm weight
      const weightInput = screen.getByTestId('weight-input')
      fireEvent.click(weightInput)

      const numpadButtons = screen.getAllByRole('button')
      const digit1Button = numpadButtons.find(btn => btn.textContent === '1')

      if (digit1Button) {
        fireEvent.click(digit1Button)

        const confirmWeightButton = screen.getByTestId('validate-weight-button')
        fireEvent.click(confirmWeightButton)

        // Clear quantity to trigger error
        await waitFor(() => {
          const backspaceButton = screen.getByText('⌫')
          fireEvent.click(backspaceButton)
        })

        // Verify exact error message from Reception alignment
        await waitFor(() => {
          expect(screen.getByText('La quantité minimale est 1')).toBeInTheDocument()
        })
      }
    })
  })
})















