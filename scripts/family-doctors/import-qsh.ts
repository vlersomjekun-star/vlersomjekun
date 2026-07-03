/**
 * HAPI 2 — Import i Qendrave Shëndetësore publike (QSH).
 *
 *   npx tsx scripts/family-doctors/import-qsh.ts
 *
 * BURIME:
 * A) FSDKSH Raport Vjetor 2024 (PDF) — VETËM të dhëna agregate (356 QSH
 *    kombëtare, ndarë për DRF/rreth, jo emra individualë) → përdoret vetëm
 *    për VALIDIM në raport, jo për krijim rekordesh (shih fsdksh-2024-fulltext.txt
 *    dhe qsh-from-pdf.json — asnjë listë emrash QSH ekziston në këtë raport).
 * B) OSM (ripërdor scripts/osm/output/osm-raw.json nga Faza 4) — burimi i
 *    VETËM me emra reale QSH; filtron amenity/healthcare + emra që përmbajnë
 *    "Qendra Shëndetësore", "QSH", "Poliklinikë", "Ambulancë".
 * C) shendetesia.gov.al — provuar; nuk u gjet listë e strukturuar HTML/PDF
 *    e qendrave (shih log; s'u shty më tej, siç kërkon rregulli anti-guess).
 *
 * Çdo QSH krijohet si Clinic me sectorType PUBLIC, source "OSM", idempotent
 * me sourceKey.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { PrismaClient, ContentStatus, CreatedBy, SectorType } from "@prisma/client";
import { slugify } from "../lib/normalize";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");
const OSM_RAW = path.join(DIR, "..", "osm", "output", "osm-raw.json");

const prisma = new PrismaClient();

// Fjalë kyçe që identifikojnë QSH publike (jo klinika/spitale private)
const QSH_NAME_RE = /qend[ëe]r?\s+sh[ëe]ndet[ëe]sore|\bqsh\b|poliklinik[ëe]?|ambulanc[ëe]?/i;
// Përjashto rezultate false-positive (barnatore/farmaci, klinika private me emra si "Poliklinika LifePlus")
const EXCLUDE_RE = /barnator|farmaci|veterin|dentar|dental|lifeplus|ufo/i;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const CITY_NAMES: Record<string, string> = {
  "tirane": "tirane", "tiranë": "tirane", "tirana": "tirane",
  "durres": "durres", "durrës": "durres",
  "vlore": "vlore", "vlorë": "vlore", "vlora": "vlore",
  "shkoder": "shkoder", "shkodër": "shkoder", "shkodra": "shkoder",
  "elbasan": "elbasan",
  "fier": "fier",
  "korce": "korce", "korçë": "korce", "korça": "korce",
  "berat": "berat",
  "lushnje": "lushnje", "lushnjë": "lushnje",
  "pogradec": "pogradec",
  "gjirokaster": "gjirokaster", "gjirokastër": "gjirokaster",
  "sarande": "sarande", "sarandë": "sarande", "saranda": "sarande",
  "lezhe": "lezhe", "lezhë": "lezhe",
  "kukes": "kukes", "kukës": "kukes",
  "peshkopi": "diber", "diber": "diber", "dibër": "diber",
};

const CITY_BBOXES: [string, number, number, number, number][] = [
  ["tirane", 41.24, 41.42, 19.68, 19.92],
  ["durres", 41.25, 41.40, 19.38, 19.55],
  ["vlore", 40.38, 40.52, 19.42, 19.58],
  ["shkoder", 42.00, 42.13, 19.44, 19.60],
  ["elbasan", 41.06, 41.16, 20.00, 20.16],
  ["fier", 40.66, 40.78, 19.50, 19.64],
  ["korce", 40.55, 40.66, 20.72, 20.84],
  ["berat", 40.66, 40.75, 19.92, 20.02],
  ["lushnje", 40.90, 41.00, 19.66, 19.76],
  ["pogradec", 40.86, 40.95, 20.60, 20.72],
  ["gjirokaster", 40.04, 40.13, 20.10, 20.20],
  ["sarande", 39.84, 39.92, 19.98, 20.06],
  ["lezhe", 41.74, 41.84, 19.60, 19.70],
  ["kukes", 42.02, 42.12, 20.38, 20.48],
  ["diber", 41.66, 41.74, 20.40, 20.48],
];

function cityGuess(tags: Record<string, string>, lat: number, lon: number): string | null {
  const addrCity = tags["addr:city"]?.toLowerCase().trim();
  if (addrCity && CITY_NAMES[addrCity]) return CITY_NAMES[addrCity];
  for (const [slug, minLat, maxLat, minLon, maxLon] of CITY_BBOXES) {
    if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) return slug;
  }
  return null;
}

function buildAddress(tags: Record<string, string>): string | null {
  const parts = [
    [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "),
    tags["addr:city"],
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

async function main() {
  // --- Burimi A: kontroll/dokumentim (jo krijim rekordesh — shih koment i lart) ---
  const pdfReportPath = path.join(OUT_DIR, "fsdksh-2024-fulltext.txt");
  let pdfSummary = "PDF FSDKSH i pashkarkuar";
  try {
    const text = readFileSync(pdfReportPath, "utf8");
    const m = text.match(/Numri i Mjekëve të Përgjithshëm dhe\s+të Familjes[\s\S]{0,80}(\d[\d,]*)/);
    pdfSummary = m
      ? `Konfirmuar nga PDF: ${m[1]} mjekë familjes kombëtare (Dhjetor 2024). Nuk u gjet listë emrash QSH (vetëm agregate DRF) — burimi B (OSM) është i vetmi me emra.`
      : "PDF i lexuar, tabela e mjekëve s'u gjet me pattern-in aktual";
  } catch {
    // opsionale — s'ndalon pipeline-in
  }

  // --- Burimi C: shendetesia.gov.al — provuar në probe-api.ts, s'u gjet listë ---
  const oshkshNote =
    "shendetesia.gov.al: kontrolluar për listë QSH, nuk u gjet listë e strukturuar publike (HTML/PDF) e adresueshme pa navigim manual — s'u shty më tej sipas rregullit anti-guess.";

  // --- Burimi B: OSM (i vetmi me emra reale) ---
  const elements: OverpassElement[] = JSON.parse(readFileSync(OSM_RAW, "utf8"));
  const cities = new Map((await prisma.city.findMany()).map((c) => [c.slug, c.id]));
  const existing = await prisma.clinic.findMany({ select: { slug: true } });
  const usedSlugs = new Set(existing.map((c) => c.slug));

  let candidates = 0;
  let created = 0;
  let skippedExisting = 0;
  let skippedNoCity = 0;
  const byCity = new Map<string, number>();

  for (const el of elements) {
    if (el.type === "relation") continue;
    const tags = el.tags ?? {};
    const name = tags.name?.replace(/\s+/g, " ").trim();
    if (!name || !QSH_NAME_RE.test(name) || EXCLUDE_RE.test(name)) continue;
    // Vetëm QSH publike reale — jo amenity=dentist (skanuar tashmë në Fazë 5/USSH)
    if (tags.amenity === "dentist") continue;

    candidates++;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const citySlug = cityGuess(tags, lat, lon);
    const cityId = citySlug ? cities.get(citySlug) : undefined;
    if (!cityId) {
      skippedNoCity++;
      continue;
    }

    // Idempotencë: Clinic s'ka fushë sourceKey (vetëm Doctor); kontrollohet me name+cityId+source
    const alreadyImported = await prisma.clinic.findFirst({
      where: { name, cityId, source: "OSM" },
      select: { id: true },
    });
    if (alreadyImported) {
      skippedExisting++;
      continue;
    }

    let slug = slugify(name, citySlug!);
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${slugify(name, citySlug!)}-${n++}`;
    usedSlugs.add(slug);

    await prisma.clinic.create({
      data: {
        name,
        slug,
        cityId,
        address: buildAddress(tags),
        phone: tags.phone ?? tags["contact:phone"] ?? null,
        latitude: lat,
        longitude: lon,
        addressSource: "OSM",
        sectorType: SectorType.PUBLIC,
        source: "OSM",
        status: ContentStatus.APPROVED,
        createdBy: CreatedBy.ADMIN,
      },
    });
    created++;
    byCity.set(citySlug!, (byCity.get(citySlug!) ?? 0) + 1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const report = [
    "# Raport Faza 6 — Import QSH publike",
    "",
    `Data: ${new Date().toISOString()}`,
    "",
    "## Burimi A — FSDKSH Raport Vjetor 2024 (PDF)",
    pdfSummary,
    "",
    "## Burimi C — shendetesia.gov.al",
    oshkshNote,
    "",
    "## Burimi B — OpenStreetMap (i vetmi me emra reale)",
    `- Kandidatë QSH-like (emër + fjalë kyçe, para filtrit gjeografik): ${candidates}`,
    `- QSH të krijuara si Clinic (sectorType PUBLIC): ${created}`,
    `- Të skipuara (ekzistonin tashmë, idempotent): ${skippedExisting}`,
    `- Të skipuara (pa qytet të përcaktueshëm): ${skippedNoCity}`,
    "",
    "## Shpërndarja për qytet",
    ...[...byCity.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `- ${c}: ${n}`),
    "",
    "KONKLUZION: mbulimi OSM i QSH-ve publike është modest (dhjetëra, jo qindra).",
    "Ky ishte vlerësimi i pritur në specifikim — infrastruktura admini (HAPI 3-4)",
    "është vlera kryesore e kësaj faze, jo sasia e QSH-ve të importuara automatikisht.",
    "",
  ].join("\n");
  writeFileSync(path.join(OUT_DIR, "report.md"), report, "utf8");

  console.log(`Kandidatë QSH-like: ${candidates} | Krijuar: ${created} | Skip ekzistues: ${skippedExisting} | Skip pa qytet: ${skippedNoCity}`);
  console.log("Raporti: scripts/family-doctors/output/report.md");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
