/**
 * HAPI 4 — Importi në DB (output/doctors-clean.json → tabela Doctor)
 *
 * - Idempotent: çelësi unik sourceKey = sha256("UMSH|emri|mbiemri|specialitet|qytet")
 *   → ri-ekzekutimi nuk krijon duplikatë
 * - Nuk prek kurrë mjekët e krijuar nga përdoruesit (punon vetëm me sourceKey UMSH)
 * - Krijon qytetet Dibër/Kukës/Lezhë dhe specialitetet e reja nëse mungojnë
 *
 * Ekzekutimi:
 *   npx tsx scripts/umsh/import.ts --region=Tirane
 *   npx tsx scripts/umsh/import.ts --all
 */
import { readFileSync } from "fs";
import path from "path";
import { createHash } from "crypto";
import { Prisma, PrismaClient, ContentStatus, CreatedBy, Gender } from "@prisma/client";
import type { CleanDoctor } from "./normalize";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");
const SOURCE = "UMSH";
const SOURCE_URL = "https://urdhrimjekeve.org.al/regjistri-i-mjekeve.html";

const prisma = new PrismaClient();

// Qarqe që mungojnë në seed-in fillestar
const NEW_CITIES = [
  { nameSq: "Dibër", nameEn: "Dibra", nameIt: "Dibra", slug: "diber" },
  { nameSq: "Kukës", nameEn: "Kukes", nameIt: "Kukës", slug: "kukes" },
  { nameSq: "Lezhë", nameEn: "Lezha", nameIt: "Alessio", slug: "lezhe" },
];

function slugify(...parts: string[]): string {
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function sourceKeyFor(d: CleanDoctor): string {
  return createHash("sha256")
    .update(`${SOURCE}|${d.firstName}|${d.lastName}|${d.specialtySlug}|${d.citySlug}`.toLowerCase())
    .digest("hex");
}

async function main() {
  const args = process.argv.slice(2);
  const regionArg = args.find((a) => a.startsWith("--region="))?.split("=")[1];
  const all = args.includes("--all");
  if (!regionArg && !all) {
    console.error("Përdorimi: tsx scripts/umsh/import.ts --region=Tirane | --all");
    process.exit(1);
  }

  const doctors: CleanDoctor[] = JSON.parse(
    readFileSync(path.join(OUT_DIR, "doctors-clean.json"), "utf8")
  );
  const toImport = all
    ? doctors
    : doctors.filter((d) => d.region.toLowerCase() === regionArg!.toLowerCase());
  console.log(`Për import: ${toImport.length} mjekë (${all ? "të gjithë" : regionArg})`);

  // 1. Qytetet e reja
  for (const c of NEW_CITIES) {
    await prisma.city.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  // 2. Specialitetet e reja
  const newSpecialties: { slug: string; nameSq: string; nameEn: string; nameIt: string; icon: string }[] =
    JSON.parse(readFileSync(path.join(OUT_DIR, "specialties-new.json"), "utf8"));
  for (const s of newSpecialties) {
    await prisma.specialty.upsert({ where: { slug: s.slug }, update: {}, create: s });
  }
  console.log(`Specialitete të siguruara: ${newSpecialties.length} të reja`);

  // 3. Maps slug → id
  const cities = new Map((await prisma.city.findMany()).map((c) => [c.slug, c.id]));
  const specialties = new Map((await prisma.specialty.findMany()).map((s) => [s.slug, s.id]));

  // 4. Gjendja ekzistuese (për idempotencë dhe slug-e unike, pa N query)
  const existing = await prisma.doctor.findMany({ select: { slug: true, sourceKey: true } });
  const usedSlugs = new Set(existing.map((d) => d.slug));
  const usedKeys = new Set(existing.map((d) => d.sourceKey).filter(Boolean) as string[]);

  let skippedExisting = 0;
  const records: Prisma.DoctorCreateManyInput[] = [];

  for (const d of toImport) {
    const sourceKey = sourceKeyFor(d);
    if (usedKeys.has(sourceKey)) {
      skippedExisting++;
      continue;
    }
    usedKeys.add(sourceKey);

    const cityId = cities.get(d.citySlug);
    const specialtyId = specialties.get(d.specialtySlug);
    if (!cityId || !specialtyId) {
      console.error(`Mungon city/specialty për ${d.firstName} ${d.lastName} (${d.citySlug}, ${d.specialtySlug})`);
      continue;
    }

    const base = slugify(d.firstName, d.lastName, d.specialtySlug);
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);

    records.push({
      firstName: d.firstName,
      lastName: d.lastName,
      slug,
      specialtyId,
      cityId,
      gender: d.gender ? (d.gender as Gender) : null,
      clinicId: null, // pasurohet më vonë nga scraper-at e klinikave
      source: SOURCE,
      sourceUrl: SOURCE_URL,
      sourceKey,
      status: ContentStatus.APPROVED,
      createdBy: CreatedBy.ADMIN,
    });
  }

  // 5. Insert në grupe
  let created = 0;
  for (let i = 0; i < records.length; i += 500) {
    const chunk = records.slice(i, i + 500);
    const res = await prisma.doctor.createMany({ data: chunk, skipDuplicates: true });
    created += res.count;
    process.stdout.write(`\r  Importuar: ${created}/${records.length}`);
  }
  console.log();

  const total = await prisma.doctor.count({ where: { source: SOURCE } });
  console.log("---");
  console.log(`Të krijuar tani: ${created}`);
  console.log(`Të skipuar (ekzistonin nga import i mëparshëm): ${skippedExisting}`);
  console.log(`Total mjekë UMSH në DB: ${total}`);
  console.log("Sitemap: dinamike (force-dynamic) — përfshin automatikisht mjekët e rinj APPROVED.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
