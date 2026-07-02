import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPhone, hashIp, clientIp } from "@/lib/hash";
import { rateLimit } from "@/lib/rate-limit";
import { getSmsProvider } from "@/lib/sms";

const schema = z.object({
  phone: z.string().regex(/^\+?[0-9\s\-()]{8,18}$/),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
  }

  const phone = parsed.data.phone;
  const phoneHash = hashPhone(phone);
  const ipHash = hashIp(clientIp(req.headers));

  // Max 3 kërkesa OTP për numër në orë + limit për IP
  if (!rateLimit(`otp:${phoneHash}`, 3, 60 * 60 * 1000) || !rateLimit(`otp-ip:${ipHash}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const code = String(randomInt(100000, 1000000));
  await prisma.otpRequest.create({
    data: {
      phoneHash,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  try {
    await getSmsProvider().sendOtp(phone, code);
  } catch (e) {
    console.error("SMS dështoi:", e);
    return NextResponse.json({ error: "SMS_FAILED" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
