import api from './api';

export interface Category {
  id: string;
  name: string;  // Story B48-P5: Nom court/rapide (toujours utilisé pour l'affichage)
  official_name?: string | null;  // Story B48-P5: Nom complet officiel (optionnel, pour tooltips)
  is_active: boolean;
  parent_id?: string | null;
  price?: number | null;
  max_price?: number | null;
  display_order: number;
  display_order_entry: number;  // Story B48-P4: Ordre d'affichage pour ENTRY/DEPOT
  is_visible: boolean;
  shortcut_key?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null; // Story B48-P1: Soft delete timestamp
}

export interface CategoryCreate {
  name: string;  // Story B48-P5: Nom court/rapide (obligatoire)
  official_name?: string | null;  // Story B48-P5: Nom complet officiel (optionnel)
  parent_id?: string | null;
  price?: number | null;
  max_price?: number | null;
  display_order?: number;
  is_visible?: boolean;
  shortcut_key?: string | null;
}

export interface CategoryUpdate {
  name?: string;  // Story B48-P5: Nom court/rapide
  official_name?: string | null;  // Story B48-P5: Nom complet officiel (optionnel)
  is_active?: boolean;
  parent_id?: string | null;
  price?: number | null;
  max_price?: number | null;
  display_order?: number;
  is_visible?: boolean;
  shortcut_key?: string | null;
}

/**
 * Service for managing product categories
 */
class CategoryService {
  /**
   * Get all categories
   * @param isActive - Optional filter by active status
   * @param includeArchived - Story B48-P1: Include archived categories (deleted_at IS NOT NULL)
   */
  async getCategories(isActive?: boolean, includeArchived?: boolean): Promise<Category[]> {
    const params: any = {};
    if (isActive !== undefined) params.is_active = isActive;
    if (includeArchived !== undefined) params.include_archived = includeArchived;
    const response = await api.get('/v1/categories/', { params });
    return response.data;
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(id: string): Promise<Category> {
    const response = await api.get(`/v1/categories/${id}`);
    return response.data;
  }

  /**
   * Create a new category
   */
  async createCategory(data: CategoryCreate): Promise<Category> {
    const response = await api.post('/v1/categories/', data);
    return response.data;
  }

  /**
   * Update an existing category
   */
  async updateCategory(id: string, data: CategoryUpdate): Promise<Category> {
    const response = await api.put(`/v1/categories/${id}`, data);
    return response.data;
  }

  /**
   * Soft delete a category (sets is_active to false)
   */
  async deleteCategory(id: string): Promise<Category> {
    const response = await api.delete(`/v1/categories/${id}`);
    return response.data;
  }

  /**
   * Hard delete category (permanent, only if no children)
   */
  async hardDeleteCategory(id: string): Promise<void> {
    await api.delete(`/v1/categories/${id}/hard`);
  }

  /**
   * Reactivate a category (sets is_active to true)
   */
  async reactivateCategory(id: string): Promise<Category> {
    return this.updateCategory(id, { is_active: true });
  }

  /**
   * Story B48-P1: Restore a soft-deleted category (sets deleted_at to null)
   */
  async restoreCategory(id: string): Promise<Category> {
    const response = await api.post(`/v1/categories/${id}/restore`);
    return response.data;
  }

  /**
   * Get direct children of a category
   */
  async getCategoryChildren(id: string): Promise<Category[]> {
    const response = await api.get(`/v1/categories/${id}/children`);
    return response.data;
  }

  /**
   * Check if a category has any usage (transactions, preset buttons, children)
   * Returns true if category can be safely hard-deleted (no usage)
   */
  async checkCategoryUsage(id: string): Promise<{ has_usage: boolean; can_hard_delete: boolean }> {
    const response = await api.get(`/v1/categories/${id}/has-usage`);
    return response.data;
  }

  /**
   * Export categories to PDF format
   * Downloads a PDF file with all categories
   */
  async exportToPdf(): Promise<void> {
    const response = await api.get('/v1/categories/actions/export', {
      params: { format: 'pdf' },
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `categories_export_${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Export categories to Excel format
   * Downloads an Excel file with all categories
   */
  async exportToExcel(): Promise<void> {
    const response = await api.get('/v1/categories/actions/export', {
      params: { format: 'xls' },
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `categories_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Export categories to CSV format (re-importable)
   */
  async exportToCsv(): Promise<void> {
    const response = await api.get('/v1/categories/actions/export', {
      params: { format: 'csv' },
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `categories_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Download CSV template for categories import
   */
  async downloadImportTemplate(): Promise<void> {
    const response = await api.get('/v1/categories/import/template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'categories_import_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Analyze CSV file for categories import
   */
  async importAnalyze(file: File): Promise<{ session_id: string | null; summary: any; sample: any[]; errors: string[]; }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/v1/categories/import/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  /**
   * Execute categories import from analyzed session
   */
  async importExecute(sessionId: string, deleteExisting: boolean = false): Promise<{ imported: number; updated: number; errors: string[]; }> {
    const response = await api.post('/v1/categories/import/execute', { 
      session_id: sessionId,
      delete_existing: deleteExisting
    });
    return response.data;
  }

  /**
   * Update category visibility for ENTRY tickets
   */
  async updateCategoryVisibility(id: string, isVisible: boolean): Promise<Category> {
    const response = await api.put(`/v1/categories/${id}/visibility`, { is_visible: isVisible });
    return response.data;
  }

  /**
   * Update category display order
   */
  async updateDisplayOrder(id: string, displayOrder: number): Promise<Category> {
    const response = await api.put(`/v1/categories/${id}/display-order`, { display_order: displayOrder });
    return response.data;
  }

  /**
   * Story B48-P4: Update category display order for ENTRY/DEPOT
   */
  async updateDisplayOrderEntry(id: string, displayOrderEntry: number): Promise<Category> {
    const response = await api.put(`/v1/categories/${id}/display-order-entry`, { display_order_entry: displayOrderEntry });
    return response.data;
  }

  /**
   * Get categories for ENTRY tickets (respects visibility settings)
   */
  async getCategoriesForEntryTickets(isActive?: boolean): Promise<Category[]> {
    const params = isActive !== undefined ? { is_active: isActive } : {};
    const response = await api.get('/v1/categories/entry-tickets', { params });
    return response.data;
  }

  /**
   * Get categories for SALE tickets (always shows all categories)
   */
  async getCategoriesForSaleTickets(isActive?: boolean): Promise<Category[]> {
    const params = isActive !== undefined ? { is_active: isActive } : {};
    const response = await api.get('/v1/categories/sale-tickets', { params });
    return response.data;
  }
}

export const categoryService = new CategoryService();
export default categoryService;
