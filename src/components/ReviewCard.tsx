import { useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";
import Stars from "./Stars";
import ReportButton from "./ReportButton";

export default function ReviewCard({
  review,
}: {
  review: {
    id: string;
    rating: number;
    text: string;
    visitMonth: number;
    visitYear: number;
    nickname: string;
    language: string;
  };
}) {
  const t = useTranslations("profile");
  const tm = useTranslations("months");

  return (
    <article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-gray-900">{review.nickname}</span>
        <Stars rating={review.rating} size={14} />
        <span className="inline-flex items-center gap-1 rounded-full bg-trust-light px-2 py-0.5 text-xs font-medium text-trust">
          <BadgeCheck size={12} aria-hidden />
          {t("verified")}
        </span>
      </div>
      <p className="mb-2 text-xs text-gray-400">
        {t("visit", { month: tm(String(review.visitMonth)), year: review.visitYear })}
      </p>
      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{review.text}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {review.language}
        </span>
        <ReportButton reviewId={review.id} />
      </div>
    </article>
  );
}
