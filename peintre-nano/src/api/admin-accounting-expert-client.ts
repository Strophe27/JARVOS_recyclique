import type { AuthContextPort } from '../app/auth/auth-context-port';
import { getLiveSnapshotBasePrefix } from './live-snapshot-client';

export type AccountingExpertLatestRevision = {
  readonly id: string;
  readonly revision_seq: number;
  readonly published_at: string;
};

export async function getAccountingExpertLatestRevision(
  auth: Pick<AuthContextPort, 'getAccessToken'>,
): Promise<
  | { ok: true; data: AccountingExpertLatestRevision }
  | { ok: false; detail: string }
> {
  const token = auth.getAccessToken?.();
  const url = `${getLiveSnapshotBasePrefix()}/v1/admin/accounting-expert/revisions/latest`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers, credentials: 'include' });
  if (res.status === 404) {
    return { ok: false, detail: 'Aucune révision comptable publiée.' };
  }
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, detail: text || res.statusText };
  }
  const data = (await res.json()) as AccountingExpertLatestRevision;
  return { ok: true, data };
}
