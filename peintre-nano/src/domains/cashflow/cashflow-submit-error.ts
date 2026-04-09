import type { RecycliqueClientFailure } from '../../api/recyclique-api-error';

export type CashflowSubmitSurfaceError =
  | { readonly kind: 'local'; readonly message: string }
  | { readonly kind: 'api'; readonly failure: RecycliqueClientFailure };

/** Pour tests / assertions simples sur le message principal. */
export function cashflowSubmitErrorPlainText(e: CashflowSubmitSurfaceError | null | undefined): string {
  if (!e) return '';
  return e.kind === 'local' ? e.message : e.failure.message;
}
