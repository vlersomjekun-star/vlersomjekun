import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-6xl font-bold text-primary-light">404</p>
      <h1 className="mt-4 text-xl font-bold text-gray-900">{t("title")}</h1>
      <p className="mt-2 text-sm text-gray-500">{t("text")}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
