"use client";

import { useState, useTransition } from "react";
import { MailWarning } from "lucide-react";
import { useTranslations } from "next-intl";
import { resendVerification } from "@/app/actions/auth";

export default function VerifyNotice() {
  const t = useTranslations("auth");
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  function resend() {
    startTransition(async () => {
      const res = await resendVerification();
      if (res.status === "ok") setSent(true);
      else setError(true);
    });
  }

  return (
    <div className="space-y-4 text-center">
      <MailWarning size={44} className="mx-auto text-amber-500" aria-hidden />
      <p className="text-sm font-medium text-gray-800">{t("verifyText")}</p>
      {sent ? (
        <p className="text-sm text-trust">{t("verifySent")}</p>
      ) : (
        <button
          onClick={resend}
          disabled={pending}
          className="w-full rounded-xl border border-primary py-2.5 text-sm font-semibold text-primary transition hover:bg-primary-light disabled:opacity-50"
        >
          {t("resendButton")}
        </button>
      )}
      {error && <p className="text-sm text-red-500">{t("errorRateLimited")}</p>}
    </div>
  );
}
