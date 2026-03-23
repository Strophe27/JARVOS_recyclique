/**
 * Client API categories — Story 8.3.
 * GET/POST/PUT/DELETE /v1/categories, hierarchy, import/export, hard delete, restore.
 */

import { buildUrl } from './_buildUrl';

const getBase = (): string =>
  (import.meta.env?.VITE_API_BASE_URL as string) ?? '';

function getAuthHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export interface CategoryResponse {
  id: string;
  name: string;
  parent_id: string | null;
  official_name: string | null;
  is_visible_sale: boolean;
  is_visible_reception: boolean;
  display_order: number;
  display_order_entry: number;
  price: number | null;
  max_price: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryHierarchyNode extends CategoryResponse {
  children: CategoryHierarchyNode[];
}

export interface CategoryBreadcrumbItem {
  id: string;
  name: string;
}

export interface CategoryImportAnalyzeRow {
  row_index: number;
  name: string | null;
  parent_id: string | null;
  official_name: string | null;
  is_visible_sale: boolean;
  is_visible_reception: boolean;
  display_order: number;
  display_order_entry: number;
  price: number | null;
  max_price: number | null;
  valid: boolean;
  error: string | null;
}

export interface CategoryImportAnalyzeResponse {
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  rows: CategoryImportAnalyzeRow[];
}

export interface CategoryCreateBody {
  name: string;
  parent_id?: string | null;
  official_name?: string | null;
  is_visible_sale?: boolean;
  is_visible_reception?: boolean;
  display_order?: number;
  display_order_entry?: number;
  price?: number | null;
  max_price?: number | null;
}

export interface CategoryUpdateBody {
  name?: string;
  parent_id?: string | null;
  official_name?: string | null;
  is_visible_sale?: boolean;
  is_visible_reception?: boolean;
  display_order?: number;
  display_order_entry?: number;
  price?: number | null;
  max_price?: number | null;
}

export async function getCategories(
  accessToken: string,
  params?: { include_deleted?: boolean; parent_id?: string }
): Promise<CategoryResponse[]> {
  const url = buildUrl('/v1/categories');
  if (params?.include_deleted) url.searchParams.set('include_deleted', 'true');
  if (params?.parent_id) url.searchParams.set('parent_id', params.parent_id);
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CategoryResponse[]>;
}

export async function getCategoriesHierarchy(
  accessToken: string,
  includeDeleted = false
): Promise<CategoryHierarchyNode[]> {
  const url = buildUrl('/v1/categories/hierarchy');
  if (includeDeleted) url.searchParams.set('include_deleted', 'true');
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CategoryHierarchyNode[]>;
}

export async function getCategory(
  accessToken: string,
  categoryId: string,
  includeDeleted = false
): Promise<CategoryResponse> {
  const url = buildUrl(`/v1/categories/${categoryId}`);
  if (includeDeleted) url.searchParams.set('include_deleted', 'true');
  const res = await fetch(url.toString(), { headers: getAuthHeaders(accessToken) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CategoryResponse>;
}

export async function getCategoryBreadcrumb(
  accessToken: string,
  categoryId: string
): Promise<CategoryBreadcrumbItem[]> {
  const res = await fetch(`${getBase()}/v1/categories/${categoryId}/breadcrumb`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CategoryBreadcrumbItem[]>;
}

export async function getCategoryHasUsage(
  accessToken: string,
  categoryId: string
): Promise<{ has_usage: boolean }> {
  const res = await fetch(`${getBase()}/v1/categories/${categoryId}/has-usage`, {
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<{ has_usage: boolean }>;
}

export async function createCategory(
  accessToken: string,
  body: CategoryCreateBody
): Promise<CategoryResponse> {
  const res = await fetch(`${getBase()}/v1/categories`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CategoryResponse>;
}

export async function updateCategory(
  accessToken: string,
  categoryId: string,
  body: CategoryUpdateBody
): Promise<CategoryResponse> {
  const res = await fetch(`${getBase()}/v1/categories/${categoryId}`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CategoryResponse>;
}

export async function deleteCategory(
  accessToken: string,
  categoryId: string
): Promise<void> {
  const res = await fetch(`${getBase()}/v1/categories/${categoryId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
}

export async function restoreCategory(
  accessToken: string,
  categoryId: string
): Promise<CategoryResponse> {
  const res = await fetch(`${getBase()}/v1/categories/${categoryId}/restore`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CategoryResponse>;
}

export async function hardDeleteCategory(
  accessToken: string,
  categoryId: string
): Promise<void> {
  const res = await fetch(`${getBase()}/v1/categories/${categoryId}/hard`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
}

export async function getExportCsv(
  accessToken: string,
  includeDeleted = false
): Promise<Blob> {
  const url = buildUrl('/v1/categories/actions/export');
  if (includeDeleted) url.searchParams.set('include_deleted', 'true');
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.blob();
}

export async function getImportTemplate(accessToken: string): Promise<Blob> {
  const res = await fetch(`${getBase()}/v1/categories/import/template`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.blob();
}

export async function postImportAnalyze(
  accessToken: string,
  file: File
): Promise<CategoryImportAnalyzeResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getBase()}/v1/categories/import/analyze`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<CategoryImportAnalyzeResponse>;
}

export async function postImportExecute(
  accessToken: string,
  rows: CategoryImportAnalyzeRow[]
): Promise<{ created: number; errors: string[] }> {
  const res = await fetch(`${getBase()}/v1/categories/import/execute`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<{ created: number; errors: string[] }>;
}
