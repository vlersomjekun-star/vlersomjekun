import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { XCircle } from "lucide-react";
import ResetForm from "./ResetForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: `${t("resetTitle")} — Vleresomjekun`, robots: { index: false } };
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getTranslations("auth");

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <XCircle size={52} className="mx-auto mb-4 text-red-400" aria-hidden />
        <h1 className="mb-2 text-xl font-bold text-gray-900">{t("resetInvalidTitle")}</h1>
        <p className="mb-6 text-sm text-gray-500">{t("resetInvalidText")}</p>
        <Link
          href="/fjalekalim-harruar"
          className="inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          {t("requestNewLink")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("resetTitle")}</h1>
      <p className="mb-6 text-sm text-gray-500">{t("resetSubtitle")}</p>
      <ResetForm token={token} />
    </div>
  );
}
