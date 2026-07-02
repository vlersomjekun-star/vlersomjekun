import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { googleEnabled } from "@/auth";
import { getSessionUser } from "@/lib/user-guard";
import SignupPageForm from "./SignupPageForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: `${t("signupTitle")} — VlersoMjekun`, robots: { index: false } };
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(callbackUrl ?? "/");

  const t = await getTranslations("auth");

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t("signupTitle")}</h1>
      <p className="mb-6 text-sm text-gray-500">{t("signupIntro")}</p>
      <SignupPageForm googleEnabled={googleEnabled} callbackUrl={callbackUrl} />
    </div>
  );
}
