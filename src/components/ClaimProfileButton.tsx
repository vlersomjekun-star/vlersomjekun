"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthGate } from "./auth/AuthGate";

/**
 * "Je ky mjek?" — hap një kërkesë claim që kalon GJITHMONË nga miratimi
 * njerëzor i adminit (asnjë verifikim automatik identiteti).
 */
export default function ClaimProfileButton({ doctorId }: { doctorId: string }) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const router = useRouter();
  const { requireAuth } = useAuthGate();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    if (!requireAuth()) return;
    setOpen(true);
  }

  async function submit() {
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, message: message.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (["AUTH_REQUIRED", "EMAIL_NOT_VERIFIED", "NICKNAME_REQUIRED"].includes(data.error)) {
          setOpen(false);
          requireAuth();
          setState("idle");
          return;
        }
        setError(data.error === "ALREADY_CLAIMED" ? t("claimAlreadyTaken") : tc("error"));
        setState("error");
        return;
      }
      setState("sent");
      router.refresh();
    } catch {
      setError(tc("error"));
      setState("error");
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="text-xs text-gray-400 hover:text-primary hover:underline"
      >
        {t("areYouThisDoctor")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t("claimTitle")}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 font-semibold text-gray-900">
                <BadgeCheck size={18} className="text-primary" aria-hidden />
                {t("claimTitle")}
              </h3>
              <button onClick={() => setOpen(false)} aria-label={tc("cancel")} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {state === "sent" ? (
              <p className="text-sm text-trust">{t("claimSent")}</p>
            ) : (
              <>
                <p className="mb-3 text-sm text-gray-600">{t("claimIntro")}</p>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="claim-message">
                  {t("claimMessageLabel")}
                </label>
                <textarea
                  id="claim-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder={t("claimMessagePlaceholder")}
                  className="mb-4 w-full rounded-lg border border-gray-200 p-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
                <button
                  onClick={submit}
                  disabled={state === "sending"}
                  className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
                >
                  {state === "sending" ? t("claimSubmitting") : t("claimSubmit")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
