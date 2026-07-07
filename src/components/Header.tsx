import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "./LanguageSwitcher";
import UserMenu from "./auth/UserMenu";
import { MobileMenuButton } from "./MobileMenu";

export default function Header() {
  const t = useTranslations("header");
  return (
    <header className="sticky top-0 z-40 border-b border-[#E8E4DA] bg-[rgba(250,250,248,0.92)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-8 py-[14px]">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden>
            <g stroke="#1a7d5e" strokeWidth="1.6" strokeLinecap="round">
              <line x1="12" y1="12" x2="12" y2="2" />
              <line x1="12" y1="12" x2="21.51" y2="8.91" />
              <line x1="12" y1="12" x2="17.88" y2="20.09" />
              <line x1="12" y1="12" x2="6.12" y2="20.09" />
              <line x1="12" y1="12" x2="2.49" y2="8.91" />
            </g>
            <circle cx="12" cy="12" r="2.3" fill="#1a7d5e" />
            <circle cx="12" cy="2" r="1.7" fill="#E8A33D" />
            <circle cx="21.51" cy="8.91" r="1.7" fill="#1a7d5e" />
            <circle cx="17.88" cy="20.09" r="1.7" fill="#1a7d5e" />
            <circle cx="6.12" cy="20.09" r="1.7" fill="#1a7d5e" />
            <circle cx="2.49" cy="8.91" r="1.7" fill="#E8A33D" />
          </svg>
          <span className="font-display text-[20px] font-bold tracking-tight leading-none text-[#1A2540]">
            Vlerëso <span className="text-primary">Mjekun</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link href="/kerko" className="text-[14.5px] font-semibold text-[#5B6478] hover:text-primary transition">
            Kërko
          </Link>
          <Link href="/shto-mjek" className="text-[14.5px] font-semibold text-[#5B6478] hover:text-primary transition">
            {t("addDoctor")}
          </Link>
          <Link href="/rreth-nesh" className="text-[14.5px] font-semibold text-[#5B6478] hover:text-primary transition">
            {t("about")}
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2.5">
          <div className="hidden lg:block">
            <Suspense>
              <LanguageSwitcher />
            </Suspense>
          </div>
          <UserMenu />
          <MobileMenuButton />
        </div>
      </div>
    </header>
  );
}
