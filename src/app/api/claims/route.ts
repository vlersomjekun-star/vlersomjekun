import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActionUser } from "@/lib/user-guard";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  doctorId: z.string().min(1),
  message: z.string().trim().max(1000).optional(),
});

/**
 * Kërkesë "Je ky mjek?" — gjithmonë kalon nga miratimi njerëzor i adminit
 * (asnjë verifikim automatik identiteti, shih DoctorClaim në schema).
 */
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

  if (!rateLimit(`claim:${user.id}`, 5, 24 * 60 * 60 * 1000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const doctor = await prisma.doctor.findUnique({ where: { id: parsed.data.doctorId } });
  if (!doctor || doctor.status !== ContentStatus.APPROVED) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (doctor.claimedByUserId) {
    return NextResponse.json({ error: "ALREADY_CLAIMED" }, { status: 409 });
  }

  const claim = await prisma.doctorClaim.upsert({
    where: { doctorId_userId: { doctorId: doctor.id, userId: user.id } },
    update: { message: parsed.data.message ?? null, status: "PENDING", reviewNote: null, reviewedAt: null },
    create: {
      doctorId: doctor.id,
      userId: user.id,
      message: parsed.data.message ?? null,
    },
  });

  return NextResponse.json({ ok: true, status: claim.status });
}
