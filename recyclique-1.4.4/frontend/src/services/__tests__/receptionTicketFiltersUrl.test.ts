/**
 * Tests unitaires pour les fonctions d'encodage/décodage URL des filtres de tickets de réception (B45-P2)
 */

import { describe, it, expect } from 'vitest'
import { ReceptionTicketFilters, receptionTicketFiltersUrl } from '../receptionTicketsService'

describe('receptionTicketFiltersUrl', () => {
  describe('encode', () => {
    it('devrait encoder les filtres de base', () => {
      const filters: ReceptionTicketFilters = {
        page: 1,
        per_page: 20,
        status: 'closed',
        benevole_id: 'benevole-123',
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        search: 'test'
      }
      
      const encoded = receptionTicketFiltersUrl.encode(filters)
      const params = new URLSearchParams(encoded)
      
      expect(params.get('page')).toBe('1')
      expect(params.get('per_page')).toBe('20')
      expect(params.get('status')).toBe('closed')
      expect(params.get('benevole_id')).toBe('benevole-123')
      expect(params.get('date_from')).toBe('2025-01-01')
      expect(params.get('date_to')).toBe('2025-01-31')
      expect(params.get('search')).toBe('test')
    })

    it('devrait encoder les filtres avancés', () => {
      const filters: ReceptionTicketFilters = {
        poids_min: 10.0,
        poids_max: 50.0,
        categories: ['cat-1', 'cat-2'],
        destinations: ['MAGASIN', 'RECYCLAGE'],
        lignes_min: 2,
        lignes_max: 10
      }
      
      const encoded = receptionTicketFiltersUrl.encode(filters)
      const params = new URLSearchParams(encoded)
      
      expect(params.get('poids_min')).toBe('10')
      expect(params.get('poids_max')).toBe('50')
      expect(params.getAll('categories[]')).toEqual(['cat-1', 'cat-2'])
      expect(params.getAll('destinations[]')).toEqual(['MAGASIN', 'RECYCLAGE'])
      expect(params.get('lignes_min')).toBe('2')
      expect(params.get('lignes_max')).toBe('10')
    })
  })

  describe('decode', () => {
    it('devrait décoder les filtres de base', () => {
      const params = new URLSearchParams()
      params.set('page', '1')
      params.set('per_page', '20')
      params.set('status', 'closed')
      params.set('benevole_id', 'benevole-123')
      params.set('date_from', '2025-01-01')
      params.set('date_to', '2025-01-31')
      params.set('search', 'test')
      
      const filters = receptionTicketFiltersUrl.decode(params)
      
      expect(filters.page).toBe(1)
      expect(filters.per_page).toBe(20)
      expect(filters.status).toBe('closed')
      expect(filters.benevole_id).toBe('benevole-123')
      expect(filters.date_from).toBe('2025-01-01')
      expect(filters.date_to).toBe('2025-01-31')
      expect(filters.search).toBe('test')
    })

    it('devrait décoder les filtres avancés', () => {
      const params = new URLSearchParams()
      params.set('poids_min', '10')
      params.set('poids_max', '50')
      params.append('categories[]', 'cat-1')
      params.append('categories[]', 'cat-2')
      params.append('destinations[]', 'MAGASIN')
      params.append('destinations[]', 'RECYCLAGE')
      params.set('lignes_min', '2')
      params.set('lignes_max', '10')
      
      const filters = receptionTicketFiltersUrl.decode(params)
      
      expect(filters.poids_min).toBe(10)
      expect(filters.poids_max).toBe(50)
      expect(filters.categories).toEqual(['cat-1', 'cat-2'])
      expect(filters.destinations).toEqual(['MAGASIN', 'RECYCLAGE'])
      expect(filters.lignes_min).toBe(2)
      expect(filters.lignes_max).toBe(10)
    })
  })

  describe('round-trip', () => {
    it('devrait encoder et décoder correctement (round-trip)', () => {
      const original: ReceptionTicketFilters = {
        page: 1,
        per_page: 20,
        status: 'closed',
        poids_min: 10.0,
        poids_max: 50.0,
        categories: ['cat-1', 'cat-2'],
        destinations: ['MAGASIN', 'RECYCLAGE'],
        lignes_min: 2,
        lignes_max: 10
      }
      
      const encoded = receptionTicketFiltersUrl.encode(original)
      const params = new URLSearchParams(encoded)
      const decoded = receptionTicketFiltersUrl.decode(params)
      
      expect(decoded.page).toBe(original.page)
      expect(decoded.per_page).toBe(original.per_page)
      expect(decoded.status).toBe(original.status)
      expect(decoded.poids_min).toBe(original.poids_min)
      expect(decoded.poids_max).toBe(original.poids_max)
      expect(decoded.categories).toEqual(original.categories)
      expect(decoded.destinations).toEqual(original.destinations)
      expect(decoded.lignes_min).toBe(original.lignes_min)
      expect(decoded.lignes_max).toBe(original.lignes_max)
    })
  })
})

