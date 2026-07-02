import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import ReviewForm from "@/components/ReviewForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const clinic = await prisma.clinic.findUnique({ where: { slug } });
  if (!clinic) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("reviewTitle", { name: clinic.name }),
    robots: { index: false },
  };
}

export default async function ReviewClinicPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("reviewForm");
  const clinic = await prisma.clinic.findUnique({
    where: { slug, status: ContentStatus.APPROVED },
  });
  if (!clinic) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mb-6 text-gray-500">{t("for", { name: clinic.name })}</p>
      <ReviewForm targetType="CLINIC" targetId={clinic.id} backHref={`/klinika/${clinic.slug}`} />
    </div>
  );
}
