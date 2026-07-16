import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FIELD_LABELS: Record<string, string> = {
  photoUrl:     "Foto",
  subSpecialty: "Nën-specialiteti",
  address:      "Adresa",
  phone:        "Telefoni",
  clinicId:     "Klinika (ID)",
  bio:          "Bio",
  yearsExp:     "Vitet e eksperiencës",
  languages:    "Gjuhët",
  websiteUrl1:  "Faqja web 1",
  websiteUrl2:  "Faqja web 2",
  scheduleJson: "Orari",
};

const DAY_LABELS: Record<string, string> = {
  Mon: "E hënë", Tue: "E martë", Wed: "E mërkurë", Thu: "E enjte",
  Fri: "E premte", Sat: "E shtunë", Sun: "E diel",
};

function formatValue(field: string, raw: string | null): string {
  if (!raw) return "—";
  if (field === "scheduleJson") {
    try {
      const parsed = JSON.parse(raw) as Record<string, { open: string; close: string } | null>;
      const lines = Object.entries(parsed)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => `${DAY_LABELS[k] ?? k}: ${v!.open}–${v!.close}`);
      return lines.length > 0 ? lines.join(", ") : "—";
    } catch { return raw; }
  }
  return raw;
}

export default async function DoctorAuditPage({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}) {
  const { doctorId } = await params;

  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { firstName: true, lastName: true, slug: true, claimedByUserId: true,
              claimedByUser: { select: { email: true } } },
  });
  if (!doctor) notFound();

  const logs = await prisma.doctorProfileLog.findMany({
    where: { doctorId },
    orderBy: { changedAt: "desc" },
    take: 500,
  });

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin/claims" className="text-sm text-gray-400 hover:text-primary">
          ← Pretendime
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">
          Log auditimi — Dr. {doctor.firstName} {doctor.lastName}
        </h1>
      </div>

      {doctor.claimedByUser && (
        <p className="mb-4 text-xs text-gray-400">
          Pronar: <b>{doctor.claimedByUser.email}</b> ·{" "}
          <Link href={`/mjeku/${doctor.slug}`} target="_blank" className="text-primary hover:underline">
            shiko profilin
          </Link>
        </p>
      )}

      {logs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
          Asnjë ndryshim i regjistruar ende.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Fusha</th>
                <th className="px-4 py-3 text-left">Vlera e mëparshme</th>
                <th className="px-4 py-3 text-left">Vlera e re</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-700">
                    {FIELD_LABELS[log.field] ?? log.field}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-gray-400">
                    {formatValue(log.field, log.oldValue)}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-gray-700">
                    {formatValue(log.field, log.newValue)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                    {log.changedAt.toLocaleString("sq-AL")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
