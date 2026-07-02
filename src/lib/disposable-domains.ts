// Domain-e email usa-e-getta të bllokuara në regjistrim. Zgjeroje me kalimin e kohës.
export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "sharklasers.com",
  "temp-mail.org",
  "temp-mail.io",
  "tempmail.com",
  "tempmail.dev",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "throwawaymail.com",
  "getnada.com",
  "maildrop.cc",
  "dispostable.com",
  "trashmail.com",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "fakeinbox.com",
  "spamgourmet.com",
  "mytemp.email",
  "burnermail.io",
  "emailondeck.com",
  "tempinbox.com",
  "33mail.com",
  "anonaddy.me",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return Boolean(domain && DISPOSABLE_DOMAINS.has(domain));
}
