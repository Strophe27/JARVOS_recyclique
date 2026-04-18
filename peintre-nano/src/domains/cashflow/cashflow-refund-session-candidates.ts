/**
 * Extraction et filtrage client des lignes vente renvoyées par
 * {@link getCashSessionDetail} (OpenAPI `CashSessionDetailResponse`, champ `sales`).
 * Aucune route HTTP inventée : filtrage purement local après chargement session.
 */

export type RefundSaleCandidateRow = {
  readonly id: string;
  readonly total_amount: number;
  readonly lifecycle_status: string;
  readonly created_at: string | null;
  readonly note: string | null;
  readonly adherent_reference: string | null;
  readonly payment_method: string | null;
};

function numOrZero(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

/**
 * Parse défensif des entrées `sales[]` du détail session (schéma variable selon agrégats admin).
 */
export function parseRefundSaleCandidatesFromSessionDetail(
  sales: ReadonlyArray<Record<string, unknown>> | undefined,
): RefundSaleCandidateRow[] {
  if (!Array.isArray(sales) || sales.length === 0) return [];
  const out: RefundSaleCandidateRow[] = [];
  for (const row of sales) {
    if (!row || typeof row !== 'object') continue;
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    if (!id) continue;
    const lifecycle =
      typeof row.lifecycle_status === 'string' && row.lifecycle_status.trim()
        ? row.lifecycle_status.trim()
        : 'completed';
    out.push({
      id,
      total_amount: numOrZero(row.total_amount),
      lifecycle_status: lifecycle,
      created_at: strOrNull(row.created_at) ?? strOrNull(row.sale_date),
      note: strOrNull(row.note),
      adherent_reference: strOrNull(row.adherent_reference),
      payment_method: strOrNull(row.payment_method),
    });
  }
  return out;
}

/**
 * Filtre local (préfixe UUID, note, référence adhérent, montant affiché).
 * `query` est typiquement issu d’un champ avec debounce côté UI.
 */
export function filterRefundSaleCandidates(
  rows: readonly RefundSaleCandidateRow[],
  query: string,
): RefundSaleCandidateRow[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return [...rows];
  const qNoDash = raw.replace(/-/g, '');
  return rows.filter((r) => {
    const idLc = r.id.toLowerCase();
    const idNoDash = idLc.replace(/-/g, '');
    if (idLc.includes(raw) || (qNoDash.length >= 4 && idNoDash.includes(qNoDash))) return true;
    const note = (r.note ?? '').toLowerCase();
    if (note.includes(raw)) return true;
    const adh = (r.adherent_reference ?? '').toLowerCase();
    if (adh.includes(raw)) return true;
    const tot = r.total_amount.toFixed(2);
    if (tot.includes(raw) || tot.replace('.', ',').includes(raw)) return true;
    const st = r.lifecycle_status.toLowerCase();
    if (st.includes(raw)) return true;
    return false;
  });
}
