import type { CategoryAdminListRowDto } from '../../../api/admin-categories-client';
import { categoryBreadcrumbLabel } from './category-admin-display-model';

export function csvEscapeCell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return '""';
  const s = typeof v === 'string' ? v : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/** Lignes CSV (sans BOM) pour les lignes affichées, avec en-tête. */
export function buildCategoriesCsvLines(
  ordered: readonly { row: CategoryAdminListRowDto }[],
  allRows: readonly CategoryAdminListRowDto[],
): string[] {
  const header = [
    'id',
    'chemin',
    'name',
    'official_name',
    'is_active',
    'parent_id',
    'price',
    'max_price',
    'display_order',
    'display_order_entry',
    'is_visible',
    'shortcut_key',
    'created_at',
    'updated_at',
    'deleted_at',
  ];
  const lines = [header.join(',')];
  for (const { row: c } of ordered) {
    const path = categoryBreadcrumbLabel(allRows, c.id);
    lines.push(
      [
        csvEscapeCell(c.id),
        csvEscapeCell(path),
        csvEscapeCell(c.name),
        csvEscapeCell(c.official_name ?? ''),
        csvEscapeCell(c.is_active),
        csvEscapeCell(c.parent_id ?? ''),
        csvEscapeCell(c.price ?? ''),
        csvEscapeCell(c.max_price ?? ''),
        csvEscapeCell(c.display_order),
        csvEscapeCell(c.display_order_entry),
        csvEscapeCell(c.is_visible),
        csvEscapeCell(c.shortcut_key ?? ''),
        csvEscapeCell(c.created_at),
        csvEscapeCell(c.updated_at),
        csvEscapeCell(c.deleted_at ?? ''),
      ].join(','),
    );
  }
  return lines;
}

export function triggerCsvDownload(filename: string, lines: string[]): void {
  const bom = '\uFEFF';
  const body = bom + lines.join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(filename, blob);
}

/** Téléchargement navigateur pour tout `Blob` (CSV/PDF/XLS renvoyés par l’API). */
export function triggerBlobDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(url);
}
