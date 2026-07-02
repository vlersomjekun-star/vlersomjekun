"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuthGate } from "./auth/AuthGate";
import ReportButton from "./ReportButton";

export type CommentData = {
  id: string;
  text: string;
  nickname: string;
  createdAt: string; // ISO
};

export default function CommentSection({
  reviewId,
  comments,
  viewerLoggedIn,
  locale,
}: {
  reviewId: string;
  comments: CommentData[];
  viewerLoggedIn: boolean;
  locale: string;
}) {
  const t = useTranslations("comments");
  const tc = useTranslations("common");
  const router = useRouter();
  const { requireAuth, openGate } = useAuthGate();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!requireAuth()) return;
    if (text.trim().length < 2) return;
    setPending(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, text: text.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (["AUTH_REQUIRED", "EMAIL_NOT_VERIFIED", "NICKNAME_REQUIRED"].includes(data.error)) {
          requireAuth();
        } else {
          setError(tc("error"));
        }
        setPending(false);
        return;
      }
      setText("");
      setPending(false);
      router.refresh();
    } catch {
      setError(tc("error"));
      setPending(false);
    }
  }

  return (
    <div className="mt-3 border-t border-gray-50 pt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition hover:text-primary"
      >
        <MessageCircle size={13} aria-hidden />
        {comments.length > 0 ? t("showComments", { count: comments.length }) : t("addComment")}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-gray-50 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-700">{c.nickname}</span>
                <span className="text-[10px] text-gray-400">
                  {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                    new Date(c.createdAt)
                  )}
                </span>
              </div>
              {viewerLoggedIn ? (
                <p className="whitespace-pre-line text-sm text-gray-600">{c.text}</p>
              ) : (
                // Blur vetëm vizual — teksti mbetet në HTML për SEO
                <button
                  onClick={() => openGate("signup")}
                  className="block w-full cursor-pointer text-left"
                  title={t("unlockComments")}
                >
                  <p className="pointer-events-none select-none whitespace-pre-line text-sm text-gray-600 blur-[5px]">
                    {c.text}
                  </p>
                </button>
              )}
              {viewerLoggedIn && (
                <div className="mt-1.5 text-right">
                  <ReportButton commentId={c.id} small />
                </div>
              )}
            </div>
          ))}

          {/* Forma e komentit — gated në klik */}
          <div className="flex items-start gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => {
                if (!viewerLoggedIn) requireAuth();
              }}
              rows={2}
              maxLength={500}
              placeholder={t("placeholder")}
              className="flex-1 rounded-lg border border-gray-200 p-2 text-sm outline-none transition focus:border-primary"
            />
            <button
              onClick={submit}
              disabled={pending || text.trim().length < 2}
              aria-label={t("send")}
              className="rounded-lg bg-primary p-2.5 text-white transition hover:bg-primary-dark disabled:opacity-40"
            >
              <Send size={16} aria-hidden />
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
