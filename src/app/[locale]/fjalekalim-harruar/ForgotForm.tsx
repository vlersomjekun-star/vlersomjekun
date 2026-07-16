"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset, type AuthActionState } from "@/app/actions/auth";

export default function ForgotForm() {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthActionState, FormData>(
    requestPasswordReset,
    { status: "idle" }
  );

  if (state.status === "ok") {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <MailCheck size={44} className="mx-auto text-trust" aria-hidden />
        <h2 className="font-bold text-gray-900">{t("forgotSentTitle")}</h2>
        <p className="text-sm text-gray-500">{t("forgotSentText")}</p>
        <Link
          href="/identifikohu"
          className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
        >
          {t("loginButton")} →
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="forgot-email" className="mb-1 block text-sm font-semibold text-gray-800">
          Email
        </label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded-lg border border-gray-200 p-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
          {t("errorRateLimited")}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
      >
        {t("forgotButton")}
      </button>
      <p className="text-center text-sm text-gray-500">
        <Link href="/identifikohu" className="font-semibold text-primary hover:underline">
          ← {t("loginButton")}
        </Link>
      </p>
    </form>
  );
}
