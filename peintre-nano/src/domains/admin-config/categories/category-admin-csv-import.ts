import type {
  CategoryAdminListRowDto,
  CategoryV1CreateRequestBody,
  CategoryV1UpdateRequestBody,
} from '../../../api/admin-categories-client';

/** Aligné sur `buildCategoriesCsvLines` (export local). */
export const CATEGORY_CSV_HEADER = [
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
] as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidLike(s: string): boolean {
  return UUID_RE.test(s.trim());
}

/** Parse CSV avec champs entre guillemets (export Recyclique admin). */
export function parseQuotedCsvRows(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  while (i < t.length) {
    const ch = t[i];
    if (inQuotes) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i += 1;
      row.push(field);
      const nonEmpty = row.some((c) => c.trim() !== '');
      if (nonEmpty) rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

function parseBoolLoose(s: string): boolean | null {
  const x = s.trim().toLowerCase();
  if (x === 'true' || x === '1' || x === 'oui') return true;
  if (x === 'false' || x === '0' || x === 'non') return false;
  return null;
}

function parseIntLoose(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloatLoose(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

export type CategoryCsvRecord = Record<(typeof CATEGORY_CSV_HEADER)[number], string>;

export function rowsToKeyedRecords(matrix: string[][]): CategoryCsvRecord[] {
  if (matrix.length < 2) return [];
  const header = matrix[0].map((h) => h.trim());
  const expected = [...CATEGORY_CSV_HEADER];
  if (header.length !== expected.length || !expected.every((h, idx) => header[idx] === h)) {
    return [];
  }
  const out: CategoryCsvRecord[] = [];
  for (let r = 1; r < matrix.length; r += 1) {
    const line = matrix[r];
    const rec = {} as CategoryCsvRecord;
    for (let c = 0; c < expected.length; c += 1) {
      rec[expected[c]] = line[c] ?? '';
    }
    out.push(rec);
  }
  return out;
}

export type CategoryImportSkip = { line: number; reason: string };

export type CategoryImportPlan = {
  readonly updates: readonly { id: string; body: CategoryV1UpdateRequestBody }[];
  readonly creates: readonly CategoryV1CreateRequestBody[];
  readonly skipped: readonly CategoryImportSkip[];
};

function bodyFromRecordCreate(rec: CategoryCsvRecord): CategoryV1CreateRequestBody | null {
  const name = rec.name.trim();
  if (!name) return null;

  const official = rec.official_name.trim() || null;
  const pidRaw = rec.parent_id.trim();
  const parent_id = pidRaw && isUuidLike(pidRaw) ? pidRaw : null;
  if (pidRaw && !parent_id) return null;

  const price = parseFloatLoose(rec.price);
  const max_price = parseFloatLoose(rec.max_price);
  const display_order = parseIntLoose(rec.display_order);
  const display_order_entry = parseIntLoose(rec.display_order_entry);
  const isVis = parseBoolLoose(rec.is_visible);
  if (display_order === null || display_order_entry === null || isVis === null) return null;

  const sk = rec.shortcut_key.trim() || null;

  return {
    name,
    official_name: official,
    parent_id,
    price,
    max_price,
    display_order,
    display_order_entry,
    is_visible: isVis,
    shortcut_key: sk,
  };
}

function bodyFromRecordUpdate(rec: CategoryCsvRecord): CategoryV1UpdateRequestBody | null {
  const name = rec.name.trim();
  if (!name) return null;

  const official = rec.official_name.trim() || null;
  const pidRaw = rec.parent_id.trim();
  const parent_id = pidRaw && isUuidLike(pidRaw) ? pidRaw : null;
  if (pidRaw && !parent_id) return null;

  const isAct = parseBoolLoose(rec.is_active);
  if (isAct === null) return null;

  const price = parseFloatLoose(rec.price);
  const max_price = parseFloatLoose(rec.max_price);
  const display_order = parseIntLoose(rec.display_order);
  const display_order_entry = parseIntLoose(rec.display_order_entry);
  const isVis = parseBoolLoose(rec.is_visible);
  if (display_order === null || display_order_entry === null || isVis === null) return null;

  const sk = rec.shortcut_key.trim() || null;

  return {
    name,
    official_name: official,
    is_active: isAct,
    parent_id,
    price,
    max_price,
    display_order,
    display_order_entry,
    is_visible: isVis,
    shortcut_key: sk,
  };
}

/**
 * Prépare créations et mises à jour à partir d’un export CSV admin (mêmes colonnes que l’export).
 * — Pas d’endpoint bulk côté OpenAPI : orchestration client (POST/PUT unitaires).
 * — Lignes avec `deleted_at` non vide : ignorées (état archive hors périmètre import).
 * — Création : `id` vide ; le parent doit déjà exister en base (pas de chaîne de nouveaux UUID dans un seul fichier).
 */
export function planCategoryCsvImport(
  records: readonly CategoryCsvRecord[],
  currentRows: readonly CategoryAdminListRowDto[],
): { ok: true; plan: CategoryImportPlan } | { ok: false; error: string } {
  const byId = new Map(currentRows.map((r) => [r.id, r]));
  const existingIds = new Set(byId.keys());

  const updates: { id: string; body: CategoryV1UpdateRequestBody }[] = [];
  const creates: CategoryV1CreateRequestBody[] = [];
  const skipped: CategoryImportSkip[] = [];

  let line = 2;
  for (const rec of records) {
    if (rec.deleted_at.trim() !== '') {
      skipped.push({ line, reason: 'Ligne marquée archivée dans le fichier (ignorée).' });
      line += 1;
      continue;
    }

    const idRaw = rec.id.trim();
    if (!idRaw) {
      const body = bodyFromRecordCreate(rec);
      if (!body) {
        skipped.push({ line, reason: 'Création invalide (nom, booléens ou nombres manquants).' });
        line += 1;
        continue;
      }
      const p = body.parent_id;
      if (p && !existingIds.has(p)) {
        skipped.push({
          line,
          reason:
            'Création : parent inconnu sur ce site. Créez le parent d’abord ou importez en deux temps.',
        });
        line += 1;
        continue;
      }
      creates.push(body);
      line += 1;
      continue;
    }

    if (!isUuidLike(idRaw)) {
      skipped.push({ line, reason: 'Identifiant catégorie invalide.' });
      line += 1;
      continue;
    }

    if (!existingIds.has(idRaw)) {
      skipped.push({ line, reason: 'Identifiant absent de la liste chargée (autre site ou données obsolètes).' });
      line += 1;
      continue;
    }

    const body = bodyFromRecordUpdate(rec);
    if (!body) {
      skipped.push({ line, reason: 'Mise à jour invalide (champs obligatoires).' });
      line += 1;
      continue;
    }
    const parentTarget = body.parent_id;
    if (parentTarget && !existingIds.has(parentTarget)) {
      skipped.push({ line, reason: 'Parent cible inconnu (référence parent_id invalide).' });
      line += 1;
      continue;
    }
    if (idRaw === parentTarget) {
      skipped.push({ line, reason: 'Une catégorie ne peut pas être son propre parent.' });
      line += 1;
      continue;
    }

    updates.push({ id: idRaw, body });
    line += 1;
  }

  return { ok: true, plan: { updates, creates, skipped } };
}

export function parseCategoriesCsvForImport(text: string):
  | { ok: true; records: CategoryCsvRecord[] }
  | { ok: false; error: string } {
  const matrix = parseQuotedCsvRows(text);
  if (matrix.length < 2) {
    return { ok: false, error: 'Fichier vide ou sans en-tête.' };
  }
  const records = rowsToKeyedRecords(matrix);
  if (records.length === 0) {
    return {
      ok: false,
      error: 'En-tête CSV inattendu. Utilisez un fichier exporté depuis cette page (mêmes colonnes).',
    };
  }
  return { ok: true, records };
}
