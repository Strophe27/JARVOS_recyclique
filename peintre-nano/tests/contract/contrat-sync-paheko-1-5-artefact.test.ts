/**
 * Story 1.5 (Piste B, doc-only) — garde-fous reproductibles sur l'artefact pivot sync/réconciliation.
 * N'exige pas correlation_id dans OpenAPI tant que les schémas d'erreur HTTP ne sont pas livrés (évite faux positif).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../..");
const ARTEFACT_PATH = join(
  REPO_ROOT,
  "references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md",
);

describe("references/artefacts/2026-04-02_05_contrat-minimal-sync-reconciliation-paheko.md (Story 1.5)", () => {
  const text = readFileSync(ARTEFACT_PATH, "utf8");

  it("expose la traçabilité AC → sections en tête de document", () => {
    expect(text).toMatch(/Traçabilité.*Acceptance Criteria/i);
    expect(text).toMatch(/\|.*Bloc Given/i);
  });

  it("couvre cycle de vie, outbox, corrélation et alignement contractuel", () => {
    expect(text).toMatch(/## 2\.\s*Cycle de vie/i);
    expect(text.toLowerCase()).toContain("outbox");
    expect(text).toContain("X-Correlation-ID");
    expect(text).toContain("correlation_id");
    expect(text).toContain("a_reessayer");
    expect(text).toContain("en_quarantaine");
    expect(text).toContain("AR39");
  });

  it("cite FR23, FR25, réconciliation et renvoi Story 1.6 (gaps Paheko)", () => {
    expect(text).toContain("FR23");
    expect(text).toContain("FR25");
    expect(text).toMatch(/réconciliation|reconciliation/i);
    expect(text).toMatch(/1\.6|Story \*\*1\.6\*\*/);
  });

  it("inclut audit minimal et grille HITL (§10)", () => {
    expect(text).toMatch(/audit minimal|piste d'audit/i);
    expect(text).toMatch(/## 10\.|Validation humaine/i);
    expect(text).toMatch(/HITL|relecture/i);
  });
});
