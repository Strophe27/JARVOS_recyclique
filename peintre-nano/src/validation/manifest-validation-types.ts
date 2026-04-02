/**
 * Erreurs structurées de validation des manifests (codes stables pour 3.6 / observabilité).
 */

export const MANIFEST_VALIDATION_CODES = [
  'MANIFEST_PARSE_ERROR',
  'MANIFEST_STRUCTURE_INVALID',
  'ROUTE_KEY_COLLISION',
  'PATH_COLLISION',
  'PAGE_KEY_COLLISION',
  'SHORTCUT_COLLISION',
  'NAV_PAGE_LINK_UNRESOLVED',
  'UNKNOWN_WIDGET_TYPE',
] as const;

export type ManifestValidationCode = (typeof MANIFEST_VALIDATION_CODES)[number];

export interface ManifestValidationIssue {
  readonly code: ManifestValidationCode;
  readonly message: string;
  readonly detail?: Readonly<Record<string, unknown>>;
}

export type ManifestBundleOk = {
  readonly ok: true;
};

export type ManifestBundleErr = {
  readonly ok: false;
  readonly issues: readonly ManifestValidationIssue[];
};

export type ManifestBundleResult = ManifestBundleOk | ManifestBundleErr;

export function manifestErr(
  code: ManifestValidationCode,
  message: string,
  detail?: Readonly<Record<string, unknown>>,
): ManifestValidationIssue {
  return detail === undefined ? { code, message } : { code, message, detail };
}

export function mergeIssues(
  ...buckets: readonly (readonly ManifestValidationIssue[] | undefined)[]
): ManifestValidationIssue[] {
  const out: ManifestValidationIssue[] = [];
  for (const b of buckets) {
    if (b?.length) out.push(...b);
  }
  return out;
}
