"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { routing } from "@/i18n/routing";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function switchTo(next: string) {
    const qs = searchParams.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { locale: next });
  }

  return (
    <div className="flex items-center gap-1 text-sm" role="group" aria-label="Language">
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          aria-current={l === locale ? "true" : undefined}
          className={`rounded px-2 py-1 font-medium uppercase transition-colors ${
            l === locale
              ? "bg-primary text-white"
              : "text-gray-500 hover:bg-primary-light hover:text-primary"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
