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

function toNum(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCategoryStat(row: unknown): CategoryStat | null {
  if (row == null || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const name = typeof r.category_name === 'string' ? r.category_name : String(r.category_name ?? '');
  return {
    category_name: name,
    total_weight: toNum(r.total_weight),
    total_items: toNum(r.total_items),
  };
}

function normalizeCategoryStats(data: unknown): CategoryStat[] {
  if (!Array.isArray(data)) return [];
  return data.map(normalizeCategoryStat).filter((x): x is CategoryStat => x != null);
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
  const result = await safeFetch<unknown>(buildUrl('/v1/stats/reception/by-category', params));
  return result != null ? normalizeCategoryStats(result) : [];
}

export async function getSalesByCategory(
  dateFrom?: string,
  dateTo?: string,
): Promise<CategoryStat[]> {
  const params: Record<string, string> = {};
  if (dateFrom) params.start_date = dateFrom;
  if (dateTo) params.end_date = dateTo;
  const result = await safeFetch<unknown>(buildUrl('/v1/stats/sales/by-category', params));
  return result != null ? normalizeCategoryStats(result) : [];
}
