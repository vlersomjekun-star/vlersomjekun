"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

type Option = { slug: string; name: string };

export default function SearchFilters({
  specialties,
  cities,
  current,
  showSpecialty,
}: {
  specialties: Option[];
  cities: Option[];
  current: { q: string; specialty?: string; city?: string; minRating?: string; type: string };
  showSpecialty: boolean;
}) {
  const t = useTranslations("search");
  const router = useRouter();

  function apply(overrides: Record<string, string | undefined>) {
    const merged = { ...current, ...overrides };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    router.push(`/kerko?${params.toString()}`);
  }

  const selectClass =
    "w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-700 outline-none focus:border-primary";

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {showSpecialty && (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-500">{t("specialty")}</span>
          <select
            value={current.specialty ?? ""}
            onChange={(e) => apply({ specialty: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">{t("all")}</option>
            {specialties.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-500">{t("city")}</span>
        <select
          value={current.city ?? ""}
          onChange={(e) => apply({ city: e.target.value || undefined })}
          className={selectClass}
        >
          <option value="">{t("all")}</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-gray-500">{t("minRating")}</span>
        <select
          value={current.minRating ?? ""}
          onChange={(e) => apply({ minRating: e.target.value || undefined })}
          className={selectClass}
        >
          <option value="">{t("all")}</option>
          <option value="3">3+ ★</option>
          <option value="4">4+ ★</option>
        </select>
      </label>
    </div>
  );
}
