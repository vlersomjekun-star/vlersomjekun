import { Inter } from "next/font/google";
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

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });

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
    <html lang={locale}>
      <body className={`${inter.variable} flex min-h-screen flex-col antialiased`}>
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
