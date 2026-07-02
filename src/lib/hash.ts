import { createHash } from "crypto";

const salt = () => {
  const s = process.env.PHONE_HASH_SALT;
  if (!s) throw new Error("PHONE_HASH_SALT mungon në env");
  return s;
};

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip + salt()).digest("hex");
}

/** Nxjerr IP-në e klientit nga headers (Vercel/proxy aware). */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
