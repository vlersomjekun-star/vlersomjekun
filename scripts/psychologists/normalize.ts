/**
 * HAPI 4 — Normalizimi (output/list-raw.json → output/psychologists-clean.json + report.md)
 *
 * - Title Case me ç/ë (emri/mbiemri janë tashmë të ndarë nga burimi — shih HAPI 2)
 * - mbiemra të dyfishtë ("Sula / Tosku") → alternativeLastName (ripërdor scripts/lib)
 * - qyteti: qytete/bashki të vogla mapohen te City e QARKUT përkatës që tashmë
 *   ekziston në DB (arkitektura jonë e City-ve është në nivel qarku, jo bashkie —
 *   njësoj si UMSH Rajon); "None" (7 raste) → cityId null, kandidatë të mirë për
 *   LocationSuggestion pas vlerësimit të parë
 * - "Kosovë" në dropdown ekzistonte, por s'u shfaq si vlerë e ndonjë rreshti të
 *   listuar — nuk pati asnjë rast për t'u trajtuar (dokumentuar në report)
 * - dedup firstName+lastName: një person në 2+ qytete (praktikë private në disa
 *   qytete) → mbahet rekordi i parë, qytetet shtesë loggohen si shënim (JO
 *   LocationSuggestion, që kërkon userId real — s'ka kuptim për import admini)
 *
 * Ekzekutimi: npx tsx scripts/psychologists/normalize.ts
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { cleanName, splitDoubleSurname } from "../lib/normalize";
import type { RawPsychologist } from "./scrape-list";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");

export type CleanPsychologist = {
  firstName: string;
  lastName: string;
  alternativeLastName: string | null;
  cityRaw: string; // për sourceKey (stabilitet edhe nëse mapping-u i qarkut ndryshon)
  citySlug: string | null; // null = "None" / i pamapueshëm
};

// Bashki/qytete të vogla → qarku (City) përkatës që EKZISTON tashmë në DB.
// DB ka: 12 "qarqe" (nga Faza 1/UMSH) + lushnje, pogradec, sarande (nga seed-i fillestar).
const CITY_TO_QARK: Record<string, string> = {
  // Match i drejtpërdrejtë (qyteti = City ekzistuese)
  "Tiranë": "tirane", "Shkodër": "shkoder", "Durrës": "durres", "Elbasan": "elbasan",
  "Lezhë": "lezhe", "Fier": "fier", "Vlorë": "vlore", "Berat": "berat",
  "Korçë": "korce", "Lushnje": "lushnje", "Dibër": "diber", "Pogradec": "pogradec",
  "Gjirokastër": "gjirokaster", "Kukës": "kukes", "Sarandë": "sarande",
  // Qark Tiranë
  "Kavajë": "tirane", "Kamëz": "tirane", "Rrogozhinë": "tirane",
  // Qark Durrës
  "Fushë-Krujë": "durres", "Krujë": "durres", "Shijak": "durres",
  // Qark Dibër
  "Burrel": "diber", "Peshkopi": "diber", "Bulqizë": "diber", "Mat": "diber",
  // Qark Elbasan
  "Librazhd": "elbasan", "Gramsh": "elbasan", "Peqin": "elbasan", "Cërrik": "elbasan",
  // Qark Berat
  "Kuçovë": "berat", "Ura Vajgurore": "berat", "Poliçan": "berat", "Çorovodë": "berat",
  // Qark Lezhë
  "Laç": "lezhe", "Rrëshen": "lezhe", "Mirditë": "lezhe", "Milot": "lezhe",
  // Qark Shkodër
  "Koplik": "shkoder", "Malësi e Madhe": "shkoder", "Pukë": "shkoder",
  // Qark Korçë
  "Bilisht": "korce", "Ersekë": "korce",
  // Qark Fier
  "Divjak": "fier", "Mallakastër": "fier", "Ballsh": "fier", "Patos": "fier",
  // Qark Kukës
  "Has": "kukes", "Bajram Curri": "kukes", "Tropojë": "kukes",
  // Qark Gjirokastër
  "Këlcyr": "gjirokaster", "Përmet": "gjirokaster", "Tepelenë": "gjirokaster",
  // Qark Vlorë
  "Delvinë": "vlore",
};

function main() {
  const raw: RawPsychologist[] = JSON.parse(
    readFileSync(path.join(OUT_DIR, "list-raw.json"), "utf8")
  );

  const unmappedCities = new Set<string>();
  let doubleSurnames = 0;
  let noCity = 0;

  const byKey = new Map<string, CleanPsychologist>();
  const secondaryCityNotes: string[] = [];
  let duplicates = 0;

  for (const r of raw) {
    const [mainSurname, altSurname] = splitDoubleSurname(r.lastName);
    if (altSurname) doubleSurnames++;

    const firstName = cleanName(r.firstName);
    const lastName = cleanName(mainSurname);
    const alternativeLastName = altSurname ? cleanName(altSurname) : null;

    let citySlug: string | null = null;
    if (r.city === "None") {
      noCity++;
    } else if (CITY_TO_QARK[r.city]) {
      citySlug = CITY_TO_QARK[r.city];
    } else {
      unmappedCities.add(r.city);
    }

    const key = `${firstName}|${lastName}`.toLowerCase();
    const existing = byKey.get(key);
    if (existing) {
      duplicates++;
      if (existing.cityRaw !== r.city) {
        secondaryCityNotes.push(`${firstName} ${lastName}: edhe në ${r.city} (mbajtur: ${existing.cityRaw})`);
      }
      continue; // mbaj rekordin e parë
    }
    byKey.set(key, { firstName, lastName, alternativeLastName, cityRaw: r.city, citySlug });
  }

  const clean = [...byKey.values()];
  writeFileSync(
    path.join(OUT_DIR, "psychologists-clean.json"),
    JSON.stringify(clean, null, 2),
    "utf8"
  );

  const byCitySlug = new Map<string, number>();
  for (const p of clean) {
    const k = p.citySlug ?? "(pa qytet)";
    byCitySlug.set(k, (byCitySlug.get(k) ?? 0) + 1);
  }

  const report = [
    "# Raport normalizimi — Regjistri i Urdhrit të Psikologut (licensuar)",
    "",
    `Data: ${new Date().toISOString()}`,
    "",
    `- Rreshta raw: ${raw.length}`,
    `- Psikologë të pastruar (pas dedup): ${clean.length}`,
    `- Duplikatë (persona në 2+ qytete, mbajtur rekordi i parë): ${duplicates}`,
    `- Mbiemra të dyfishtë (alternativeLastName): ${doubleSurnames}`,
    `- Pa qytet ("None" në burim): ${noCity}`,
    `- Qytete të pamapueshme (kontrollo manualisht): ${unmappedCities.size}`,
    "",
    "SHËNIM: asnjë email nuk u lexua/ruajt në asnjë hap të pipeline-it (Faza 5).",
    "Faqet e detajit /members/detail/* NUK u vizituan fare.",
    "",
    "## Qytete të pamapueshme",
    ...(unmappedCities.size ? [...unmappedCities].map((c) => `- ${c}`) : ["- asnjë"]),
    "",
    "## Persona në disa qytete (shënim, jo LocationSuggestion — import admini)",
    ...(secondaryCityNotes.length ? secondaryCityNotes.map((s) => `- ${s}`) : ["- asnjë"]),
    "",
    "## Shpërndarja për qark (pas mapping-ut)",
    ...[...byCitySlug.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `- ${c}: ${n}`),
    "",
  ].join("\n");
  writeFileSync(path.join(OUT_DIR, "report.md"), report, "utf8");

  console.log(
    `Clean: ${clean.length} | duplikatë: ${duplicates} | mbiemra dyfish: ${doubleSurnames} | pa qytet: ${noCity} | qytete të pamapueshme: ${unmappedCities.size}`
  );
  if (unmappedCities.size) console.log("Qytete të pamapueshme:", [...unmappedCities].join(", "));
}

main();
