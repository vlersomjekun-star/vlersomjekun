/**
 * HAPI 5 — Importi i psikologëve në DB.
 *
 *   npx tsx scripts/psychologists/import.ts
 *
 * - Idempotent: sourceKey = sha256("PSIKOLOG|emri|mbiemri|qyteti-raw")
 * - cityId: nga qarku i mapuar (null nëse "None"/i pamapueshëm)
 * - Nuk prek kurrë rekorde me createdBy USER ose source tjetër; omonimet me
 *   mjekë/dentistë ekzistues mbeten rekorde të veçanta (asnjë merge)
 * - ⚠️ ASNJË email nuk lexohet as ruhet — kontrollohet eksplicit në fund
 */
import { readFileSync } from "fs";
import path from "path";
import { createHash } from "crypto";
import { Prisma, PrismaClient, ContentStatus, CreatedBy } from "@prisma/client";
import { slugify } from "../lib/normalize";
import type { CleanPsychologist } from "./normalize";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");
const SOURCE = "URDHRI_PSIKOLOGUT";
const SOURCE_URL = "https://regjistri.urdhriipsikologut.al/members/list/licensuar";

const prisma = new PrismaClient();

function sourceKeyFor(p: CleanPsychologist): string {
  return createHash("sha256")
    .update(`PSIKOLOG|${p.firstName}|${p.lastName}|${p.cityRaw}`.toLowerCase())
    .digest("hex");
}

async function main() {
  const psychologists: CleanPsychologist[] = JSON.parse(
    readFileSync(path.join(OUT_DIR, "psychologists-clean.json"), "utf8")
  );
  console.log(`Për import: ${psychologists.length} psikologë`);

  const specialty = await prisma.specialty.findUniqueOrThrow({ where: { slug: "psikolog" } });
  const cities = new Map((await prisma.city.findMany()).map((c) => [c.slug, c.id]));

  const existing = await prisma.doctor.findMany({ select: { slug: true, sourceKey: true } });
  const usedSlugs = new Set(existing.map((d) => d.slug));
  const usedKeys = new Set(existing.map((d) => d.sourceKey).filter(Boolean) as string[]);

  let skippedExisting = 0;
  let skippedNoCity = 0;
  const records: Prisma.DoctorCreateManyInput[] = [];

  for (const p of psychologists) {
    const sourceKey = sourceKeyFor(p);
    if (usedKeys.has(sourceKey)) {
      skippedExisting++;
      continue;
    }
    usedKeys.add(sourceKey);

    const cityId = p.citySlug ? cities.get(p.citySlug) : undefined;
    if (p.citySlug && !cityId) skippedNoCity++; // qark i pamapueshëm (s'duhet të ndodhë pas normalize)

    const base = slugify(p.firstName, p.lastName, "psikolog");
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);

    records.push({
      firstName: p.firstName,
      lastName: p.lastName,
      alternativeLastName: p.alternativeLastName,
      slug,
      specialtyId: specialty.id,
      cityId: cityId ?? null,
      clinicId: null,
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      sourceKey,
      status: ContentStatus.APPROVED,
      createdBy: CreatedBy.ADMIN,
    });
  }

  let created = 0;
  for (let i = 0; i < records.length; i += 500) {
    const res = await prisma.doctor.createMany({
      data: records.slice(i, i + 500),
      skipDuplicates: true,
    });
    created += res.count;
    process.stdout.write(`\r  Importuar: ${created}/${records.length}`);
  }
  console.log();

  const total = await prisma.doctor.count({ where: { source: SOURCE } });

  // ---- KONTROLL PRIVATËSIE (i detyrueshëm) ----
  // Doctor s'ka fushë email fare në schema, prandaj s'mund të "rrjedhë" — por
  // verifikojmë gjithsesi që asnjë stringë email-i s'u fut diku (address/clinicFreeText).
  const suspect = await prisma.doctor.count({
    where: {
      source: SOURCE,
      OR: [
        { address: { contains: "@" } },
        { clinicFreeText: { contains: "@" } },
        { firstName: { contains: "@" } },
        { lastName: { contains: "@" } },
      ],
    },
  });

  console.log("---");
  console.log(`Të krijuar tani: ${created}`);
  console.log(`Të skipuar (ekzistonin): ${skippedExisting}`);
  console.log(`Qytet i pamapueshëm (papritur): ${skippedNoCity}`);
  console.log(`Total psikologë në DB: ${total}`);
  console.log(
    suspect === 0
      ? "✓ KONTROLL PRIVATËSIE: asnjë '@' i gjetur në asnjë fushë të psikologëve — asnjë email i rrjedhur."
      : `✗ KUJDES: ${suspect} rekorde psikologësh kanë '@' në ndonjë fushë — kontrollo menjëherë!`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
