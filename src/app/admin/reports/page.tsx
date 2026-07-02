import { ReportStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveReportKeep, resolveReportRemove } from "../actions";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    where: { status: ReportStatus.OPEN },
    include: { review: { include: { doctor: true, clinic: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold text-gray-900">
        Raportime të hapura ({reports.length})
      </h1>
      {reports.length === 0 && <p className="text-sm text-gray-400">Asnjë raportim i hapur.</p>}
      <div className="space-y-4">
        {reports.map((rep) => (
          <div key={rep.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                Arsyeja: {rep.reason}
              </span>
              <span className="text-xs text-gray-400">
                Raportuar: {new Date(rep.createdAt).toLocaleString("sq-AL")}
              </span>
            </div>
            <div className="mb-3 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="mb-1 font-medium text-gray-800">
                {rep.review.nickname} · {"★".repeat(rep.review.rating)} →{" "}
                {rep.review.doctor
                  ? `Dr. ${rep.review.doctor.firstName} ${rep.review.doctor.lastName}`
                  : rep.review.clinic?.name}{" "}
                <span className="text-xs text-gray-400">({rep.review.status})</span>
              </p>
              <p className="whitespace-pre-line text-gray-600">{rep.review.text}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={resolveReportKeep}>
                <input type="hidden" name="id" value={rep.id} />
                <button className="rounded-lg bg-trust px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                  Mbaje vlerësimin
                </button>
              </form>
              <form action={resolveReportRemove} className="flex items-center gap-2">
                <input type="hidden" name="id" value={rep.id} />
                <input
                  name="reason"
                  placeholder="Arsyeja e heqjes"
                  className="rounded-lg border border-gray-200 p-1.5 text-xs"
                />
                <button className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                  Hiqe vlerësimin
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
