/**
 * Story 24.9 — construit les champs API `business_tag_*` pour POST vente / hold / finalize-held.
 */
import type { SaleCreateBody } from '../../api/sales-client';

export function buildBusinessTagPayload(
  kind: string,
  custom: string,
): Pick<SaleCreateBody, 'business_tag_kind' | 'business_tag_custom'> {
  const k = kind.trim();
  if (!k) return {};
  if (k === 'AUTRE') {
    return {
      business_tag_kind: 'AUTRE',
      business_tag_custom: custom.trim() || undefined,
    };
  }
  return { business_tag_kind: k as NonNullable<SaleCreateBody['business_tag_kind']> };
}
