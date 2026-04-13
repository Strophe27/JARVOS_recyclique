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

  it("expose recyclique_sales_correctSaleSensitive sur PATCH /v1/sales/{sale_id}/corrections (Story 6.8)", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string; tags?: string[] }>
    >;
    const p = paths["/v1/sales/{sale_id}/corrections"];
    expect(p?.patch?.operationId).toBe("recyclique_sales_correctSaleSensitive");
    expect(p?.patch?.tags).toContain("sales");
  });

  it("expose recyclique_users_createUser sur POST /v1/users/", () => {
    const paths = doc.paths as Record<string, Record<string, { operationId?: string }>>;
    expect(paths["/v1/users/"]?.post?.operationId).toBe("recyclique_users_createUser");
  });

  it("expose recyclique_users_updateUser sur PUT /v1/users/{user_id}", () => {
    const paths = doc.paths as Record<string, Record<string, { operationId?: string }>>;
    expect(paths["/v1/users/{user_id}"]?.put?.operationId).toBe("recyclique_users_updateUser");
  });

  it("expose adminUsersRolePut sur PUT /v1/admin/users/{user_id}/role", () => {
    const paths = doc.paths as Record<string, Record<string, { operationId?: string }>>;
    expect(paths["/v1/admin/users/{user_id}/role"]?.put?.operationId).toBe("adminUsersRolePut");
  });

  it("expose recyclique_cashSessions_getCurrentOpenSession sur GET /v1/cash-sessions/current (Story 6.7)", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string; tags?: string[] }>
    >;
    const cur = paths["/v1/cash-sessions/current"];
    expect(cur?.get?.operationId).toBe("recyclique_cashSessions_getCurrentOpenSession");
    expect(cur?.get?.tags).toContain("cash-sessions");
  });

  it("expose recyclique_cashSessions_getSessionDetail sur GET /v1/cash-sessions/{session_id} (Story 6.8)", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string; tags?: string[] }>
    >;
    const detail = paths["/v1/cash-sessions/{session_id}"];
    expect(detail?.get?.operationId).toBe("recyclique_cashSessions_getSessionDetail");
    expect(detail?.get?.tags).toContain("cash-sessions");
  });

  it("expose recyclique_cashSessions_listSessions sur GET /v1/cash-sessions/ (session-manager)", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string; tags?: string[] }>
    >;
    const list = paths["/v1/cash-sessions/"];
    expect(list?.get?.operationId).toBe("recyclique_cashSessions_listSessions");
    expect(list?.get?.tags).toContain("cash-sessions");
  });

  it("expose recyclique_cashSessions_getSessionStatsSummary sur GET /v1/cash-sessions/stats/summary", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string; tags?: string[] }>
    >;
    const st = paths["/v1/cash-sessions/stats/summary"];
    expect(st?.get?.operationId).toBe("recyclique_cashSessions_getSessionStatsSummary");
    expect(st?.get?.tags).toContain("cash-sessions");
  });

  it("expose recyclique_sites_listSites sur GET /v1/sites/", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string; tags?: string[] }>
    >;
    const sites = paths["/v1/sites/"];
    expect(sites?.get?.operationId).toBe("recyclique_sites_listSites");
    expect(sites?.get?.tags).toContain("sites");
  });

  it("expose recyclique_cashRegisters_listCashRegisters sur GET /v1/cash-registers/", () => {
    const paths = doc.paths as Record<string, Record<string, { operationId?: string; tags?: string[] }>>;
    const p = paths["/v1/cash-registers/"];
    expect(p?.get?.operationId).toBe("recyclique_cashRegisters_listCashRegisters");
    expect(p?.get?.tags).toContain("cash-registers");
  });

  it("expose recyclique_cashRegisters_getRegistersStatus sur GET /v1/cash-registers/status", () => {
    const paths = doc.paths as Record<string, Record<string, { operationId?: string; tags?: string[] }>>;
    const p = paths["/v1/cash-registers/status"];
    expect(p?.get?.operationId).toBe("recyclique_cashRegisters_getRegistersStatus");
    expect(p?.get?.tags).toContain("cash-registers");
  });

  it("expose recyclique_sites_createSite sur POST /v1/sites/", () => {
    const paths = doc.paths as Record<string, Record<string, { operationId?: string }>>;
    expect(paths["/v1/sites/"]?.post?.operationId).toBe("recyclique_sites_createSite");
  });

  it("expose recyclique_categories_listCategories sur GET /v1/categories/", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string; tags?: string[] }>
    >;
    const cat = paths["/v1/categories/"];
    expect(cat?.get?.operationId).toBe("recyclique_categories_listCategories");
    expect(cat?.get?.tags).toContain("categories");
  });

  it("expose recyclique_categories_listForEntryTickets sur GET /v1/categories/entry-tickets", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string; tags?: string[] }>
    >;
    const p = paths["/v1/categories/entry-tickets"];
    expect(p?.get?.operationId).toBe("recyclique_categories_listForEntryTickets");
    expect(p?.get?.tags).toContain("categories");
  });

  it("expose recyclique_categories_listForSaleTickets sur GET /v1/categories/sale-tickets", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string; tags?: string[] }>
    >;
    const p = paths["/v1/categories/sale-tickets"];
    expect(p?.get?.operationId).toBe("recyclique_categories_listForSaleTickets");
    expect(p?.get?.tags).toContain("categories");
  });

  it("expose les mutations catégories reviewables (contrat admin / parité observable)", () => {
    const paths = doc.paths as Record<string, Record<string, { operationId?: string; tags?: string[] }>>;
    expect(paths["/v1/categories/"]?.post?.operationId).toBe("recyclique_categories_createCategory");
    expect(paths["/v1/categories/hierarchy"]?.get?.operationId).toBe("recyclique_categories_getHierarchy");
    expect(paths["/v1/categories/{category_id}"]?.get?.operationId).toBe("recyclique_categories_getCategoryById");
    expect(paths["/v1/categories/{category_id}"]?.put?.operationId).toBe("recyclique_categories_updateCategory");
    expect(paths["/v1/categories/{category_id}"]?.delete?.operationId).toBe(
      "recyclique_categories_softDeleteCategory",
    );
    expect(paths["/v1/categories/{category_id}/restore"]?.post?.operationId).toBe(
      "recyclique_categories_restoreCategory",
    );
    expect(paths["/v1/categories/{category_id}/visibility"]?.put?.operationId).toBe(
      "recyclique_categories_updateCategoryVisibility",
    );
    expect(paths["/v1/categories/{category_id}/display-order"]?.put?.operationId).toBe(
      "recyclique_categories_updateCategoryDisplayOrder",
    );
    expect(paths["/v1/categories/{category_id}/display-order-entry"]?.put?.operationId).toBe(
      "recyclique_categories_updateCategoryDisplayOrderEntry",
    );
    expect(paths["/v1/categories/"]?.post?.tags).toContain("categories");
    expect(paths["/v1/categories/hierarchy"]?.get?.tags).toContain("categories");
    expect(paths["/v1/categories/{category_id}"]?.get?.tags).toContain("categories");
    expect(paths["/v1/categories/{category_id}"]?.put?.tags).toContain("categories");
    expect(paths["/v1/categories/{category_id}"]?.delete?.tags).toContain("categories");
    expect(paths["/v1/categories/{category_id}/restore"]?.post?.tags).toContain("categories");
    expect(paths["/v1/categories/{category_id}/visibility"]?.put?.tags).toContain("categories");
    expect(paths["/v1/categories/{category_id}/display-order"]?.put?.tags).toContain("categories");
    expect(paths["/v1/categories/{category_id}/display-order-entry"]?.put?.tags).toContain(
      "categories",
    );
  });

  it("expose import/export catégories et helpers hiérarchie (parité backend recyclique)", () => {
    const paths = doc.paths as Record<string, Record<string, { operationId?: string; tags?: string[] }>>;
    expect(paths["/v1/categories/actions/export"]?.get?.operationId).toBe(
      "recyclique_categories_exportCategories",
    );
    expect(paths["/v1/categories/actions/export"]?.get?.tags).toContain("categories");
    expect(paths["/v1/categories/import/template"]?.get?.operationId).toBe(
      "recyclique_categories_downloadCategoriesImportTemplate",
    );
    expect(paths["/v1/categories/import/analyze"]?.post?.operationId).toBe(
      "recyclique_categories_analyzeCategoriesImport",
    );
    expect(paths["/v1/categories/import/execute"]?.post?.operationId).toBe(
      "recyclique_categories_executeCategoriesImport",
    );
    expect(paths["/v1/categories/{category_id}/hard"]?.delete?.operationId).toBe(
      "recyclique_categories_hardDeleteCategory",
    );
    expect(paths["/v1/categories/{category_id}/has-usage"]?.get?.operationId).toBe(
      "recyclique_categories_getCategoryUsage",
    );
    expect(paths["/v1/categories/{category_id}/children"]?.get?.operationId).toBe(
      "recyclique_categories_listCategoryChildren",
    );
    expect(paths["/v1/categories/{category_id}/parent"]?.get?.operationId).toBe(
      "recyclique_categories_getCategoryParent",
    );
    expect(paths["/v1/categories/{category_id}/breadcrumb"]?.get?.operationId).toBe(
      "recyclique_categories_getCategoryBreadcrumb",
    );
  });

  it("expose recyclique_admin_reports_cashSessionsDownloadBySession sur GET …/by-session/{session_id}", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string; tags?: string[] }>
    >;
    const dl = paths["/v1/admin/reports/cash-sessions/by-session/{session_id}"];
    expect(dl?.get?.operationId).toBe("recyclique_admin_reports_cashSessionsDownloadBySession");
    expect(dl?.get?.tags).toContain("admin");
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

  it("expose la famille admin health + sessions/metrics (parité legacy / observabilité)", () => {
    const paths = doc.paths as Record<
      string,
      Record<string, { operationId?: string; tags?: string[] }>
    >;
    expect(paths["/v1/admin/health-test"]?.get?.operationId).toBe("adminHealthTestEndpointGet");
    expect(paths["/v1/admin/health/public"]?.get?.operationId).toBe("adminHealthPublicGet");
    expect(paths["/v1/admin/health/database"]?.get?.operationId).toBe("adminHealthDatabaseGet");
    expect(paths["/v1/admin/health"]?.get?.operationId).toBe("adminHealthSystemGet");
    expect(paths["/v1/admin/health/anomalies"]?.get?.operationId).toBe("adminHealthAnomaliesGet");
    expect(paths["/v1/admin/health/scheduler"]?.get?.operationId).toBe("adminHealthSchedulerGet");
    expect(paths["/v1/admin/health/test-notifications"]?.post?.operationId).toBe(
      "adminHealthTestNotificationsPost",
    );
    expect(paths["/v1/admin/sessions/metrics"]?.get?.operationId).toBe("adminSessionsMetricsGet");
    expect(paths["/v1/admin/health"]?.get?.tags).toEqual(expect.arrayContaining(["admin", "observability"]));
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

  it("expose les routes catégories import/export (export PDF/XLS/CSV, template, analyze, execute)", () => {
    const paths = doc.paths as Record<string, Record<string, { operationId?: string }>>;
    expect(paths["/v1/categories/actions/export"]?.get?.operationId).toBe(
      "recyclique_categories_exportCategories",
    );
    expect(paths["/v1/categories/import/template"]?.get?.operationId).toBe(
      "recyclique_categories_downloadCategoriesImportTemplate",
    );
    expect(paths["/v1/categories/import/analyze"]?.post?.operationId).toBe(
      "recyclique_categories_analyzeCategoriesImport",
    );
    expect(paths["/v1/categories/import/execute"]?.post?.operationId).toBe(
      "recyclique_categories_executeCategoriesImport",
    );
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
