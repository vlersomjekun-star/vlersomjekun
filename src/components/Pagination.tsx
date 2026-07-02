import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  const t = useTranslations("search");
  if (totalPages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 hover:border-primary hover:text-primary">
          ← {t("previous")}
        </Link>
      ) : (
        <span className="rounded-lg border border-gray-100 px-3 py-1.5 text-gray-300">← {t("previous")}</span>
      )}
      <span className="text-gray-500">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 hover:border-primary hover:text-primary">
          {t("next")} →
        </Link>
      ) : (
        <span className="rounded-lg border border-gray-100 px-3 py-1.5 text-gray-300">{t("next")} →</span>
      )}
    </nav>
  );
}
