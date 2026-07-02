"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import GoogleButton from "./GoogleButton";

export default function LoginForm({
  googleEnabled,
  callbackUrl,
  onSuccess,
  onSwitchToSignup,
}: {
  googleEnabled: boolean;
  callbackUrl?: string;
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    if (res?.error) {
      setError(t("errorInvalidCredentials"));
      return;
    }
    router.refresh();
    if (callbackUrl) {
      router.push(callbackUrl);
    }
    onSuccess?.();
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 p-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-semibold text-gray-800">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1 block text-sm font-semibold text-gray-800">
            {t("password")}
          </label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
        >
          {t("loginButton")}
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
        {t("noAccount")}{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="font-semibold text-primary hover:underline"
        >
          {t("signupLink")}
        </button>
      </p>
    </div>
  );
}
