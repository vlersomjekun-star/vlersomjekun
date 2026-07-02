"use client";

import { useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Props = {
  targetType: "DOCTOR" | "CLINIC";
  targetId: string;
  backHref: string;
};

const ERROR_KEYS: Record<string, string> = {
  INVALID_CODE: "errorInvalidCode",
  TOO_MANY_ATTEMPTS: "errorTooManyAttempts",
  EXPIRED: "errorExpired",
  RATE_LIMITED: "errorRateLimited",
  ALREADY_REVIEWED: "errorAlreadyReviewed",
  OTP_REQUIRED: "errorOtpRequired",
  TEXT_TOO_SHORT: "errorTextTooShort",
  INVALID_PHONE: "errorPhone",
};

export default function ReviewForm({ targetType, targetId, backHref }: Props) {
  const t = useTranslations("reviewForm");
  const tm = useTranslations("months");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [visitMonth, setVisitMonth] = useState("");
  const [visitYear, setVisitYear] = useState("");
  const [nickname, setNickname] = useState("");
  const [language, setLanguage] = useState(locale.toUpperCase());
  const [phone, setPhone] = useState("+355 ");
  const [code, setCode] = useState("");
  const [otpState, setOtpState] = useState<"idle" | "sending" | "sent" | "verifying" | "verified">("idle");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"PUBLISHED" | "PENDING" | null>(null);

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

  function mapError(codeStr: string | undefined): string {
    const key = codeStr ? ERROR_KEYS[codeStr] : undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return key ? t(key as any) : tc("error");
  }

  async function sendCode() {
    setError(null);
    if (!/^\+?[0-9\s\-()]{8,18}$/.test(phone.trim())) {
      setError(t("errorPhone"));
      return;
    }
    setOtpState("sending");
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(mapError(data.error));
        setOtpState("idle");
        return;
      }
      setOtpState("sent");
    } catch {
      setError(tc("error"));
      setOtpState("idle");
    }
  }

  async function verifyCode() {
    setError(null);
    setOtpState("verifying");
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(mapError(data.error));
        setOtpState("sent");
        return;
      }
      setOtpState("verified");
    } catch {
      setError(tc("error"));
      setOtpState("sent");
    }
  }

  async function submit() {
    setError(null);
    if (rating < 1) return setError(t("errorRating"));
    if (text.trim().length < 30) return setError(t("errorTextTooShort"));
    if (!visitMonth || !visitYear) return setError(t("errorVisit"));
    if (!nickname.trim()) return setError(t("errorNickname"));
    if (otpState !== "verified") return setError(t("errorOtpRequired"));

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
          nickname: nickname.trim(),
          language,
          phone: phone.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(mapError(data.error));
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
      {/* 1. Yjet */}
      <div>
        <span className={labelClass}>{t("ratingLabel")}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${i}/5`}
              className="p-1"
            >
              <Star
                size={36}
                className={
                  i <= (hover || rating)
                    ? "fill-trust text-trust"
                    : "fill-gray-200 text-gray-200"
                }
              />
            </button>
          ))}
        </div>
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

      {/* 4. Nofka */}
      <div>
        <label htmlFor="nickname" className={labelClass}>
          {t("nicknameLabel")}
        </label>
        <input
          id="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={30}
          placeholder={t("nicknamePlaceholder")}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-400">{t("nicknameHelp")}</p>
      </div>

      {/* 5. Gjuha */}
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

      {/* 6. Telefoni + OTP */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <label htmlFor="phone" className={labelClass}>
          {t("phoneLabel")}
        </label>
        <p className="mb-2 text-xs text-gray-400">{t("phoneHelp")}</p>
        {otpState === "verified" ? (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-trust-light px-3 py-1.5 text-sm font-medium text-trust">
            <CheckCircle2 size={16} aria-hidden />
            {t("codeVerified")}
          </p>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
                disabled={otpState === "sent" || otpState === "verifying"}
                className={inputClass}
              />
              <button
                type="button"
                onClick={sendCode}
                disabled={otpState === "sending" || otpState === "verifying"}
                className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
              >
                {t("sendCode")}
              </button>
            </div>
            {(otpState === "sent" || otpState === "verifying") && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-trust">{t("codeSent")}</p>
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    placeholder={t("codeLabel")}
                    aria-label={t("codeLabel")}
                    className={`${inputClass} tracking-[0.3em]`}
                  />
                  <button
                    type="button"
                    onClick={verifyCode}
                    disabled={code.length !== 6 || otpState === "verifying"}
                    className="shrink-0 rounded-lg bg-trust px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    {t("verifyCode")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {/* 7. Submit */}
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
