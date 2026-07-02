import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, Phone } from "lucide-react";
import { ContentStatus, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localName } from "@/lib/locale-name";
import { hreflangAlternates, localeUrl } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import Avatar from "@/components/Avatar";
import RatingBlock from "@/components/RatingBlock";
import ReviewCard from "@/components/ReviewCard";
import ResultCard from "@/components/ResultCard";

export const dynamic = "force-dynamic";

async function getClinic(slug: string) {
  return prisma.clinic.findUnique({
    where: { slug, status: ContentStatus.APPROVED },
    include: {
      city: true,
      reviews: {
        where: { status: ReviewStatus.PUBLISHED },
        orderBy: { createdAt: "desc" },
      },
      doctors: {
        where: { status: ContentStatus.APPROVED },
        orderBy: [{ reviewCount: "desc" }, { avgRating: "desc" }],
        include: { specialty: true, city: true },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const clinic = await getClinic(slug);
  if (!clinic) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const city = localName(clinic.city, locale);
  const path = `/klinika/${slug}`;
  return {
    title: t("clinicTitle", { name: clinic.name, city }),
    description:
      clinic.reviewCount > 0
        ? t("clinicDescription", {
            name: clinic.name,
            city,
            count: clinic.reviewCount,
            rating: clinic.avgRating.toFixed(1),
          })
        : t("clinicDescriptionNoReviews", { name: clinic.name, city }),
    alternates: { ...hreflangAlternates(path), canonical: localeUrl(locale, path) },
  };
}

export default async function ClinicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("profile");
  const clinic = await getClinic(slug);
  if (!clinic) notFound();

  const distribution: Record<number, number> = {};
  for (const r of clinic.reviews) {
    distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
  }

  const mapsQuery = encodeURIComponent(
    [clinic.name, clinic.address, localName(clinic.city, "sq")].filter(Boolean).join(", ")
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: clinic.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: clinic.city.nameEn,
      addressCountry: "AL",
      ...(clinic.address && { streetAddress: clinic.address }),
    },
    url: localeUrl("sq", `/klinika/${clinic.slug}`),
    ...(clinic.phone && { telephone: clinic.phone }),
    ...(clinic.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: clinic.avgRating,
        reviewCount: clinic.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:pb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar name={clinic.name} size={72} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{clinic.name}</h1>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <p className="flex items-center gap-1.5">
              <MapPin size={14} className="shrink-0 text-gray-400" aria-hidden />
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {[clinic.address, localName(clinic.city, locale)].filter(Boolean).join(", ")}
              </a>
            </p>
            {clinic.phone && (
              <p className="flex items-center gap-1.5">
                <Phone size={14} className="shrink-0 text-gray-400" aria-hidden />
                <a href={`tel:${clinic.phone}`} className="hover:underline">
                  {clinic.phone}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rating — autonom, jo mesatare e mjekëve */}
      <div className="mt-6">
        <RatingBlock
          avgRating={clinic.avgRating}
          reviewCount={clinic.reviewCount}
          distribution={distribution}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 p-3 backdrop-blur sm:static sm:mt-4 sm:border-0 sm:bg-transparent sm:p-0">
        <Link
          href={`/klinika/${clinic.slug}/vlereso`}
          className="block w-full rounded-xl bg-primary py-3 text-center font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          {t("leaveReview")}
        </Link>
      </div>

      {/* Mjekët e klinikës */}
      {clinic.doctors.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-gray-900">{t("clinicDoctors")}</h2>
          <div className="space-y-3">
            {clinic.doctors.map((d) => (
              <ResultCard
                key={d.id}
                href={`/mjeku/${d.slug}`}
                name={`Dr. ${d.firstName} ${d.lastName}`}
                subtitle={localName(d.specialty, locale)}
                meta={localName(d.city, locale)}
                avgRating={d.avgRating}
                reviewCount={d.reviewCount}
                photoUrl={d.photoUrl}
              />
            ))}
          </div>
        </section>
      )}

      {/* Vlerësimet */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-gray-900">
          {t("reviewsTitle")} ({clinic.reviewCount})
        </h2>
        {clinic.reviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            {t("noReviews")}
          </p>
        ) : (
          <div className="space-y-3">
            {clinic.reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
      </section>

      <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-400">
        <a
          href={`mailto:info@vlersomjekun.al?subject=${encodeURIComponent(`Të dhëna të gabuara: ${clinic.name} (${clinic.slug})`)}`}
          className="hover:text-primary hover:underline"
        >
          {t("reportWrongData")}
        </a>
        <a
          href={`mailto:info@vlersomjekun.al?subject=${encodeURIComponent(`Claim profili: ${clinic.name} (${clinic.slug})`)}`}
          className="hover:text-primary hover:underline"
        >
          {t("areYouThisClinic")}
        </a>
      </div>
    </div>
  );
}
