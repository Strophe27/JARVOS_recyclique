/**
 * Tests unitaires pour le composant AdvancedFiltersAccordion (B45-P2)
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  AdvancedFiltersAccordion,
  FilterInput,
  FilterMultiSelect,
  FilterToggle,
  FiltersGridContainer
} from '../AdvancedFiltersAccordion'

describe('AdvancedFiltersAccordion', () => {
  it('devrait s\'ouvrir et se fermer au clic', () => {
    render(
      <AdvancedFiltersAccordion title="Filtres Avancés">
        <div data-testid="content">Contenu des filtres</div>
      </AdvancedFiltersAccordion>
    )

    const header = screen.getByText('Filtres Avancés')
    const content = screen.getByTestId('content')

    // Par défaut, l'accordéon est fermé
    expect(content.parentElement).toHaveStyle({ maxHeight: '0px' })

    // Ouvrir l'accordéon
    fireEvent.click(header)
    expect(content.parentElement).toHaveStyle({ maxHeight: '2000px' })

    // Fermer l'accordéon
    fireEvent.click(header)
    expect(content.parentElement).toHaveStyle({ maxHeight: '0px' })
  })

  it('devrait être ouvert par défaut si defaultOpen=true', () => {
    render(
      <AdvancedFiltersAccordion title="Filtres Avancés" defaultOpen>
        <div data-testid="content">Contenu</div>
      </AdvancedFiltersAccordion>
    )

    const content = screen.getByTestId('content')
    expect(content.parentElement).toHaveStyle({ maxHeight: '2000px' })
  })
})

describe('FilterInput', () => {
  it('devrait appeler onChange avec la valeur saisie', () => {
    const onChange = vi.fn()
    render(
      <FilterInput
        label="Montant minimum"
        value={undefined}
        onChange={onChange}
        placeholder="0.00"
      />
    )

    const input = screen.getByLabelText('Montant minimum')
    fireEvent.change(input, { target: { value: '100' } })

    expect(onChange).toHaveBeenCalledWith('100')
  })

  it('devrait afficher la valeur fournie', () => {
    render(
      <FilterInput
        label="Montant minimum"
        value={50}
        onChange={vi.fn()}
      />
    )

    const input = screen.getByLabelText('Montant minimum')
    expect(input).toHaveValue('50')
  })
})

describe('FilterMultiSelect', () => {
  it('devrait permettre de sélectionner plusieurs options', () => {
    const onChange = vi.fn()
    const options = [
      { value: 'cash', label: 'Espèces' },
      { value: 'card', label: 'Carte' },
      { value: 'check', label: 'Chèque' }
    ]

    render(
      <FilterMultiSelect
        label="Méthodes de paiement"
        selected={[]}
        onChange={onChange}
        options={options}
      />
    )

    const cashCheckbox = screen.getByLabelText('Espèces')
    const cardCheckbox = screen.getByLabelText('Carte')

    fireEvent.click(cashCheckbox)
    expect(onChange).toHaveBeenCalledWith(['cash'])

    fireEvent.click(cardCheckbox)
    expect(onChange).toHaveBeenCalledWith(['cash', 'card'])
  })

  it('devrait permettre de désélectionner une option', () => {
    const onChange = vi.fn()
    const options = [
      { value: 'cash', label: 'Espèces' },
      { value: 'card', label: 'Carte' }
    ]

    render(
      <FilterMultiSelect
        label="Méthodes de paiement"
        selected={['cash', 'card']}
        onChange={onChange}
        options={options}
      />
    )

    const cashCheckbox = screen.getByLabelText('Espèces')
    fireEvent.click(cashCheckbox)

    expect(onChange).toHaveBeenCalledWith(['card'])
  })
})

describe('FilterToggle', () => {
  it('devrait appeler onChange avec la nouvelle valeur', () => {
    const onChange = vi.fn()
    render(
      <FilterToggle
        label="Avec variance"
        checked={false}
        onChange={onChange}
      />
    )

    const toggle = screen.getByLabelText('Avec variance')
    fireEvent.click(toggle)

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('devrait afficher l\'état checked', () => {
    render(
      <FilterToggle
        label="Avec variance"
        checked={true}
        onChange={vi.fn()}
      />
    )

    const toggle = screen.getByLabelText('Avec variance')
    expect(toggle).toBeChecked()
  })
})

