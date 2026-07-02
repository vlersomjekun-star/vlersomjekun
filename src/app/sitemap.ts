import type { MetadataRoute } from "next";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localeUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

function entriesFor(path: string, lastModified?: Date): MetadataRoute.Sitemap {
  return routing.locales.map((locale) => ({
    url: localeUrl(locale, path),
    lastModified,
    alternates: {
      languages: Object.fromEntries(routing.locales.map((l) => [l, localeUrl(l, path)])),
    },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = [
    ...entriesFor("/"),
    ...entriesFor("/kerko"),
    ...entriesFor("/shto-mjek"),
    ...entriesFor("/rreth-nesh"),
  ];

  try {
    const [doctors, clinics] = await Promise.all([
      prisma.doctor.findMany({
        where: { status: ContentStatus.APPROVED },
        select: { slug: true, createdAt: true },
      }),
      prisma.clinic.findMany({
        where: { status: ContentStatus.APPROVED },
        select: { slug: true, createdAt: true },
      }),
    ]);
    return [
      ...staticEntries,
      ...doctors.flatMap((d) => entriesFor(`/mjeku/${d.slug}`, d.createdAt)),
      ...clinics.flatMap((c) => entriesFor(`/klinika/${c.slug}`, c.createdAt)),
    ];
  } catch {
    // DB e paarritshme (p.sh. në build) — kthe vetëm faqet statike
    return staticEntries;
  }
}
