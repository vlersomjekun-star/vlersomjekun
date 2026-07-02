import { Prisma, ReviewStatus, TargetType } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Rillogarit avgRating dhe reviewCount (fusha të denormalizuara) për një mjek ose klinikë.
 * Thirret brenda të njëjtit transaction sa herë një review publikohet ose hiqet.
 */
export async function recalcRating(tx: Tx, targetType: TargetType, targetId: string): Promise<void> {
  const where =
    targetType === TargetType.DOCTOR
      ? { doctorId: targetId, status: ReviewStatus.PUBLISHED }
      : { clinicId: targetId, status: ReviewStatus.PUBLISHED };

  const agg = await tx.review.aggregate({
    where,
    _avg: { rating: true },
    _count: true,
  });

  const data = {
    avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
    reviewCount: agg._count,
  };

  if (targetType === TargetType.DOCTOR) {
    await tx.doctor.update({ where: { id: targetId }, data });
  } else {
    await tx.clinic.update({ where: { id: targetId }, data });
  }
}
