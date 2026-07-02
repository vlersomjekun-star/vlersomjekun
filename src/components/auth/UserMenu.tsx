"use client";

import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { CircleUserRound, LogOut } from "lucide-react";
import { useAuthGate } from "./AuthGate";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const { openGate } = useAuthGate();
  const t = useTranslations("auth");

  if (status === "loading") {
    return <span className="h-8 w-8 animate-pulse rounded-full bg-gray-100" aria-hidden />;
  }

  if (!session?.user?.id) {
    return (
      <button
        onClick={() => openGate("login")}
        className="rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary-light"
      >
        {t("loginButton")}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="hidden items-center gap-1.5 text-sm font-medium text-gray-700 sm:flex">
        <CircleUserRound size={18} className="text-primary" aria-hidden />
        {session.user.nickname ?? session.user.email}
      </span>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        aria-label={t("logout")}
        title={t("logout")}
        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
      >
        <LogOut size={18} />
      </button>
    </span>
  );
}
