import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CommentStatus, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/user-guard";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  reviewId: z.string().min(1),
  text: z.string().trim().min(2).max(500),
});

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/\s{3,}/g, " ").trim();
}

export async function POST(req: NextRequest) {
  const guard = await requireActionUser();
  if ("error" in guard) {
    return NextResponse.json(
      { error: guard.error },
      { status: guard.error === "AUTH_REQUIRED" ? 401 : 403 }
    );
  }
  const user = guard.user;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  if (!rateLimit(`comment:${user.id}`, 20, 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const review = await prisma.review.findUnique({
    where: { id: parsed.data.reviewId },
  });
  if (!review || review.status !== ReviewStatus.PUBLISHED) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const text = stripHtml(parsed.data.text);
  if (text.length < 2) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const comment = await prisma.reviewComment.create({
    data: {
      reviewId: review.id,
      userId: user.id,
      text,
      status: CommentStatus.PUBLISHED,
    },
  });

  return NextResponse.json({ ok: true, id: comment.id });
}
