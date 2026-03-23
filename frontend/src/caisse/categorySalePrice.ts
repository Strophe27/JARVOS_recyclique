/**
 * Prix caisse / catégories — Story 19.7 (parité 1.4.4, prix fixe import).
 * Les champs API `price` / `max_price` sont en euros (schéma CategoryResponse).
 */

/** Tolérance flottante pour considérer min = max = prix fixe unique. */
const EURO_EPS = 0.005;

export interface CategoryPriceFields {
  price?: number | null;
  max_price?: number | null;
}

/**
 * Si la catégorie impose un prix unitaire fixe (euros → centimes), le retourne ; sinon null.
 * Règle : `price` défini et (`max_price` absent ou égal à `price` à EURO_EPS près) ;
 * ou seul `max_price` défini (repli import).
 */
export function getCategoryFixedUnitPriceCents(cat: CategoryPriceFields): number | null {
  const p = cat.price;
  const m = cat.max_price;
  if (p != null && Number.isFinite(p)) {
    if (m == null || !Number.isFinite(m) || Math.abs(p - m) <= EURO_EPS) {
      return Math.round(p * 100);
    }
    return null;
  }
  if (m != null && Number.isFinite(m)) {
    return Math.round(m * 100);
  }
  return null;
}

export interface PresetPriceInput {
  preset_price: number;
  category_id: string | null;
}

/**
 * Prix unitaire en centimes pour un preset : priorité au prix fixe de la catégorie liée, sinon `preset_price`.
 */
export function resolvePresetUnitPriceCents(
  preset: PresetPriceInput,
  categories: Array<CategoryPriceFields & { id: string }>
): number {
  if (!preset.category_id) return preset.preset_price;
  const cat = categories.find((c) => c.id === preset.category_id);
  if (!cat) return preset.preset_price;
  const fixed = getCategoryFixedUnitPriceCents(cat);
  return fixed ?? preset.preset_price;
}
