"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashIp, clientIp } from "@/lib/hash";
import { rateLimit } from "@/lib/rate-limit";
import { isDisposableEmail } from "@/lib/disposable-domains";
import { getEmailProvider } from "@/lib/email";
import { getSessionUser } from "@/lib/user-guard";
import { BASE_URL } from "@/lib/seo";

export type AuthActionState = {
  status: "idle" | "ok" | "error";
  error?: string;
};

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(8).max(100),
  nickname: z.string().trim().min(2).max(30),
});

async function createAndSendVerification(userId: string, email: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });
  await getEmailProvider().sendVerification(email, `${BASE_URL}/verifiko-email?token=${token}`);
}

export async function signup(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    nickname: formData.get("nickname"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return {
      status: "error",
      error:
        field === "password"
          ? "PASSWORD_TOO_SHORT"
          : field === "nickname"
            ? "INVALID_NICKNAME"
            : "INVALID_EMAIL",
    };
  }
  const { email, password, nickname } = parsed.data;

  if (isDisposableEmail(email)) {
    return { status: "error", error: "DISPOSABLE_EMAIL" };
  }

  const ipHash = hashIp(clientIp(await headers()));
  if (!rateLimit(`signup:${ipHash}`, 5, 60 * 60 * 1000)) {
    return { status: "error", error: "RATE_LIMITED" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { status: "error", error: "EMAIL_TAKEN" };
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      nickname,
      provider: AuthProvider.CREDENTIALS,
    },
  });

  try {
    await createAndSendVerification(user.id, email);
  } catch (e) {
    console.error("Dërgimi i email-it dështoi:", e);
    return { status: "error", error: "EMAIL_SEND_FAILED" };
  }

  return { status: "ok" };
}

export async function resendVerification(): Promise<AuthActionState> {
  const user = await getSessionUser();
  if (!user) return { status: "error", error: "AUTH_REQUIRED" };
  if (user.verified) return { status: "ok" };

  if (!rateLimit(`resend:${user.id}`, 3, 60 * 60 * 1000)) {
    return { status: "error", error: "RATE_LIMITED" };
  }

  try {
    await createAndSendVerification(user.id, user.email);
  } catch (e) {
    console.error("Dërgimi i email-it dështoi:", e);
    return { status: "error", error: "EMAIL_SEND_FAILED" };
  }
  return { status: "ok" };
}

/** Konsumohet nga faqja /verifiko-email (server-side). */
export async function verifyEmailToken(token: string): Promise<"ok" | "invalid" | "expired"> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!record) return "invalid";
  if (record.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { id: record.id } });
    return "expired";
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: record.user.emailVerified ?? new Date() },
    }),
    prisma.verificationToken.deleteMany({ where: { userId: record.userId } }),
  ]);
  return "ok";
}

const nicknameSchema = z.string().trim().min(2).max(30);

export async function setNickname(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const user = await getSessionUser();
  if (!user) return { status: "error", error: "AUTH_REQUIRED" };

  const parsed = nicknameSchema.safeParse(formData.get("nickname"));
  if (!parsed.success) return { status: "error", error: "INVALID_NICKNAME" };

  await prisma.user.update({
    where: { id: user.id },
    data: { nickname: parsed.data },
  });
  return { status: "ok" };
}
