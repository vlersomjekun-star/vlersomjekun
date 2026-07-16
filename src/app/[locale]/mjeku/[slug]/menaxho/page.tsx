import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/user-guard";
import { redirect, Link } from "@/i18n/navigation";
import ManageForm from "./ManageForm";
import ReviewsTab from "./ReviewsTab";
import ActivityTab from "./ActivityTab";

export const dynamic = "force-dynamic";

type Tab = "profili" | "vleresimet" | "aktiviteti";

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
    title: `${t("manageProfile")} — Dr. ${doctor.firstName} ${doctor.lastName} | Vleresomjekun`,
    robots: { index: false },
  };
}

export default async function ManageDoctorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ locale: pageLocale, slug }, { tab: rawTab }] = await Promise.all([
    params,
    searchParams,
  ]);

  const activeTab: Tab =
    rawTab === "vleresimet" || rawTab === "aktiviteti" ? rawTab : "profili";

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
  if (doctor.claimedByUserId !== user!.id) {
    redirect({ href: `/mjeku/${slug}`, locale: pageLocale });
  }

  const baseHref = `/mjeku/${slug}/menaxho` as const;

  const tabs: { key: Tab; label: string }[] = [
    { key: "profili",    label: t("tabProfile") },
    { key: "vleresimet", label: t("tabReviews") },
    { key: "aktiviteti", label: t("tabActivity") },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">{t("dashboardTitle")}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {t("manageIntro", { name: `Dr. ${doctor.firstName} ${doctor.lastName}` })}
      </p>

      {/* Tab navigation */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {tabs.map(({ key, label }) => (
          <Link
            key={key}
            href={`${baseHref}?tab=${key}`}
            className={`px-4 py-2.5 text-sm font-medium transition
              ${
                activeTab === key
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "profili" && (
        <ProfileTabContent
          doctor={doctor}
          pageLocale={pageLocale}
          t={t}
        />
      )}
      {activeTab === "vleresimet" && (
        <ReviewsTab doctorId={doctor.id} doctorSlug={doctor.slug} />
      )}
      {activeTab === "aktiviteti" && (
        <ActivityTab doctorId={doctor.id} />
      )}
    </div>
  );
}

// Estratto come funzione per non appesantire il componente principale
async function ProfileTabContent({
  doctor,
  pageLocale,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doctor: any;
  pageLocale: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: any, vals?: any) => string;
}) {
  void pageLocale;

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
    <ManageForm
      doctorId={doctor.id}
      clinics={clinics.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
      initial={{
        photoUrl:     doctor.photoUrl    ?? "",
        subSpecialty: doctor.subSpecialty ?? "",
        address:      doctor.address     ?? "",
        phone:        doctor.phone       ?? "",
        clinicId:     doctor.clinicId    ?? "",
        bio:          doctor.bio         ?? "",
        yearsExp:     doctor.yearsExp != null ? String(doctor.yearsExp) : "",
        languages:    doctor.languages   ?? "",
        websiteUrl1:  doctor.websiteUrl1 ?? "",
        websiteUrl2:  doctor.websiteUrl2 ?? "",
        scheduleJson: doctor.scheduleJson ? JSON.stringify(doctor.scheduleJson) : null,
      }}
      backHref={`/mjeku/${doctor.slug}`}
    />
  );
}
