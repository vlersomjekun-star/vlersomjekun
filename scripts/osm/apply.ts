/**
 * HAPI 2.4 — Aplikimi i match-eve OSM (AUTO_MATCHED + CONFIRMED) + raporti.
 *
 *   npx tsx scripts/osm/apply.ts
 *
 * RREGULL PRIORITETI: OSM NUK mbishkruan kurrë fusha me addressSource
 * USER / ADMIN / PLACES_VERIFIED — vetëm null ose OSM të vjetër.
 */
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { PrismaClient, AddressSource, CreatedBy, MatchStatus } from "@prisma/client";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");

const prisma = new PrismaClient();

const PROTECTED: (AddressSource | null)[] = [
  AddressSource.USER,
  AddressSource.ADMIN,
  AddressSource.PLACES_VERIFIED,
  AddressSource.DOCTOR_VERIFIED,
];

async function main() {
  const cities = new Map(
    (await prisma.city.findMany()).map((c) => [c.slug, c.id])
  );

  const matches = await prisma.osmCandidate.findMany({
    where: {
      matchStatus: { in: [MatchStatus.AUTO_MATCHED, MatchStatus.CONFIRMED] },
    },
    include: { matchedDoctor: true, matchedClinic: true },
  });

  let doctorsUpdated = 0;
  let clinicsUpdated = 0;
  let protectedSkips = 0;
  const dentistCityGains: string[] = [];

  for (const m of matches) {
    if (m.matchedDoctor) {
      const d = m.matchedDoctor;
      if (d.createdBy === CreatedBy.USER || PROTECTED.includes(d.addressSource)) {
        protectedSkips++;
        continue;
      }
      const gainedCity = !d.cityId && m.cityGuess && cities.has(m.cityGuess);
      await prisma.doctor.update({
        where: { id: d.id },
        data: {
          address: m.address ?? d.address,
          phone: m.phone ?? d.phone,
          latitude: m.latitude,
          longitude: m.longitude,
          ...(gainedCity && { cityId: cities.get(m.cityGuess!) }),
          addressSource: AddressSource.OSM,
          enrichedAt: new Date(),
        },
      });
      doctorsUpdated++;
      if (gainedCity) {
        dentistCityGains.push(`${d.firstName} ${d.lastName} (${d.slug}) → ${m.cityGuess}`);
      }
    } else if (m.matchedClinic) {
      const c = m.matchedClinic;
      if (PROTECTED.includes(c.addressSource)) {
        protectedSkips++;
        continue;
      }
      await prisma.clinic.update({
        where: { id: c.id },
        data: {
          address: c.address ?? m.address,
          phone: c.phone ?? m.phone,
          latitude: m.latitude,
          longitude: m.longitude,
          addressSource: AddressSource.OSM,
        },
      });
      clinicsUpdated++;
    }
  }

  const stats = await prisma.osmCandidate.groupBy({ by: ["matchStatus"], _count: true });
  const stat = (s: MatchStatus) => stats.find((x) => x.matchStatus === s)?._count ?? 0;
  const total = stats.reduce((sum, s) => sum + s._count, 0);

  const report = [
    "# Raport Faza 4 — Pasurimi gjeografik nga OSM",
    "",
    `Data: ${new Date().toISOString()}`,
    "",
    `- Kandidatë OSM total: ${total}`,
    `- AUTO_MATCHED: ${stat(MatchStatus.AUTO_MATCHED)}`,
    `- NEEDS_REVIEW: ${stat(MatchStatus.NEEDS_REVIEW)}`,
    `- CONFIRMED (admin): ${stat(MatchStatus.CONFIRMED)}`,
    `- UNMATCHED (kandidatë për klinika të reja): ${stat(MatchStatus.UNMATCHED)}`,
    "",
    `- Mjekë të pasuruar në këtë run: ${doctorsUpdated}`,
    `- Klinika të pasuruara: ${clinicsUpdated}`,
    `- Të mbrojtur (USER/ADMIN/PLACES_VERIFIED — të paprekur): ${protectedSkips}`,
    "",
    `## Stomatologë/mjekë që FITUAN qytet nga OSM (${dentistCityGains.length})`,
    ...(dentistCityGains.length ? dentistCityGains.map((s) => `- ${s}`) : ["- asnjë"]),
    "",
    "Atribuimi: të dhënat gjeografike © OpenStreetMap contributors (ODbL) — i shfaqur në footer.",
    "",
  ].join("\n");
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "report.md"), report, "utf8");

  console.log("---");
  console.log(`Mjekë të pasuruar: ${doctorsUpdated} (${dentistCityGains.length} fituan qytet)`);
  console.log(`Klinika të pasuruara: ${clinicsUpdated} | Të mbrojtur: ${protectedSkips}`);
  console.log(`Raporti: scripts/osm/output/report.md`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
