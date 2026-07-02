/**
 * HAPI 3 — Normalizimi (output/doctors-raw.json → output/doctors-clean.json + report.md)
 *
 * - korrigjon gabimet e njohura të specialiteteve të burimit
 * - mapon specialitetet te slug-et ekzistuese të DB-së ose përcakton të reja (specialties-new.json)
 * - pastron emrat (trim, apostrofa gabim, Title Case me ç/ë)
 * - dedup: firstName+lastName+specialty+region
 * - mapon rajonet te qytetet (city slugs)
 *
 * Ekzekutimi: npx tsx scripts/umsh/normalize.ts
 */
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import type { RawDoctor } from "./parse";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const OUT_DIR = path.join(DIR, "output");

// ---- Rajon → City slug (diber/kukes/lezhe krijohen nga import.ts nëse mungojnë) ----
const REGION_TO_CITY: Record<string, string> = {
  Tirane: "tirane",
  Durres: "durres",
  Vlore: "vlore",
  Shkoder: "shkoder",
  Elbasan: "elbasan",
  Fier: "fier",
  Korce: "korce",
  Berat: "berat",
  Diber: "diber",
  Kukes: "kukes",
  Lezhe: "lezhe",
  Gjirokaster: "gjirokaster",
};

// ---- Korrigjime të verifikuara të burimit (typo + sinonime) ----
const SPECIALTY_FIXES: Record<string, string> = {
  "Onkkologji": "Onkologji",
  "Mirkobiologji": "Mikrobiologji",
  "Dermatalogji": "Dermatologji",
  "Dermatologji & Venerologji": "Dermatologji",
  "Anestezi - Reaminacion": "Anestezi-Reanimacion",
  "Gastrohepatologji": "Gastroenterologji-Hepatologji",
  "Gastroenterologji": "Gastroenterologji-Hepatologji",
  "Diagnoza me Imazhe": "Imazheri",
  "Semundje Infektive": "Sëmundje Infektive",
  "Infeksionist": "Sëmundje Infektive",
  "Kirurgji e pergjithshme": "Kirurgji e Pergjithshme",
  "Pneumolog": "Pneumologji",
  "Mjek i Pergjithshem": "Mjek i Përgjithshëm",
  "Mjek Familje": "Mjek i Përgjithshëm",
  "Imunologji": "Alergologji-Imunologji",
  "Neuropsikiater": "Neuropsikiatri",
  "Psikiatri e Femijeve dhe Adoleshenteve": "Psikiatri e Fëmijëve dhe Adoleshentëve",
  "Kirurgji-Vaskulare": "Kirurgji Vaskulare",
  "Mjekesi Berthamore/Nukleare": "Mjekësi Bërthamore",
  "Mjeksi Tradicionale Kineze": "Mjekësi Tradicionale Kineze",
};

// ---- Specialiteti i normalizuar → slug ekzistues në DB (seed) ----
const TO_EXISTING_SLUG: Record<string, string> = {
  "Mjek i Përgjithshëm": "mjek-i-pergjithshem",
  "Kardiologji": "kardiolog",
  "Pediatri": "pediater",
  "Obstetrike-Gjinekologji": "gjinekolog",
  "Kirurgji e Pergjithshme": "kirurg",
  "Okulistike": "okulista",
  "Otorinolaringologji": "orl",
  "Nefrologji": "nefrolog",
  "Reumatologji": "reumatolog",
  "Neurologji": "neurolog",
  "Endokrinologji": "endokrinolog",
  "Psikiatri": "psikiater",
  "Dermatologji": "dermatolog",
  "Onkologji": "onkolog",
  "Pneumologji": "pneumolog",
  "Urologji": "urolog",
  "Gastroenterologji-Hepatologji": "gastroenterolog",
  "Ortopedi-Traumatologji": "ortoped",
};

// ---- Specialitete të reja (s'ekzistojnë në seed) — përkthimet për rishikim ----
type NewSpecialty = { slug: string; nameSq: string; nameEn: string; nameIt: string; icon: string };
const NEW_SPECIALTIES: Record<string, NewSpecialty> = {
  "Anestezi-Reanimacion": { slug: "anestezi-reanimacion", nameSq: "Anestezi-Reanimacion", nameEn: "Anesthesiology & Intensive Care", nameIt: "Anestesia e Rianimazione", icon: "syringe" },
  "Laborator Klinik-Biokimik": { slug: "laborator-klinik", nameSq: "Laborator Klinik-Biokimik", nameEn: "Clinical & Biochemical Laboratory", nameIt: "Laboratorio clinico-biochimico", icon: "microscope" },
  "Mikrobiologji": { slug: "mikrobiologji", nameSq: "Mikrobiologji", nameEn: "Microbiology", nameIt: "Microbiologia", icon: "microscope" },
  "Imazheri": { slug: "imazheri", nameSq: "Imazheri", nameEn: "Medical Imaging", nameIt: "Diagnostica per immagini", icon: "scan" },
  "Radiologji": { slug: "radiologji", nameSq: "Radiologji", nameEn: "Radiology", nameIt: "Radiologia", icon: "radiation" },
  "Sëmundje Infektive": { slug: "semundje-infektive", nameSq: "Sëmundje Infektive", nameEn: "Infectious Diseases", nameIt: "Malattie infettive", icon: "biohazard" },
  "Hematologji": { slug: "hematologji", nameSq: "Hematologji", nameEn: "Hematology", nameIt: "Ematologia", icon: "droplet" },
  "Alergologji-Imunologji": { slug: "alergologji-imunologji", nameSq: "Alergologji-Imunologji", nameEn: "Allergology & Immunology", nameIt: "Allergologia e immunologia", icon: "shield" },
  "Mjekesi Interne": { slug: "mjekesi-interne", nameSq: "Mjekësi Interne", nameEn: "Internal Medicine", nameIt: "Medicina interna", icon: "stethoscope" },
  "Kirurgji Plastike Rikonstruktive": { slug: "kirurgji-plastike", nameSq: "Kirurgji Plastike Rikonstruktive", nameEn: "Plastic & Reconstructive Surgery", nameIt: "Chirurgia plastica ricostruttiva", icon: "scissors" },
  "Higjenist": { slug: "higjene", nameSq: "Higjienë", nameEn: "Hygiene Specialist", nameIt: "Igienista", icon: "sparkles" },
  "Shendet Publik": { slug: "shendet-publik", nameSq: "Shëndet Publik", nameEn: "Public Health", nameIt: "Sanità pubblica", icon: "users" },
  "Kardiokirurgji": { slug: "kardiokirurgji", nameSq: "Kardiokirurgji", nameEn: "Cardiac Surgery", nameIt: "Cardiochirurgia", icon: "heart-pulse" },
  "Anatomi Patologjike": { slug: "anatomi-patologjike", nameSq: "Anatomi Patologjike", nameEn: "Pathological Anatomy", nameIt: "Anatomia patologica", icon: "microscope" },
  "Neurokirurgji": { slug: "neurokirurgji", nameSq: "Neurokirurgji", nameEn: "Neurosurgery", nameIt: "Neurochirurgia", icon: "brain" },
  "Mjekesi e Urgjences": { slug: "mjekesi-urgjence", nameSq: "Mjekësi e Urgjencës", nameEn: "Emergency Medicine", nameIt: "Medicina d'urgenza", icon: "siren" },
  "Neonatologji": { slug: "neonatologji", nameSq: "Neonatologji", nameEn: "Neonatology", nameIt: "Neonatologia", icon: "baby" },
  "Kirurgji Vaskulare": { slug: "kirurgji-vaskulare", nameSq: "Kirurgji Vaskulare", nameEn: "Vascular Surgery", nameIt: "Chirurgia vascolare", icon: "activity" },
  "Psikiatri e Fëmijëve dhe Adoleshentëve": { slug: "psikiatri-femijesh", nameSq: "Psikiatri e Fëmijëve dhe Adoleshentëve", nameEn: "Child & Adolescent Psychiatry", nameIt: "Psichiatria infantile e dell'adolescenza", icon: "message-circle" },
  "Mjekesi Ligjore": { slug: "mjekesi-ligjore", nameSq: "Mjekësi Ligjore", nameEn: "Forensic Medicine", nameIt: "Medicina legale", icon: "scale" },
  "Toksikologji Klinike": { slug: "toksikologji", nameSq: "Toksikologji Klinike", nameEn: "Clinical Toxicology", nameIt: "Tossicologia clinica", icon: "flask-conical" },
  "Mjekesi Transfuzive": { slug: "mjekesi-transfuzive", nameSq: "Mjekësi Transfuzive", nameEn: "Transfusion Medicine", nameIt: "Medicina trasfusionale", icon: "droplets" },
  "Epidemiologji": { slug: "epidemiologji", nameSq: "Epidemiologji", nameEn: "Epidemiology", nameIt: "Epidemiologia", icon: "activity" },
  "Kirurgji Oro-Maxilo-Faciale": { slug: "kirurgji-maxilo-faciale", nameSq: "Kirurgji Oro-Maxilo-Faciale", nameEn: "Oral & Maxillofacial Surgery", nameIt: "Chirurgia maxillo-facciale", icon: "smile" },
  "Neuropsikiatri": { slug: "neuropsikiatri", nameSq: "Neuropsikiatri", nameEn: "Neuropsychiatry", nameIt: "Neuropsichiatria", icon: "brain" },
  "Fizioterapi": { slug: "fizioterapi", nameSq: "Fizioterapi", nameEn: "Physiotherapy", nameIt: "Fisioterapia", icon: "accessibility" },
  "Semundje Profesionale": { slug: "semundje-profesionale", nameSq: "Sëmundje Profesionale", nameEn: "Occupational Diseases", nameIt: "Malattie professionali", icon: "briefcase-medical" },
  "Dietologji": { slug: "dietologji", nameSq: "Dietologji", nameEn: "Dietology", nameIt: "Dietologia", icon: "apple" },
  "Mjekesi Sportive": { slug: "mjekesi-sportive", nameSq: "Mjekësi Sportive", nameEn: "Sports Medicine", nameIt: "Medicina dello sport", icon: "dumbbell" },
  "Mjekesi e Punes": { slug: "mjekesi-punes", nameSq: "Mjekësi e Punës", nameEn: "Occupational Medicine", nameIt: "Medicina del lavoro", icon: "briefcase" },
  "Mjekësi Tradicionale Kineze": { slug: "mjekesi-kineze", nameSq: "Mjekësi Tradicionale Kineze", nameEn: "Traditional Chinese Medicine", nameIt: "Medicina tradizionale cinese", icon: "leaf" },
  "Kardiopediatri": { slug: "kardiopediatri", nameSq: "Kardiopediatri", nameEn: "Pediatric Cardiology", nameIt: "Cardiologia pediatrica", icon: "heart-pulse" },
  "Andrologji": { slug: "andrologji", nameSq: "Andrologji", nameEn: "Andrology", nameIt: "Andrologia", icon: "user" },
  "Mjekësi Bërthamore": { slug: "mjekesi-berthamore", nameSq: "Mjekësi Bërthamore", nameEn: "Nuclear Medicine", nameIt: "Medicina nucleare", icon: "atom" },
  "Pneumoftiziatri": { slug: "pneumoftiziatri", nameSq: "Pneumoftiziatri", nameEn: "Pneumophthisiology", nameIt: "Pneumotisiologia", icon: "wind" },
  "Patologji": { slug: "patologji", nameSq: "Patologji", nameEn: "Pathology", nameIt: "Patologia", icon: "microscope" },
};

export type CleanDoctor = {
  firstName: string;
  lastName: string;
  gender: "M" | "F" | null;
  region: string;
  citySlug: string;
  specialtySlug: string;
};

/** Pastrim emri: trim, heq apostrofa/backtick gabim, Title Case duke ruajtur ç/ë. */
function cleanName(raw: string): string {
  const stripped = raw.replace(/[`´'"']/g, "").replace(/\s+/g, " ").trim();
  return stripped
    .toLowerCase()
    .split(" ")
    .map((word) =>
      word
        .split("-")
        .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
        .join("-")
    )
    .join(" ");
}

function normalizeSpecialty(raw: string | null): { name: string; slug: string } {
  let name = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!name) name = "Mjek i Përgjithshëm";
  if (SPECIALTY_FIXES[name]) name = SPECIALTY_FIXES[name];

  if (TO_EXISTING_SLUG[name]) return { name, slug: TO_EXISTING_SLUG[name] };
  if (NEW_SPECIALTIES[name]) return { name, slug: NEW_SPECIALTIES[name].slug };
  throw new Error(`Specialitet i pamapuar: "${name}" — shto në mapping`);
}

function main() {
  const raw: RawDoctor[] = JSON.parse(
    readFileSync(path.join(OUT_DIR, "doctors-raw.json"), "utf8")
  );

  const clean: CleanDoctor[] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const skipped: string[] = [];
  const usedNewSpecialties = new Set<string>();
  const bySpecialty = new Map<string, number>();
  const byRegion = new Map<string, number>();

  for (const d of raw) {
    const citySlug = REGION_TO_CITY[d.region];
    if (!citySlug) {
      skipped.push(`rajon i pamapuar: ${d.region} (${d.firstName} ${d.lastName})`);
      continue;
    }
    let spec: { name: string; slug: string };
    try {
      spec = normalizeSpecialty(d.specialtyRaw);
    } catch (e) {
      skipped.push(String(e));
      continue;
    }
    const firstName = cleanName(d.firstName);
    const lastName = cleanName(d.lastName);
    if (firstName.length < 2 || lastName.length < 2) {
      skipped.push(`emër shumë i shkurtër: "${firstName} ${lastName}"`);
      continue;
    }

    const key = `${firstName}|${lastName}|${spec.slug}|${d.region}`.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(`${firstName} ${lastName} (${spec.name}, ${d.region})`);
      continue;
    }
    seen.add(key);

    if (NEW_SPECIALTIES[spec.name]) usedNewSpecialties.add(spec.name);
    bySpecialty.set(spec.slug, (bySpecialty.get(spec.slug) ?? 0) + 1);
    byRegion.set(d.region, (byRegion.get(d.region) ?? 0) + 1);

    clean.push({
      firstName,
      lastName,
      gender: d.gender,
      region: d.region,
      citySlug,
      specialtySlug: spec.slug,
    });
  }

  writeFileSync(path.join(OUT_DIR, "doctors-clean.json"), JSON.stringify(clean, null, 2), "utf8");
  writeFileSync(
    path.join(OUT_DIR, "specialties-new.json"),
    JSON.stringify(
      [...usedNewSpecialties].map((name) => NEW_SPECIALTIES[name]),
      null,
      2
    ),
    "utf8"
  );

  const report = [
    "# Raport normalizimi — Regjistri UMSH",
    "",
    `Data: ${new Date().toISOString()}`,
    "",
    `- Rreshta raw: ${raw.length}`,
    `- Mjekë të pastruar: ${clean.length}`,
    `- Duplikatë të hequr: ${duplicates.length}`,
    `- Të skipuar: ${skipped.length}`,
    `- Specialitete të reja për t'u krijuar: ${usedNewSpecialties.size} (shih specialties-new.json — rishiko përkthimet)`,
    "",
    "SHËNIM PRIVACY: Datelindje dhe Atesi nuk janë lexuar/ruajtur në asnjë hap (Ligji 9887).",
    "",
    "## Për rajon",
    ...[...byRegion.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => `- ${r}: ${n}`),
    "",
    "## Për specialitet (slug)",
    ...[...bySpecialty.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `- ${s}: ${n}`),
    "",
    "## Duplikatë të hequr",
    ...duplicates.map((d) => `- ${d}`),
    "",
    "## Të skipuar (me arsye)",
    ...(skipped.length ? skipped.map((s) => `- ${s}`) : ["- asnjë"]),
    "",
  ].join("\n");
  writeFileSync(path.join(OUT_DIR, "report.md"), report, "utf8");

  console.log(`Clean: ${clean.length} | duplikatë: ${duplicates.length} | skip: ${skipped.length}`);
  console.log(`Specialitete të reja: ${usedNewSpecialties.size}`);
  console.log(`Raporti: scripts/umsh/output/report.md`);
}

main();
