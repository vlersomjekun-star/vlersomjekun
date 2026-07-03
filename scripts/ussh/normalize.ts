/**
 * HAPI 3 — Normalizimi agresiv i të dhënave USSH
 * (output/dentists-raw.json → output/dentists-clean.json + report.md)
 *
 * Rregullat e verifikuara nga burimi real:
 * 1. mojibake UTF-8 ("ÃƒÂ§"→"ç", "ÃƒÂ«"→"ë", ...)
 * 2. ALL CAPS / lowercase → Title Case me ç/ë
 * 3. mbiemra të dyfishtë: "Aga (Xharo)", "(Vrapi) Gjika", "Guza/Nano",
 *    "Bajrami//Muhollari", "Hykaj(Dervishaj)", "Dervishi Shala"
 *    → lastName = i pari, alternativeLastName = i dyti
 * 4. data: M/D/YYYY dhe DD.MM.YYYY; të pavlefshme → null + log
 * 5. dedup firstName+lastName; mbahet rekordi me licenseExpiry më të re
 *
 * Ekzekutimi: npx tsx scripts/ussh/normalize.ts
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { cleanName, fixMojibake, splitDoubleSurname } from "../lib/normalize";
import type { RawDentist } from "./parse";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");

export type CleanDentist = {
  firstName: string;
  lastName: string;
  alternativeLastName: string | null;
  licenseExpiry: string | null; // ISO — E BRENDSHME, kurrë publike
};

/** Parse i datave në dy formatet e përziera të burimit. */
function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const s = raw.trim();

  // M/D/YYYY (amerikan)
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2])));
    return isNaN(d.getTime()) || Number(m[1]) > 12 || Number(m[2]) > 31 ? null : d;
  }
  // DD.MM.YYYY (europian)
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const d = new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
    return isNaN(d.getTime()) || Number(m[2]) > 12 || Number(m[1]) > 31 ? null : d;
  }
  return null;
}

function main() {
  const raw: RawDentist[] = JSON.parse(
    readFileSync(path.join(OUT_DIR, "dentists-raw.json"), "utf8")
  );

  let mojibakeFixed = 0;
  let invalidDates = 0;
  const invalidDateSamples: string[] = [];
  let doubleSurnames = 0;
  const skipped: string[] = [];

  // Çelës i normalizuar → rekordi më i mirë (licenseExpiry më e re)
  const byKey = new Map<string, CleanDentist>();
  let duplicates = 0;

  for (const r of raw) {
    // 1. mojibake
    const f1 = fixMojibake(r.firstName);
    const f2 = fixMojibake(r.lastName);
    if (f1.changed || f2.changed) mojibakeFixed++;

    // 3. mbiemra të dyfishtë (para Title Case, mbi tekstin e pastruar)
    const [mainSurname, altSurname] = splitDoubleSurname(f2.fixed);
    if (altSurname) doubleSurnames++;

    // 2. Title Case
    const firstName = cleanName(f1.fixed);
    const lastName = cleanName(mainSurname);
    const alternativeLastName = altSurname ? cleanName(altSurname) : null;

    if (firstName.length < 2 || lastName.length < 2) {
      skipped.push(`emër/mbiemër i pavlefshëm: "${r.firstName} ${r.lastName}"`);
      continue;
    }

    // 4. datat (vetëm skadimi na duhet — i brendshëm)
    const expiry = parseDate(r.licenseExpiryRaw);
    if (r.licenseExpiryRaw && !expiry) {
      invalidDates++;
      if (invalidDateSamples.length < 15) {
        invalidDateSamples.push(`"${r.licenseExpiryRaw}" (${firstName} ${lastName})`);
      }
    }

    const record: CleanDentist = {
      firstName,
      lastName,
      alternativeLastName,
      licenseExpiry: expiry ? expiry.toISOString() : null,
    };

    // 5. dedup — mbaj rekordin me skadim më të ri
    const key = `${firstName}|${lastName}`.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      duplicates++;
      const newer =
        (record.licenseExpiry ?? "") > (existing.licenseExpiry ?? "") ? record : existing;
      byKey.set(key, newer);
    } else {
      byKey.set(key, record);
    }
  }

  const clean = [...byKey.values()];
  writeFileSync(path.join(OUT_DIR, "dentists-clean.json"), JSON.stringify(clean, null, 2), "utf8");

  const report = [
    "# Raport normalizimi — Regjistri USSH (stomatologë)",
    "",
    `Data: ${new Date().toISOString()}`,
    "",
    `- Rreshta raw: ${raw.length}`,
    `- Stomatologë të pastruar (pas dedup): ${clean.length}`,
    `- Duplikatë të bashkuar: ${duplicates}`,
    `- Mojibake të rregulluara: ${mojibakeFixed}`,
    `- Mbiemra të dyfishtë (alternativeLastName): ${doubleSurnames}`,
    `- Data skadimi të pavlefshme → null: ${invalidDates}`,
    `- Të skipuar: ${skipped.length}`,
    "",
    "SHËNIM: licenseExpiry është E BRENDSHME — kurrë publike, kurrë filtër.",
    "Kolona Shënime NUK është importuar.",
    "",
    "## Data të pavlefshme (shembuj)",
    ...(invalidDateSamples.length ? invalidDateSamples.map((s) => `- ${s}`) : ["- asnjë"]),
    "",
    "## Të skipuar",
    ...(skipped.length ? skipped.map((s) => `- ${s}`) : ["- asnjë"]),
    "",
  ].join("\n");
  writeFileSync(path.join(OUT_DIR, "report.md"), report, "utf8");

  console.log(
    `Clean: ${clean.length} | duplikatë: ${duplicates} | mojibake: ${mojibakeFixed} | mbiemra dyfish: ${doubleSurnames} | data invalide: ${invalidDates} | skip: ${skipped.length}`
  );
}

main();
