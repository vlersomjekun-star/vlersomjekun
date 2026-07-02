"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";
import { useTranslations } from "next-intl";

const REASONS = ["insult", "notMedical", "privacy", "fake", "other"] as const;

export default function ReportButton({ reviewId }: { reviewId: string }) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    if (!reason) return;
    setState("sending");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, reason }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-gray-400 transition hover:text-red-500"
      >
        <Flag size={12} aria-hidden />
        {t("report")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={t("reportTitle")}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{t("reportTitle")}</h3>
              <button onClick={() => setOpen(false)} aria-label={tc("cancel")} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {state === "sent" ? (
              <p className="text-sm text-trust">{t("reportSent")}</p>
            ) : (
              <>
                <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor={`reason-${reviewId}`}>
                  {t("reportReason")}
                </label>
                <select
                  id={`reason-${reviewId}`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mb-4 w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">—</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {t(`reportReason${r.charAt(0).toUpperCase()}${r.slice(1)}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
                {state === "error" && <p className="mb-2 text-sm text-red-500">{tc("error")}</p>}
                <button
                  onClick={submit}
                  disabled={!reason || state === "sending"}
                  className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
                >
                  {t("reportSubmit")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
