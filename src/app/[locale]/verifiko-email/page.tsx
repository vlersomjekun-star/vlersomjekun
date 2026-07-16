import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyEmailToken } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: `${t("verifyTitle")} — Vleresomjekun`, robots: { index: false } };
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = await getTranslations("auth");

  const result = token ? await verifyEmailToken(token) : "invalid";

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {result === "ok" ? (
        <>
          <CheckCircle2 size={52} className="mx-auto mb-4 text-trust" aria-hidden />
          <h1 className="mb-2 text-xl font-bold text-gray-900">{t("verifySuccessTitle")}</h1>
          <p className="mb-6 text-sm text-gray-500">{t("verifySuccessText")}</p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {t("goHome")}
          </Link>
        </>
      ) : (
        <>
          <XCircle size={52} className="mx-auto mb-4 text-red-400" aria-hidden />
          <h1 className="mb-2 text-xl font-bold text-gray-900">
            {result === "expired" ? t("verifyExpiredTitle") : t("verifyInvalidTitle")}
          </h1>
          <p className="mb-6 text-sm text-gray-500">{t("verifyInvalidText")}</p>
          <Link
            href="/identifikohu"
            className="inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {t("loginButton")}
          </Link>
        </>
      )}
    </div>
  );
}
