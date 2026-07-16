import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ForgotForm from "./ForgotForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: `${t("forgotTitle")} — Vleresomjekun`, robots: { index: false } };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("forgotTitle")}</h1>
      <p className="mb-6 text-sm text-gray-500">{t("forgotSubtitle")}</p>
      <ForgotForm />
    </div>
  );
}
