import type { NavigationManifest } from '../types/navigation-manifest';
import type { PageManifest } from '../types/page-manifest';
import { defaultAllowedWidgetTypeSet } from '../validation/allowed-widget-types';
import type { ManifestValidationIssue } from '../validation/manifest-validation-types';
import { parseNavigationManifestJson } from '../validation/navigation-ingest';
import { parsePageManifestJson } from '../validation/page-manifest-ingest';
import { validateManifestBundle } from '../validation/validate-bundle-rules';
import { reportRuntimeFallback } from './report-runtime-fallback';

function rejectManifestBundle(issues: readonly ManifestValidationIssue[]): {
  readonly ok: false;
  readonly issues: readonly ManifestValidationIssue[];
} {
  for (const issue of issues) {
    reportRuntimeFallback({
      code: issue.code,
      message: issue.message,
      severity: 'blocked',
      detail: issue.detail,
      state: 'manifest_bundle_invalid',
    });
  }
  return { ok: false, issues };
}

export type LoadedManifestBundle = {
  readonly navigation: NavigationManifest;
  readonly pages: readonly PageManifest[];
};

export type LoadManifestBundleResult =
  | { readonly ok: true; readonly bundle: LoadedManifestBundle }
  | { readonly ok: false; readonly issues: readonly ManifestValidationIssue[] };

export type LoadManifestBundleInput = {
  /** Texte JSON NavigationManifest (snake_case ou camelCase). */
  readonly navigationJson: string;
  /** Un texte JSON par PageManifest. */
  readonly pageManifestsJson: readonly string[];
  /** Surcharge allowlist widgets ; défaut : {@link defaultAllowedWidgetTypeSet}. */
  readonly allowedWidgetTypes?: ReadonlySet<string>;
  /** Libellés pour messages d'erreur (ex. URL). */
  readonly sourceLabels?: {
    readonly navigation?: string;
    readonly page?: (index: number) => string;
  };
};

/**
 * Parse, normalise (clés camelCase) et valide un lot nav + pages coactivées (Piste A : JSON statique / fetch).
 */
export function loadManifestBundle(input: LoadManifestBundleInput): LoadManifestBundleResult {
  const navLabel = input.sourceLabels?.navigation ?? 'navigation';
  const navParsed = parseNavigationManifestJson(input.navigationJson, navLabel);
  if (navParsed.issues.length) {
    return rejectManifestBundle(navParsed.issues);
  }
  const navigation = navParsed.manifest!;

  const pageIssues: ManifestValidationIssue[] = [];
  const pages: PageManifest[] = [];
  input.pageManifestsJson.forEach((text, i) => {
    const label = input.sourceLabels?.page?.(i) ?? `page[${i}]`;
    const p = parsePageManifestJson(text, label);
    pageIssues.push(...p.issues);
    if (p.manifest) pages.push(p.manifest);
  });
  if (pageIssues.length) {
    return rejectManifestBundle(pageIssues);
  }

  const allowed = input.allowedWidgetTypes ?? defaultAllowedWidgetTypeSet();
  const { issues } = validateManifestBundle(navigation, pages, allowed);
  if (issues.length) {
    return rejectManifestBundle(issues);
  }

  return { ok: true, bundle: { navigation, pages } };
}

/**
 * Charge via fetch deux ressources JSON (nav + tableau d'URLs de pages ou une seule page).
 * Réservé au navigateur / tests avec fetch mocké.
 */
export async function fetchManifestBundle(options: {
  readonly navigationUrl: string;
  readonly pageManifestUrls: readonly string[];
  readonly allowedWidgetTypes?: ReadonlySet<string>;
}): Promise<LoadManifestBundleResult> {
  let navigationJson: string;
  try {
    const navRes = await fetch(options.navigationUrl);
    if (!navRes.ok) {
      return rejectManifestBundle([
        {
          code: 'MANIFEST_PARSE_ERROR',
          message: `Échec HTTP navigation (${options.navigationUrl}) : ${navRes.status}`,
          detail: { url: options.navigationUrl, status: navRes.status },
        },
      ]);
    }
    navigationJson = await navRes.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return rejectManifestBundle([
      {
        code: 'MANIFEST_PARSE_ERROR',
        message: `Réseau / lecture navigation impossible`,
        detail: { url: options.navigationUrl, error: msg },
      },
    ]);
  }

  const pageTexts: string[] = [];
  for (let i = 0; i < options.pageManifestUrls.length; i++) {
    const url = options.pageManifestUrls[i]!;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        return rejectManifestBundle([
          {
            code: 'MANIFEST_PARSE_ERROR',
            message: `Échec HTTP page manifest (${url}) : ${res.status}`,
            detail: { url, index: i, status: res.status },
          },
        ]);
      }
      pageTexts.push(await res.text());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return rejectManifestBundle([
        {
          code: 'MANIFEST_PARSE_ERROR',
          message: `Réseau / lecture page manifest impossible`,
          detail: { url, index: i, error: msg },
        },
      ]);
    }
  }

  return loadManifestBundle({
    navigationJson,
    pageManifestsJson: pageTexts,
    allowedWidgetTypes: options.allowedWidgetTypes,
    sourceLabels: {
      navigation: options.navigationUrl,
      page: (index) => options.pageManifestUrls[index] ?? `page[${index}]`,
    },
  });
}
