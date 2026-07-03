/**
 * HAPI 5 — Fallback: template Excel për plotësim manual (kur burimet automatike
 * s'kanë emra QSH të mjaftueshëm — rasti ynë: OSM gjeti vetëm 22 QSH, PDF FSDKSH
 * s'ka listë emrash, API është e mbrojtur nga WAF).
 *
 *   npx tsx scripts/family-doctors/generate-template.ts
 *
 * Damiano e plotëson QSH_Name/QSH_Address me njohuri lokale, pastaj:
 *   npx tsx scripts/family-doctors/import-from-xlsx.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");

const prisma = new PrismaClient();

async function main() {
  const doctors = await prisma.doctor.findMany({
    where: { familyLinkStatus: "UNLINKED_FAMILY_DOCTOR" },
    include: { specialty: true, city: true },
    orderBy: [{ city: { nameSq: "asc" } }, { lastName: "asc" }],
  });

  const rows = doctors.map((d) => ({
    DoctorId: d.id, // MOS e fshi — përdoret nga import-from-xlsx.ts për match të saktë
    FirstName: d.firstName,
    LastName: d.lastName,
    Specialty: d.specialty.nameSq,
    City: d.city?.nameSq ?? "",
    QSH_Name: "",
    QSH_Address: "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Mjekë Familjes");

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, "manual-import-template.xlsx");
  XLSX.writeFile(wb, outPath);

  console.log(`Template i gjeneruar: ${outPath}`);
  console.log(`${rows.length} mjekë familjes të palidhur, gati për plotësim manual.`);
  console.log(`Kolonat QSH_Name/QSH_Address plotësohen me njohuri lokale, pastaj:`);
  console.log(`  npx tsx scripts/family-doctors/import-from-xlsx.ts`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
