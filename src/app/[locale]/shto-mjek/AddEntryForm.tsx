"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { submitEntry, type SubmitState } from "./actions";

type Option = { id: string; name: string };

export default function AddEntryForm({
  specialties,
  cities,
  clinics,
}: {
  specialties: Option[];
  cities: Option[];
  clinics: string[];
}) {
  const t = useTranslations("addDoctor");
  const [type, setType] = useState<"doctor" | "clinic">("doctor");
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(submitEntry, {
    status: "idle",
  });

  if (state.status === "ok") {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 size={48} className="mx-auto mb-4 text-trust" aria-hidden />
        <h2 className="mb-2 text-lg font-bold text-gray-900">{t("successTitle")}</h2>
        <p className="mb-6 text-sm text-gray-600">{t("success")}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {t("addAnother")}
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 p-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
  const labelClass = "mb-1 block text-sm font-semibold text-gray-800";
  const optional = <span className="font-normal text-gray-400"> ({t("optional")})</span>;

  return (
    <form action={formAction} className="space-y-5">
      {/* Toggle Mjek | Klinikë */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
        {(["doctor", "clinic"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setType(v)}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              type === v ? "bg-white text-primary shadow-sm" : "text-gray-500"
            }`}
          >
            {v === "doctor" ? t("typeDoctor") : t("typeClinic")}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />

      {type === "doctor" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className={labelClass}>
                {t("firstName")} *
              </label>
              <input id="firstName" name="firstName" required className={inputClass} />
            </div>
            <div>
              <label htmlFor="lastName" className={labelClass}>
                {t("lastName")} *
              </label>
              <input id="lastName" name="lastName" required className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="specialtyId" className={labelClass}>
              {t("specialty")} *
            </label>
            <select id="specialtyId" name="specialtyId" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                {t("select")}
              </option>
              {specialties.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="clinicName" className={labelClass}>
              {t("clinicField")}
              {optional}
            </label>
            <input
              id="clinicName"
              name="clinicName"
              list="clinics-list"
              placeholder={t("clinicPlaceholder")}
              className={inputClass}
            />
            <datalist id="clinics-list">
              {clinics.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        </>
      ) : (
        <div>
          <label htmlFor="clinicName" className={labelClass}>
            {t("clinicName")} *
          </label>
          <input id="clinicName" name="clinicName" required className={inputClass} />
        </div>
      )}

      <div>
        <label htmlFor="cityId" className={labelClass}>
          {t("city")} *
        </label>
        <select id="cityId" name="cityId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            {t("select")}
          </option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="address" className={labelClass}>
          {t("address")}
          {optional}
        </label>
        <input id="address" name="address" className={inputClass} />
      </div>

      <div>
        <label htmlFor="phone" className={labelClass}>
          {t("phone")}
          {optional}
        </label>
        <input id="phone" name="phone" type="tel" className={inputClass} />
      </div>

      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input type="checkbox" name="confirmPublic" required className="mt-0.5 accent-[#1e6fb8]" />
        {t("confirmPublic")} *
      </label>

      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
          {state.error === "RATE_LIMITED" ? t("errorRateLimited") : t("errorRequired")}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary py-3.5 font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </form>
  );
}
