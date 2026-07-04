import { Inter } from "next/font/google";
import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-session";
import { logout } from "./actions";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });

export const metadata = {
  title: "Admin — VlersoMjekun",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const email = await verifySessionToken(store.get(ADMIN_COOKIE)?.value);

  return (
    <html lang="sq">
      <body className={`${inter.variable} min-h-screen bg-gray-50 antialiased`}>
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href="/admin" className="font-bold text-primary">
              VlersoMjekun <span className="rounded bg-primary-light px-1.5 py-0.5 text-xs">ADMIN</span>
            </Link>
            {email && (
              <nav className="flex flex-wrap items-center gap-1 text-sm">
                <Link href="/admin" className="rounded px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100">
                  Statistika
                </Link>
                <Link href="/admin/pending" className="rounded px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100">
                  Në pritje
                </Link>
                <Link href="/admin/reviews" className="rounded px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100">
                  Moderim
                </Link>
                <Link href="/admin/reports" className="rounded px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100">
                  Raportime
                </Link>
                <Link href="/admin/claims" className="rounded px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100">
                  Pretendime
                </Link>
                <Link href="/admin/users" className="rounded px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100">
                  Përdoruesit
                </Link>
                <Link href="/admin/matches" className="rounded px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100">
                  Përputhjet
                </Link>
                <Link href="/admin/osm" className="rounded px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100">
                  OSM
                </Link>
                <Link href="/admin/family-doctors" className="rounded px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100">
                  Mjekë Familjes
                </Link>
                <Link href="/admin/manage" className="rounded px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100">
                  Menaxho
                </Link>
                <form action={logout}>
                  <button className="rounded px-3 py-1.5 font-medium text-red-500 hover:bg-red-50">
                    Dil ({email})
                  </button>
                </form>
              </nav>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
