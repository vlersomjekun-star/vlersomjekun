import { useTranslations } from "next-intl";
import { BadgeCheck } from "lucide-react";
import Stars from "./Stars";
import ReportButton from "./ReportButton";
import CommentSection, { type CommentData } from "./CommentSection";

function hashId(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export default function ReviewCard({
  review,
  comments = [],
  viewerLoggedIn = false,
  locale = "sq",
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
  comments?: CommentData[];
  viewerLoggedIn?: boolean;
  locale?: string;
}) {
  const t = useTranslations("profile");
  const tm = useTranslations("months");

  const borderColor =
    review.rating >= 4 ? "border-l-trust" : review.rating === 3 ? "border-l-yellow-400" : "border-l-orange-400";

  return (
    <article className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm border-l-4 ${borderColor}`}>
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold text-gray-900">{review.nickname}</span>
        <Stars rating={review.rating} size={14} idPrefix={`rv-${hashId(review.id)}`} />
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
      <CommentSection
        reviewId={review.id}
        comments={comments}
        viewerLoggedIn={viewerLoggedIn}
        locale={locale}
      />
    </article>
  );
}
