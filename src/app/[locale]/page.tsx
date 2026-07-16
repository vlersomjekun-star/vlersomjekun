import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { ReviewStatus, ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localName } from "@/lib/locale-name";
import { hreflangAlternates, localeUrl } from "@/lib/seo";
import { colorForSpecialty } from "@/lib/specialty-color";
import { Link } from "@/i18n/navigation";
import SearchBar from "@/components/SearchBar";
import SpecialtyIcon from "@/components/SpecialtyIcon";
import Stars from "@/components/Stars";
import CounterStrip from "@/components/CounterStrip";
import HeroVisual from "@/components/HeroVisual";

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

  const [specialties, reviewCount, latestReviews, doctorCount, cityCount] = await Promise.all([
    prisma.specialty.findMany({
      where: { slug: { in: TOP_SPECIALTIES } },
      include: { _count: { select: { doctors: { where: { status: ContentStatus.APPROVED } } } } },
    }),
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
      take: 4,
      include: { doctor: { include: { city: true } }, clinic: true },
    }),
    prisma.doctor.count({ where: { status: ContentStatus.APPROVED } }),
    prisma.city.count(),
  ]);

  const orderedSpecialties = TOP_SPECIALTIES.map((slug) =>
    specialties.find((s) => s.slug === slug)
  ).filter((s): s is NonNullable<typeof s> => Boolean(s));

  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="mx-auto max-w-[1280px] px-8 py-16 grid grid-cols-1 gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        {/* Left */}
        <div className="vm-fade-up">
          <div className="inline-flex items-center gap-2 bg-primary-light text-primary px-4 py-2 rounded-full text-[13px] font-bold mb-5">
            {t("heroBadge")}
          </div>
          <h1 className="font-display font-extrabold text-[42px] sm:text-[54px] leading-[1.04] tracking-tight text-[#16213D] mb-5">
            {t("title")}<br />
            <span className="text-primary">{t("titleHighlight")}</span>
          </h1>
          <p className="text-[17px] leading-relaxed text-[#5B6478] max-w-[480px] mb-8">
            {t("subtitle")}
          </p>

          <div className="flex items-center gap-3 bg-white border-[1.5px] border-[#E8E4DA] rounded-2xl p-2 pl-5 shadow-[0_8px_24px_rgba(26,37,64,0.06)] max-w-[510px]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A8471" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div className="flex-1">
              <SearchBar large />
            </div>
          </div>

          <CounterStrip
            doctorCount={doctorCount}
            reviewCount={reviewCount}
            cityCount={cityCount}
          />
        </div>

        {/* Right: animated network + callout card */}
        <div className="hidden lg:block relative" aria-hidden>
          <HeroVisual />
        </div>
      </section>

      {/* ===== SPECIALITÀ ===== */}
      <section className="mx-auto max-w-[1280px] px-8 py-12">
        <h2 className="font-display font-bold text-[26px] text-[#16213D] mb-6">{t("specialtiesTitle")}</h2>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {orderedSpecialties.map((s) => {
            const c = colorForSpecialty(s.slug);
            const count = s._count.doctors;
            return (
              <Link
                key={s.id}
                href={`/kerko?specialty=${s.slug}`}
                className="group bg-white border-[1.5px] border-[#E8E4DA] rounded-2xl p-[18px] flex flex-col gap-2.5 transition hover:-translate-y-0.5"
                style={{ ["--sp-color" as string]: c.text }}
              >
                <span
                  className="flex h-[42px] w-[42px] items-center justify-center rounded-xl"
                  style={{ background: c.bg }}
                >
                  <SpecialtyIcon icon={s.icon} size={21} className="text-[--sp-color]" />
                </span>
                <div>
                  <p className="font-bold text-[14.5px] text-[#16213D]">{localName(s, locale)}</p>
                  {count > 0 && (
                    <p className="text-[11.5px] text-[#8A8471] mt-0.5">{t("specialtyCount", { count })}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ===== RECENSIONI RECENTI ===== */}
      <section className="bg-section py-12">
        <div className="mx-auto max-w-[1280px] px-8">
          <h2 className="font-display font-bold text-[26px] text-[#16213D] mb-1.5">{t("latestReviews")}</h2>
          <p className="text-[14.5px] text-[#5B6478] mb-5">
            {t("reviewsSubtitle")}
            {reviewCount > 0 && ` ${t("reviewsPublishedCount", { count: reviewCount })}`}
          </p>

          {latestReviews.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#E8E4DA] p-10 text-center text-sm text-[#8A8471]">
              {t("noReviewsYet")}
            </p>
          ) : (
            <div className="grid gap-[18px] sm:grid-cols-2">
              {latestReviews.map((r, idx) => {
                const name = r.doctor
                  ? `Dr. ${r.doctor.firstName} ${r.doctor.lastName}`
                  : r.clinic?.name ?? "";
                const href = r.doctor ? `/mjeku/${r.doctor.slug}` : `/klinika/${r.clinic?.slug}`;
                const city = r.doctor?.city ? localName(r.doctor.city, locale) : null;
                const excerpt = r.text.length > 165 ? `${r.text.slice(0, 165).trimEnd()}…` : r.text;
                return (
                  <div key={r.id} className="bg-white rounded-2xl p-[22px] border border-[#E8E4DA]">
                    <Stars rating={r.rating} size={17} idPrefix={`rev-${idx}`} />
                    <p className="mt-2.5 text-[15px] leading-[1.55] text-[#2C3345] mb-3.5">
                      &ldquo;{excerpt}&rdquo;
                    </p>
                    <div className="flex items-center justify-between border-t border-[#F0EEE4] pt-[11px]">
                      <Link href={href} className="font-bold text-[13.5px] text-primary hover:underline">
                        {name}
                      </Link>
                      <span className="text-[12px] text-[#8A8471]">
                        {city && `${city} · `}
                        {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(r.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== MANIFESTO ===== */}
      <section className="mx-auto max-w-[1280px] px-8 py-14 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {(
          [
            ["manifesto0Title", "manifesto0Text"],
            ["manifesto1Title", "manifesto1Text"],
            ["manifesto2Title", "manifesto2Text"],
          ] as const
        ).map(([titleKey, textKey]) => (
          <div key={titleKey}>
            <p className="font-display font-extrabold text-[19px] text-primary mb-2">{t(titleKey)}</p>
            <p className="text-[14px] text-[#5B6478] leading-[1.55]">{t(textKey)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
