/**
 * HAPI 5 — Ekzekutimi i scraper-ave (një nga një).
 *
 *   npx tsx scripts/clinics/runner.ts --site=spitali-amerikan
 *   npx tsx scripts/clinics/runner.ts --all
 *
 * Shkruan VETËM në DoctorClinicMatch (staging). Vendimet e adminit
 * (CONFIRMED/REJECTED) nuk mbishkruhen kurrë në ri-ekzekutim.
 */
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { PrismaClient, ContentStatus, CreatedBy, MatchStatus } from "@prisma/client";
import { fetchHtml } from "./lib/fetcher";
import { Matcher } from "./lib/matcher";
import { SITES } from "./sites";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");

const prisma = new PrismaClient();

async function runSite(key: string, matcher: Matcher): Promise<void> {
  const site = SITES[key];
  if (!site) throw new Error(`Site i panjohur: ${key}. Të njohur: ${Object.keys(SITES).join(", ")}`);

  console.log(`\n=== ${key} → ${site.staffUrl}`);

  // 1. Klinika: krijo nëse mungon; përditëso vetëm fushat bosh (mos prek të dhëna manuale)
  const city = await prisma.city.findUniqueOrThrow({ where: { slug: site.clinic.citySlug } });
  const existing = await prisma.clinic.findUnique({ where: { slug: site.clinic.slug } });
  const clinic = existing
    ? await prisma.clinic.update({
        where: { id: existing.id },
        data: {
          address: existing.address ?? site.clinic.address ?? null,
          phone: existing.phone ?? site.clinic.phone ?? null,
        },
      })
    : await prisma.clinic.create({
        data: {
          name: site.clinic.name,
          slug: site.clinic.slug,
          cityId: city.id,
          address: site.clinic.address ?? null,
          phone: site.clinic.phone ?? null,
          status: ContentStatus.APPROVED,
          createdBy: CreatedBy.ADMIN,
          source: "SCRAPER",
        },
      });

  // 2. Scrape
  const html = await fetchHtml(site.staffUrl);
  const scraped = site.parse(html);
  if (scraped.length < site.minExpected) {
    throw new Error(
      `STRUKTURA KA NDRYSHUAR? ${key}: u gjetën vetëm ${scraped.length} mjekë (pritej ≥${site.minExpected}) — kontrollo parser-in`
    );
  }
  console.log(`  Mjekë të scraped: ${scraped.length}`);

  // 3. Match + staging
  const counts = { AUTO_MATCHED: 0, NEEDS_REVIEW: 0, NEW_DOCTOR: 0, preserved: 0 };
  const reviewList: string[] = [];
  const newList: string[] = [];

  for (const d of scraped) {
    const result = matcher.match(d.firstName, d.lastName);

    const where = {
      clinicId_scrapedFirstName_scrapedLastName: {
        clinicId: clinic.id,
        scrapedFirstName: d.firstName,
        scrapedLastName: d.lastName,
      },
    };
    const current = await prisma.doctorClinicMatch.findUnique({ where });
    if (
      current &&
      (current.matchStatus === MatchStatus.CONFIRMED || current.matchStatus === MatchStatus.REJECTED)
    ) {
      counts.preserved++; // vendim admini — mos e prek
      continue;
    }

    const data = {
      scrapedSpecialty: d.specialty ?? null,
      scrapedTitle: d.title ?? null,
      photoSourceUrl: d.photoUrl ?? null,
      profileUrl: d.profileUrl ?? null,
      doctorId: result.doctorId,
      matchStatus: result.status as MatchStatus,
      matchScore: result.score,
    };
    await prisma.doctorClinicMatch.upsert({
      where,
      update: data,
      create: {
        clinicId: clinic.id,
        scrapedFirstName: d.firstName,
        scrapedLastName: d.lastName,
        ...data,
      },
    });

    counts[result.status]++;
    const label = `${d.firstName} ${d.lastName}${d.specialty ? ` (${d.specialty})` : ""} score=${result.score ?? "-"}`;
    if (result.status === "NEEDS_REVIEW") reviewList.push(label);
    if (result.status === "NEW_DOCTOR") newList.push(label);
  }

  // 4. Raporti
  const total = scraped.length;
  const report = [
    `# Raport scraping — ${site.clinic.name}`,
    "",
    `Data: ${new Date().toISOString()}`,
    `URL: ${site.staffUrl}`,
    "",
    `- Mjekë të gjetur: ${total}`,
    `- AUTO_MATCHED: ${counts.AUTO_MATCHED} (${((counts.AUTO_MATCHED / total) * 100).toFixed(1)}%)`,
    `- NEEDS_REVIEW: ${counts.NEEDS_REVIEW}`,
    `- NEW_DOCTOR: ${counts.NEW_DOCTOR}`,
    `- Të paprekur (vendime admini): ${counts.preserved}`,
    "",
    "## NEEDS_REVIEW",
    ...(reviewList.length ? reviewList.map((s) => `- ${s}`) : ["- asnjë"]),
    "",
    "## NEW_DOCTOR",
    ...(newList.length ? newList.map((s) => `- ${s}`) : ["- asnjë"]),
    "",
  ].join("\n");
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, `report-${key}.md`), report, "utf8");

  console.log(
    `  AUTO: ${counts.AUTO_MATCHED} | REVIEW: ${counts.NEEDS_REVIEW} | NEW: ${counts.NEW_DOCTOR} | preserved: ${counts.preserved}`
  );
  console.log(`  Raporti: scripts/clinics/output/report-${key}.md`);
}

async function main() {
  const args = process.argv.slice(2);
  const siteArg = args.find((a) => a.startsWith("--site="))?.split("=")[1];
  const all = args.includes("--all");
  if (!siteArg && !all) {
    console.error(`Përdorimi: tsx scripts/clinics/runner.ts --site=<${Object.keys(SITES).join("|")}> | --all`);
    process.exit(1);
  }

  const umsh = await prisma.doctor.findMany({
    where: { source: "UMSH" },
    include: { specialty: true },
  });
  const matcher = new Matcher(
    umsh.map((d) => ({
      id: d.id,
      firstName: d.firstName,
      lastName: d.lastName,
      specialtyName: d.specialty.nameSq,
    }))
  );
  console.log(`Baza UMSH për matching: ${umsh.length} mjekë`);

  const keys = all ? Object.keys(SITES) : [siteArg!];
  for (const key of keys) {
    await runSite(key, matcher);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
