// Lista fillestare e fjalëve që flagojnë një review për moderim manual (JO bllokim).
// Shto fjalë me kalimin e kohës nga panel-i admin ose direkt këtu.
export const BLACKLIST: string[] = [
  // shqip
  "idiot", "budalla", "hajdut", "mashtrues", "kriminel", "injorant",
  "qelbësirë", "maskara", "horr", "bythë", "mut", "pis", "kurvë",
  "peder", "karagjoz", "gomar", "lopë", "derr",
  // italisht
  "stronzo", "coglione", "cretino", "imbecille", "bastardo", "merda",
  "vaffanculo", "truffatore", "ladro", "incompetente del cazzo", "puttana",
  // anglisht
  "asshole", "bastard", "bitch", "fuck", "shit", "scumbag", "moron",
  "scammer", "thief", "fraud",
];

/** Kthen fjalën e parë të gjetur nga blacklist, ose null. */
export function findBlacklistedWord(text: string): string | null {
  const lower = text.toLowerCase();
  for (const word of BLACKLIST) {
    // kërkim me kufij fjale për të shmangur false positives (p.sh. "muti" ≠ "mut")
    const re = new RegExp(`(^|[^a-zëç])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-zëç])`, "i");
    if (re.test(lower)) return word;
  }
  return null;
}
