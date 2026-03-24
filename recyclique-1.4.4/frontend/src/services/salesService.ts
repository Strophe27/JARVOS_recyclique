import axiosClient from '../api/axiosClient'

export interface SaleItem {
  id: string
  sale_id: string
  category: string
  quantity: number
  weight: number
  unit_price: number
  total_price: number
  // Story 1.1.2: Champs ajoutés pour preset et notes par item
  preset_id?: string | null
  notes?: string | null
}

// Story B52-P1: Paiement individuel
export interface Payment {
  id: string
  sale_id: string
  payment_method: string
  amount: number
  created_at: string
}

export interface SaleDetail {
  id: string
  cash_session_id: string
  total_amount: number
  donation?: number
  payment_method?: string  // Déprécié - utiliser payments
  payments?: Payment[]  // Story B52-P1: Liste de paiements multiples
  created_at: string
  operator_id?: string
  note?: string  // Story B40-P4: Notes sur les tickets
  // Story 1.1.2: notes et preset_id déplacés vers sale_items (par item individuel)
  items: SaleItem[]
}

/**
 * Service pour récupérer les détails d'une vente avec ses articles
 */
export const getSaleDetail = async (saleId: string): Promise<SaleDetail> => {
  try {
    const response = await axiosClient.get(`/v1/sales/${saleId}`)
    return response.data
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de la vente:', error)
    throw error
  }
}

/**
 * Service pour mettre à jour la note d'une vente (admin seulement)
 */
export const updateSaleNote = async (saleId: string, note: string): Promise<SaleDetail> => {
  try {
    const response = await axiosClient.put(`/v1/sales/${saleId}`, { note })
    return response.data
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la note:', error)
    throw error
  }
}

/**
 * Service pour modifier le poids d'un item de vente (admin seulement)
 * Story B52-P2
 */
export const updateSaleItemWeight = async (saleId: string, itemId: string, weight: number): Promise<SaleItem> => {
  try {
    const response = await axiosClient.patch(`/v1/sales/${saleId}/items/${itemId}/weight`, { weight })
    return response.data
  } catch (error) {
    console.error('Erreur lors de la mise à jour du poids:', error)
    throw error
  }
}