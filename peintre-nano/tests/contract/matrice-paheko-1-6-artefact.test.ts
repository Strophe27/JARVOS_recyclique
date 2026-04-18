/**
 * Story 1.6 (Piste B, doc-only) — garde-fous reproductibles sur la matrice Paheko + gaps API.
 * Vérifie structure AC → sections, classifications, §4 backlog/conséquence, §5 FR5/FR40/AR9.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../../..");
const ARTEFACT_PATH = join(
  REPO_ROOT,
  "references/artefacts/2026-04-02_06_matrice-integration-paheko-gaps-api.md",
);

describe("references/artefacts/2026-04-02_06_matrice-integration-paheko-gaps-api.md (Story 1.6)", () => {
  const text = readFileSync(ARTEFACT_PATH, "utf8");

  it("expose la traçabilité AC → sections en tête de document", () => {
    expect(text).toMatch(/Traçabilité.*Acceptance Criteria/i);
    // Ligne tableau : "| AC (Story 1.6, …) |" ou variante sans virgule
    expect(text).toMatch(/\| AC \(Story 1\.6[,)]/);
  });

  it("contient la table principale §2 avec les quatre classifications", () => {
    expect(text).toMatch(/## 2\.\s*Table principale/i);
    expect(text).toContain("API officielle");
    expect(text).toContain("Plugin minimal");
    expect(text).toContain("SQL analyse-admin");
    expect(text).toContain("Hors scope v2");
  });

  it("§4 liste gaps : colonnes conséquence produit et backlog", () => {
    expect(text).toMatch(/## 4\.\s*Gaps API/i);
    expect(text).toMatch(/Conséquence produit/i);
    expect(text).toMatch(/\|.*Backlog/i);
  });

  it("§5 garde-fous FR5, FR40, AR9 et contrôle /api/sql hors nominal mutation", () => {
    expect(text).toMatch(/## 5\.\s*Garde-fous/i);
    expect(text).toContain("FR5");
    expect(text).toContain("FR40");
    expect(text).toContain("AR9");
    expect(text).toMatch(/\/api\/sql/i);
    expect(text.toLowerCase()).toMatch(/interdiction|mutation métier/i);
  });

  it("les besoins plugin minimal incluent une rationale explicite (Notes)", () => {
    // AC : « **rationale** explicite » ou ligne Notes « **Rationale :** … »
    expect(text).toMatch(/\*\*Rationale\s*:/i);
    expect(text).toMatch(/\*\*rationale\*\*\s*explicite|Si plugin.*rationale/is);
    expect(text).toMatch(/Plugin minimal/);
  });

  it("§4 relie les gaps à un backlog ou epic (Epic 8, 6-4, etc.)", () => {
    expect(text).toMatch(/Epic 8/i);
    expect(text).toMatch(/8-2|8-3|8-5|6-4|Epic 7|Epic 10/i);
  });

  it("cite les preuves liste endpoints et brownfield (cohérence story)", () => {
    expect(text).toContain("liste-endpoints-api-paheko.md");
    expect(text).toContain("analyse-brownfield-paheko.md");
  });
});
