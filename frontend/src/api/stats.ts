/**
 * API client pour les endpoints stats du dashboard principal.
 * Chaque appel gere gracieusement le 404 (endpoint non implemente).
 */
import { buildUrl } from './_buildUrl';

export interface CashSessionStats {
  total_sales: number;
  total_donations: number;
  total_weight_sold: number;
  [key: string]: unknown;
}

export interface ReceptionSummary {
  total_weight: number;
  total_items: number;
  [key: string]: unknown;
}

export interface CategoryStat {
  category_name: string;
  total_weight: number;
  total_items: number;
}

async function safeFetch<T>(url: URL): Promise<T | null> {
  try {
    const res = await fetch(url.toString(), { credentials: 'include' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getCashSessionStats(
  dateFrom?: string,
  dateTo?: string,
): Promise<CashSessionStats | null> {
  const params: Record<string, string> = {};
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  return safeFetch<CashSessionStats>(buildUrl('/v1/cash-sessions/stats/summary', params));
}

export async function getReceptionSummary(
  dateFrom?: string,
  dateTo?: string,
): Promise<ReceptionSummary | null> {
  const params: Record<string, string> = {};
  if (dateFrom) params.start_date = dateFrom;
  if (dateTo) params.end_date = dateTo;
  return safeFetch<ReceptionSummary>(buildUrl('/v1/stats/reception/summary', params));
}

export async function getReceptionByCategory(
  dateFrom?: string,
  dateTo?: string,
): Promise<CategoryStat[]> {
  const params: Record<string, string> = {};
  if (dateFrom) params.start_date = dateFrom;
  if (dateTo) params.end_date = dateTo;
  const result = await safeFetch<CategoryStat[]>(buildUrl('/v1/stats/reception/by-category', params));
  return result ?? [];
}

export async function getSalesByCategory(
  dateFrom?: string,
  dateTo?: string,
): Promise<CategoryStat[]> {
  const params: Record<string, string> = {};
  if (dateFrom) params.start_date = dateFrom;
  if (dateTo) params.end_date = dateTo;
  const result = await safeFetch<CategoryStat[]>(buildUrl('/v1/stats/sales/by-category', params));
  return result ?? [];
}
