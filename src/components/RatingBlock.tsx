import { useTranslations } from "next-intl";
import Stars from "./Stars";

export default function RatingBlock({
  avgRating,
  reviewCount,
  distribution,
}: {
  avgRating: number;
  reviewCount: number;
  distribution: Record<number, number>; // {5: n, 4: n, ...}
}) {
  const t = useTranslations("profile");
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:gap-8">
      <div className="flex flex-col items-center">
        <span className="text-5xl font-bold text-gray-900">
          {reviewCount > 0 ? avgRating.toFixed(1) : "–"}
        </span>
        <Stars rating={avgRating} size={20} />
        <span className="mt-1 text-xs text-gray-400">{t("outOf", { count: reviewCount })}</span>
      </div>
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] ?? 0;
          const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-8 shrink-0 text-right">
                {star} <span aria-hidden>★</span>
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-trust" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 shrink-0">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
