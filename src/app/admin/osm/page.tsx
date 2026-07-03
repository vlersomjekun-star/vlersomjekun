import { MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { confirmOsmMatch, rejectOsmCandidate, createClinicFromOsm } from "../actions";

export const dynamic = "force-dynamic";

export default async function OsmPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "review" } = await searchParams;

  const [stats, cities] = await Promise.all([
    prisma.osmCandidate.groupBy({ by: ["matchStatus"], _count: true }),
    prisma.city.findMany({ orderBy: { nameSq: "asc" } }),
  ]);
  const stat = (s: MatchStatus) => stats.find((x) => x.matchStatus === s)?._count ?? 0;

  const candidates = await prisma.osmCandidate.findMany({
    where: {
      matchStatus: view === "unmatched" ? MatchStatus.UNMATCHED : MatchStatus.NEEDS_REVIEW,
    },
    include: {
      matchedDoctor: { include: { specialty: true, city: true } },
      matchedClinic: true,
    },
    // Prioritet: studio dentare private me emër personal — kategoria më e kërkuar
    orderBy: [{ amenity: "asc" }, { name: "asc" }],
    take: 200,
  });

  const btn = {
    green: "rounded-lg bg-trust px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90",
    red: "rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90",
    blue: "rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark",
  };

  return (
    <div>
      <h1 className="mb-2 text-xl font-bold text-gray-900">Vendndodhje nga OpenStreetMap</h1>
      <p className="mb-5 text-xs text-gray-400">
        Të dhëna © OpenStreetMap contributors (ODbL)
      </p>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Auto-matched", stat(MatchStatus.AUTO_MATCHED)],
          ["Në pritje review", stat(MatchStatus.NEEDS_REVIEW)],
          ["Të palidhur", stat(MatchStatus.UNMATCHED)],
          ["Të konfirmuar", stat(MatchStatus.CONFIRMED)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex gap-2 border-b border-gray-200">
        {[
          ["review", `Për review (${stat(MatchStatus.NEEDS_REVIEW)})`],
          ["unmatched", `Të palidhur — klinika të reja (${stat(MatchStatus.UNMATCHED)})`],
        ].map(([key, label]) => (
          <a
            key={key}
            href={`/admin/osm?view=${key}`}
            className={`border-b-2 px-4 py-2 text-sm font-semibold ${
              view === key
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      {candidates.length === 0 && <p className="text-sm text-gray-400">Asgjë këtu.</p>}

      <div className="space-y-3">
        {candidates.map((m) => (
          <div key={m.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded bg-gray-800 px-2 py-0.5 font-semibold text-white">
                {m.amenity}
              </span>
              {m.cityGuess && (
                <span className="rounded bg-primary-light px-2 py-0.5 font-semibold text-primary">
                  {m.cityGuess}
                </span>
              )}
              {m.matchScore != null && <span className="text-gray-400">score: {m.matchScore}</span>}
              <a
                href={`https://www.google.com/maps?q=${m.latitude},${m.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Shiko në hartë ↗
              </a>
            </div>

            <p className="font-semibold text-gray-900">{m.name}</p>
            <p className="text-sm text-gray-500">
              {[m.address, m.phone, m.website].filter(Boolean).join(" · ") || "(pa detaje shtesë)"}
            </p>

            {(m.matchedDoctor || m.matchedClinic) && (
              <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm">
                <p className="mb-1 text-[10px] font-semibold uppercase text-gray-400">
                  Kandidati në DB
                </p>
                {m.matchedDoctor && (
                  <p className="text-gray-700">
                    Dr. {m.matchedDoctor.firstName} {m.matchedDoctor.lastName} ·{" "}
                    {m.matchedDoctor.specialty.nameSq} ·{" "}
                    {m.matchedDoctor.city?.nameSq ?? "(pa qytet)"}
                  </p>
                )}
                {m.matchedClinic && <p className="text-gray-700">🏥 {m.matchedClinic.name}</p>}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {view === "review" ? (
                <>
                  <form action={confirmOsmMatch}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className={btn.green}>Konfirmo match</button>
                  </form>
                  <form action={rejectOsmCandidate}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className={btn.red}>Refuzo</button>
                  </form>
                </>
              ) : (
                <>
                  <form action={createClinicFromOsm} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <select
                      name="citySlug"
                      defaultValue={m.cityGuess ?? ""}
                      className="rounded-lg border border-gray-200 p-1.5 text-xs"
                    >
                      <option value="">Qyteti...</option>
                      {cities.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.nameSq}
                        </option>
                      ))}
                    </select>
                    <button className={btn.blue}>Krijo klinikë</button>
                  </form>
                  <form action={rejectOsmCandidate}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className={btn.red}>Injoro</button>
                  </form>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
