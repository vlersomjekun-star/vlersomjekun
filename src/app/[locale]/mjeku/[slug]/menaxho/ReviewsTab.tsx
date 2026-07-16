import { getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import { ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ReplyManager from "./ReplyManager";
import DisputeButton from "./DisputeButton";

const MONTHS_SQ = [
  "Jan","Shk","Mar","Pri","Maj","Qer","Kor","Gus","Sht","Tet","Nën","Dhj",
];

export default async function ReviewsTab({
  doctorId,
  doctorSlug,
}: {
  doctorId: string;
  doctorSlug: string;
}) {
  const t = await getTranslations("profile");

  const reviews = await prisma.review.findMany({
    where: { doctorId, status: ReviewStatus.PUBLISHED },
    orderBy: { createdAt: "desc" },
    include: {
      doctorReply: true,
      disputes: { where: { doctorId }, take: 1 },
    },
  });

  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
        {t("noReviewsForDoctor")}
      </p>
    );
  }

  void doctorSlug; // usato per revalidatePath in actions

  return (
    <div className="space-y-4">
      {reviews.map((r) => {
        const stars = r.rating;
        const monthLabel = MONTHS_SQ[r.visitMonth - 1] ?? String(r.visitMonth);
        const alreadyDisputed = r.disputes.length > 0;

        return (
          <article
            key={r.id}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            {/* Header: rating + data */}
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1" aria-label={`${stars} yje`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < stars ? "fill-amber-400 text-amber-400" : "text-gray-200"}
                    aria-hidden
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400">
                {monthLabel} {r.visitYear}
              </span>
            </div>

            {/* Testo recensione */}
            <p className="text-sm leading-relaxed text-gray-700">{r.text}</p>
            <p className="mt-1 text-xs text-gray-400">{r.nickname}</p>

            {/* Reply manager */}
            <ReplyManager
              reviewId={r.id}
              doctorId={doctorId}
              existingReply={
                r.doctorReply
                  ? {
                      id: r.doctorReply.id,
                      text: r.doctorReply.text,
                      createdAt: r.doctorReply.createdAt,
                    }
                  : null
              }
            />

            {/* Dispute */}
            <DisputeButton
              reviewId={r.id}
              doctorId={doctorId}
              alreadyDisputed={alreadyDisputed}
            />
          </article>
        );
      })}
    </div>
  );
}
