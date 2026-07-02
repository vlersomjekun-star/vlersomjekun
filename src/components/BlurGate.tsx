"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthGate } from "./auth/AuthGate";

/**
 * Mbështjell përmbajtje të renderuar nga serveri me blur VETËM vizual (CSS).
 * KRITIKE për SEO: children janë në HTML-në e serverit — Google i indekson;
 * blur-i hiqet vetëm pas login-it (faqja rirenderohet pa BlurGate).
 */
export default function BlurGate({ children }: { children: ReactNode }) {
  const t = useTranslations("gate");
  const { openGate } = useAuthGate();

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[6px]">{children}</div>
      <div className="absolute inset-0 flex justify-center">
        <div className="sticky top-40 flex h-fit flex-col items-center gap-3 self-start rounded-2xl bg-white/90 p-6 text-center shadow-lg backdrop-blur-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light text-primary">
            <Lock size={20} aria-hidden />
          </span>
          <p className="max-w-xs text-sm font-medium text-gray-700">{t("unlockText")}</p>
          <button
            onClick={() => openGate("signup")}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            {t("unlockButton")}
          </button>
          <button
            onClick={() => openGate("login")}
            className="text-xs font-medium text-gray-400 hover:text-primary"
          >
            {t("alreadyRegistered")}
          </button>
        </div>
      </div>
    </div>
  );
}
