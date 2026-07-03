/**
 * HAPI 2 — Parse i tabelës (output/licensuar.html → output/list-raw.json)
 *
 * Tabela ka kolona TË NDARA firstName/lastName (jo fullName si USSH) dhe
 * kolonën e qytetit tashmë të pranishme — nuk kërkohen faqe detaji (HAPI 3
 * skip-ohet qëllimisht: Email s'importohet dhe qyteti vjen që këtu).
 *
 * Ekzekutimi: npx tsx scripts/psychologists/scrape-list.ts
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");

export type RawPsychologist = {
  detailSlug: string;
  firstName: string;
  lastName: string;
  city: string; // emri i qytetit/qarkut siç del në regjistër, p.sh. "Fushë-Krujë" ose "None"
};

const ROW_RE =
  /<tr>\s*<td><a href="\/members\/detail\/([^"]+)">\d+<\/a><\/td>\s*<td><a[^>]*>([^<]*)<\/a><\/td>\s*<td><a[^>]*>([^<]*)<\/a><\/td>\s*<td><a[^>]*>([^<]*)<\/a><\/td>/g;

function main() {
  const html = readFileSync(path.join(OUT_DIR, "licensuar.html"), "utf8").replace(/\r?\n/g, "");
  const rows: RawPsychologist[] = [];

  for (const m of html.matchAll(ROW_RE)) {
    const [, detailSlug, firstName, lastName, city] = m;
    if (!firstName.trim() || !lastName.trim()) continue;
    rows.push({
      detailSlug,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      city: city.trim(),
    });
  }

  if (rows.length < 500) {
    throw new Error(
      `STRUKTURA KA NDRYSHUAR? U gjetën vetëm ${rows.length} rreshta (pritej ≥500) — kontrollo parser-in/HTML-në`
    );
  }

  writeFileSync(path.join(OUT_DIR, "list-raw.json"), JSON.stringify(rows, null, 2), "utf8");

  const byCity = new Map<string, number>();
  for (const r of rows) byCity.set(r.city, (byCity.get(r.city) ?? 0) + 1);

  console.log(`Psikologë të parsuar (raw): ${rows.length}`);
  console.log(`Qytete distinkte: ${byCity.size}`);
  console.log(`Pa email askund (nuk lexohet fare nga faqet e detajit — s'preken)`);
}

main();
