"use client";

import { useActionState } from "react";
import { Flag, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createDoctorDispute, type ManageState } from "./actions";

export default function DisputeButton({
  reviewId,
  doctorId,
  alreadyDisputed,
}: {
  reviewId: string;
  doctorId: string;
  alreadyDisputed: boolean;
}) {
  const t = useTranslations("profile");
  const [state, formAction, pending] = useActionState<ManageState, FormData>(
    createDoctorDispute,
    { status: "idle" }
  );

  if (alreadyDisputed || state.status === "ok") {
    return (
      <p className="flex items-center gap-1 text-xs text-gray-400">
        <CheckCircle2 size={12} aria-hidden />
        {t("disputeAlreadySent")}
      </p>
    );
  }

  return (
    <details className="group mt-2">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600">
        <Flag size={12} aria-hidden />
        {t("disputeTitle")}
      </summary>
      <form action={formAction} className="mt-2 space-y-2">
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="doctorId" value={doctorId} />
        <textarea
          name="reason"
          required
          minLength={10}
          maxLength={500}
          rows={3}
          placeholder={t("disputePlaceholder")}
          className="w-full rounded-lg border border-gray-200 p-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y"
        />
        {state.status === "error" && (
          <p role="alert" className="text-xs text-red-600">
            {state.error === "ALREADY_DISPUTED" ? t("disputeAlreadySent") : t("replyError")}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl border border-red-200 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {t("disputeSubmit")}
        </button>
      </form>
    </details>
  );
}
