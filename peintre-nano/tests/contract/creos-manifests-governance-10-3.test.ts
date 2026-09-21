/**
 * Story 10.3 — gate globale manifests CREOS reviewables (structure, schéma widget, bundle servi, crosswalk OpenAPI).
 */
import Ajv2020 from 'ajv/dist/2020.js';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runtimeServedManifestLoadResult } from '../../src/app/demo/runtime-demo-manifest';
import {
  collectOperationIdsFromJsonTree,
  formatManifestOperationIdContext,
  loadOpenApiOperationIdSet,
  OPENAPI_REVIEWABLE_REL,
} from './lib/creos-openapi-operation-ids';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const MANIFESTS_DIR = join(REPO_ROOT, 'contracts/creos/manifests');
const WIDGET_SCHEMA_PATH = join(REPO_ROOT, 'contracts/creos/schemas/widget-declaration.schema.json');
const OPENAPI_PATH = join(REPO_ROOT, 'contracts/openapi/recyclique-api.yaml');

const DEMO_SANDBOX_FILES = new Set([
  'page-demo-home.json',
  'page-demo-guarded-page.json',
  'page-demo-unknown-widget.json',
]);

function listManifestJsonFiles(): string[] {
  return readdirSync(MANIFESTS_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => join(MANIFESTS_DIR, name))
    .sort();
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

function manifestHasDataContractNode(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((item) => manifestHasDataContractNode(item));
  const obj = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(obj, 'data_contract')) return true;
  return Object.values(obj).some((child) => manifestHasDataContractNode(child));
}

function shouldApplyOpenApiCrosswalk(fileName: string, parsed: unknown): boolean {
  if (!DEMO_SANDBOX_FILES.has(fileName)) return true;
  return manifestHasDataContractNode(parsed);
}

const widgetSchema = JSON.parse(readFileSync(WIDGET_SCHEMA_PATH, 'utf8')) as object;
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateWidgetDeclaration = ajv.compile(widgetSchema);

describe('contracts/creos/manifests — gouvernance globale (Story 10.3)', () => {
  const openApiIds = loadOpenApiOperationIdSet(OPENAPI_PATH);
  const manifestPaths = listManifestJsonFiles();

  it('parse tous les JSON reviewables et applique les conventions minimales (AC1a)', () => {
    for (const path of manifestPaths) {
      const fileName = basename(path);
      const parsed = readJsonFile(path);
      expect(parsed, `${fileName} : JSON invalide`).toBeTruthy();
      if (fileName.startsWith('widgets-catalog-')) {
        const catalog = parsed as { version?: string };
        expect(catalog.version, `${fileName} : version catalogue`).toBeTruthy();
      }
    }
  });

  it('valide chaque entrée widgets[] des catalogues contre widget-declaration.schema.json (AC1b)', () => {
    for (const path of manifestPaths) {
      const fileName = basename(path);
      if (!fileName.startsWith('widgets-catalog-')) continue;
      const catalog = readJsonFile(path) as { widgets?: unknown[] };
      expect(Array.isArray(catalog.widgets), `${fileName} : widgets[]`).toBe(true);
      for (const [index, widget] of (catalog.widgets ?? []).entries()) {
        const valid = validateWidgetDeclaration(widget);
        expect(
          valid,
          `${fileName} widgets[${index}] : ${ajv.errorsText(validateWidgetDeclaration.errors)}`,
        ).toBe(true);
      }
    }
  });

  it('charge le lot servi produit sans erreur de validation bundle (AC1c)', () => {
    expect(runtimeServedManifestLoadResult.ok, JSON.stringify(runtimeServedManifestLoadResult)).toBe(true);
  });

  it('aligne chaque operation_id reviewable sur un operationId OpenAPI (AC2)', () => {
    for (const path of manifestPaths) {
      const fileName = basename(path);
      const parsed = readJsonFile(path);
      if (!shouldApplyOpenApiCrosswalk(fileName, parsed)) continue;

      const collected = collectOperationIdsFromJsonTree(parsed);
      for (const entry of collected) {
        expect(
          openApiIds.has(entry.operationId),
          `${formatManifestOperationIdContext(fileName, entry)} : operationId "${entry.operationId}" absent de ${OPENAPI_REVIEWABLE_REL}`,
        ).toBe(true);
      }
    }
  });
});
