import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { hreflangAlternates, localeUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("aboutTitle"),
    description: t("aboutDescription"),
    alternates: { ...hreflangAlternates("/rreth-nesh"), canonical: localeUrl(locale, "/rreth-nesh") },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about" });

  const sectionTitle = "mt-8 mb-2 text-lg font-bold text-gray-900";
  const listItem = "flex gap-2 text-sm leading-relaxed text-gray-700";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>

      <h2 className={sectionTitle}>{t("missionTitle")}</h2>
      <p className="text-sm leading-relaxed text-gray-700">{t("missionText")}</p>

      <h2 className={sectionTitle}>{t("freeTitle")}</h2>
      <p className="text-sm leading-relaxed text-gray-700">{t("freeText")}</p>

      <h2 id="rregullat" className="mt-10 text-2xl font-bold text-gray-900">
        {t("rulesTitle")}
      </h2>

      <h3 className={sectionTitle}>✅ {t("publishedTitle")}</h3>
      <ul className="space-y-1.5">
        {(["published1", "published2", "published3"] as const).map((k) => (
          <li key={k} className={listItem}>
            <span className="text-trust">•</span> {t(k)}
          </li>
        ))}
      </ul>

      <h3 className={sectionTitle}>❌ {t("removedTitle")}</h3>
      <ul className="space-y-1.5">
        {(["removed1", "removed2", "removed3", "removed4", "removed5"] as const).map((k) => (
          <li key={k} className={listItem}>
            <span className="text-red-500">•</span> {t(k)}
          </li>
        ))}
      </ul>

      <h3 className={sectionTitle}>🛡️ {t("notRemovedTitle")}</h3>
      <ul className="space-y-1.5">
        {(["notRemoved1", "notRemoved2", "notRemoved3"] as const).map((k) => (
          <li key={k} className={listItem}>
            <span className="text-primary">•</span> {t(k)}
          </li>
        ))}
      </ul>

      <h2 className={sectionTitle}>{t("moderationTitle")}</h2>
      <p className="text-sm leading-relaxed text-gray-700">{t("moderationText")}</p>

      <h2 className={sectionTitle}>{t("anonymityTitle")}</h2>
      <p className="text-sm leading-relaxed text-gray-700">{t("anonymityText")}</p>

      <h2 className={sectionTitle}>{t("contactTitle")}</h2>
      <p className="text-sm leading-relaxed text-gray-700">
        {t("contactText")}{" "}
        <a href="mailto:info@vlersomjekun.al" className="font-medium text-primary hover:underline">
          info@vlersomjekun.al
        </a>
      </p>
    </div>
  );
}
