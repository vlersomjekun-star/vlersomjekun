/**
 * HAPI 1 — Import nga OpenStreetMap përmes Overpass API.
 *
 *   npx tsx scripts/osm/fetch.ts            (fetch + normalize + import në OsmCandidate)
 *   npx tsx scripts/osm/fetch.ts --offline  (ripërdor osm-raw.json ekzistues, pa fetch)
 *
 * Overpass është shërbim komunitar falas: 1 query e vetme e madhe, User-Agent
 * identifikues, asnjë loop. Të dhënat OSM janë ODbL — atribuimi
 * "© OpenStreetMap contributors" shfaqet në footer-in e faqes.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { PrismaClient, MatchStatus } from "@prisma/client";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");
const RAW_FILE = path.join(OUT_DIR, "osm-raw.json");

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "VlersoMjekun/1.0 (platformë vlerësimesh mjekësh; info@vlersomjekun.al)";

// 1 query e vetme për gjithë Shqipërinë: amenity mjekësore + healthcare=*
const QUERY = `
[out:json][timeout:180];
area["ISO3166-1"="AL"][admin_level=2]->.al;
(
  node["amenity"~"^(dentist|doctors|clinic|hospital)$"](area.al);
  way["amenity"~"^(dentist|doctors|clinic|hospital)$"](area.al);
  node["healthcare"](area.al);
  way["healthcare"](area.al);
);
out center tags;
`;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

// Bounding box-e të thjeshta të qyteteve kryesore (pa API të jashtme):
// [minLat, maxLat, minLon, maxLon] → city slug
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

// Emra qytetesh nga addr:city → slug (varianta të ndryshme shkrimi)
const CITY_NAMES: Record<string, string> = {
  "tirane": "tirane", "tiranë": "tirane", "tirana": "tirane",
  "durres": "durres", "durrës": "durres",
  "vlore": "vlore", "vlorë": "vlore", "vlora": "vlore",
  "shkoder": "shkoder", "shkodër": "shkoder", "shkodra": "shkoder",
  "elbasan": "elbasan",
  "fier": "fier",
  "korce": "korce", "korçë": "korce", "korça": "korce", "korca": "korce",
  "berat": "berat",
  "lushnje": "lushnje", "lushnjë": "lushnje",
  "pogradec": "pogradec",
  "gjirokaster": "gjirokaster", "gjirokastër": "gjirokaster",
  "sarande": "sarande", "sarandë": "sarande", "saranda": "sarande",
  "lezhe": "lezhe", "lezhë": "lezhe", "lezha": "lezhe",
  "kukes": "kukes", "kukës": "kukes",
  "peshkopi": "diber", "diber": "diber", "dibër": "diber",
};

function cityGuessFor(tags: Record<string, string>, lat: number, lon: number): string | null {
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

async function fetchOverpass(): Promise<OverpassElement[]> {
  console.log("Overpass: 1 query për gjithë Shqipërinë...");
  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `data=${encodeURIComponent(QUERY)}`,
  });
  if (!res.ok) {
    throw new Error(`Overpass dështoi: ${res.status} ${await res.text().then((t) => t.slice(0, 200))}`);
  }
  const json = (await res.json()) as { elements: OverpassElement[] };
  return json.elements;
}

async function main() {
  const offline = process.argv.includes("--offline");
  mkdirSync(OUT_DIR, { recursive: true });

  let elements: OverpassElement[];
  if (offline && existsSync(RAW_FILE)) {
    console.log("Offline: po ripërdor osm-raw.json");
    elements = JSON.parse(readFileSync(RAW_FILE, "utf8"));
  } else {
    elements = await fetchOverpass();
    writeFileSync(RAW_FILE, JSON.stringify(elements, null, 2), "utf8");
  }
  console.log(`Elemente OSM: ${elements.length}`);

  const prisma = new PrismaClient();
  let imported = 0;
  let skippedNoName = 0;
  let skippedPharmacy = 0;
  let preserved = 0;

  for (const el of elements) {
    if (el.type === "relation") continue;
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;

    const amenity = tags.amenity || (tags.healthcare ? `healthcare:${tags.healthcare}` : "");
    // Farmacitë përjashtohen — s'janë mjekë as klinika
    if (tags.amenity === "pharmacy" || tags.healthcare === "pharmacy") {
      skippedPharmacy++;
      continue;
    }
    const name = tags.name?.replace(/\s+/g, " ").trim();
    if (!name) {
      skippedNoName++;
      continue;
    }

    const osmId = `${el.type}/${el.id}`;
    const data = {
      osmType: el.type,
      name,
      amenity,
      address: buildAddress(tags),
      phone: tags.phone ?? tags["contact:phone"] ?? null,
      website: tags.website ?? tags["contact:website"] ?? null,
      latitude: lat,
      longitude: lon,
      cityGuess: cityGuessFor(tags, lat, lon),
    };

    // Idempotent me osmId; vendimet e adminit (CONFIRMED/REJECTED) nuk preken
    const existing = await prisma.osmCandidate.findUnique({ where: { osmId } });
    if (
      existing &&
      (existing.matchStatus === MatchStatus.CONFIRMED ||
        existing.matchStatus === MatchStatus.REJECTED)
    ) {
      preserved++;
      continue;
    }
    await prisma.osmCandidate.upsert({
      where: { osmId },
      update: data,
      create: { osmId, ...data },
    });
    imported++;
  }

  const total = await prisma.osmCandidate.count();
  console.log("---");
  console.log(`Kandidatë të importuar/përditësuar: ${imported}`);
  console.log(`Pa emër (skip): ${skippedNoName} | Farmaci (skip): ${skippedPharmacy} | Të paprekur (vendime admini): ${preserved}`);
  console.log(`Total OsmCandidate në DB: ${total}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
