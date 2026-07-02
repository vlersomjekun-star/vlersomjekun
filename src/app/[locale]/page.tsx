import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { ReviewStatus, ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localName } from "@/lib/locale-name";
import { hreflangAlternates, localeUrl } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import SearchBar from "@/components/SearchBar";
import SpecialtyIcon from "@/components/SpecialtyIcon";
import Stars from "@/components/Stars";

export const dynamic = "force-dynamic";

const TOP_SPECIALTIES = [
  "dentist",
  "pediater",
  "gjinekolog",
  "kardiolog",
  "dermatolog",
  "okulista",
  "psikolog",
  "ortoped",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const alternates = hreflangAlternates("/");
  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
    alternates: { ...alternates, canonical: localeUrl(locale, "/") },
  };
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getTranslations("home");

  const [specialties, reviewCount, latestReviews] = await Promise.all([
    prisma.specialty.findMany({ where: { slug: { in: TOP_SPECIALTIES } } }),
    prisma.review.count({ where: { status: ReviewStatus.PUBLISHED } }),
    prisma.review.findMany({
      where: {
        status: ReviewStatus.PUBLISHED,
        OR: [
          { doctor: { status: ContentStatus.APPROVED } },
          { clinic: { status: ContentStatus.APPROVED } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { doctor: true, clinic: true },
    }),
  ]);

  const orderedSpecialties = TOP_SPECIALTIES.map((slug) =>
    specialties.find((s) => s.slug === slug)
  ).filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* Hero */}
      <section className="py-12 text-center sm:py-16">
        <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-500">{t("subtitle")}</p>
        <div className="mx-auto mt-8 max-w-2xl">
          <SearchBar large />
        </div>
        <p className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-trust">
          <ShieldCheck size={18} aria-hidden />
          {t("counterLabel", { count: reviewCount })}
        </p>
      </section>

      {/* Specialitetet */}
      <section className="py-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900">{t("specialtiesTitle")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {orderedSpecialties.map((s) => (
            <Link
              key={s.id}
              href={`/kerko?specialty=${s.slug}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm transition hover:border-primary/40 hover:shadow"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light text-primary">
                <SpecialtyIcon icon={s.icon} size={22} />
              </span>
              <span className="text-sm font-medium text-gray-800">{localName(s, locale)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Vlerësimet e fundit */}
      <section className="py-8">
        <h2 className="mb-4 text-xl font-bold text-gray-900">{t("latestReviews")}</h2>
        {latestReviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            {t("noReviewsYet")}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {latestReviews.map((r) => {
              const isDoctor = Boolean(r.doctor);
              const name = r.doctor
                ? `Dr. ${r.doctor.firstName} ${r.doctor.lastName}`
                : r.clinic?.name ?? "";
              const href = r.doctor
                ? `/mjeku/${r.doctor.slug}`
                : `/klinika/${r.clinic?.slug}`;
              const excerpt =
                r.text.length > 140 ? `${r.text.slice(0, 140).trimEnd()}…` : r.text;
              return (
                <Link
                  key={r.id}
                  href={href}
                  className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow"
                >
                  <div className="flex items-center justify-between">
                    <Stars rating={r.rating} size={14} />
                    <span className="text-xs text-gray-400">
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(r.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">“{excerpt}”</p>
                  <p className="mt-auto text-sm font-semibold text-primary">
                    {isDoctor ? name : `🏥 ${name}`}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
