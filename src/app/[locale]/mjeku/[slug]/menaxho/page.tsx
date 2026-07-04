import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/user-guard";
import { redirect } from "@/i18n/navigation";
import ManageForm from "./ManageForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const doctor = await prisma.doctor.findUnique({ where: { slug } });
  if (!doctor) return {};
  const t = await getTranslations({ locale, namespace: "profile" });
  return {
    title: `${t("manageProfile")} — Dr. ${doctor.firstName} ${doctor.lastName} | VlersoMjekun`,
    robots: { index: false },
  };
}

export default async function ManageDoctorPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: pageLocale, slug } = await params;
  const t = await getTranslations("profile");

  const doctor = await prisma.doctor.findUnique({
    where: { slug, status: ContentStatus.APPROVED },
    include: { clinic: true, city: true },
  });
  if (!doctor) notFound();

  const user = await getSessionUser();
  if (!user) {
    redirect({
      href: `/identifikohu?callbackUrl=${encodeURIComponent(`/mjeku/${slug}/menaxho`)}`,
      locale: pageLocale,
    });
  }
  // Vetëm pronari i verifikuar (pas aprovimit admini) — asnjë përjashtim
  if (doctor.claimedByUserId !== user!.id) {
    redirect({ href: `/mjeku/${slug}`, locale: pageLocale });
  }

  const clinics = doctor.cityId
    ? await prisma.clinic.findMany({
        where: { status: ContentStatus.APPROVED, cityId: doctor.cityId },
        orderBy: { name: "asc" },
      })
    : await prisma.clinic.findMany({
        where: { status: ContentStatus.APPROVED },
        orderBy: { name: "asc" },
      });

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("manageProfile")}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {t("manageIntro", { name: `Dr. ${doctor.firstName} ${doctor.lastName}` })}
      </p>
      <ManageForm
        doctorId={doctor.id}
        clinics={clinics.map((c) => ({ id: c.id, name: c.name }))}
        initial={{
          photoUrl: doctor.photoUrl ?? "",
          subSpecialty: doctor.subSpecialty ?? "",
          address: doctor.address ?? "",
          phone: doctor.phone ?? "",
          clinicId: doctor.clinicId ?? "",
        }}
        backHref={`/mjeku/${doctor.slug}`}
      />
    </div>
  );
}
