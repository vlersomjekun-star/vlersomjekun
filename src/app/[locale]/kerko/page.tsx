import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ContentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localName } from "@/lib/locale-name";
import { hreflangAlternates, localeUrl } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import SearchBar from "@/components/SearchBar";
import ResultCard from "@/components/ResultCard";
import Pagination from "@/components/Pagination";
import SearchFilters from "./SearchFilters";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type SearchParams = {
  q?: string;
  specialty?: string;
  city?: string;
  minRating?: string;
  type?: string;
  page?: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("searchTitle"),
    description: t("searchDescription"),
    alternates: { ...hreflangAlternates("/kerko"), canonical: localeUrl(locale, "/kerko") },
  };
}

function buildQueryString(sp: SearchParams, overrides: Record<string, string | undefined>) {
  const merged = { ...sp, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("search");

  const q = sp.q?.trim() ?? "";
  const type = sp.type === "clinic" ? "clinic" : "doctor";
  const page = Math.max(1, Number(sp.page) || 1);
  const minRating = sp.minRating ? Number(sp.minRating) : undefined;

  const [specialties, cities] = await Promise.all([
    prisma.specialty.findMany({ orderBy: { nameSq: "asc" } }),
    prisma.city.findMany({ orderBy: { nameSq: "asc" } }),
  ]);

  const terms = q.split(/\s+/).filter(Boolean);

  let results: {
    href: string;
    name: string;
    subtitle: string;
    meta?: string;
    avgRating: number;
    reviewCount: number;
    photoUrl?: string | null;
    publicBadge?: string;
  }[] = [];
  let total = 0;

  if (type === "doctor") {
    const where: Prisma.DoctorWhereInput = {
      status: ContentStatus.APPROVED,
      ...(sp.specialty && { specialty: { slug: sp.specialty } }),
      ...(sp.city && { city: { slug: sp.city } }),
      ...(minRating && { avgRating: { gte: minRating }, reviewCount: { gt: 0 } }),
      AND: terms.map((term): Prisma.DoctorWhereInput => ({
        OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { lastName: { contains: term, mode: "insensitive" } },
          { alternativeLastName: { contains: term, mode: "insensitive" } },
          { subSpecialty: { contains: term, mode: "insensitive" } },
          { clinic: { is: { name: { contains: term, mode: "insensitive" } } } },
          { clinicFreeText: { contains: term, mode: "insensitive" } },
          {
            specialty: {
              is: {
                OR: [
                  { nameSq: { contains: term, mode: "insensitive" } },
                  { nameEn: { contains: term, mode: "insensitive" } },
                  { nameIt: { contains: term, mode: "insensitive" } },
                ],
              },
            },
          },
          {
            city: {
              is: {
                OR: [
                  { nameSq: { contains: term, mode: "insensitive" } },
                  { nameEn: { contains: term, mode: "insensitive" } },
                  { nameIt: { contains: term, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      })),
    };
    const [doctors, count] = await Promise.all([
      prisma.doctor.findMany({
        where,
        orderBy: [{ reviewCount: "desc" }, { avgRating: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { specialty: true, city: true, clinic: true },
      }),
      prisma.doctor.count({ where }),
    ]);
    total = count;
    results = doctors.map((d) => ({
      href: `/mjeku/${d.slug}`,
      name: `Dr. ${d.firstName} ${d.lastName}`,
      subtitle: localName(d.specialty, locale),
      specialtySlug: d.specialty.slug,
      meta: [d.clinic?.name ?? d.clinicFreeText, d.city ? localName(d.city, locale) : null]
        .filter(Boolean)
        .join(" · "),
      avgRating: d.avgRating,
      reviewCount: d.reviewCount,
      photoUrl: d.photoUrl,
    }));
  } else {
    const where: Prisma.ClinicWhereInput = {
      status: ContentStatus.APPROVED,
      ...(sp.city && { city: { slug: sp.city } }),
      ...(minRating && { avgRating: { gte: minRating }, reviewCount: { gt: 0 } }),
      AND: terms.map((term): Prisma.ClinicWhereInput => ({
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          {
            city: {
              is: {
                OR: [
                  { nameSq: { contains: term, mode: "insensitive" } },
                  { nameEn: { contains: term, mode: "insensitive" } },
                  { nameIt: { contains: term, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      })),
    };
    const [clinics, count] = await Promise.all([
      prisma.clinic.findMany({
        where,
        orderBy: [{ reviewCount: "desc" }, { avgRating: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { city: true },
      }),
      prisma.clinic.count({ where }),
    ]);
    total = count;
    results = clinics.map((c) => ({
      href: `/klinika/${c.slug}`,
      name: c.name,
      subtitle: localName(c.city, locale),
      meta: c.address ?? undefined,
      avgRating: c.avgRating,
      reviewCount: c.reviewCount,
      publicBadge: c.sectorType === "PUBLIC" ? t("publicSector") : undefined,
    }));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-[1280px] px-8 py-6">
      <div className="mb-5 max-w-2xl">
        <SearchBar initialQuery={q} />
      </div>

      {/* Tabs Mjekë | Klinika */}
      <div className="mb-4 flex gap-2 border-b border-gray-100">
        {(["doctor", "clinic"] as const).map((tab) => (
          <Link
            key={tab}
            href={`/kerko?${buildQueryString(sp, { type: tab, page: undefined, specialty: tab === "clinic" ? undefined : sp.specialty })}`}
            className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
              type === tab
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab === "doctor" ? t("doctors") : t("clinics")}
          </Link>
        ))}
      </div>

      <SearchFilters
        specialties={specialties.map((s) => ({ slug: s.slug, name: localName(s, locale) }))}
        cities={cities.map((c) => ({ slug: c.slug, name: localName(c, locale) }))}
        current={{ q, specialty: sp.specialty, city: sp.city, minRating: sp.minRating, type }}
        showSpecialty={type === "doctor"}
      />

      <p className="mb-3 mt-5 text-sm text-gray-500">{t("resultsCount", { count: total })}</p>

      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <p className="mb-4 text-gray-500">{t("noResults")}</p>
          <Link
            href="/shto-mjek"
            className="inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {t("addIt")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => (
            <ResultCard key={r.href} {...r} />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) => `/kerko?${buildQueryString(sp, { page: String(p) })}`}
      />
    </div>
  );
}
