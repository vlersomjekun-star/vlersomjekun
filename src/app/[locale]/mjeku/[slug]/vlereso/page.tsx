import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localName } from "@/lib/locale-name";
import ReviewForm from "@/components/ReviewForm";

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
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations("reviewForm");
  const doctor = await prisma.doctor.findUnique({
    where: { slug, status: ContentStatus.APPROVED },
    include: { specialty: true },
  });
  if (!doctor) notFound();

  const name = `Dr. ${doctor.firstName} ${doctor.lastName}`;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mb-6 text-gray-500">
        {t("for", { name })} · {localName(doctor.specialty, locale)}
      </p>
      <ReviewForm targetType="DOCTOR" targetId={doctor.id} backHref={`/mjeku/${doctor.slug}`} />
    </div>
  );
}
