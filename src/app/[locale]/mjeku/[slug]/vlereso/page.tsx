import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localName } from "@/lib/locale-name";
import { getSessionUser } from "@/lib/user-guard";
import { redirect } from "@/i18n/navigation";
import ReviewForm from "@/components/ReviewForm";
import VerifyNotice from "@/components/auth/VerifyNotice";
import NicknameForm from "@/components/auth/NicknameForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const doctor = await prisma.doctor.findUnique({ where: { slug } });
  if (!doctor) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("reviewTitle", { name: `Dr. ${doctor.firstName} ${doctor.lastName}` }),
    robots: { index: false },
  };
}

export default async function ReviewDoctorPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: pageLocale, slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("reviewForm");
  const doctor = await prisma.doctor.findUnique({
    where: { slug, status: ContentStatus.APPROVED },
    include: { specialty: true },
  });
  if (!doctor) notFound();

  // Gating: pa login s'ka formë vlerësimi
  const user = await getSessionUser();
  if (!user) {
    redirect({
      href: `/identifikohu?callbackUrl=${encodeURIComponent(`/mjeku/${slug}/vlereso`)}`,
      locale: pageLocale,
    });
  }

  const name = `Dr. ${doctor.firstName} ${doctor.lastName}`;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mb-6 text-gray-500">
        {t("for", { name })} · {localName(doctor.specialty, locale)}
      </p>
      {!user!.verified ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <VerifyNotice />
        </div>
      ) : !user!.nickname ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <NicknameForm />
        </div>
      ) : (
        <ReviewForm targetType="DOCTOR" targetId={doctor.id} backHref={`/mjeku/${doctor.slug}`} />
      )}
    </div>
  );
}
