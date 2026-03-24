/**
 * Tests unitaires pour les fonctions d'encodage/décodage URL des filtres de sessions de caisse (B45-P2)
 */

import { describe, it, expect } from 'vitest'
import { CashSessionFilters, cashSessionFiltersUrl } from '../cashSessionsService'

describe('cashSessionFiltersUrl', () => {
  describe('encode', () => {
    it('devrait encoder les filtres de base', () => {
      const filters: CashSessionFilters = {
        skip: 0,
        limit: 20,
        status: 'closed',
        operator_id: 'op-123',
        site_id: 'site-456',
        date_from: '2025-01-01',
        date_to: '2025-01-31',
        search: 'test'
      }
      
      const encoded = cashSessionFiltersUrl.encode(filters)
      const params = new URLSearchParams(encoded)
      
      expect(params.get('skip')).toBe('0')
      expect(params.get('limit')).toBe('20')
      expect(params.get('status')).toBe('closed')
      expect(params.get('operator_id')).toBe('op-123')
      expect(params.get('site_id')).toBe('site-456')
      expect(params.get('date_from')).toBe('2025-01-01')
      expect(params.get('date_to')).toBe('2025-01-31')
      expect(params.get('search')).toBe('test')
    })

    it('devrait encoder les filtres avancés', () => {
      const filters: CashSessionFilters = {
        amount_min: 50.0,
        amount_max: 200.0,
        variance_threshold: 10.0,
        variance_has_variance: true,
        duration_min_hours: 2.0,
        duration_max_hours: 4.0,
        payment_methods: ['cash', 'card'],
        has_donation: true
      }
      
      const encoded = cashSessionFiltersUrl.encode(filters)
      const params = new URLSearchParams(encoded)
      
      expect(params.get('amount_min')).toBe('50')
      expect(params.get('amount_max')).toBe('200')
      expect(params.get('variance_threshold')).toBe('10')
      expect(params.get('variance_has_variance')).toBe('true')
      expect(params.get('duration_min_hours')).toBe('2')
      expect(params.get('duration_max_hours')).toBe('4')
      expect(params.getAll('payment_methods[]')).toEqual(['cash', 'card'])
      expect(params.get('has_donation')).toBe('true')
    })

    it('devrait gérer les tableaux vides', () => {
      const filters: CashSessionFilters = {
        payment_methods: []
      }
      
      const encoded = cashSessionFiltersUrl.encode(filters)
      const params = new URLSearchParams(encoded)
      
      expect(params.getAll('payment_methods[]')).toEqual([])
    })
  })

  describe('decode', () => {
    it('devrait décoder les filtres de base', () => {
      const params = new URLSearchParams()
      params.set('skip', '0')
      params.set('limit', '20')
      params.set('status', 'closed')
      params.set('operator_id', 'op-123')
      params.set('site_id', 'site-456')
      params.set('date_from', '2025-01-01')
      params.set('date_to', '2025-01-31')
      params.set('search', 'test')
      
      const filters = cashSessionFiltersUrl.decode(params)
      
      expect(filters.skip).toBe(0)
      expect(filters.limit).toBe(20)
      expect(filters.status).toBe('closed')
      expect(filters.operator_id).toBe('op-123')
      expect(filters.site_id).toBe('site-456')
      expect(filters.date_from).toBe('2025-01-01')
      expect(filters.date_to).toBe('2025-01-31')
      expect(filters.search).toBe('test')
    })

    it('devrait décoder les filtres avancés', () => {
      const params = new URLSearchParams()
      params.set('amount_min', '50')
      params.set('amount_max', '200')
      params.set('variance_threshold', '10')
      params.set('variance_has_variance', 'true')
      params.set('duration_min_hours', '2')
      params.set('duration_max_hours', '4')
      params.append('payment_methods[]', 'cash')
      params.append('payment_methods[]', 'card')
      params.set('has_donation', 'true')
      
      const filters = cashSessionFiltersUrl.decode(params)
      
      expect(filters.amount_min).toBe(50)
      expect(filters.amount_max).toBe(200)
      expect(filters.variance_threshold).toBe(10)
      expect(filters.variance_has_variance).toBe(true)
      expect(filters.duration_min_hours).toBe(2)
      expect(filters.duration_max_hours).toBe(4)
      expect(filters.payment_methods).toEqual(['cash', 'card'])
      expect(filters.has_donation).toBe(true)
    })

    it('devrait gérer variance_has_variance=false', () => {
      const params = new URLSearchParams()
      params.set('variance_has_variance', 'false')
      
      const filters = cashSessionFiltersUrl.decode(params)
      
      expect(filters.variance_has_variance).toBe(false)
    })

    it('devrait retourner un objet vide pour des paramètres vides', () => {
      const params = new URLSearchParams()
      const filters = cashSessionFiltersUrl.decode(params)
      
      expect(Object.keys(filters).length).toBe(0)
    })
  })

  describe('round-trip', () => {
    it('devrait encoder et décoder correctement (round-trip)', () => {
      const original: CashSessionFilters = {
        skip: 0,
        limit: 20,
        status: 'closed',
        amount_min: 50.0,
        amount_max: 200.0,
        variance_has_variance: true,
        duration_min_hours: 2.0,
        duration_max_hours: 4.0,
        payment_methods: ['cash', 'card'],
        has_donation: true
      }
      
      const encoded = cashSessionFiltersUrl.encode(original)
      const params = new URLSearchParams(encoded)
      const decoded = cashSessionFiltersUrl.decode(params)
      
      expect(decoded.skip).toBe(original.skip)
      expect(decoded.limit).toBe(original.limit)
      expect(decoded.status).toBe(original.status)
      expect(decoded.amount_min).toBe(original.amount_min)
      expect(decoded.amount_max).toBe(original.amount_max)
      expect(decoded.variance_has_variance).toBe(original.variance_has_variance)
      expect(decoded.duration_min_hours).toBe(original.duration_min_hours)
      expect(decoded.duration_max_hours).toBe(original.duration_max_hours)
      expect(decoded.payment_methods).toEqual(original.payment_methods)
      expect(decoded.has_donation).toBe(original.has_donation)
    })
  })
})

