/**
 * HAPI 1 — Zbulimi: fetch i listës "licensuar" + kontroll manutenzioni + qytetet e dropdown-it.
 *
 *   npx tsx scripts/psychologists/discover.ts
 *
 * GJETJE ARKITEKTURORE (verifikuar në HTML real): lista NUK ka paginim dhe filtri
 * i qytetit është JS lokal — të 932 rreshtat (me kolonë qyteti tashmë të ndarë)
 * janë të pranishëm në 1 faqe të vetme. Kjo do të thotë 1 fetch i vetëm mjafton
 * për tërë regjistrin — asnjë kërkesë e veçantë për qytet (më pak ngarkesë te
 * serveri institucional, jo më shumë siç sugjeronte specifikimi fillestar).
 */
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");
const LIST_URL = "https://regjistri.urdhriipsikologut.al/members/list/licensuar";
const USER_AGENT = "VlersoMjekun/1.0 (platformë vlerësimesh mjekësh; info@vlersomjekun.al)";

export function isMaintenance(html: string): boolean {
  return (
    /site maintenance/i.test(html) ||
    /punime\s+n[ëe]\s+baz[ëe]n\s+e\s+t[ëe]\s+dh[ëe]nave/i.test(html) ||
    /members\/maintenance/i.test(html)
  );
}

async function main() {
  const res = await fetch(LIST_URL, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Fetch dështoi: ${res.status}`);
  const html = await res.text();

  if (isMaintenance(html)) {
    console.error("NDALUAR: siti është në manutenzione (Site Maintenance). Provo më vonë.");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "licensuar.html"), html, "utf8");

  // Qytetet e deklaruara në dropdown (për dokumentim/raport — jo për fetch të veçantë)
  const options = [...html.matchAll(/<select[^>]*id="search-city"[^>]*>([\s\S]*?)<\/select>/g)];
  const dropdownCities = options.length
    ? [...options[0][1].matchAll(/<option[^>]*>([^<]*)<\/option>/g)]
        .map((m) => m[1].trim())
        .filter((c) => c && c !== "(Të Gjithë)")
    : [];

  writeFileSync(
    path.join(OUT_DIR, "cities-discovered.json"),
    JSON.stringify(dropdownCities, null, 2),
    "utf8"
  );

  console.log(`OK — siti nuk është në manutenzione.`);
  console.log(`Qytete në dropdown: ${dropdownCities.length}`);
  console.log(`Përfshin "Kosovë"? ${dropdownCities.includes("Kosovë") ? "PO — trajtohet si qytet i veçantë, skip nga import (jashtë Shqipërisë)" : "jo"}`);
  console.log(`HTML i ruajtur: scripts/psychologists/output/licensuar.html`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
