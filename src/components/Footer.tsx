import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="mt-16 border-t border-gray-100 bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-gray-500">
        <p className="mb-4 max-w-md">{t("tagline")}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/rreth-nesh" className="hover:text-primary">
            {t("about")}
          </Link>
          <Link href="/rreth-nesh#rregullat" className="hover:text-primary">
            {t("rules")}
          </Link>
          <a href="mailto:info@vlersomjekun.al" className="hover:text-primary">
            {t("contact")}
          </a>
        </div>
        <p className="mt-6 text-xs text-gray-400">© {new Date().getFullYear()} VlersoMjekun</p>
      </div>
    </footer>
  );
}
