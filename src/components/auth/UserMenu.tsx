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
      <div className="flex items-center gap-2">
        <button
          onClick={() => openGate("login")}
          className="hidden sm:block rounded-lg border-[1.5px] border-[#E8E4DA] px-[13px] py-[7px] text-[13.5px] font-semibold text-[#5B6478] transition hover:border-primary hover:text-primary"
        >
          {t("identifikohu")}
        </button>
        <button
          onClick={() => openGate("signup")}
          className="rounded-lg bg-primary px-[15px] py-[8px] text-[13.5px] font-bold text-white transition hover:bg-primary-dark"
        >
          {t("signupButton")}
        </button>
      </div>
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
