export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

/** URL absolute për një path në një locale të caktuar (sq pa prefiks). */
export function localeUrl(locale: string, path: string): string {
  const prefix = locale === "sq" ? "" : `/${locale}`;
  return `${BASE_URL}${prefix}${path === "/" ? (prefix ? "" : "/") : path}`;
}

/** Alternates hreflang për metadata API. */
export function hreflangAlternates(path: string) {
  return {
    canonical: undefined as string | undefined,
    languages: {
      sq: localeUrl("sq", path),
      en: localeUrl("en", path),
      it: localeUrl("it", path),
      "x-default": localeUrl("sq", path),
    },
  };
}
