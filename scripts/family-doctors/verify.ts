/** HAPI 6 — Verifikim final. Ekzekutimi: npx tsx scripts/family-doctors/verify.ts */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const specialty = await prisma.specialty.findUniqueOrThrow({ where: { slug: "mjek-i-pergjithshem" } });
  const total = await prisma.doctor.count({ where: { specialtyId: specialty.id } });
  const linked = await prisma.doctor.count({ where: { specialtyId: specialty.id, clinicId: { not: null } } });
  const unlinked = await prisma.doctor.count({ where: { specialtyId: specialty.id, familyLinkStatus: "UNLINKED_FAMILY_DOCTOR" } });

  const qshTotal = await prisma.clinic.count({ where: { sectorType: "PUBLIC" } });
  const qshByCity = await prisma.clinic.groupBy({ by: ["cityId"], where: { sectorType: "PUBLIC" }, _count: true });
  const cities = await prisma.city.findMany();

  console.log("=== Faza 6 — Verifikim final ===");
  console.log(`Mjekë familjes (Mjek i Përgjithshëm) total: ${total}`);
  console.log(`  Të lidhur me klinikë/QSH: ${linked}`);
  console.log(`  Të palidhur (UNLINKED_FAMILY_DOCTOR): ${unlinked}`);
  console.log(`\nQSH publike (sectorType PUBLIC) total: ${qshTotal}`);
  for (const b of qshByCity.sort((a, b2) => b2._count - a._count)) {
    console.log(`  ${cities.find((c) => c.id === b.cityId)?.nameSq ?? "?"}: ${b._count}`);
  }

  const totalAllDoctors = await prisma.doctor.count();
  console.log(`\nTotal profesionistë në DB (të gjitha fazat): ${totalAllDoctors}`);
  await prisma.$disconnect();
}
main().catch(console.error);
