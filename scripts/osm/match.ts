/**
 * HAPI 2 — Matching OsmCandidate → Doctor / Clinic
 *
 *   npx tsx scripts/osm/match.ts
 *
 * - Emra personalë ("Dentist Piro Dede", "Klinikë Dentare Mark Bobnaj") → match me Doctor;
 *   amenity=dentist kufizon kërkimin te stomatologët
 * - Emra strukturash ("Spitali...", "Poliklinika...") → match me Clinic
 * - Exact i vetëm → AUTO_MATCHED; fuzzy ≥0.85 → NEEDS_REVIEW; omonimi → NEEDS_REVIEW;
 *   asgjë → UNMATCHED (kandidatë për klinika të reja)
 * - Vendimet e adminit (CONFIRMED/REJECTED) nuk preken kurrë
 */
import { PrismaClient, MatchStatus } from "@prisma/client";
import { Matcher, normalizeForCompare, nameSimilarity } from "../lib/matcher";

const prisma = new PrismaClient();

// Fjalë strukture/biznesi që hiqen para nxjerrjes së emrit personal
const STRIP_TOKENS = new Set([
  "klinika", "klinike", "klinikë", "dentare", "dentale", "dental", "dent",
  "stomatologjike", "stomatologji", "stomatologjik", "dentist", "dentiste",
  "studio", "ordinance", "ordinanca", "mjekesore", "mjekësore", "mjeku", "mjek",
  "dr", "dr.", "prof", "prof.", "doktor", "art", "care", "center", "centre",
  "clinic", "qendra", "qender", "qendër",
]);

// Parashtesa që tregojnë strukturë (→ match me Clinic, jo me Doctor)
const STRUCTURE_RE =
  /^(spitali|spital|poliklinika|poliklinike|qendra\s+shendetesore|qendra\s+shëndetësore|qsh|materniteti|hospital|laborator|farmaci|ambulanc|ambulator)/i;

/** Provon të nxjerrë [emri, mbiemri] personal nga emri OSM; null nëse s'duket emër personi. */
export function extractPersonName(osmName: string): [string, string] | null {
  if (osmName.includes("&")) return null; // shumë mjekë në një emër — review manual
  const cleaned = osmName
    .replace(/["“”'']/g, " ")
    .replace(/[-–—_/,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned
    .split(" ")
    .filter((w) => w && !STRIP_TOKENS.has(w.toLowerCase()));
  if (words.length !== 2) return null;
  const [first, last] = words;
  // Duhet të duken si fjalë emri (jo numra, jo shkurtime 1-shkronjëshe të dyja)
  if (!/^[a-zçëA-ZÇË][a-zçëA-ZÇË'-]*$/.test(first) || !/^[a-zçëA-ZÇË][a-zçëA-ZÇË'-]*$/.test(last)) {
    return null;
  }
  if (first.length < 2 && last.length < 2) return null;
  return [first, last];
}

async function main() {
  const [dentSpecialty, allDoctors, clinics, candidates] = await Promise.all([
    prisma.specialty.findUniqueOrThrow({ where: { slug: "dentist" } }),
    prisma.doctor.findMany({ include: { specialty: true } }),
    prisma.clinic.findMany(),
    prisma.osmCandidate.findMany({
      where: { matchStatus: { notIn: [MatchStatus.CONFIRMED, MatchStatus.REJECTED] } },
    }),
  ]);

  const toUmsh = (d: (typeof allDoctors)[number]) => ({
    id: d.id,
    firstName: d.firstName,
    lastName: d.lastName,
    specialtyName: d.specialty.nameSq,
  });
  const dentistMatcher = new Matcher(
    allDoctors.filter((d) => d.specialtyId === dentSpecialty.id).map(toUmsh)
  );
  const doctorMatcher = new Matcher(allDoctors.map(toUmsh));

  const normClinics = clinics.map((c) => ({ ...c, norm: normalizeForCompare(c.name) }));

  const counts = { AUTO_MATCHED: 0, NEEDS_REVIEW: 0, UNMATCHED: 0 };
  const cityGains: string[] = [];

  for (const cand of candidates) {
    let status: MatchStatus = MatchStatus.UNMATCHED;
    let doctorId: string | null = null;
    let clinicId: string | null = null;
    let score: number | null = null;

    const person = extractPersonName(cand.name);
    if (person && !STRUCTURE_RE.test(cand.name)) {
      const matcher = cand.amenity === "dentist" ? dentistMatcher : doctorMatcher;
      const result = matcher.match(person[0], person[1]);
      if (result.status !== "NEW_DOCTOR") {
        status = result.status as MatchStatus;
        doctorId = result.doctorId;
        score = result.score;
      }
    }

    if (status === MatchStatus.UNMATCHED && STRUCTURE_RE.test(cand.name)) {
      const norm = normalizeForCompare(cand.name);
      let best: { id: string; s: number } | null = null;
      for (const c of normClinics) {
        const s = nameSimilarity(norm, c.norm);
        if (s >= 0.85 && (!best || s > best.s)) best = { id: c.id, s };
      }
      if (best) {
        status = best.s >= 0.98 ? MatchStatus.AUTO_MATCHED : MatchStatus.NEEDS_REVIEW;
        clinicId = best.id;
        score = Math.round(best.s * 100) / 100;
      }
    }

    await prisma.osmCandidate.update({
      where: { id: cand.id },
      data: { matchedDoctorId: doctorId, matchedClinicId: clinicId, matchStatus: status, matchScore: score },
    });
    counts[status as keyof typeof counts]++;

    if (doctorId && status === MatchStatus.AUTO_MATCHED && cand.cityGuess) {
      const d = allDoctors.find((x) => x.id === doctorId);
      if (d && !d.cityId) cityGains.push(`${d.firstName} ${d.lastName} → ${cand.cityGuess}`);
    }
  }

  console.log("---");
  console.log(`AUTO_MATCHED: ${counts.AUTO_MATCHED} | NEEDS_REVIEW: ${counts.NEEDS_REVIEW} | UNMATCHED: ${counts.UNMATCHED}`);
  console.log(`Stomatologë/mjekë pa qytet që do të fitojnë qytet (pas apply): ${cityGains.length}`);
  for (const g of cityGains.slice(0, 20)) console.log(`  + ${g}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
