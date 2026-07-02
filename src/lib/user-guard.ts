import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  email: string;
  nickname: string | null;
  verified: boolean;
};

/** User-i i loguar dhe jo i banuar, ose null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || u.banned) return null;
  return {
    id: u.id,
    email: u.email ?? "",
    nickname: u.nickname,
    verified: u.verified,
  };
}

export type GuardError = "AUTH_REQUIRED" | "EMAIL_NOT_VERIFIED" | "NICKNAME_REQUIRED";

/**
 * Guard për veprimet e mbrojtura (vlerësim, koment, shto mjek):
 * kërkon login + email të verifikuar + nickname të vendosur.
 */
export async function requireActionUser(): Promise<
  { user: SessionUser } | { error: GuardError }
> {
  const user = await getSessionUser();
  if (!user) return { error: "AUTH_REQUIRED" };
  if (!user.verified) return { error: "EMAIL_NOT_VERIFIED" };
  if (!user.nickname) return { error: "NICKNAME_REQUIRED" };
  return { user };
}
