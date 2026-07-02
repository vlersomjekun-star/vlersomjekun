import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localName } from "@/lib/locale-name";
import { hreflangAlternates, localeUrl } from "@/lib/seo";
import { getSessionUser } from "@/lib/user-guard";
import { redirect } from "@/i18n/navigation";
import VerifyNotice from "@/components/auth/VerifyNotice";
import NicknameForm from "@/components/auth/NicknameForm";
import AddEntryForm from "./AddEntryForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("addTitle"),
    description: t("addDescription"),
    alternates: { ...hreflangAlternates("/shto-mjek"), canonical: localeUrl(locale, "/shto-mjek") },
  };
}

export default async function AddPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: pageLocale } = await params;
  const locale = await getLocale();
  const t = await getTranslations("addDoctor");

  // Gating: kërkohet login + verifikim + nickname
  const user = await getSessionUser();
  if (!user) {
    redirect({
      href: `/identifikohu?callbackUrl=${encodeURIComponent("/shto-mjek")}`,
      locale: pageLocale,
    });
  }
  if (!user!.verified || !user!.nickname) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("title")}</h1>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {!user!.verified ? <VerifyNotice /> : <NicknameForm />}
        </div>
      </div>
    );
  }

  const [specialties, cities, clinics] = await Promise.all([
    prisma.specialty.findMany({ orderBy: { nameSq: "asc" } }),
    prisma.city.findMany({ orderBy: { nameSq: "asc" } }),
    prisma.clinic.findMany({
      where: { status: ContentStatus.APPROVED },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mb-6 mt-2 text-sm text-gray-500">{t("intro")}</p>
      <AddEntryForm
        specialties={specialties.map((s) => ({ id: s.id, name: localName(s, locale) }))}
        cities={cities.map((c) => ({ id: c.id, name: localName(c, locale) }))}
        clinics={clinics.map((c) => c.name)}
      />
    </div>
  );
}
