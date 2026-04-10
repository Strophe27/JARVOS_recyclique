/**
 * Story 11.1 — manifeste CREOS login public + enregistrement widget `auth.live.public-login`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parsePageManifestJson } from '../../src/validation/page-manifest-ingest';
import { resolveWidget } from '../../src/registry';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const PAGE_PATH = join(REPO_ROOT, 'contracts/creos/manifests/page-login-public.json');

describe('contracts/creos/manifests/page-login-public.json (Story 11.1)', () => {
  it('parse sans erreur et résout le widget auth.live.public-login', () => {
    const raw = readFileSync(PAGE_PATH, 'utf8');
    const { manifest, issues } = parsePageManifestJson(raw, 'page-login-public.json');
    expect(issues, JSON.stringify(issues)).toHaveLength(0);
    expect(manifest?.pageKey).toBe('login-public');
    const slot = manifest?.slots[0];
    expect(slot?.widgetType).toBe('auth.live.public-login');
    const w = resolveWidget('auth.live.public-login');
    expect(w.ok).toBe(true);
    const props = slot?.widgetProps as Record<string, unknown> | undefined;
    expect(props?.footnote).toBeUndefined();
  });
});
