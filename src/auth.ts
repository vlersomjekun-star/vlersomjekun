import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { Provider } from "next-auth/providers";
import bcrypt from "bcryptjs";
import { AuthProvider, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const providers: Provider[] = [
  Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash || user.status === UserStatus.BANNED) return null;
      if (!(await bcrypt.compare(password, user.passwordHash))) return null;
      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);
if (googleEnabled) {
  providers.push(Google);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/identifikohu" },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing?.status === UserStatus.BANNED) return false;
        if (!existing) {
          // Google: email e verifikuar automatikisht; nickname kërkohet para veprimit të parë
          await prisma.user.create({
            data: {
              email,
              name: user.name ?? null,
              emailVerified: new Date(),
              provider: AuthProvider.GOOGLE,
            },
          });
        } else if (!existing.emailVerified) {
          await prisma.user.update({
            where: { email },
            data: { emailVerified: new Date() },
          });
        }
      }
      return true;
    },
    // Rifresko gjendjen nga DB në çdo lexim sesioni: ban-i dhe verifikimi
    // hyjnë në fuqi menjëherë, pa pritur skadimin e JWT-së.
    async jwt({ token, user }) {
      const email = (user?.email ?? token.email)?.toLowerCase();
      if (email) {
        const dbUser = await prisma.user.findUnique({ where: { email } });
        if (dbUser) {
          token.uid = dbUser.id;
          token.nickname = dbUser.nickname;
          token.verified = Boolean(dbUser.emailVerified);
          token.banned = dbUser.status === UserStatus.BANNED;
        } else {
          token.uid = undefined;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        session.user.id = token.uid;
        session.user.nickname = token.nickname ?? null;
        session.user.verified = Boolean(token.verified);
        session.user.banned = Boolean(token.banned);
      }
      return session;
    },
  },
});
