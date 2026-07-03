import Link from "next/link";
import { SectorType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bulkAssignQsh, unlinkFamilyDoctor } from "../actions";

export const dynamic = "force-dynamic";

export default async function FamilyDoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;

  const specialty = await prisma.specialty.findUniqueOrThrow({
    where: { slug: "mjek-i-pergjithshem" },
  });

  const [cities, linkedCount, totalCount] = await Promise.all([
    prisma.city.findMany({ orderBy: { nameSq: "asc" } }),
    prisma.doctor.count({ where: { specialtyId: specialty.id, clinicId: { not: null } } }),
    prisma.doctor.count({ where: { specialtyId: specialty.id } }),
  ]);

  const doctors = await prisma.doctor.findMany({
    where: {
      specialtyId: specialty.id,
      familyLinkStatus: "UNLINKED_FAMILY_DOCTOR",
      ...(city && { city: { slug: city } }),
    },
    include: { city: true },
    orderBy: [{ city: { nameSq: "asc" } }, { lastName: "asc" }],
    take: 300,
  });

  // QSH-të e qarkut aktual (nëse filtri është aktiv) — përndryshe të gjitha QSH publike
  const qshOptions = await prisma.clinic.findMany({
    where: {
      sectorType: SectorType.PUBLIC,
      ...(city && { city: { slug: city } }),
    },
    include: { city: true },
    orderBy: { name: "asc" },
  });

  const linkedRecently = await prisma.doctor.findMany({
    where: { specialtyId: specialty.id, familyLinkStatus: "LINKED" },
    include: { city: true, clinic: true },
    orderBy: { enrichedAt: "desc" },
    take: 20,
  });

  const pct = totalCount > 0 ? Math.round((linkedCount / totalCount) * 100) : 0;

  return (
    <div>
      <h1 className="mb-2 text-xl font-bold text-gray-900">
        Mjekë Familjes — Lidhja me QSH
      </h1>
      <p className="mb-5 text-xs text-gray-400">
        Portali i Mjekut të Familjes kërkon login e-Albania (mbrojtur nga WAF) — lidhja
        bëhet manualisht, sipas njohurisë lokale të tregut. Asnjë lidhje automatike.
      </p>

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-gray-800">
            {linkedCount} / {totalCount} mjekë familjes të lidhur
          </span>
          <span className="text-gray-500">{pct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-trust" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <form method="GET" className="mb-5 flex gap-2">
        <select
          name="city"
          defaultValue={city ?? ""}
          className="rounded-lg border border-gray-200 p-2 text-sm"
        >
          <option value="">Të gjitha qarqet</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nameSq}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
          Filtro
        </button>
      </form>

      {qshOptions.length === 0 && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
          Asnjë QSH publike {city ? "për këtë qark" : ""} në DB ende. Shto QSH nga{" "}
          <Link href="/admin/manage?section=clinics" className="underline">
            Menaxho → Klinika
          </Link>{" "}
          (sectorType PUBLIC) para se të lidhësh mjekë këtu.
        </p>
      )}

      <form action={bulkAssignQsh}>
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
          <span className="text-sm font-medium text-gray-700">Cakto QSH:</span>
          <select
            name="clinicId"
            required
            className="rounded-lg border border-gray-200 p-2 text-sm"
          >
            <option value="">Zgjidh QSH-në...</option>
            {qshOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.city.nameSq})
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-trust px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Lidh të zgjedhurit
          </button>
          <span className="text-xs text-gray-400">
            (zgjidh mjekë me checkbox më poshtë, pastaj klikoni &quot;Lidh&quot;)
          </span>
        </div>

        {doctors.length === 0 ? (
          <p className="text-sm text-gray-400">Asnjë mjek familjes i palidhur me këtë filtër.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="p-3"></th>
                  <th className="p-3">Mjeku</th>
                  <th className="p-3">Qarku</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {doctors.map((d) => (
                  <tr key={d.id}>
                    <td className="p-3">
                      <input type="checkbox" name="doctorIds" value={d.id} />
                    </td>
                    <td className="p-3">
                      <a href={`/mjeku/${d.slug}`} target="_blank" className="text-primary hover:underline">
                        Dr. {d.firstName} {d.lastName}
                      </a>
                    </td>
                    <td className="p-3 text-gray-500">{d.city?.nameSq ?? "(pa qytet)"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </form>

      {linkedRecently.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-bold text-gray-800">Të lidhur së fundmi</h2>
          <div className="space-y-2">
            {linkedRecently.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                <span>
                  Dr. {d.firstName} {d.lastName} → {d.clinic?.name} ({d.city?.nameSq})
                </span>
                <form action={unlinkFamilyDoctor}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50">
                    Shkëput
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
