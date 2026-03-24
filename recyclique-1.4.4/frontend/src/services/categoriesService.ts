/**
 * Façade de compatibilité : expose `getCategories` / `getCategoryById` pour les imports historiques.
 * Source riche et client HTTP unique : `categoryService` (`axiosClient`).
 */
import categoryService, { type Category } from './categoryService'

export type { Category }

export const getCategories = (): Promise<Category[]> => categoryService.getCategories()

export const getCategoryById = (categoryId: string): Promise<Category> =>
  categoryService.getCategoryById(categoryId)
