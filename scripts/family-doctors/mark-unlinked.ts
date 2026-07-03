/**
 * HAPI 3 — Shënon mjekët "Mjek i Përgjithshëm" pa klinikë si UNLINKED_FAMILY_DOCTOR,
 * në mënyrë që admini t'i shohë e t'i lidhë me QSH-në e duhur nga /admin/family-doctors.
 *
 * ASNJË lidhje automatike mjek→QSH pa të dhëna reale (Portali i Mjekut të Familjes
 * është i mbrojtur nga WAF/login — shih probe-api.ts). Lidhja bëhet VETËM manualisht.
 *
 * Ekzekutimi: npx tsx scripts/family-doctors/mark-unlinked.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const specialty = await prisma.specialty.findUniqueOrThrow({
    where: { slug: "mjek-i-pergjithshem" },
  });

  const res = await prisma.doctor.updateMany({
    where: { specialtyId: specialty.id, clinicId: null, familyLinkStatus: null },
    data: { familyLinkStatus: "UNLINKED_FAMILY_DOCTOR" },
  });

  const linked = await prisma.doctor.count({
    where: { specialtyId: specialty.id, clinicId: { not: null } },
  });
  const unlinked = await prisma.doctor.count({
    where: { specialtyId: specialty.id, familyLinkStatus: "UNLINKED_FAMILY_DOCTOR" },
  });
  const total = await prisma.doctor.count({ where: { specialtyId: specialty.id } });

  console.log(`Shënuar tani si UNLINKED_FAMILY_DOCTOR: ${res.count}`);
  console.log(`---`);
  console.log(`Mjekë familjes me klinikë: ${linked}/${total}`);
  console.log(`Mjekë familjes të palidhur: ${unlinked}/${total}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
