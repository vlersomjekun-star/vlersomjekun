/**
 * HAPI 1 — Sondazh i API-ve të mundshme publike (app "Shëndeti", portale qeveritare).
 * Sjellje e respektueshme: timeout të shkurtër, 1 provë për endpoint, ndalim
 * i menjëhershëm në 401/403 (nuk insistojmë kurrë ndaj kërkesës së login-it).
 *
 * Ekzekutimi: npx tsx scripts/family-doctors/probe-api.ts
 */
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");
const UA = "Vleresomjekun/1.0 (kërkim strukture publike; info@vlersomjekun.al)";

const CANDIDATES = [
  "https://api.portaliimjekut.gov.al/api/doctors",
  "https://api.portaliimjekut.gov.al/api/facilities",
  "https://api.portaliimjekut.gov.al/api/centers",
  "https://api.portaliimjekut.gov.al/api/search",
  "https://portaliimjekut.gov.al/api/doctors",
  "https://portaliimjekut.gov.al/api/facilities",
  "https://shendeti.gov.al/api/doctors",
  "https://shendeti.gov.al/api/facilities",
  "https://fsdksh.gov.al/api/doctors",
  "https://fsdksh.gov.al/api/facilities",
  "https://api.shendeti.al/doctors",
  "https://api.shendeti.al/facilities",
  "https://shendeti.al/api/facilities",
];

type ProbeResult = {
  url: string;
  status: number | "TIMEOUT" | "DNS_ERROR" | "ERROR";
  contentType?: string;
  bodyPreview?: string;
};

async function probe(url: string): Promise<ProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.status === 401 || res.status === 403) {
      console.log(`  ${url} → ${res.status} (kërkon autentikim) — NDALUAR, nuk insistojmë`);
      return { url, status: res.status };
    }
    const text = await res.text();
    return {
      url,
      status: res.status,
      contentType: res.headers.get("content-type") ?? undefined,
      bodyPreview: text.slice(0, 300),
    };
  } catch (e) {
    clearTimeout(timeout);
    const msg = String(e);
    const status = /abort/i.test(msg) ? "TIMEOUT" : /ENOTFOUND|EAI_AGAIN/i.test(msg) ? "DNS_ERROR" : "ERROR";
    return { url, status };
  }
}

async function main() {
  console.log(`Sondazh i ${CANDIDATES.length} endpoint-eve të mundshme...\n`);
  const results: ProbeResult[] = [];
  for (const url of CANDIDATES) {
    const r = await probe(url);
    results.push(r);
    const label =
      typeof r.status === "number"
        ? r.status
        : r.status;
    console.log(`  ${url} → ${label}`);
    await new Promise((res) => setTimeout(res, 500)); // delay i respektueshëm
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "api-discovery.json"), JSON.stringify(results, null, 2), "utf8");

  // Përgjigjet 2xx me content-type text/html + tekst "Incapsula"/robots noindex janë
  // faqe sfide WAF (bot-protection), JO API reale — filtrohen si "të bllokuara".
  const realHits = results.filter(
    (r) =>
      typeof r.status === "number" &&
      r.status >= 200 &&
      r.status < 300 &&
      r.contentType?.includes("json")
  );
  const wafBlocked = results.filter(
    (r) => typeof r.status === "number" && r.bodyPreview?.includes("Incapsula")
  );
  const authRequired = results.filter((r) => r.status === 401 || r.status === 403);

  console.log("\n---");
  if (realHits.length > 0) {
    console.log(`API_FOUND: ${realHits.length} endpoint(e) me JSON real — shih api-discovery.json`);
  } else {
    console.log("API_NOT_FOUND: asnjë endpoint publik i aksesueshëm pa autentikim.");
    if (wafBlocked.length) {
      console.log(
        `(${wafBlocked.length} endpoint(e) të mbrojtura nga Incapsula/WAF — sinjal eksplicit anti-automatizim, NDALUAR, nuk provohet më tej)`
      );
    }
    console.log(`(${authRequired.length} kërkuan login/token — DNS/timeout për të tjerët)`);
    console.log("Vazhdo me strategjinë alternative: OSM + PDF FSDKSH + linkim manual admini.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
