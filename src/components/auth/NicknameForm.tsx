"use client";

import { useActionState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setNickname, type AuthActionState } from "@/app/actions/auth";

export default function NicknameForm({ onDone }: { onDone?: () => void }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const { update } = useSession();
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(setNickname, {
    status: "idle",
  });

  useEffect(() => {
    if (state.status === "ok") {
      // rifresko token-in JWT dhe faqen që nickname-i të hyjë në fuqi
      update().then(() => {
        router.refresh();
        onDone?.();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-gray-600">{t("nicknameIntro")}</p>
      <div>
        <label htmlFor="nickname-input" className="mb-1 block text-sm font-semibold text-gray-800">
          {t("nickname")}
        </label>
        <input
          id="nickname-input"
          name="nickname"
          required
          minLength={2}
          maxLength={30}
          placeholder={t("nicknamePlaceholder")}
          className="w-full rounded-lg border border-gray-200 p-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <p className="mt-1 text-xs text-gray-400">{t("nicknameHint")}</p>
      </div>
      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
          {t("errorInvalidNickname")}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
      >
        {t("saveNickname")}
      </button>
    </form>
  );
}
