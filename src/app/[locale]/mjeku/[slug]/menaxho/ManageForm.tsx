"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { updateOwnProfile, type ManageState } from "./actions";

type Option = { id: string; name: string };

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
  };
  backHref: string;
}) {
  const t = useTranslations("profile");
  const [state, formAction, pending] = useActionState<ManageState, FormData>(updateOwnProfile, {
    status: "idle",
  });

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
    <form action={formAction} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <input type="hidden" name="doctorId" value={doctorId} />

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

      <div>
        <label htmlFor="address" className={labelClass}>
          {t("manageFieldAddress")}
        </label>
        <input id="address" name="address" defaultValue={initial.address} className={inputClass} />
      </div>

      <div>
        <label htmlFor="phone" className={labelClass}>
          {t("manageFieldPhone")}
        </label>
        <input id="phone" name="phone" type="tel" defaultValue={initial.phone} className={inputClass} />
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
