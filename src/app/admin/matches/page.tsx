import { MatchStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { confirmMatch, rejectMatch, createDoctorFromMatch } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  ["NEEDS_REVIEW", "Në pritje review"],
  ["NEW_DOCTOR", "Mjekë të rinj"],
  ["AUTO_MATCHED", "Auto-matched"],
  ["CONFIRMED", "Të konfirmuar"],
  ["REJECTED", "Të refuzuar"],
] as const;

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; clinic?: string }>;
}) {
  const sp = await searchParams;
  const status = (sp.status as MatchStatus) || undefined;
  const clinicId = sp.clinic || undefined;

  const where: Prisma.DoctorClinicMatchWhereInput = {
    ...(status
      ? { matchStatus: status }
      : { matchStatus: { in: [MatchStatus.NEEDS_REVIEW, MatchStatus.NEW_DOCTOR] } }),
    ...(clinicId && { clinicId }),
  };

  const [matches, clinics, stats] = await Promise.all([
    prisma.doctorClinicMatch.findMany({
      where,
      include: {
        clinic: true,
        doctor: { include: { specialty: true, city: true } },
      },
      orderBy: [{ clinicId: "asc" }, { scrapedLastName: "asc" }],
      take: 200,
    }),
    prisma.clinic.findMany({
      where: { doctorMatches: { some: {} } },
      orderBy: { name: "asc" },
    }),
    prisma.doctorClinicMatch.groupBy({ by: ["matchStatus"], _count: true }),
  ]);

  const statCount = (s: MatchStatus) => stats.find((x) => x.matchStatus === s)?._count ?? 0;
  const total = stats.reduce((sum, s) => sum + s._count, 0);
  const autoPct = total > 0 ? ((statCount(MatchStatus.AUTO_MATCHED) / total) * 100).toFixed(0) : "0";

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold text-gray-900">Përputhjet mjek → klinikë</h1>

      {/* Statistika */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Total scraped", total],
          [`Auto-matched (${autoPct}%)`, statCount(MatchStatus.AUTO_MATCHED)],
          ["Në pritje review", statCount(MatchStatus.NEEDS_REVIEW)],
          ["Mjekë të rinj", statCount(MatchStatus.NEW_DOCTOR)],
          ["Të konfirmuar", statCount(MatchStatus.CONFIRMED)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtra */}
      <form method="GET" className="mb-5 flex flex-wrap gap-2">
        <select name="status" defaultValue={sp.status ?? ""} className="rounded-lg border border-gray-200 p-2 text-sm">
          <option value="">Review + Të rinj</option>
          {STATUS_OPTIONS.map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
        <select name="clinic" defaultValue={sp.clinic ?? ""} className="rounded-lg border border-gray-200 p-2 text-sm">
          <option value="">Të gjitha klinikat</option>
          {clinics.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
          Filtro
        </button>
      </form>

      {matches.length === 0 && <p className="text-sm text-gray-400">Asnjë përputhje për këto filtra.</p>}

      <div className="space-y-3">
        {matches.map((m) => (
          <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-primary-light px-2 py-0.5 font-semibold text-primary">
                {m.clinic.name}
              </span>
              <span
                className={`rounded px-2 py-0.5 font-semibold ${
                  m.matchStatus === "NEW_DOCTOR"
                    ? "bg-purple-100 text-purple-700"
                    : m.matchStatus === "NEEDS_REVIEW"
                      ? "bg-amber-100 text-amber-700"
                      : m.matchStatus === "CONFIRMED"
                        ? "bg-trust-light text-trust"
                        : m.matchStatus === "REJECTED"
                          ? "bg-red-100 text-red-600"
                          : "bg-gray-100 text-gray-600"
                }`}
              >
                {m.matchStatus}
              </span>
              {m.matchScore != null && <span className="text-gray-400">score: {m.matchScore}</span>}
            </div>

            {/* Krahasim: scraped vs kandidati UMSH */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">Nga faqja e klinikës</p>
                <p className="font-semibold text-gray-900">
                  {m.scrapedTitle && <span className="font-normal text-gray-500">{m.scrapedTitle} </span>}
                  {m.scrapedFirstName} {m.scrapedLastName}
                </p>
                <p className="text-gray-600">{m.scrapedSpecialty ?? "(pa specialitet)"}</p>
                {m.profileUrl && (
                  <a href={m.profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                    Profili në faqen e klinikës ↗
                  </a>
                )}
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">Kandidati UMSH</p>
                {m.doctor ? (
                  <>
                    <p className="font-semibold text-gray-900">
                      {m.doctor.firstName} {m.doctor.lastName}
                    </p>
                    <p className="text-gray-600">
                      {m.doctor.specialty.nameSq} · {m.doctor.city?.nameSq ?? "(pa qytet)"}
                    </p>
                    <a href={`/mjeku/${m.doctor.slug}`} target="_blank" className="text-xs text-primary hover:underline">
                      Shiko profilin ↗
                    </a>
                  </>
                ) : (
                  <p className="italic text-gray-400">Asnjë kandidat në regjistrin UMSH</p>
                )}
              </div>
            </div>

            {(m.matchStatus === "NEEDS_REVIEW" || m.matchStatus === "NEW_DOCTOR") && (
              <div className="mt-3 flex flex-wrap gap-2">
                {m.doctorId && (
                  <form action={confirmMatch}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className="rounded-lg bg-trust px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                      Konfirmo match
                    </button>
                  </form>
                )}
                <form action={createDoctorFromMatch}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark">
                    Krijo mjek të ri
                  </button>
                </form>
                <form action={rejectMatch}>
                  <input type="hidden" name="id" value={m.id} />
                  <button className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                    Refuzo
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
