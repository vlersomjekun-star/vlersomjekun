import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, Phone, Building2, BadgeCheck, Settings } from "lucide-react";
import { ClaimStatus, CommentStatus, ContentStatus, ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localName } from "@/lib/locale-name";
import { hreflangAlternates, localeUrl } from "@/lib/seo";
import { getSessionUser } from "@/lib/user-guard";
import { colorForSpecialty } from "@/lib/specialty-color";
import { CITY_DOTS } from "@/lib/city-coords";
import { Link } from "@/i18n/navigation";
import Avatar from "@/components/Avatar";
import RatingBlock from "@/components/RatingBlock";
import ReviewCard, { type DoctorReplyData } from "@/components/ReviewCard";
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
          doctorReply: { select: { text: true } },
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

  const specialtyColor = colorForSpecialty(doctor.specialty.slug);

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
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 sm:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Profile header ── */}
      <div className="flex items-start gap-5 mb-6">
        <Avatar
          name={`${doctor.firstName} ${doctor.lastName}`}
          photoUrl={doctor.photoUrl}
          size={96}
          specialtySlug={doctor.specialty.slug}
        />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="font-display font-extrabold text-[34px] leading-tight text-[#16213D]">
              {name}
            </h1>
            {doctor.claimedByUserId && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: specialtyColor.bg, color: specialtyColor.text }}
              >
                <BadgeCheck size={12} aria-hidden />
                {t("profileVerifiedByDoctor")}
              </span>
            )}
          </div>

          {/* Specialty pill */}
          <span
            className="inline-block px-3 py-1 rounded-full text-[13px] font-bold mb-3"
            style={{ background: specialtyColor.bg, color: specialtyColor.text, border: `1px solid ${specialtyColor.border}` }}
          >
            {localName(doctor.specialty, locale)}
            {doctor.subSpecialty && (
              <span className="opacity-70"> · {doctor.subSpecialty}</span>
            )}
          </span>

          <div className="space-y-1 text-[14px] text-[#5B6478]">
            {(doctor.clinic || doctor.clinicFreeText) && (
              <p className="flex items-center gap-1.5">
                <Building2 size={14} className="shrink-0 text-[#8A8471]" aria-hidden />
                {doctor.clinic ? (
                  <Link href={`/klinika/${doctor.clinic.slug}`} className="text-primary hover:underline font-medium">
                    {doctor.clinic.name}
                  </Link>
                ) : (
                  doctor.clinicFreeText
                )}
              </p>
            )}
            {doctor.city ? (
              <p className="flex items-center gap-1.5">
                <MapPin size={14} className="shrink-0 text-[#8A8471]" aria-hidden />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline hover:text-primary transition"
                >
                  {[doctor.address, localName(doctor.city, locale)].filter(Boolean).join(", ")}
                </a>
              </p>
            ) : (
              <p className="flex items-center gap-1.5">
                <MapPin size={14} className="shrink-0 text-[#8A8471]" aria-hidden />
                <span className="italic text-[#8A8471]">{t("locationPending")}</span>
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
                <Phone size={14} className="shrink-0 text-[#8A8471]" aria-hidden />
                <a href={`tel:${doctor.phone}`} className="hover:underline hover:text-primary transition">
                  {doctor.phone}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Rating block ── */}
      <div className="mb-5">
        <RatingBlock
          avgRating={doctor.avgRating}
          reviewCount={doctor.reviewCount}
          distribution={distribution}
          idPrefix={`dr-${doctor.slug}`}
        />
      </div>

      {/* ── CTA ── desktop integrated + mobile sticky */}
      <div className="hidden sm:block mb-6">
        <GatedLink
          href={`/mjeku/${doctor.slug}/vlereso`}
          className="block w-full rounded-2xl bg-primary py-3.5 text-center font-semibold text-white shadow-sm transition hover:bg-primary-dark text-[16px]"
        >
          {t("leaveReview")}
        </GatedLink>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8E4DA] bg-white/95 p-3 backdrop-blur sm:hidden">
        <GatedLink
          href={`/mjeku/${doctor.slug}/vlereso`}
          className="block w-full rounded-xl bg-primary py-3 text-center font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          {t("leaveReview")}
        </GatedLink>
      </div>

      {/* ── Mini Albania map strip ── */}
      {doctor.city && CITY_DOTS[doctor.city.slug] && (() => {
        const dot = CITY_DOTS[doctor.city!.slug];
        return (
          <div className="mb-6 flex items-center gap-5 rounded-2xl border border-[#E8E4DA] bg-white p-4">
            <svg
              viewBox="0 0 230 400"
              width="60"
              height="104"
              aria-hidden
              className="shrink-0"
            >
              <path
                d="M120,10 L160,15 L190,40 L210,90 L230,140 L220,190 L240,230 L225,270 L200,310 L175,345 L150,370 L120,360 L100,330 L90,290 L70,260 L60,220 L75,190 L65,160 L80,130 L70,100 L85,60 L100,30 Z"
                fill="#EAF3EE"
                stroke="#C8E2D6"
                strokeWidth="2"
              />
              {/* All city dots, faint */}
              {Object.entries(CITY_DOTS).map(([slug, coords]) => (
                <circle key={slug} cx={coords.x} cy={coords.y} r="4" fill="#C8E2D6" />
              ))}
              {/* Highlighted city */}
              <circle cx={dot.x} cy={dot.y} r="7" fill="#1a7d5e" />
              <circle cx={dot.x} cy={dot.y} r="3.5" fill="white" />
            </svg>
            <div>
              <p className="text-[12px] text-[#8A8471] uppercase tracking-wider font-semibold mb-0.5">{t("locationLabel")}</p>
              <p className="font-bold text-[15px] text-[#16213D]">{localName(doctor.city!, locale)}</p>
              {doctor.address && (
                <p className="text-[13px] text-[#5B6478] mt-0.5">{doctor.address}</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Reviews ── */}
      <section className="mt-2">
        <h2 className="font-display font-bold text-[20px] text-[#16213D] mb-4">
          {t("reviewsTitle")} ({doctor.reviewCount})
        </h2>
        {doctor.reviews.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#E8E4DA] p-8 text-center text-sm text-[#8A8471]">
            {t("noReviews")}
          </p>
        ) : (
          <div className="space-y-3">
            {/* Prima recensione — sempre visibile */}
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
                doctorReply={r.doctorReply as DoctorReplyData | null}
              />
            ))}

            {/* Recensioni 2+ */}
            {doctor.reviews.length > 1 &&
              (loggedIn ? (
                // Logged-in: risposta visibile dentro la card
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
                    doctorReply={r.doctorReply as DoctorReplyData | null}
                  />
                ))
              ) : (
                // Non-logged: prima blurred con overlay, resto solo blur CSS;
                // risposte medico SEMPRE fuori blur
                doctor.reviews.slice(1).map((r, idx) => (
                  <div key={r.id} className="space-y-1">
                    {idx === 0 ? (
                      <BlurGate>
                        <ReviewCard review={r} locale={locale} />
                      </BlurGate>
                    ) : (
                      <div className="pointer-events-none select-none blur-[6px]">
                        <ReviewCard review={r} locale={locale} />
                      </div>
                    )}
                    {r.doctorReply && (
                      <div className="ml-1 rounded-lg border-l-[3px] border-primary bg-primary-light px-3 py-2.5">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {t("replyDoctorLabel")}
                        </p>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                          {r.doctorReply.text}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              ))}
          </div>
        )}
      </section>

      {/* ── Footer links ── */}
      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#8A8471]">
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
