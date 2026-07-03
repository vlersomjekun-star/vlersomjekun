/** HAPI 6 — Verifikim cilësie pas importit. Ekzekutimi: npx tsx scripts/psychologists/verify.ts */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.doctor.count({ where: { source: "URDHRI_PSIKOLOGUT" } });
  const withCity = await prisma.doctor.count({
    where: { source: "URDHRI_PSIKOLOGUT", cityId: { not: null } },
  });
  const withAlt = await prisma.doctor.count({
    where: { source: "URDHRI_PSIKOLOGUT", alternativeLastName: { not: null } },
  });
  console.log({ total, withCity, withoutCity: total - withCity, withAlternativeLastName: withAlt });

  const byCity = await prisma.doctor.groupBy({
    by: ["cityId"],
    where: { source: "URDHRI_PSIKOLOGUT" },
    _count: true,
  });
  const cities = await prisma.city.findMany();
  console.log("\nShpërndarja për qytet:");
  for (const b of byCity.sort((a, b2) => b2._count - a._count)) {
    const name = b.cityId ? cities.find((c) => c.id === b.cityId)?.nameSq : "(pa qytet)";
    console.log(`  ${name}: ${b._count}`);
  }

  console.log("\n15 raste random:");
  const sample = await prisma.doctor.findMany({
    where: { source: "URDHRI_PSIKOLOGUT" },
    take: 15,
    skip: Math.floor(Math.random() * (total - 15)),
    include: { specialty: true, city: true },
  });
  for (const d of sample) {
    console.log(
      `  ${d.firstName} ${d.lastName}${d.alternativeLastName ? ` (alt: ${d.alternativeLastName})` : ""} | ${d.specialty.nameSq} | ${d.city?.nameSq ?? "(pa qytet)"} | /mjeku/${d.slug}`
    );
  }

  const hits = await prisma.doctor.count({
    where: {
      status: "APPROVED",
      city: { slug: "tirane" },
      specialty: { nameSq: { contains: "psikolog", mode: "insensitive" } },
    },
  });
  console.log(`\nKërkimi "psikolog Tiranë" → ${hits} rezultate`);

  await prisma.$disconnect();
}

main().catch(console.error);
