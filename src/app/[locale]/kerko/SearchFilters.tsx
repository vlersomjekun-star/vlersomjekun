"use client";

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
  const router = useRouter();

  function apply(overrides: Record<string, string | undefined>) {
    const merged = { ...current, ...overrides };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    router.push(`/kerko?${params.toString()}`);
  }

  const pill =
    "shrink-0 px-3.5 py-1.5 rounded-full border text-[13px] font-semibold transition cursor-pointer whitespace-nowrap";
  const pillActive = `${pill} bg-primary border-primary text-white`;
  const pillIdle = `${pill} bg-white border-[#E8E4DA] text-[#5B6478] hover:border-primary hover:text-primary`;

  return (
    <div className="space-y-3">
      {/* Specialty pills */}
      {showSpecialty && (
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => apply({ specialty: undefined, page: undefined })}
            className={!current.specialty ? pillActive : pillIdle}
          >
            Të gjitha
          </button>
          {specialties.map((s) => (
            <button
              key={s.slug}
              onClick={() => apply({ specialty: s.slug, page: undefined })}
              className={current.specialty === s.slug ? pillActive : pillIdle}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* City pills */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => apply({ city: undefined, page: undefined })}
          className={!current.city ? pillActive : pillIdle}
        >
          Të gjitha qytetet
        </button>
        {cities.map((c) => (
          <button
            key={c.slug}
            onClick={() => apply({ city: c.slug, page: undefined })}
            className={current.city === c.slug ? pillActive : pillIdle}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Rating pills */}
      <div className="flex gap-2">
        {[
          { label: "Të gjitha", value: undefined },
          { label: "3+ ★", value: "3" },
          { label: "4+ ★", value: "4" },
        ].map(({ label, value }) => (
          <button
            key={label}
            onClick={() => apply({ minRating: value, page: undefined })}
            className={(current.minRating ?? undefined) === value ? pillActive : pillIdle}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
