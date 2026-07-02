import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashIp, clientIp } from "@/lib/hash";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  reviewId: z.string().min(1),
  reason: z.enum(["insult", "notMedical", "privacy", "fake", "other"]),
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

  const review = await prisma.review.findUnique({ where: { id: parsed.data.reviewId } });
  if (!review) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.report.create({
    data: {
      reviewId: parsed.data.reviewId,
      reason: parsed.data.reason,
      reporterIpHash,
    },
  });

  return NextResponse.json({ ok: true });
}
