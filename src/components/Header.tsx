import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const t = useTranslations("header");
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight text-primary">
          Vlerso<span className="text-trust">Mjekun</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/shto-mjek"
            className="hidden text-sm font-medium text-gray-600 hover:text-primary sm:block"
          >
            {t("addDoctor")}
          </Link>
          <Link
            href="/rreth-nesh"
            className="hidden text-sm font-medium text-gray-600 hover:text-primary sm:block"
          >
            {t("about")}
          </Link>
          <Suspense>
            <LanguageSwitcher />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
