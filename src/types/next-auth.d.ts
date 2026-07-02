import { DefaultSession } from "next-auth";
// Import i nevojshëm që augmentation-i i modulit "next-auth/jwt" të aplikohet
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nickname: string | null;
      verified: boolean;
      banned: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    nickname?: string | null;
    verified?: boolean;
    banned?: boolean;
  }
}
