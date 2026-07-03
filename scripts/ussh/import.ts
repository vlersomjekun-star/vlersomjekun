/**
 * HAPI 4 — Importi i stomatologëve në DB
 *
 *   npx tsx scripts/ussh/import.ts
 *
 * - Idempotent: sourceKey = sha256("USSH|emri|mbiemri")
 * - cityId: null (arrikohet në fazat pasuese), clinicId: null
 * - Nuk prek kurrë rekorde me createdBy USER ose source tjetër;
 *   omonimet mjek/dentist mbeten rekorde të veçanta (asnjë merge)
 * - licenseExpiry: e ruajtur por VETËM e brendshme
 */
import { readFileSync } from "fs";
import path from "path";
import { createHash } from "crypto";
import { Prisma, PrismaClient, ContentStatus, CreatedBy } from "@prisma/client";
import { slugify } from "../lib/normalize";
import type { CleanDentist } from "./normalize";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");
const SOURCE = "USSH";
const SOURCE_URL = "https://ussh.org.al/regjistri-i-stomatologeve/";

const prisma = new PrismaClient();

function sourceKeyFor(d: CleanDentist): string {
  return createHash("sha256")
    .update(`${SOURCE}|${d.firstName}|${d.lastName}`.toLowerCase())
    .digest("hex");
}

async function main() {
  const dentists: CleanDentist[] = JSON.parse(
    readFileSync(path.join(OUT_DIR, "dentists-clean.json"), "utf8")
  );
  console.log(`Për import: ${dentists.length} stomatologë`);

  // Specialiteti: përditëso emrin sq që kërkimi të kapë edhe "stomatolog" edhe "dentist"
  const specialty = await prisma.specialty.upsert({
    where: { slug: "dentist" },
    update: { nameSq: "Stomatolog (Dentist)" },
    create: {
      slug: "dentist",
      nameSq: "Stomatolog (Dentist)",
      nameEn: "Dentist",
      nameIt: "Dentista",
      icon: "smile",
    },
  });

  // Gjendja ekzistuese për idempotencë dhe slug-e unike (pa N query)
  const existing = await prisma.doctor.findMany({ select: { slug: true, sourceKey: true } });
  const usedSlugs = new Set(existing.map((d) => d.slug));
  const usedKeys = new Set(existing.map((d) => d.sourceKey).filter(Boolean) as string[]);

  let skippedExisting = 0;
  const records: Prisma.DoctorCreateManyInput[] = [];

  for (const d of dentists) {
    const sourceKey = sourceKeyFor(d);
    if (usedKeys.has(sourceKey)) {
      skippedExisting++;
      continue;
    }
    usedKeys.add(sourceKey);

    // slug: emri-mbiemri-stomatolog (+suffix numerik në kolizion)
    const base = slugify(d.firstName, d.lastName, "stomatolog");
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);

    records.push({
      firstName: d.firstName,
      lastName: d.lastName,
      alternativeLastName: d.alternativeLastName,
      slug,
      specialtyId: specialty.id,
      cityId: null,
      clinicId: null,
      licenseExpiry: d.licenseExpiry ? new Date(d.licenseExpiry) : null,
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
  console.log("---");
  console.log(`Të krijuar tani: ${created}`);
  console.log(`Të skipuar (ekzistonin): ${skippedExisting}`);
  console.log(`Total stomatologë USSH në DB: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
