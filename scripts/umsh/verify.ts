/** HAPI 5 — Verifikim cilësie pas importit. Ekzekutimi: npx tsx scripts/umsh/verify.ts */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.doctor.count();
  const umsh = await prisma.doctor.count({ where: { source: "UMSH" } });
  const tirana = await prisma.doctor.count({
    where: { source: "UMSH", city: { slug: "tirane" } },
  });
  const genderNull = await prisma.doctor.count({ where: { source: "UMSH", gender: null } });
  const userCreated = await prisma.doctor.count({ where: { createdBy: "USER" } });

  console.log({ total, umsh, tirana, genderNull, userCreated });

  const sample = await prisma.doctor.findMany({
    where: { source: "UMSH" },
    take: 8,
    skip: Math.floor(Math.random() * 5000),
    include: { specialty: true, city: true },
  });
  for (const d of sample) {
    console.log(
      `${d.firstName} ${d.lastName} | ${d.gender ?? "-"} | ${d.specialty.nameSq} | ${d.city.nameSq} | /mjeku/${d.slug}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
