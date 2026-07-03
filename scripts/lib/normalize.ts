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
