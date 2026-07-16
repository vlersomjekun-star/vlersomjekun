"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { NetworkStarIcon } from "./NetworkStar";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuthGate } from "./auth/AuthGate";

type Props = {
  targetType: "DOCTOR" | "CLINIC";
  targetId: string;
  backHref: string;
  /** Për mjekët pa qytet (USSH): pas submit-it pyetet opsionalisht qyteti i vizitës. */
  askCity?: { cities: { slug: string; name: string }[] } | null;
};

const ERROR_KEYS: Record<string, string> = {
  RATE_LIMITED: "errorRateLimited",
  ALREADY_REVIEWED: "errorAlreadyReviewed",
  TEXT_TOO_SHORT: "errorTextTooShort",
  INVALID_VISIT_DATE: "errorVisit",
};

const GATE_ERRORS = ["AUTH_REQUIRED", "EMAIL_NOT_VERIFIED", "NICKNAME_REQUIRED"];

export default function ReviewForm({ targetType, targetId, backHref, askCity }: Props) {
  const t = useTranslations("reviewForm");
  const tm = useTranslations("months");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { requireAuth } = useAuthGate();

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [visitMonth, setVisitMonth] = useState("");
  const [visitYear, setVisitYear] = useState("");
  const [language, setLanguage] = useState(locale.toUpperCase());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"PUBLISHED" | "PENDING" | null>(null);
  const [suggestedCity, setSuggestedCity] = useState("");
  const [cityState, setCityState] = useState<"idle" | "sending" | "sent">("idle");

  async function suggestCity() {
    if (!suggestedCity) return;
    setCityState("sending");
    try {
      await fetch("/api/location-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: targetId, citySlug: suggestedCity }),
      });
    } catch {
      // opsionale — dështimi nuk bllokon asgjë
    }
    setCityState("sent");
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  function monthOptionsFor(year: number): number[] {
    const months: number[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthsAgo = (currentYear - year) * 12 + (now.getMonth() + 1 - m);
      if (monthsAgo >= 0 && monthsAgo <= 36) months.push(m);
    }
    return months;
  }

  async function submit() {
    setError(null);
    if (rating < 1) return setError(t("errorRating"));
    if (text.trim().length < 30) return setError(t("errorTextTooShort"));
    if (!visitMonth || !visitYear) return setError(t("errorVisit"));
    if (!requireAuth()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          rating,
          text: text.trim(),
          visitMonth: Number(visitMonth),
          visitYear: Number(visitYear),
          language,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (GATE_ERRORS.includes(data.error)) {
          requireAuth(); // hap modal-in e duhur
        } else {
          const key = ERROR_KEYS[data.error];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setError(key ? t(key as any) : tc("error"));
        }
        setSubmitting(false);
        return;
      }
      setResult(data.status === "PUBLISHED" ? "PUBLISHED" : "PENDING");
    } catch {
      setError(tc("error"));
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 size={48} className="mx-auto mb-4 text-trust" aria-hidden />
        <p className="mb-6 font-medium text-gray-800">
          {result === "PUBLISHED" ? t("successPublished") : t("successPending")}
        </p>

        {/* Pyetje opsionale për mjekët pa qytet (USSH) */}
        {askCity && targetType === "DOCTOR" && (
          <div className="mb-6 rounded-xl bg-gray-50 p-4 text-left">
            {cityState === "sent" ? (
              <p className="text-sm font-medium text-trust">{t("cityThanks")}</p>
            ) : (
              <>
                <p className="mb-2 text-sm font-semibold text-gray-800">{t("cityQuestion")}</p>
                <div className="flex gap-2">
                  <select
                    value={suggestedCity}
                    onChange={(e) => setSuggestedCity(e.target.value)}
                    aria-label={t("cityQuestion")}
                    className="flex-1 rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="">—</option>
                    {askCity.cities.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={suggestCity}
                    disabled={!suggestedCity || cityState === "sending"}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                  >
                    {t("citySave")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        <Link
          href={backHref}
          className="inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {t("backToProfile")}
        </Link>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 p-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
  const labelClass = "mb-1 block text-sm font-semibold text-gray-800";

  return (
    <div className="space-y-6">
      {/* 1. NetworkStar interactive picker */}
      <div>
        <span className={labelClass}>{t("ratingLabel")}</span>
        <div className="flex gap-1.5 mt-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${i}/5`}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <NetworkStarIcon
                id={`form-star-${i}`}
                fill={i <= (hover || rating) ? 1 : 0}
                size={40}
              />
            </button>
          ))}
        </div>
        {(hover || rating) > 0 && (
          <p className="mt-1.5 text-[13px] font-medium text-primary">
            {(t.raw("ratingLabels") as string[])[hover || rating]}
          </p>
        )}
      </div>

      {/* 2. Teksti */}
      <div>
        <label htmlFor="review-text" className={labelClass}>
          {t("textLabel")}
        </label>
        <textarea
          id="review-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          maxLength={3000}
          placeholder={t("textPlaceholder")}
          className={inputClass}
        />
        <p className={`mt-1 text-xs ${text.trim().length >= 30 ? "text-trust" : "text-gray-400"}`}>
          {t("charCount", { count: text.trim().length })}
        </p>
      </div>

      {/* 3. Muaji dhe viti */}
      <div>
        <span className={labelClass}>{t("visitLabel")}</span>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="sr-only">{t("year")}</span>
            <select
              value={visitYear}
              onChange={(e) => {
                setVisitYear(e.target.value);
                setVisitMonth("");
              }}
              className={inputClass}
            >
              <option value="">{t("year")}...</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">{t("month")}</span>
            <select
              value={visitMonth}
              onChange={(e) => setVisitMonth(e.target.value)}
              disabled={!visitYear}
              className={inputClass}
            >
              <option value="">{t("month")}...</option>
              {visitYear &&
                monthOptionsFor(Number(visitYear)).map((m) => (
                  <option key={m} value={m}>
                    {tm(String(m))}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>

      {/* 4. Gjuha */}
      <div>
        <label htmlFor="language" className={labelClass}>
          {t("languageLabel")}
        </label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className={inputClass}
        >
          <option value="SQ">Shqip</option>
          <option value="EN">English</option>
          <option value="IT">Italiano</option>
        </select>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {/* 5. Submit */}
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-50"
      >
        {submitting ? t("submitting") : t("submit")}
      </button>
    </div>
  );
}
