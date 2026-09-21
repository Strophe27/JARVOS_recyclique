/**
 * Story 10.3 — collecte OpenAPI + parcours manifests pour crosswalk `operation_id` ↔ `operationId`.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

export const OPENAPI_REVIEWABLE_REL = 'contracts/openapi/recyclique-api.yaml';

export type CollectedManifestOperationId = {
  operationId: string;
  jsonPath: string;
  widgetType?: string;
  pageKey?: string;
};

export function collectOperationIdsFromOpenApi(openapi: {
  paths?: Record<string, Record<string, { operationId?: string }>>;
}): Set<string> {
  const ids = new Set<string>();
  const paths = openapi.paths ?? {};
  for (const methods of Object.values(paths)) {
    for (const op of Object.values(methods)) {
      if (op?.operationId) ids.add(op.operationId);
    }
  }
  return ids;
}

export function loadOpenApiOperationIdSet(yamlPath: string): Set<string> {
  const raw = readFileSync(yamlPath, 'utf8');
  const openapi = parse(raw) as {
    paths?: Record<string, Record<string, { operationId?: string }>>;
  };
  return collectOperationIdsFromOpenApi(openapi);
}

/**
 * Parcourt l’arbre JSON et collecte uniquement les propriétés nommées `operation_id` (FM7).
 */
export function collectOperationIdsFromJsonTree(
  value: unknown,
  ctx: { jsonPath?: string; widgetType?: string; pageKey?: string } = {},
  out: CollectedManifestOperationId[] = [],
): CollectedManifestOperationId[] {
  if (value === null || typeof value !== 'object') return out;

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectOperationIdsFromJsonTree(item, {
        ...ctx,
        jsonPath: `${ctx.jsonPath ?? ''}[${index}]`,
      }, out);
    });
    return out;
  }

  const obj = value as Record<string, unknown>;
  if (typeof obj.page_key === 'string') {
    ctx = { ...ctx, pageKey: obj.page_key };
  }
  if (typeof obj.type === 'string' && typeof obj.component === 'string') {
    ctx = { ...ctx, widgetType: obj.type };
  }

  for (const [key, child] of Object.entries(obj)) {
    const childPath = ctx.jsonPath ? `${ctx.jsonPath}.${key}` : key;
    if (key === 'operation_id' && typeof child === 'string') {
      out.push({
        operationId: child,
        jsonPath: childPath,
        widgetType: ctx.widgetType,
        pageKey: ctx.pageKey,
      });
    } else {
      collectOperationIdsFromJsonTree(child, { ...ctx, jsonPath: childPath }, out);
    }
  }
  return out;
}

export function formatManifestOperationIdContext(
  fileLabel: string,
  entry: CollectedManifestOperationId,
): string {
  const parts = [fileLabel, entry.jsonPath];
  if (entry.widgetType) parts.push(`widget.type=${entry.widgetType}`);
  if (entry.pageKey) parts.push(`page_key=${entry.pageKey}`);
  return parts.join(' · ');
}
