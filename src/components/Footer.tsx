import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { localName } from "@/lib/locale-name";
import { CITY_DOTS } from "@/lib/city-coords";

export default async function Footer() {
  const locale = await getLocale();
  const t = await getTranslations("footer");
  const cities = await prisma.city.findMany({ orderBy: { nameSq: "asc" } });

  return (
    <footer className="bg-navy text-white mt-0">
      <div className="mx-auto max-w-[1280px] px-8 py-14 grid grid-cols-1 gap-12 sm:grid-cols-[0.8fr_1.2fr]">
        {/* Colonna sinistra: mappa + tagline */}
        <div>
          <svg viewBox="0 0 230 400" className="w-40 h-auto mb-5" aria-hidden>
            <path
              d="M120,10 L160,15 L190,40 L210,90 L230,140 L220,190 L240,230 L225,270 L200,310 L175,345 L150,370 L120,360 L100,330 L90,290 L70,260 L60,220 L75,190 L65,160 L80,130 L70,100 L85,60 L100,30 Z"
              fill="#1E2C4E" stroke="#3C4A6E" strokeWidth="2"
            />
            {cities.map((c) => {
              const dot = CITY_DOTS[c.slug];
              if (!dot) return null;
              return <circle key={c.id} cx={dot.x} cy={dot.y} r="5" fill="#E8A33D" />;
            })}
          </svg>
          <p className="text-[13.5px] text-[#9AA5BE] leading-relaxed max-w-[280px]">
            {t("tagline")}
          </p>
        </div>

        {/* Colonna destra: città + link */}
        <div>
          <p className="text-[14px] font-bold text-[#9AA5BE] mb-4 uppercase tracking-wider">
            Qytetet e mbuluara
          </p>
          <div className="flex flex-wrap gap-2.5 mb-8">
            {cities.map((c) => (
              <Link
                key={c.id}
                href={`/kerko?city=${c.slug}`}
                className="bg-[#1E2C4E] border border-[#3C4A6E] px-3.5 py-1.5 rounded-full text-[13.5px] text-white hover:border-primary transition"
              >
                {localName(c, locale)}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-6 text-[13.5px] text-[#9AA5BE] border-t border-[#2A3757] pt-5 mb-4">
            <Link href="/rreth-nesh" className="hover:text-white transition">{t("about")}</Link>
            <Link href="/rreth-nesh#rregullat" className="hover:text-white transition">{t("rules")}</Link>
            <a href="mailto:info@vlersomjekun.al" className="hover:text-white transition">{t("contact")}</a>
          </div>
          <p className="text-[12.5px] text-[#6B7793]">
            © {new Date().getFullYear()} Vlerëso Mjekun ·{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#9AA5BE] transition"
            >
              © OpenStreetMap contributors
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
