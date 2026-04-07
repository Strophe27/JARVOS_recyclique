/**
 * Story 1.4 (Piste B) — garde-fou minimal sur le contrat OpenAPI reviewable.
 * Valide structure, operationId stables uniques et point d'ancrage illustratif documenté.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../..");
const OPENAPI_PATH = join(
  REPO_ROOT,
  "contracts/openapi/recyclique-api.yaml",
);
const WIDGET_SCHEMA_PATH = join(
  REPO_ROOT,
  "contracts/creos/schemas/widget-declaration.schema.json",
);

function collectOperationIds(
  paths: Record<string, Record<string, { operationId?: string }>>,
): string[] {
  const ids: string[] = [];
  for (const item of Object.values(paths)) {
    for (const op of Object.values(item)) {
      if (op && typeof op.operationId === "string") {
        ids.push(op.operationId);
      }
    }
  }
  return ids;
}

describe("contracts/openapi/recyclique-api.yaml (gouvernance 1.4)", () => {
  const raw = readFileSync(OPENAPI_PATH, "utf8");
  const doc = parse(raw) as Record<string, unknown>;

  it("est OpenAPI 3.1 avec métadonnées draft cohérentes", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.info).toBeDefined();
    const info = doc.info as { title?: string; version?: string };
    expect(info.title).toBe("Recyclique API v2");
    expect(typeof info.version).toBe("string");
    expect(info.version!.length).toBeGreaterThan(0);
  });

  it("expose l'operationId illustratif recyclique_contractGovernance_ping (Story 1.4)", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string; tags?: string[] }>
    >;
    expect(paths).toBeDefined();
    const ping = paths["/v2/_contract-governance/ping"];
    expect(ping?.get?.operationId).toBe("recyclique_contractGovernance_ping");
    expect(ping?.get?.tags).toContain("governance");
  });

  it("expose recyclique_exploitation_getLiveSnapshot sur /v2/exploitation/live-snapshot (Stories 1.4 / 1.7)", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string; tags?: string[] }>
    >;
    const live = paths["/v2/exploitation/live-snapshot"];
    expect(live?.get?.operationId).toBe("recyclique_exploitation_getLiveSnapshot");
    expect(live?.get?.tags).toContain("exploitation");
  });

  it("déclare une réponse 503 sur live-snapshot (source externe indisponible, Story 1.7)", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { responses?: Record<string, unknown> }>
    >;
    const live = paths["/v2/exploitation/live-snapshot"];
    expect(live?.get?.responses?.["503"]).toBeDefined();
  });

  it("n'a pas de doublons d'operationId sur les opérations déclarées", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string }>
    >;
    const ids = collectOperationIds(paths ?? {});
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("définit SyncStateCore aligné FR24 / Story 1.5 (enum stable)", () => {
    const components = doc.components as {
      schemas?: Record<string, { enum?: string[] }>;
    };
    const sync = components.schemas?.SyncStateCore;
    expect(sync?.enum).toEqual([
      "a_reessayer",
      "en_quarantaine",
      "resolu",
      "rejete",
    ]);
  });

  it("définit ExploitationLiveSnapshot avec clés bandeau live (Story 1.7)", () => {
    const components = doc.components as {
      schemas?: Record<
        string,
        { type?: string; properties?: Record<string, unknown>; additionalProperties?: boolean }
      >;
    };
    const snap = components.schemas?.ExploitationLiveSnapshot;
    expect(snap?.type).toBe("object");
    expect(snap?.additionalProperties).toBe(false);
    const props = Object.keys(snap?.properties ?? {});
    expect(props).toEqual(
      expect.arrayContaining([
        "daily_kpis_aggregate",
        "context",
        "effective_open_state",
        "cash_session_effectiveness",
        "sync_operational_summary",
        "observed_at",
      ]),
    );
  });

  it("référence ExploitationContextIds depuis ExploitationLiveSnapshot.context", () => {
    const components = doc.components as {
      schemas?: Record<
        string,
        {
          properties?: Record<
            string,
            { $ref?: string; type?: string; nullable?: boolean }
          >;
        }
      >;
    };
    const snap = components.schemas?.ExploitationLiveSnapshot;
    expect(snap?.properties?.context?.$ref).toBe(
      "#/components/schemas/ExploitationContextIds",
    );
    const ctx = components.schemas?.ExploitationContextIds;
    expect(ctx?.properties?.site_id).toBeDefined();
    expect(ctx?.properties?.cash_register_id).toBeDefined();
  });

  it("définit ContextEnvelope.presentation_labels (Story 5.5, présentation additive)", () => {
    const components = doc.components as {
      schemas?: Record<
        string,
        { properties?: Record<string, { type?: string; nullable?: boolean; additionalProperties?: unknown }> }
      >;
    };
    const ce = components.schemas?.ContextEnvelope;
    const pl = ce?.properties?.presentation_labels;
    expect(pl).toBeDefined();
    expect(pl?.type).toBe("object");
    expect(pl?.nullable).toBe(true);
    expect(pl?.additionalProperties).toEqual({ type: "string" });
  });

  it("définit ContextEnvelope.restriction_message nullable (Story 5.5, diagnostic UI non normatif)", () => {
    const components = doc.components as {
      schemas?: Record<
        string,
        { properties?: Record<string, { type?: string; nullable?: boolean }> }
      >;
    };
    const ce = components.schemas?.ContextEnvelope;
    const rm = ce?.properties?.restriction_message;
    expect(rm).toBeDefined();
    expect(rm?.type).toBe("string");
    expect(rm?.nullable).toBe(true);
  });
});

describe("contracts/creos/schemas/widget-declaration.schema.json", () => {
  it("parse en JSON et référence data_contract.operation_id (CREOS / 1.4)", () => {
    const raw = readFileSync(WIDGET_SCHEMA_PATH, "utf8");
    const schema = JSON.parse(raw) as {
      properties?: {
        data_contract?: { properties?: { operation_id?: { description?: string } } };
      };
    };
    expect(schema.properties?.data_contract?.properties?.operation_id).toBeDefined();
    const desc =
      schema.properties!.data_contract!.properties!.operation_id!.description ?? "";
    expect(desc.toLowerCase()).toContain("operationid");
  });
});
