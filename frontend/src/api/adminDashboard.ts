/**
 * Story 11.4 / Artefact 10 §7.1 — GET /v1/admin/dashboard/stats (optionnel).
 * Si l'API n'existe pas encore (404), retourne null.
 */

const getBase = (): string =>
  (import.meta.env?.VITE_API_BASE_URL as string) ?? '';

function getAuthHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

export interface DashboardStats {
  users_count?: number;
  sites_count?: number;
  cash_registers_count?: number;
  open_sessions_count?: number;
  pending_users_count?: number;
  ca_jour?: number;
  dons_jour?: number;
  poids_sorti_kg?: number;
  poids_recu_kg?: number;
  ca_mois?: number;
  notifications_count?: number;
  connected_users_count?: number;
  [key: string]: unknown;
}

/** GET /v1/admin/dashboard/stats — stats agrégées. Retourne null si endpoint absent (404). */
export async function getDashboardStats(
  accessToken: string
): Promise<DashboardStats | null> {
  const res = await fetch(`${getBase()}/v1/admin/dashboard/stats`, {
    headers: getAuthHeaders(accessToken),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const msg = typeof data?.detail === 'string' ? data.detail : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<DashboardStats>;
}
