import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashIp, clientIp } from "@/lib/hash";
import { rateLimit } from "@/lib/rate-limit";

const schema = z
  .object({
    reviewId: z.string().min(1).optional(),
    commentId: z.string().min(1).optional(),
    reason: z.enum(["insult", "notMedical", "privacy", "fake", "other"]),
  })
  .refine((d) => Boolean(d.reviewId) !== Boolean(d.commentId), {
    message: "Duhet ose reviewId ose commentId",
  });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const reporterIpHash = hashIp(clientIp(req.headers));
  if (!rateLimit(`report:${reporterIpHash}`, 10, 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const { reviewId, commentId, reason } = parsed.data;

  if (reviewId) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  } else if (commentId) {
    const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
    if (!comment) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.report.create({
    data: { reviewId, commentId, reason, reporterIpHash },
  });

  return NextResponse.json({ ok: true });
}
