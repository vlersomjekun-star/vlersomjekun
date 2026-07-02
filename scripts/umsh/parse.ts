/**
 * HAPI 2 — Parser i regjistrit UMSH (scripts/umsh/regjistri.html → output/doctors-raw.json)
 *
 * PRIVACY (Ligji 9887): kolonat Atesi (1) dhe Datelindje (3) NUK ruhen kurrë.
 * Ekstraktohen vetëm: Emer (0), Mbiemer (2), Gjini (4), Rajon (5), Specialitet (6).
 *
 * Ekzekutimi: npx tsx scripts/umsh/parse.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import * as cheerio from "cheerio";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");

const VALID_REGIONS = new Set([
  "Tirane", "Durres", "Vlore", "Shkoder", "Elbasan", "Fier",
  "Korce", "Berat", "Diber", "Kukes", "Lezhe", "Gjirokaster",
]);

export type RawDoctor = {
  firstName: string;
  lastName: string;
  gender: "M" | "F" | null;
  region: string;
  specialtyRaw: string | null;
};

function parseGender(value: string): "M" | "F" | null {
  const v = value.trim().toLowerCase();
  if (v === "mashkull") return "M";
  if (v === "femer" || v === "femër") return "F";
  return null;
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function parseTable(html: string): { doctors: RawDoctor[]; skipped: string[] } {
  const $ = cheerio.load(html);
  const doctors: RawDoctor[] = [];
  const skipped: string[] = [];

  let rows = $("#example tbody tr");
  if (rows.length === 0) rows = $("table tbody tr");
  if (rows.length === 0) rows = $("table tr").slice(1); // skip header

  rows.each((i, row) => {
    const tds = $(row).find("td");
    if (tds.length !== 7) {
      skipped.push(`rreshti ${i}: ${tds.length} qeliza në vend të 7`);
      return;
    }
    // VETËM indekset 0, 2, 4, 5, 6 — kurrë 1 (Atesi) dhe 3 (Datelindje)
    const firstName = clean($(tds[0]).text());
    const lastName = clean($(tds[2]).text());
    const gender = parseGender($(tds[4]).text());
    const region = clean($(tds[5]).text());
    const specialtyRaw = clean($(tds[6]).text()) || null;

    if (!firstName || !lastName) {
      skipped.push(`rreshti ${i}: emër/mbiemër bosh`);
      return;
    }
    if (!VALID_REGIONS.has(region)) {
      skipped.push(`rreshti ${i}: rajon i panjohur "${region}" (${firstName} ${lastName})`);
      return;
    }
    doctors.push({ firstName, lastName, gender, region, specialtyRaw });
  });

  return { doctors, skipped };
}

/** Fallback: parse me regex mbi tekstin, nëse struktura nuk është tabelare. */
function parseFallback(html: string): { doctors: RawDoctor[]; skipped: string[] } {
  const text = html.replace(/<[^>]+>/g, "\n").replace(/&nbsp;/g, " ");
  const doctors: RawDoctor[] = [];
  const skipped: string[] = [];
  // Emer Atesi Mbiemer Datë(ose NULL) Mashkull|Femer Rajon Specialitet?
  const re =
    /^\s*([A-ZÇË][\wçëÇË'-]+)\s*\n\s*([A-ZÇË][\wçëÇË'-]*)\s*\n\s*([A-ZÇË][\wçëÇË'-]+)\s*\n\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|NULL)\s*\n\s*(Mashkull|Femer)\s*\n\s*(\w+)\s*\n\s*([^\n]*)$/gim;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const region = m[6].trim();
    if (!VALID_REGIONS.has(region)) {
      skipped.push(`fallback: rajon i panjohur "${region}"`);
      continue;
    }
    doctors.push({
      firstName: m[1].trim(),
      lastName: m[3].trim(),
      gender: m[5] === "Mashkull" ? "M" : "F",
      region,
      specialtyRaw: m[7].trim() || null,
    });
  }
  return { doctors, skipped };
}

function main() {
  const html = readFileSync(path.join(DIR, "regjistri.html"), "utf8");
  let { doctors, skipped } = parseTable(html);
  if (doctors.length === 0) {
    console.warn("Struktura tabelare nuk u gjet — po përdor fallback me regex");
    ({ doctors, skipped } = parseFallback(html));
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "doctors-raw.json"), JSON.stringify(doctors, null, 2), "utf8");

  const byRegion = new Map<string, number>();
  for (const d of doctors) byRegion.set(d.region, (byRegion.get(d.region) ?? 0) + 1);

  console.log(`Total mjekë të parsuar: ${doctors.length}`);
  console.log("Për rajon:");
  for (const [region, count] of [...byRegion.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${region}: ${count}`);
  }
  console.log(`Rreshta të skipuar: ${skipped.length}`);
  for (const s of skipped.slice(0, 20)) console.log(`  - ${s}`);
  if (skipped.length > 20) console.log(`  ... dhe ${skipped.length - 20} të tjerë`);

  writeFileSync(path.join(OUT_DIR, "skipped.log"), skipped.join("\n"), "utf8");
}

main();
