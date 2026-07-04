import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, Phone, Building2, BadgeCheck, Settings } from "lucide-react";
import { ClaimStatus, CommentStatus, ContentStatus, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localName } from "@/lib/locale-name";
import { hreflangAlternates, localeUrl } from "@/lib/seo";
import { getSessionUser } from "@/lib/user-guard";
import { Link } from "@/i18n/navigation";
import Avatar from "@/components/Avatar";
import RatingBlock from "@/components/RatingBlock";
import ReviewCard from "@/components/ReviewCard";
import BlurGate from "@/components/BlurGate";
import GatedLink from "@/components/auth/GatedLink";
import ClaimProfileButton from "@/components/ClaimProfileButton";

export const dynamic = "force-dynamic";

async function getDoctor(slug: string) {
  return prisma.doctor.findUnique({
    where: { slug, status: ContentStatus.APPROVED },
    include: {
      specialty: true,
      city: true,
      clinic: true,
      reviews: {
        where: { status: ReviewStatus.PUBLISHED },
        orderBy: { createdAt: "desc" },
        include: {
          comments: {
            where: { status: CommentStatus.PUBLISHED },
            orderBy: { createdAt: "asc" },
            include: { user: { select: { nickname: true } } },
          },
        },
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
  const doctor = await getDoctor(slug);
  if (!doctor) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const name = `Dr. ${doctor.firstName} ${doctor.lastName}`;
  const specialty = localName(doctor.specialty, locale);
  const city = doctor.city
    ? localName(doctor.city, locale)
    : locale === "sq"
      ? "Shqipëri"
      : "Albania";
  const path = `/mjeku/${slug}`;
  return {
    title: t("doctorTitle", { name, specialty, city }),
    description:
      doctor.reviewCount > 0
        ? t("doctorDescription", {
            name,
            specialty,
            city,
            count: doctor.reviewCount,
            rating: doctor.avgRating.toFixed(1),
          })
        : t("doctorDescriptionNoReviews", { name, specialty, city }),
    alternates: { ...hreflangAlternates(path), canonical: localeUrl(locale, path) },
  };
}

export default async function DoctorPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("profile");
  const [doctor, viewer] = await Promise.all([getDoctor(slug), getSessionUser()]);
  if (!doctor) notFound();

  const loggedIn = Boolean(viewer);
  const isOwner = Boolean(viewer && doctor.claimedByUserId === viewer.id);
  const myPendingClaim =
    viewer && !doctor.claimedByUserId
      ? await prisma.doctorClaim.findUnique({
          where: { doctorId_userId: { doctorId: doctor.id, userId: viewer.id } },
        })
      : null;
  const name = `Dr. ${doctor.firstName} ${doctor.lastName}`;
  const distribution: Record<number, number> = {};
  for (const r of doctor.reviews) {
    distribution[r.rating] = (distribution[r.rating] ?? 0) + 1;
  }

  const mapsQuery = doctor.city
    ? encodeURIComponent(
        [name, doctor.address, localName(doctor.city, "sq")].filter(Boolean).join(", ")
      )
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name,
    medicalSpecialty: doctor.specialty.nameEn,
    address: {
      "@type": "PostalAddress",
      ...(doctor.city && { addressLocality: doctor.city.nameEn }),
      addressCountry: "AL",
      ...(doctor.address && { streetAddress: doctor.address }),
    },
    url: localeUrl("sq", `/mjeku/${doctor.slug}`),
    ...(doctor.phone && { telephone: doctor.phone }),
    ...(doctor.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: doctor.avgRating,
        reviewCount: doctor.reviewCount,
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
        <Avatar name={`${doctor.firstName} ${doctor.lastName}`} photoUrl={doctor.photoUrl} size={72} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
            {doctor.claimedByUserId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-trust-light px-2.5 py-0.5 text-xs font-semibold text-trust">
                <BadgeCheck size={12} aria-hidden />
                {t("profileVerifiedByDoctor")}
              </span>
            )}
          </div>
          <p className="font-medium text-primary">
            {localName(doctor.specialty, locale)}
            {doctor.subSpecialty && (
              <span className="text-gray-400"> · {doctor.subSpecialty}</span>
            )}
          </p>
          <div className="mt-2 space-y-1 text-sm text-gray-600">
            {(doctor.clinic || doctor.clinicFreeText) && (
              <p className="flex items-center gap-1.5">
                <Building2 size={14} className="shrink-0 text-gray-400" aria-hidden />
                {doctor.clinic ? (
                  <Link href={`/klinika/${doctor.clinic.slug}`} className="text-primary hover:underline">
                    {doctor.clinic.name}
                  </Link>
                ) : (
                  doctor.clinicFreeText
                )}
              </p>
            )}
            {doctor.city ? (
              <p className="flex items-center gap-1.5">
                <MapPin size={14} className="shrink-0 text-gray-400" aria-hidden />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {[doctor.address, localName(doctor.city, locale)].filter(Boolean).join(", ")}
                </a>
              </p>
            ) : (
              <p className="flex items-center gap-1.5">
                <MapPin size={14} className="shrink-0 text-gray-400" aria-hidden />
                <span className="italic text-gray-400">{t("locationPending")}</span>
                <a
                  href={`mailto:info@vlersomjekun.al?subject=${encodeURIComponent(`Vendndodhja: ${name} (${doctor.slug})`)}`}
                  className="text-primary hover:underline"
                >
                  {t("reportLocation")}
                </a>
              </p>
            )}
            {doctor.phone && (
              <p className="flex items-center gap-1.5">
                <Phone size={14} className="shrink-0 text-gray-400" aria-hidden />
                <a href={`tel:${doctor.phone}`} className="hover:underline">
                  {doctor.phone}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Rating */}
      <div className="mt-6">
        <RatingBlock
          avgRating={doctor.avgRating}
          reviewCount={doctor.reviewCount}
          distribution={distribution}
        />
      </div>

      {/* CTA — sticky në mobile; gated: login modal në klik */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white/95 p-3 backdrop-blur sm:static sm:mt-4 sm:border-0 sm:bg-transparent sm:p-0">
        <GatedLink
          href={`/mjeku/${doctor.slug}/vlereso`}
          className="block w-full rounded-xl bg-primary py-3 text-center font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          {t("leaveReview")}
        </GatedLink>
      </div>

      {/* Vlerësimet: i pari i plotë për të gjithë (SEO), të tjerët blur pa login */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-gray-900">
          {t("reviewsTitle")} ({doctor.reviewCount})
        </h2>
        {doctor.reviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
            {t("noReviews")}
          </p>
        ) : (
          <div className="space-y-3">
            {doctor.reviews.slice(0, 1).map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                comments={r.comments.map((c) => ({
                  id: c.id,
                  text: c.text,
                  nickname: c.user.nickname ?? "—",
                  createdAt: c.createdAt.toISOString(),
                }))}
                viewerLoggedIn={loggedIn}
                locale={locale}
              />
            ))}
            {doctor.reviews.length > 1 &&
              (loggedIn ? (
                doctor.reviews.slice(1).map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    comments={r.comments.map((c) => ({
                      id: c.id,
                      text: c.text,
                      nickname: c.user.nickname ?? "—",
                      createdAt: c.createdAt.toISOString(),
                    }))}
                    viewerLoggedIn
                    locale={locale}
                  />
                ))
              ) : (
                <BlurGate>
                  <div className="space-y-3">
                    {doctor.reviews.slice(1).map((r) => (
                      <ReviewCard key={r.id} review={r} locale={locale} />
                    ))}
                  </div>
                </BlurGate>
              ))}
          </div>
        )}
      </section>

      {/* Linke diskrete */}
      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-400">
        <a
          href={`mailto:info@vlersomjekun.al?subject=${encodeURIComponent(`Të dhëna të gabuara: ${name} (${doctor.slug})`)}`}
          className="hover:text-primary hover:underline"
        >
          {t("reportWrongData")}
        </a>
        {isOwner ? (
          <Link
            href={`/mjeku/${doctor.slug}/menaxho`}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <Settings size={12} aria-hidden />
            {t("manageProfile")}
          </Link>
        ) : doctor.claimedByUserId ? null : myPendingClaim?.status === ClaimStatus.PENDING ? (
          <span className="italic">{t("claimPending")}</span>
        ) : (
          <ClaimProfileButton doctorId={doctor.id} />
        )}
      </div>
    </div>
  );
}
