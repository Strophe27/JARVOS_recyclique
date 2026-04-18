/**
 * Normalisation snake_case → camelCase sur les clés d'objets JSON (contrats CREOS / commanditaire).
 */

function snakeSegmentToCamel(segment: string): string {
  if (!segment) return segment;
  return segment.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Convertit une clé JSON snake_case en camelCase (ex. route_key → routeKey). */
export function snakeToCamelKey(key: string): string {
  return snakeSegmentToCamel(key);
}

export function deepMapKeysToCamelCase(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => deepMapKeysToCamelCase(item));
  }
  if (value !== null && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[snakeToCamelKey(k)] = deepMapKeysToCamelCase(v);
    }
    return out;
  }
  return value;
}
