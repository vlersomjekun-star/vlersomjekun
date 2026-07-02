/**
 * HAPI 3 — Aplikimi i match-eve AUTO_MATCHED dhe CONFIRMED te Doctor.
 *
 *   npx tsx scripts/clinics/apply.ts
 *
 * Rregulla:
 * - Nuk prek kurrë mjekët createdBy: USER
 * - Nuk mbishkruan clinicId ekzistues të ndryshëm (multi-klinikë → log; nëse >5%
 *   e mjekëve dalin në shumë klinika, rekomandohet modeli many-to-many DoctorClinic)
 * - scrapedSpecialty → subSpecialty vetëm nëse ndryshon nga specialiteti UMSH
 *   dhe subSpecialty është bosh (nuk mbishkruan të dhëna manuale)
 * - photoSourceUrl: vetëm referencë e brendshme, nuk shfaqet publikisht
 * - Idempotent me log të plotë
 */
import { PrismaClient, CreatedBy, MatchStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.doctorClinicMatch.findMany({
    where: {
      matchStatus: { in: [MatchStatus.AUTO_MATCHED, MatchStatus.CONFIRMED] },
      doctorId: { not: null },
    },
    include: { doctor: { include: { specialty: true } }, clinic: true },
  });

  let linked = 0;
  let alreadyLinked = 0;
  let multiClinic = 0;
  let skippedUser = 0;
  let subSpecialtySet = 0;

  for (const m of matches) {
    const doctor = m.doctor!;
    if (doctor.createdBy === CreatedBy.USER) {
      skippedUser++;
      continue;
    }

    const data: Record<string, unknown> = {};

    if (!doctor.clinicId) {
      data.clinicId = m.clinicId;
      linked++;
    } else if (doctor.clinicId === m.clinicId) {
      alreadyLinked++;
    } else {
      multiClinic++;
      console.log(
        `  multi-klinikë: ${doctor.firstName} ${doctor.lastName} — mban ${doctor.clinicId}, gjetur edhe te ${m.clinic.name}`
      );
    }

    if (
      m.scrapedSpecialty &&
      !doctor.subSpecialty &&
      m.scrapedSpecialty.toLowerCase() !== doctor.specialty.nameSq.toLowerCase()
    ) {
      data.subSpecialty = m.scrapedSpecialty;
      subSpecialtySet++;
    }
    if (m.photoSourceUrl && !doctor.photoSourceUrl) {
      data.photoSourceUrl = m.photoSourceUrl;
    }

    if (Object.keys(data).length > 0) {
      data.enrichedAt = new Date();
      await prisma.doctor.update({ where: { id: doctor.id }, data });
    }
  }

  const totalWithClinic = linked + alreadyLinked + multiClinic;
  const multiPct = totalWithClinic > 0 ? (multiClinic / totalWithClinic) * 100 : 0;

  console.log("---");
  console.log(`Match të aplikueshëm: ${matches.length}`);
  console.log(`Lidhje të reja mjek→klinikë: ${linked}`);
  console.log(`Tashmë të lidhur (idempotent): ${alreadyLinked}`);
  console.log(`Multi-klinikë (clinicId i mbajtur, i pari): ${multiClinic} (${multiPct.toFixed(1)}%)`);
  console.log(`subSpecialty të vendosura: ${subSpecialtySet}`);
  console.log(`Të skipuar (createdBy USER): ${skippedUser}`);
  if (multiPct > 5) {
    console.log(
      "⚠ Multi-klinikë >5% — rekomandohet modeli many-to-many DoctorClinic (shih dokumentimin në krye të këtij file)"
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
