import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPhone, hashIp, clientIp } from "@/lib/hash";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  phone: z.string().regex(/^\+?[0-9\s\-()]{8,18}$/),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
  }

  const ipHash = hashIp(clientIp(req.headers));
  if (!rateLimit(`otp-verify:${ipHash}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const phoneHash = hashPhone(parsed.data.phone);
  const otp = await prisma.otpRequest.findFirst({
    where: { phoneHash, verified: false },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.expiresAt < new Date()) {
    return NextResponse.json({ error: "EXPIRED" }, { status: 400 });
  }
  if (otp.attempts >= 3) {
    return NextResponse.json({ error: "TOO_MANY_ATTEMPTS" }, { status: 400 });
  }
  if (otp.code !== parsed.data.code) {
    await prisma.otpRequest.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "INVALID_CODE" }, { status: 400 });
  }

  await prisma.otpRequest.update({
    where: { id: otp.id },
    data: { verified: true },
  });

  return NextResponse.json({ ok: true });
}
