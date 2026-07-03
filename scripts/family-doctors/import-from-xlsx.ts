/**
 * HAPI 5 — Riimporton template-in e plotësuar manualisht (output/manual-import-template.xlsx)
 * dhe krijon/lidh QSH-të sipas njohurisë lokale të Damianos.
 *
 *   npx tsx scripts/family-doctors/import-from-xlsx.ts
 *
 * Rreshta pa QSH_Name skipohen (ende të pazgjidhur). Idempotent: nëse QSH_Name +
 * qytet ekziston tashmë si Clinic, ripërdoret në vend që të krijohet nga e para.
 */
import { readFileSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { PrismaClient, ContentStatus, CreatedBy, SectorType } from "@prisma/client";
import { slugify } from "../lib/normalize";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const FILE = path.join(DIR, "output", "manual-import-template.xlsx");

const prisma = new PrismaClient();

type Row = {
  DoctorId: string;
  FirstName: string;
  LastName: string;
  City: string;
  QSH_Name?: string;
  QSH_Address?: string;
};

async function main() {
  const wb = XLSX.read(readFileSync(FILE));
  const rows: Row[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

  let linked = 0;
  let skippedEmpty = 0;
  let qshCreated = 0;

  for (const row of rows) {
    const qshName = row.QSH_Name?.trim();
    if (!qshName) {
      skippedEmpty++;
      continue;
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: row.DoctorId } });
    if (!doctor || doctor.createdBy === "USER") continue; // mos prek mjekë të përdoruesve

    let clinic = await prisma.clinic.findFirst({
      where: { name: qshName, cityId: doctor.cityId ?? undefined },
    });
    if (!clinic && doctor.cityId) {
      clinic = await prisma.clinic.create({
        data: {
          name: qshName,
          slug: await (async () => {
            let s = slugify(qshName, row.City || "al");
            let n = 2;
            while (await prisma.clinic.findUnique({ where: { slug: s } })) s = `${slugify(qshName, row.City || "al")}-${n++}`;
            return s;
          })(),
          cityId: doctor.cityId,
          address: row.QSH_Address?.trim() || null,
          sectorType: SectorType.PUBLIC,
          source: "MANUAL_XLSX",
          status: ContentStatus.APPROVED,
          createdBy: CreatedBy.ADMIN,
        },
      });
      qshCreated++;
    }
    if (!clinic) continue;

    await prisma.doctor.update({
      where: { id: doctor.id },
      data: { clinicId: clinic.id, familyLinkStatus: "LINKED" },
    });
    linked++;
  }

  console.log(`Mjekë të lidhur: ${linked} | QSH të reja krijuara: ${qshCreated} | Rreshta ende bosh (skip): ${skippedEmpty}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
