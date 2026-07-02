import { ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishReview, removeReview } from "../actions";

export const dynamic = "force-dynamic";

const REMOVAL_REASONS = [
  ["insult", "Fyerje / gjuhë urrejtjeje"],
  ["not-medical", "Jo përvojë mjekësore"],
  ["privacy", "Të dhëna personale të të tretëve"],
  ["fake", "I rremë / i koordinuar"],
  ["other", "Tjetër"],
] as const;

export default async function ReviewModerationPage() {
  const reviews = await prisma.review.findMany({
    where: { status: ReviewStatus.PENDING },
    include: { doctor: true, clinic: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold text-gray-900">
        Vlerësime në moderim ({reviews.length})
      </h1>
      {reviews.length === 0 && <p className="text-sm text-gray-400">Asnjë vlerësim në pritje.</p>}
      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-gray-900">{r.nickname}</span>
              <span className="text-trust">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
              <span className="text-gray-400">
                → {r.doctor ? `Dr. ${r.doctor.firstName} ${r.doctor.lastName}` : r.clinic?.name}
              </span>
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                Flag: {r.flagReason ?? "?"}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(r.createdAt).toLocaleString("sq-AL")} · {r.language}
              </span>
            </div>
            <p className="mb-3 whitespace-pre-line text-sm text-gray-700">{r.text}</p>
            <div className="flex flex-wrap items-center gap-2">
              <form action={publishReview}>
                <input type="hidden" name="id" value={r.id} />
                <button className="rounded-lg bg-trust px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                  Publiko
                </button>
              </form>
              <form action={removeReview} className="flex items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <select name="reason" className="rounded-lg border border-gray-200 p-1.5 text-xs" defaultValue="other">
                  {REMOVAL_REASONS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                  Hiq
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
