import { Bricolage_Grotesque, Source_Sans_3 } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { SessionProvider } from "next-auth/react";
import { googleEnabled } from "@/auth";
import { routing } from "@/i18n/routing";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthGateProvider from "@/components/auth/AuthGate";
import "../globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["400", "500", "600", "700", "800"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--font-source-sans",
  weight: ["400", "500", "600", "700"],
});

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${bricolage.variable} ${sourceSans.variable}`}>
      <body className="flex min-h-screen flex-col antialiased bg-warm text-[#1A2540]">
        <NextIntlClientProvider>
          <SessionProvider>
            <AuthGateProvider googleEnabled={googleEnabled}>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </AuthGateProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
