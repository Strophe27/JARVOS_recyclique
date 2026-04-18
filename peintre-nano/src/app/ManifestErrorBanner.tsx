import { Alert, Text } from '@mantine/core';
import type { ManifestValidationIssue } from '../validation/manifest-validation-types';
import classes from './ManifestErrorBanner.module.css';

export type ManifestErrorBannerProps = {
  readonly issues: readonly ManifestValidationIssue[];
};

/**
 * Erreurs de chargement / validation manifests — zone main, lisible (Mantine OK hors layout shell).
 */
export function ManifestErrorBanner({ issues }: ManifestErrorBannerProps) {
  if (!issues.length) return null;
  return (
    <Alert
      className={classes.banner}
      color="red"
      title="Manifests invalides"
      data-testid="manifest-load-error"
      data-runtime-severity="blocked"
      data-runtime-rejection-kind="manifest_validation"
      data-runtime-codes={issues.map((i) => i.code).join(',')}
    >
      <ul className={classes.list}>
        {issues.map((issue, i) => (
          <li key={`${issue.code}-${i}`}>
            <Text component="span" fw={600}>
              {issue.code}
            </Text>
            {' — '}
            {issue.message}
          </li>
        ))}
      </ul>
    </Alert>
  );
}
