"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export default function SearchBar({
  initialQuery = "",
  large = false,
}: {
  initialQuery?: string;
  large?: boolean;
}) {
  const t = useTranslations("home");
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/kerko?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex w-full items-stretch gap-2"
      role="search"
    >
      <div className="relative flex-1">
        <Search
          size={large ? 20 : 16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className={`w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-gray-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
            large ? "py-3.5 text-base" : "py-2 text-sm"
          }`}
        />
      </div>
      <button
        type="submit"
        className={`rounded-xl bg-primary font-semibold text-white transition hover:bg-primary-dark ${
          large ? "px-6 py-3.5" : "px-4 py-2 text-sm"
        }`}
      >
        {t("searchButton")}
      </button>
    </form>
  );
}
