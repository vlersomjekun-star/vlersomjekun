import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const enriched = await prisma.doctor.findMany({
    where: { addressSource: "OSM" },
    include: { city: true, specialty: true },
    take: 15,
  });
  console.log(`Mjekë me addressSource OSM: ${await prisma.doctor.count({ where: { addressSource: "OSM" } })}`);
  for (const d of enriched) {
    console.log(`  ${d.firstName} ${d.lastName} | ${d.specialty.nameSq} | ${d.city?.nameSq ?? "(pa qytet)"} | ${d.address ?? "-"} | ${d.phone ?? "-"} | ${d.latitude?.toFixed(4)},${d.longitude?.toFixed(4)}`);
  }
  const gained = await prisma.doctor.count({ where: { addressSource: "OSM", source: "USSH", cityId: { not: null } } });
  console.log(`Stomatologë USSH që fituan qytet: ${gained}`);
  await prisma.$disconnect();
}
main().catch(console.error);
