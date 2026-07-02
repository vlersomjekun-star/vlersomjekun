/**
 * Fetch i sjellshëm: User-Agent normal, delay 1.5-2s mes kërkesave, retry i kufizuar,
 * respekton robots.txt. Në 403/429 NDALON menjëherë — s'insistojmë kurrë.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const robotsCache = new Map<string, string[]>(); // host → disallow paths
let lastRequestAt = 0;

async function politeDelay(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  const wait = 1500 + Math.random() * 500 - elapsed;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

async function disallowedPaths(origin: string): Promise<string[]> {
  if (robotsCache.has(origin)) return robotsCache.get(origin)!;
  let paths: string[] = [];
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { "User-Agent": UA } });
    if (res.ok) {
      const text = await res.text();
      let applies = false;
      for (const line of text.split("\n")) {
        const [key, ...rest] = line.split(":");
        const value = rest.join(":").trim();
        if (/^user-agent$/i.test(key.trim())) applies = value === "*";
        else if (applies && /^disallow$/i.test(key.trim()) && value) paths.push(value);
      }
    }
  } catch {
    paths = [];
  }
  robotsCache.set(origin, paths);
  return paths;
}

export async function fetchHtml(url: string): Promise<string> {
  const { origin, pathname } = new URL(url);
  const disallowed = await disallowedPaths(origin);
  if (disallowed.some((p) => pathname.startsWith(p))) {
    throw new Error(`robots.txt e ndalon: ${url}`);
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    await politeDelay();
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "sq,en;q=0.8" },
      redirect: "follow",
    });
    if (res.status === 403 || res.status === 429) {
      // NDALO — mos insisto (site të vogla)
      throw new Error(`NDALUAR nga serveri (${res.status}) për ${url} — nuk vazhdojmë`);
    }
    if (res.ok) return res.text();
    if (attempt === 3) throw new Error(`Fetch dështoi (${res.status}) për ${url}`);
    await new Promise((r) => setTimeout(r, 3000 * attempt));
  }
  throw new Error("unreachable");
}
