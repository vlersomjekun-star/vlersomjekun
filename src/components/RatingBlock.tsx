import { useTranslations } from "next-intl";
import { NetworkStarRating } from "./NetworkStar";

export default function RatingBlock({
  avgRating,
  reviewCount,
  distribution,
  idPrefix = "rb",
}: {
  avgRating: number;
  reviewCount: number;
  distribution: Record<number, number>;
  idPrefix?: string;
}) {
  const t = useTranslations("profile");
  return (
    <div className="flex flex-col gap-4 rounded-2xl border-[1.5px] border-[#E8E4DA] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:gap-8">
      <div className="flex flex-col items-center">
        <span className="font-display font-extrabold text-[52px] leading-none text-[#16213D]">
          {reviewCount > 0 ? avgRating.toFixed(1) : "–"}
        </span>
        <NetworkStarRating rating={avgRating} size={20} idPrefix={idPrefix} />
        <span className="mt-1.5 text-xs text-[#8A8471]">{t("outOf", { count: reviewCount })}</span>
      </div>
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] ?? 0;
          const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-[#8A8471]">
              <span className="w-4 shrink-0 text-right font-bold">{star}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F0EEE4]">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 shrink-0 tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
