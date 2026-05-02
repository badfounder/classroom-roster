import { parse } from "csv-parse/sync";

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_ROWS = 200;

export type RosterRow = {
  legal_name: string;
  preferred_name: string | null;
  pronouns: string | null;
};

export type ParsedRoster =
  | { ok: true; rows: RosterRow[] }
  | { ok: false; error: string };

export function parseRosterCsv(buffer: Buffer): ParsedRoster {
  if (buffer.length > MAX_FILE_BYTES) {
    return { ok: false, error: "CSV must be 1 MB or smaller." };
  }

  let records: Record<string, string>[];
  try {
    records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch {
    return { ok: false, error: "Could not parse CSV. Use the template columns." };
  }

  if (records.length > MAX_ROWS) {
    return { ok: false, error: `CSV must have at most ${MAX_ROWS} data rows.` };
  }

  if (records.length === 0) {
    return { ok: false, error: "CSV has no data rows." };
  }

  const headers = Object.keys(records[0] ?? {});
  const legalKey = headers.find((h) => h.toLowerCase() === "legal_name");
  if (!legalKey) {
    return {
      ok: false,
      error: 'Missing required column "legal_name". Download the template.',
    };
  }

  const prefKey = headers.find((h) => h.toLowerCase() === "preferred_name");
  const proKey = headers.find((h) => h.toLowerCase() === "pronouns");

  const rows: RosterRow[] = [];
  const seenLegal = new Map<string, number>();

  for (let i = 0; i < records.length; i++) {
    const row = records[i]!;
    const legalRaw = String(row[legalKey] ?? "").trim();
    if (!legalRaw) {
      return { ok: false, error: `Row ${i + 2}: legal_name is empty.` };
    }
    const norm = legalRaw.toLowerCase();
    if (seenLegal.has(norm)) {
      return {
        ok: false,
        error: `Duplicate legal_name in file: "${legalRaw}" (rows ${seenLegal.get(norm)! + 2} and ${i + 2}).`,
      };
    }
    seenLegal.set(norm, i);

    const preferredRaw = prefKey ? String(row[prefKey] ?? "").trim() : "";
    const pronounsRaw = proKey ? String(row[proKey] ?? "").trim() : "";

    rows.push({
      legal_name: legalRaw,
      preferred_name: preferredRaw.length > 0 ? preferredRaw : null,
      pronouns: pronounsRaw.length > 0 ? pronounsRaw : null,
    });
  }

  return { ok: true, rows };
}
