"use client";

import { useActionState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { resetPassword, type AuthActionState } from "@/app/actions/auth";

const ERROR_KEYS: Record<string, string> = {
  PASSWORD_TOO_SHORT: "errorPasswordTooShort",
  PASSWORD_MISMATCH: "errorPasswordMismatch",
  INVALID_TOKEN: "errorInvalidToken",
};

export default function ResetForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<AuthActionState, FormData>(resetPassword, {
    status: "idle",
  });

  if (state.status === "ok") {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 size={44} className="mx-auto text-trust" aria-hidden />
        <h2 className="font-bold text-gray-900">{t("resetSuccessTitle")}</h2>
        <p className="text-sm text-gray-500">{t("resetSuccessText")}</p>
        <Link
          href="/identifikohu"
          className="mt-2 inline-block w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {t("loginButton")}
        </Link>
      </div>
    );
  }

  if (state.status === "error" && state.error === "INVALID_TOKEN") {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <XCircle size={44} className="mx-auto text-red-400" aria-hidden />
        <h2 className="font-bold text-gray-900">{t("resetInvalidTitle")}</h2>
        <p className="text-sm text-gray-500">{t("resetInvalidText")}</p>
        <Link
          href="/fjalekalim-harruar"
          className="mt-2 inline-block w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {t("requestNewLink")}
        </Link>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 p-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
  const errorKey = state.status === "error" ? ERROR_KEYS[state.error ?? ""] : null;

  return (
    <form
      action={action}
      className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="reset-password" className="mb-1 block text-sm font-semibold text-gray-800">
          {t("newPassword")}
        </label>
        <input
          id="reset-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="reset-confirm" className="mb-1 block text-sm font-semibold text-gray-800">
          {t("confirmPassword")}
        </label>
        <input
          id="reset-confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
      </div>
      {errorKey && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {t(errorKey as any)}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
      >
        {t("resetButton")}
      </button>
    </form>
  );
}
