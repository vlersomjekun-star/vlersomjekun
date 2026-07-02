"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MailCheck } from "lucide-react";
import { signup, type AuthActionState } from "@/app/actions/auth";
import GoogleButton from "./GoogleButton";

const ERROR_KEYS: Record<string, string> = {
  INVALID_EMAIL: "errorInvalidEmail",
  PASSWORD_TOO_SHORT: "errorPasswordTooShort",
  INVALID_NICKNAME: "errorInvalidNickname",
  DISPOSABLE_EMAIL: "errorDisposableEmail",
  EMAIL_TAKEN: "errorEmailTaken",
  RATE_LIMITED: "errorRateLimited",
  EMAIL_SEND_FAILED: "errorEmailSendFailed",
};

export default function SignupForm({
  googleEnabled,
  callbackUrl,
  onVerifyNeeded,
  onSwitchToLogin,
}: {
  googleEnabled: boolean;
  callbackUrl?: string;
  onVerifyNeeded?: () => void;
  onSwitchToLogin?: () => void;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(signup, {
    status: "idle",
  });
  const [creds, setCreds] = useState({ email: "", password: "" });
  const signedIn = useRef(false);

  // Pas regjistrimit: logohu automatikisht (veprimet mbeten të bllokuara deri në verifikim)
  useEffect(() => {
    if (state.status === "ok" && !signedIn.current && creds.email) {
      signedIn.current = true;
      signIn("credentials", { ...creds, redirect: false }).then(() => router.refresh());
    }
  }, [state.status, creds, router]);

  if (state.status === "ok") {
    return (
      <div className="space-y-4 text-center">
        <MailCheck size={44} className="mx-auto text-trust" aria-hidden />
        <p className="text-sm font-medium text-gray-800">{t("checkEmailTitle")}</p>
        <p className="text-sm text-gray-500">{t("checkEmailText")}</p>
        {onVerifyNeeded && (
          <button
            onClick={onVerifyNeeded}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            OK
          </button>
        )}
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 p-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
  const labelClass = "mb-1 block text-sm font-semibold text-gray-800";
  const errorKey = state.status === "error" ? ERROR_KEYS[state.error ?? ""] : null;

  return (
    <div className="space-y-4">
      <form
        action={formAction}
        onSubmit={(e) => {
          const fd = new FormData(e.currentTarget);
          setCreds({ email: String(fd.get("email")), password: String(fd.get("password")) });
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="signup-email" className={labelClass}>
            Email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            required
            autoComplete="username"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="signup-password" className={labelClass}>
            {t("password")}
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-400">{t("passwordHint")}</p>
        </div>
        <div>
          <label htmlFor="signup-nickname" className={labelClass}>
            {t("nickname")}
          </label>
          <input
            id="signup-nickname"
            name="nickname"
            required
            minLength={2}
            maxLength={30}
            placeholder={t("nicknamePlaceholder")}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-400">{t("nicknameHint")}</p>
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
          {t("signupButton")}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            {t("or")}
            <span className="h-px flex-1 bg-gray-200" />
          </div>
          <GoogleButton callbackUrl={callbackUrl} />
        </>
      )}

      <p className="text-center text-sm text-gray-500">
        {t("haveAccount")}{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-semibold text-primary hover:underline"
        >
          {t("loginLink")}
        </button>
      </p>
    </div>
  );
}
