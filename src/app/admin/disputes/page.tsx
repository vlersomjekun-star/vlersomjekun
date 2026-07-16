import Link from "next/link";
import { DisputeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { dismissDispute, resolveDispute } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<DisputeStatus, { label: string; cls: string }> = {
  OPEN:      { label: "Hapur",    cls: "bg-yellow-100 text-yellow-700" },
  DISMISSED: { label: "Refuzuar", cls: "bg-gray-100 text-gray-500" },
  RESOLVED:  { label: "Zgjidhur", cls: "bg-green-100 text-green-700" },
};

export default async function DisputesPage() {
  const disputes = await prisma.doctorDispute.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      doctor: { select: { firstName: true, lastName: true, slug: true } },
      review: { select: { id: true, rating: true, text: true, nickname: true, visitMonth: true, visitYear: true, status: true } },
    },
  });

  const open      = disputes.filter((d) => d.status === DisputeStatus.OPEN);
  const closed    = disputes.filter((d) => d.status !== DisputeStatus.OPEN);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-gray-900">Kontestime ({disputes.length})</h1>
      <p className="mb-6 text-xs text-gray-400">
        Kontestimet nuk ndikojnë automatikisht mbi recensimet — vendimi është i admini.
      </p>

      <h2 className="mb-3 font-semibold text-gray-800">Të hapura ({open.length})</h2>
      {open.length === 0 && (
        <p className="mb-8 text-sm text-gray-400">Asnjë kontestim i hapur.</p>
      )}
      <div className="mb-8 space-y-4">
        {open.map((d) => (
          <DisputeCard key={d.id} d={d} showActions />
        ))}
      </div>

      {closed.length > 0 && (
        <>
          <h2 className="mb-3 font-semibold text-gray-800">Të mbyllura ({closed.length})</h2>
          <div className="space-y-3">
            {closed.map((d) => (
              <DisputeCard key={d.id} d={d} showActions={false} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DisputeCard({
  d,
  showActions,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  d: any;
  showActions: boolean;
}) {
  const badge = STATUS_BADGE[d.status as DisputeStatus];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={`/mjeku/${d.doctor.slug}`}
            target="_blank"
            className="font-semibold text-primary hover:underline"
          >
            Dr. {d.doctor.firstName} {d.doctor.lastName}
          </Link>
          <span className="text-gray-400">konteston</span>
          <span className="text-gray-500">
            recensionin e &quot;{d.review.nickname}&quot; ({d.review.visitMonth}/{d.review.visitYear})
          </span>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Recensioni in questione */}
      <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Recensioni ({d.review.rating}★) · status: {d.review.status}
        </p>
        <p className="line-clamp-3">{d.review.text}</p>
      </div>

      {/* Motivo contestazione */}
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Arsyeja e mjekut
        </p>
        <p className="whitespace-pre-line text-sm text-gray-700">{d.reason}</p>
      </div>

      {d.adminNote && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Shënim admini
          </p>
          <p className="text-sm text-gray-500">{d.adminNote}</p>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Dërguar: {new Date(d.createdAt).toLocaleString("sq-AL")}
      </p>

      {showActions && (
        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
          <form action={dismissDispute} className="flex items-center gap-2">
            <input type="hidden" name="id" value={d.id} />
            <input
              name="adminNote"
              placeholder="Shënim (opsionale)"
              className="rounded-lg border border-gray-200 p-1.5 text-xs"
            />
            <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              Refuzo kontestimin
            </button>
          </form>
          <form action={resolveDispute} className="flex items-center gap-2">
            <input type="hidden" name="id" value={d.id} />
            <input
              name="adminNote"
              placeholder="Shënim (opsionale)"
              className="rounded-lg border border-gray-200 p-1.5 text-xs"
            />
            <button className="rounded-lg bg-trust px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
              Shëno zgjidhur
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
