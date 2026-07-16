"use client";

import { useActionState, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { updateOwnProfile, type ManageState } from "./actions";

type Option = { id: string; name: string };

const DAYS = [
  { key: "Mon", tKey: "dayMon" },
  { key: "Tue", tKey: "dayTue" },
  { key: "Wed", tKey: "dayWed" },
  { key: "Thu", tKey: "dayThu" },
  { key: "Fri", tKey: "dayFri" },
  { key: "Sat", tKey: "daySat" },
  { key: "Sun", tKey: "daySun" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];
type DayState = { enabled: boolean; open: string; close: string };

function initSchedule(
  jsonStr: string | null
): Record<DayKey, DayState> {
  let parsed: Record<string, { open: string; close: string } | null> | null = null;
  if (jsonStr) {
    try { parsed = JSON.parse(jsonStr); } catch { /* ignore */ }
  }
  const result = {} as Record<DayKey, DayState>;
  for (const { key } of DAYS) {
    const entry = parsed?.[key] ?? null;
    result[key] = entry
      ? { enabled: true, open: entry.open, close: entry.close }
      : { enabled: false, open: "09:00", close: "17:00" };
  }
  return result;
}

export default function ManageForm({
  doctorId,
  clinics,
  initial,
  backHref,
}: {
  doctorId: string;
  clinics: Option[];
  initial: {
    photoUrl: string;
    subSpecialty: string;
    address: string;
    phone: string;
    clinicId: string;
    bio: string;
    yearsExp: string;
    languages: string;
    websiteUrl1: string;
    websiteUrl2: string;
    scheduleJson: string | null;
  };
  backHref: string;
}) {
  const t = useTranslations("profile");
  const [state, formAction, pending] = useActionState<ManageState, FormData>(updateOwnProfile, {
    status: "idle",
  });
  const [schedule, setSchedule] = useState(() => initSchedule(initial.scheduleJson));

  const inputClass =
    "w-full rounded-lg border border-gray-200 p-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
  const labelClass = "mb-1 block text-sm font-semibold text-gray-800";

  if (state.status === "ok") {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 size={48} className="mx-auto mb-4 text-trust" aria-hidden />
        <p className="mb-6 font-medium text-gray-800">{t("manageSaved")}</p>
        <Link
          href={backHref}
          className="inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {t("backToProfile")}
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="doctorId" value={doctorId} />

      {/* ── Foto ── */}
      <div>
        <label htmlFor="photoUrl" className={labelClass}>
          {t("manageFieldPhoto")}
        </label>
        <input
          id="photoUrl"
          name="photoUrl"
          type="url"
          defaultValue={initial.photoUrl}
          placeholder="https://..."
          className={inputClass}
        />
      </div>

      {/* ── Bio ── */}
      <div>
        <label htmlFor="bio" className={labelClass}>
          {t("manageFieldBio")}
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={initial.bio}
          maxLength={1000}
          rows={4}
          placeholder={t("bioPlaceholder")}
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* ── Anni esperienza + Lingue ── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="yearsExp" className={labelClass}>
            {t("manageFieldYearsExp")}
          </label>
          <input
            id="yearsExp"
            name="yearsExp"
            type="number"
            min={0}
            max={80}
            defaultValue={initial.yearsExp}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="languages" className={labelClass}>
            {t("manageFieldLanguages")}
          </label>
          <input
            id="languages"
            name="languages"
            defaultValue={initial.languages}
            placeholder={t("languagesPlaceholder")}
            maxLength={200}
            className={inputClass}
          />
        </div>
      </div>

      {/* ── Nën-specialiteti ── */}
      <div>
        <label htmlFor="subSpecialty" className={labelClass}>
          {t("manageFieldSubSpecialty")}
        </label>
        <input
          id="subSpecialty"
          name="subSpecialty"
          defaultValue={initial.subSpecialty}
          maxLength={120}
          className={inputClass}
        />
      </div>

      {/* ── Klinika ── */}
      <div>
        <label htmlFor="clinicId" className={labelClass}>
          {t("manageFieldClinic")}
        </label>
        <select id="clinicId" name="clinicId" defaultValue={initial.clinicId} className={inputClass}>
          <option value="">—</option>
          {clinics.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* ── Adresa ── */}
      <div>
        <label htmlFor="address" className={labelClass}>
          {t("manageFieldAddress")}
        </label>
        <input
          id="address"
          name="address"
          defaultValue={initial.address}
          maxLength={200}
          className={inputClass}
        />
      </div>

      {/* ── Telefon ── */}
      <div>
        <label htmlFor="phone" className={labelClass}>
          {t("manageFieldPhone")}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initial.phone}
          maxLength={30}
          className={inputClass}
        />
      </div>

      {/* ── Website ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="websiteUrl1" className={labelClass}>
            {t("manageFieldWebsite1")}
          </label>
          <input
            id="websiteUrl1"
            name="websiteUrl1"
            type="url"
            defaultValue={initial.websiteUrl1}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="websiteUrl2" className={labelClass}>
            {t("manageFieldWebsite2")}
          </label>
          <input
            id="websiteUrl2"
            name="websiteUrl2"
            type="url"
            defaultValue={initial.websiteUrl2}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
      </div>

      {/* ── Oraret ── */}
      <div>
        <p className={`${labelClass} mb-3`}>{t("manageFieldSchedule")}</p>
        <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 p-4">
          {DAYS.map(({ key, tKey }) => {
            const day = schedule[key];
            return (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`sched_${key}_on`}
                  name={`sched_${key}_on`}
                  value="1"
                  checked={day.enabled}
                  onChange={(e) =>
                    setSchedule((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], enabled: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 cursor-pointer accent-primary"
                />
                <label
                  htmlFor={`sched_${key}_on`}
                  className="w-24 cursor-pointer select-none text-sm font-medium text-gray-700"
                >
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {t(tKey as any)}
                </label>
                <input
                  type="time"
                  name={`sched_${key}_open`}
                  value={day.open}
                  disabled={!day.enabled}
                  onChange={(e) =>
                    setSchedule((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], open: e.target.value },
                    }))
                  }
                  className="rounded-md border border-gray-200 px-2 py-1 text-sm disabled:opacity-40"
                />
                <span className="text-xs text-gray-400">–</span>
                <input
                  type="time"
                  name={`sched_${key}_close`}
                  value={day.close}
                  disabled={!day.enabled}
                  onChange={(e) =>
                    setSchedule((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], close: e.target.value },
                    }))
                  }
                  className="rounded-md border border-gray-200 px-2 py-1 text-sm disabled:opacity-40"
                />
              </div>
            );
          })}
        </div>
      </div>

      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
          {t("manageError")}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-primary py-3 font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-50"
      >
        {t("manageSave")}
      </button>
    </form>
  );
}
