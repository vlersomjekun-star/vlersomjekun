/**
 * HAPI 2 — Parser i regjistrit USSH (regjistri.html → output/dentists-raw.json)
 *
 * Burimi preferohet Excel nëse download.sh e ka gjetur (regjistri.xlsx),
 * ndryshe tabela HTML (#tablepress-2).
 *
 * SHËNIM: kolona "Shënime" lexohet vetëm për statistikë — NUK importohet
 * në asnjë fushë publike (shih KUJDES në spec).
 *
 * Ekzekutimi: npx tsx scripts/ussh/parse.ts
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import * as cheerio from "cheerio";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");

export type RawDentist = {
  firstName: string;
  lastName: string;
  licenseDateRaw: string | null;
  licenseExpiryRaw: string | null;
  hasNotes: boolean; // vetëm flag statistik — përmbajtja e Shënime NUK ruhet
};

function parseHtml(html: string): RawDentist[] {
  const $ = cheerio.load(html);
  const rows: RawDentist[] = [];
  let table = $("#tablepress-2 tbody tr");
  if (table.length === 0) table = $("table.tablepress tbody tr");
  if (table.length === 0) table = $("table tbody tr");

  table.each((_, row) => {
    const tds = $(row).find("td");
    if (tds.length < 2) return;
    const firstName = $(tds[0]).text().trim();
    const lastName = $(tds[1]).text().trim();
    if (!firstName || !lastName) return;
    rows.push({
      firstName,
      lastName,
      licenseDateRaw: $(tds[2]).text().trim() || null,
      licenseExpiryRaw: $(tds[3]).text().trim() || null,
      hasNotes: Boolean($(tds[4]).text().trim()),
    });
  });
  return rows;
}

async function parseExcel(file: string): Promise<RawDentist[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(readFileSync(file));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  const rows: RawDentist[] = [];
  for (const row of data.slice(1)) {
    const [firstName, lastName, licenseDate, licenseExpiry, notes] = row.map((c) =>
      String(c ?? "").trim()
    );
    if (!firstName || !lastName) continue;
    rows.push({
      firstName,
      lastName,
      licenseDateRaw: licenseDate || null,
      licenseExpiryRaw: licenseExpiry || null,
      hasNotes: Boolean(notes),
    });
  }
  return rows;
}

async function main() {
  const excelPath = path.join(DIR, "regjistri.xlsx");
  let rows: RawDentist[];
  if (existsSync(excelPath)) {
    console.log("Burimi: Excel (regjistri.xlsx)");
    rows = await parseExcel(excelPath);
  } else {
    console.log("Burimi: tabela HTML (regjistri.html)");
    rows = parseHtml(readFileSync(path.join(DIR, "regjistri.html"), "utf8"));
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "dentists-raw.json"), JSON.stringify(rows, null, 2), "utf8");
  console.log(`Stomatologë të parsuar (raw): ${rows.length}`);
  console.log(`Me shënime (vetëm statistikë): ${rows.filter((r) => r.hasNotes).length}`);
}

main();
