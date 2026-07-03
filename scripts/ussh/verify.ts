/** HAPI 6 — Verifikim cilësie pas importit USSH. Ekzekutimi: npx tsx scripts/ussh/verify.ts */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.doctor.count({ where: { source: "USSH" } });
  const withAlt = await prisma.doctor.count({
    where: { source: "USSH", alternativeLastName: { not: null } },
  });
  const withExpiry = await prisma.doctor.count({
    where: { source: "USSH", licenseExpiry: { not: null } },
  });
  const totalDoctors = await prisma.doctor.count();
  console.log({ usshTotal: total, withAlternativeLastName: withAlt, withLicenseExpiry: withExpiry, totalDoctors });

  console.log("\n15 raste random:");
  const sample = await prisma.doctor.findMany({
    where: { source: "USSH" },
    take: 15,
    skip: Math.floor(Math.random() * (total - 15)),
    include: { specialty: true },
  });
  for (const d of sample) {
    console.log(
      `  ${d.firstName} ${d.lastName}${d.alternativeLastName ? ` (alt: ${d.alternativeLastName})` : ""} | ${d.specialty.nameSq} | city=${d.cityId ?? "null"} | /mjeku/${d.slug}`
    );
  }

  // Kërkimi duhet t'i kapë me "dentist" dhe "stomatolog" (specialty nameSq/En)
  for (const term of ["dentist", "stomatolog"]) {
    const hits = await prisma.doctor.count({
      where: {
        status: "APPROVED",
        specialty: {
          OR: [
            { nameSq: { contains: term, mode: "insensitive" } },
            { nameEn: { contains: term, mode: "insensitive" } },
            { nameIt: { contains: term, mode: "insensitive" } },
          ],
        },
      },
    });
    console.log(`\nKërkimi "${term}" → ${hits} mjekë (përmes specialitetit)`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
