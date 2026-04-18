/**
 * Story 4.1 — garde-fous manifests CREOS bandeau live ↔ OpenAPI (operationId, slots, fichiers).
 * Pas d'E2E UI (réservé 4.6) : lecture fichiers + cohérence statique uniquement.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../..");
const OPENAPI_PATH = join(REPO_ROOT, "contracts/openapi/recyclique-api.yaml");
const NAV_PATH = join(
  REPO_ROOT,
  "contracts/creos/manifests/navigation-bandeau-live-slice.json",
);
const PAGE_PATH = join(
  REPO_ROOT,
  "contracts/creos/manifests/page-bandeau-live-sandbox.json",
);
const CATALOG_PATH = join(
  REPO_ROOT,
  "contracts/creos/manifests/widgets-catalog-bandeau-live.json",
);

type NavigationManifest = {
  version: string;
  entries: Array<{
    page_key: string;
    required_permission_keys?: string[];
    route_key?: string;
  }>;
};

type PageManifest = {
  version: string;
  page_key: string;
  required_permission_keys?: string[];
  slots: Array<{ slot_id: string; widget_type: string; widget_props?: unknown }>;
};

type WidgetsCatalogManifest = {
  version: string;
  widgets: Array<{
    type: string;
    data_contract?: {
      operation_id?: string;
      endpoint_hint?: string;
      source?: string;
    };
  }>;
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

describe("contracts/creos/manifests — bandeau live (Story 4.1)", () => {
  const openapiRaw = readFileSync(OPENAPI_PATH, "utf8");
  const openapi = parse(openapiRaw) as {
    paths?: Record<
      string,
      Record<string, { operationId?: string }>
    >;
  };
  const liveOpId =
    openapi.paths?.["/v2/exploitation/live-snapshot"]?.get?.operationId;

  const navigation = readJson<NavigationManifest>(NAV_PATH);
  const page = readJson<PageManifest>(PAGE_PATH);
  const catalog = readJson<WidgetsCatalogManifest>(CATALOG_PATH);

  it("expose recyclique_exploitation_getLiveSnapshot sur GET /v2/exploitation/live-snapshot (OpenAPI)", () => {
    expect(liveOpId).toBe("recyclique_exploitation_getLiveSnapshot");
  });

  it("aligne widgets-catalog-bandeau-live.data_contract.operation_id sur l'operationId OpenAPI", () => {
    const bandeau = catalog.widgets.find((w) => w.type === "bandeau-live");
    expect(bandeau).toBeDefined();
    expect(bandeau!.data_contract?.operation_id).toBe(liveOpId);
    expect(bandeau!.data_contract?.source).toBe("exploitation");
    expect(bandeau!.data_contract?.endpoint_hint).toMatch(
      /\/v2\/exploitation\/live-snapshot/i,
    );
  });

  it("déclare version 1 sur les trois manifests", () => {
    expect(navigation.version).toBe("1");
    expect(page.version).toBe("1");
    expect(catalog.version).toBe("1");
  });

  it("câble navigation → page sandbox (page_key et permissions)", () => {
    const entry = navigation.entries.find(
      (e) => e.page_key === "bandeau-live-sandbox",
    );
    expect(entry).toBeDefined();
    expect(entry!.page_key).toBe(page.page_key);
    expect(entry!.required_permission_keys).toEqual(
      page.required_permission_keys,
    );
  });

  it("référence bandeau-live dans un slot main et types hors demo présents au catalogue", () => {
    const catalogTypes = new Set(catalog.widgets.map((w) => w.type));
    const mainBandeau = page.slots.find(
      (s) => s.slot_id === "main" && s.widget_type === "bandeau-live",
    );
    expect(mainBandeau).toBeDefined();
    for (const slot of page.slots) {
      if (slot.widget_type.startsWith("demo.")) continue;
      expect(
        catalogTypes.has(slot.widget_type),
        `widget_type "${slot.widget_type}" (slot ${slot.slot_id}) doit être déclaré dans widgets-catalog-bandeau-live.json`,
      ).toBe(true);
    }
  });

  it("déclare des types de widgets uniques dans le catalogue bandeau live", () => {
    const types = catalog.widgets.map((w) => w.type);
    expect(new Set(types).size).toBe(types.length);
  });
});
