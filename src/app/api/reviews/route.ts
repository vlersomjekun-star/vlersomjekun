import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ContentStatus,
  Language,
  ReviewStatus,
  TargetType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashIp, clientIp } from "@/lib/hash";
import { rateLimit } from "@/lib/rate-limit";
import { findBlacklistedWord } from "@/lib/blacklist";
import { textSimilarity } from "@/lib/similarity";
import { recalcRating } from "@/lib/ratings";
import { requireActionUser } from "@/lib/user-guard";

const schema = z.object({
  targetType: z.enum(["DOCTOR", "CLINIC"]),
  targetId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(30).max(3000),
  visitMonth: z.number().int().min(1).max(12),
  visitYear: z.number().int().min(2000),
  language: z.enum(["SQ", "EN", "IT"]),
});

/** Heq çdo tag HTML nga teksti i review-t. */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/\s{3,}/g, " ").trim();
}

export async function POST(req: NextRequest) {
  // Gating: login + email i verifikuar + nickname
  const guard = await requireActionUser();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.error === "AUTH_REQUIRED" ? 401 : 403 });
  }
  const user = guard.user;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const error = issue?.path[0] === "text" ? "TEXT_TOO_SHORT" : "INVALID_INPUT";
    return NextResponse.json({ error }, { status: 400 });
  }
  const data = parsed.data;

  const ipHash = hashIp(clientIp(req.headers));
  if (!rateLimit(`review-ip:${ipHash}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  // Data e vizitës: jo në të ardhmen, max 36 muaj prapa
  const now = new Date();
  const monthsAgo =
    (now.getFullYear() - data.visitYear) * 12 + (now.getMonth() + 1 - data.visitMonth);
  if (monthsAgo < 0 || monthsAgo > 36) {
    return NextResponse.json({ error: "INVALID_VISIT_DATE" }, { status: 400 });
  }

  // Target ekziston dhe është APPROVED
  const targetType = data.targetType as TargetType;
  const target =
    targetType === TargetType.DOCTOR
      ? await prisma.doctor.findUnique({ where: { id: data.targetId } })
      : await prisma.clinic.findUnique({ where: { id: data.targetId } });
  if (!target || target.status !== ContentStatus.APPROVED) {
    return NextResponse.json({ error: "TARGET_NOT_FOUND" }, { status: 404 });
  }

  const targetWhere =
    targetType === TargetType.DOCTOR
      ? { doctorId: data.targetId }
      : { clinicId: data.targetId };

  // Constraint: 1 vlerësim për profil për userId në 12 muaj
  const existing = await prisma.review.findFirst({
    where: {
      ...targetWhere,
      userId: user.id,
      status: { not: ReviewStatus.REMOVED },
      createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "ALREADY_REVIEWED" }, { status: 409 });
  }

  const text = stripHtml(data.text);
  if (text.length < 30) {
    return NextResponse.json({ error: "TEXT_TOO_SHORT" }, { status: 400 });
  }

  // ---- Filtrat automatikë: flag → PENDING (jo bllokim) ----
  let flagReason: string | null = null;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // a) i njëjti userId ka vlerësuar 2+ profile të tjera sot
  const otherToday = await prisma.review.count({
    where: {
      userId: user.id,
      createdAt: { gte: startOfDay },
      NOT: targetWhere,
    },
  });
  if (otherToday >= 2) {
    flagReason = "same-user-multiple-targets-today";
  }

  // b) similarity ≥80% me review ekzistuese të të njëjtit profil
  if (!flagReason) {
    const sameTarget = await prisma.review.findMany({
      where: { ...targetWhere, status: { not: ReviewStatus.REMOVED } },
      select: { text: true },
      take: 200,
    });
    if (sameTarget.some((r) => textSimilarity(r.text, text) >= 0.8)) {
      flagReason = "duplicate-text";
    }
  }

  // c) 3+ reviews nga i njëjti ipHash në 24h
  if (!flagReason) {
    const fromIp = await prisma.review.count({
      where: { ipHash, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (fromIp >= 3) {
      flagReason = "too-many-from-ip";
    }
  }

  // d) llogari më e re se 24 orë → moderim manual
  if (!flagReason) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { createdAt: true },
    });
    if (dbUser && dbUser.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      flagReason = "new-account";
    }
  }

  // e) fjalë nga blacklist
  if (!flagReason) {
    const word = findBlacklistedWord(text);
    if (word) flagReason = `blacklist:${word}`;
  }

  const status = flagReason ? ReviewStatus.PENDING : ReviewStatus.PUBLISHED;

  await prisma.$transaction(async (tx) => {
    await tx.review.create({
      data: {
        targetType,
        ...targetWhere,
        userId: user.id,
        rating: data.rating,
        text,
        visitMonth: data.visitMonth,
        visitYear: data.visitYear,
        nickname: user.nickname ?? "—", // snapshot
        language: data.language as Language,
        ipHash,
        status,
        flagReason,
      },
    });
    if (status === ReviewStatus.PUBLISHED) {
      await recalcRating(tx, targetType, data.targetId);
    }
  });

  return NextResponse.json({ status });
}
