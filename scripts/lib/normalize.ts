/**
 * Module të përbashkëta për pipeline-t e importit (UMSH, USSH, klinika...).
 */

/** Pastrim emri: trim, heq apostrofa/backtick gabim, Title Case duke ruajtur ç/ë. */
export function cleanName(raw: string): string {
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

/** Slug ASCII nga pjesë emrash (ë→e, ç→c). */
export function slugify(...parts: string[]): string {
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/ë/g, "e")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Rregullon UTF-8 mojibake (të dyfishtë ose të thjeshtë) për ç/ë/Ç/Ë —
 * sekuenca të verifikuara nga regjistri real i USSH (p.sh. "GaÃƒÂ§e" → "Gaçe").
 */
const MOJIBAKE: [string, string][] = [
  ["ÃƒÂ§", "ç"],
  ["ÃƒÂ«", "ë"],
  ["Ãƒâ€¡", "Ç"],
  ["Ãƒâ€¹", "Ë"],
  ["Ã§", "ç"],
  ["Ã«", "ë"],
  ["Ã‡", "Ç"],
  ["Ã‹", "Ë"],
];

export function fixMojibake(s: string): { fixed: string; changed: boolean } {
  let fixed = s;
  for (const [bad, good] of MOJIBAKE) {
    fixed = fixed.split(bad).join(good);
  }
  return { fixed, changed: fixed !== s };
}

/**
 * Ndan një mbiemër/emër të dyfishtë → [kryesori, alternativi|null].
 * Format të verifikuara nga burimet reale (USSH, Urdhri i Psikologut):
 * "Aga (Xharo)", "(Vrapi) Gjika", "Guza/Nano", "Bajrami//Muhollari",
 * "Hykaj(Dervishaj)", "Dervishi Shala", "Sula / Tosku".
 */
export function splitDoubleSurname(raw: string): [string, string | null] {
  const s = raw.replace(/\/{2,}/g, "/").replace(/\s+/g, " ").trim();

  // "(Vrapi) Gjika" — kllapa në fillim → alternativi është në kllapa
  const leadParen = s.match(/^\(([^)]+)\)\s*(.+)$/);
  if (leadParen) return [leadParen[2].trim(), leadParen[1].trim()];

  // "Aga (Xharo)" / "Hykaj(Dervishaj)"
  const trailParen = s.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (trailParen) return [trailParen[1].trim(), trailParen[2].trim()];

  // "Guza/Nano" / "Sula / Tosku"
  const slash = s.split("/");
  if (slash.length > 1) return [slash[0].trim(), slash.slice(1).join(" ").trim() || null];

  // "Dervishi Shala" — dy fjalë me hapësirë → i pari kryesor, i dyti alternativ
  const words = s.split(" ");
  if (words.length > 1) return [words[0], words.slice(1).join(" ")];

  return [s, null];
}
