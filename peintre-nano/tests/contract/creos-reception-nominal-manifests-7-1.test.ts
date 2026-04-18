/**
 * Story 7.1 — garde-fous widgets-catalog réception nominal ↔ OpenAPI (operationId).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../..");
const OPENAPI_PATH = join(REPO_ROOT, "contracts/openapi/recyclique-api.yaml");
const CATALOG_PATH = join(
  REPO_ROOT,
  "contracts/creos/manifests/widgets-catalog-reception-nominal.json",
);

type WidgetsCatalogManifest = {
  version: string;
  widgets: Array<{
    type: string;
    data_contract?: {
      operation_id?: string;
      secondary_sources?: Array<{ operation_id?: string }>;
    };
  }>;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function collectOperationIdsFromOpenApi(openapi: {
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

describe("contracts/creos/manifests — réception nominal (Story 7.1)", () => {
  const openapiRaw = readFileSync(OPENAPI_PATH, "utf8");
  const openapi = parse(openapiRaw) as {
    paths?: Record<string, Record<string, { operationId?: string }>>;
  };
  const opIds = collectOperationIdsFromOpenApi(openapi);
  const catalog = readJson<WidgetsCatalogManifest>(CATALOG_PATH);

  it("déclare recyclique_reception_* présents dans OpenAPI pour chaque widget du catalogue réception", () => {
    for (const widget of catalog.widgets) {
      const primary = widget.data_contract?.operation_id;
      expect(primary, `${widget.type} : operation_id primaire`).toBeTruthy();
      expect(opIds.has(primary!)).toBe(true);
      const secondaries = widget.data_contract?.secondary_sources ?? [];
      for (const s of secondaries) {
        const id = s.operation_id;
        expect(id, `${widget.type} : secondary_sources.operation_id défini`).toBeTruthy();
        expect(opIds.has(id!)).toBe(true);
      }
    }
  });

  it("déclare version 1 sur le catalogue réception nominal", () => {
    expect(catalog.version).toBe("1");
  });
});
