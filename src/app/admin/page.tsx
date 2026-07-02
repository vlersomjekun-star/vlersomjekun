import Link from "next/link";
import { ContentStatus, ReportStatus, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalReviews,
    reviewsThisWeek,
    removedReviews,
    pendingReviews,
    totalDoctors,
    totalClinics,
    pendingDoctors,
    pendingClinics,
    openReports,
  ] = await Promise.all([
    prisma.review.count(),
    prisma.review.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.review.count({ where: { status: ReviewStatus.REMOVED } }),
    prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
    prisma.doctor.count({ where: { status: ContentStatus.APPROVED } }),
    prisma.clinic.count({ where: { status: ContentStatus.APPROVED } }),
    prisma.doctor.count({ where: { status: ContentStatus.PENDING } }),
    prisma.clinic.count({ where: { status: ContentStatus.PENDING } }),
    prisma.report.count({ where: { status: ReportStatus.OPEN } }),
  ]);

  const removedPct = totalReviews > 0 ? ((removedReviews / totalReviews) * 100).toFixed(1) : "0";

  const stats = [
    { label: "Vlerësime totale", value: totalReviews },
    { label: "Vlerësime këtë javë", value: reviewsThisWeek },
    { label: "Mjekë aktivë", value: totalDoctors },
    { label: "Klinika aktive", value: totalClinics },
    { label: "% vlerësime të hequra", value: `${removedPct}%`, warn: Number(removedPct) > 5 },
  ];

  const queues = [
    { label: "Mjekë/Klinika në pritje", value: pendingDoctors + pendingClinics, href: "/admin/pending" },
    { label: "Vlerësime në moderim", value: pendingReviews, href: "/admin/reviews" },
    { label: "Raportime të hapura", value: openReports, href: "/admin/reports" },
  ];

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold text-gray-900">Statistika</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className={`text-2xl font-bold ${s.warn ? "text-red-500" : "text-gray-900"}`}>{s.value}</p>
            <p className="mt-1 text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-gray-900">Radhët e punës</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {queues.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition hover:border-primary"
          >
            <span className="text-sm font-medium text-gray-700">{q.label}</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${
                q.value > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"
              }`}
            >
              {q.value}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
