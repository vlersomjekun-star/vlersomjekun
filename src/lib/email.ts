export interface EmailProvider {
  sendVerification(to: string, verifyUrl: string): Promise<void>;
  sendPasswordReset(to: string, resetUrl: string): Promise<void>;
}

class MockEmailProvider implements EmailProvider {
  async sendVerification(to: string, verifyUrl: string): Promise<void> {
    console.log(`[MockEmailProvider] Verifikim për ${to}: ${verifyUrl}`);
  }
  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    console.log(`[MockEmailProvider] Reset fjalëkalimi për ${to}: ${resetUrl}`);
  }
}

function emailShell(body: string): string {
  return `<!DOCTYPE html>
<html lang="sq">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F2E9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F2E9;padding:40px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">
        <tr>
          <td align="center" style="padding-bottom:24px">
            <span style="font-size:22px;font-weight:700;color:#1a7d5e;letter-spacing:-0.5px">Vleresomjekun</span>
            <span style="font-size:13px;color:#888;display:block;margin-top:2px">Platforma shqiptare e vlerësimit të mjekëve</span>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;border-radius:16px;padding:40px 36px;box-shadow:0 2px 12px rgba(0,0,0,0.07)">
            ${body}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:24px">
            <p style="margin:0;font-size:11px;color:#bbb">
              © ${new Date().getFullYear()} Vleresomjekun ·
              <a href="https://vlersomjekun.al" style="color:#1a7d5e;text-decoration:none">vlersomjekun.al</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function actionButton(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:0 0 28px">
    <tr>
      <td align="center" style="background:#1a7d5e;border-radius:12px">
        <a href="${href}" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:0.2px">${label}</a>
      </td>
    </tr>
  </table>`;
}

function fallbackLink(href: string): string {
  return `<p style="margin:0;font-size:12px;color:#999;line-height:1.6">
    Nëse butoni nuk funksionon, kopjo dhe ngjit këtë adresë në shfletues:<br>
    <a href="${href}" style="color:#1a7d5e;word-break:break-all">${href}</a>
  </p>`;
}

function buildVerificationHtml(url: string): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1A2540">Verifiko email-in tënd</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6">
      Mirë se erdhe! Kliko butonin më poshtë për të aktivizuar llogarinë tënde.<br>
      Ky link është i vlefshëm për <strong>24 orë</strong>.
    </p>
    ${actionButton(url, "✓ &nbsp;Verifiko Email-in")}
    ${fallbackLink(url)}
    <hr style="margin:28px 0;border:none;border-top:1px solid #E8E4DA">
    <p style="margin:0;font-size:12px;color:#aaa">
      Nëse nuk e ke krijuar ti këtë llogari, mund ta injorosh këtë email — asgjë nuk do të ndryshojë.
    </p>
  `);
}

function buildPasswordResetHtml(url: string): string {
  return emailShell(`
    <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1A2540">Rivendos fjalëkalimin</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#555;line-height:1.6">
      Kemi marrë një kërkesë për rivendosjen e fjalëkalimit të llogarisë tënde.<br>
      Ky link është i vlefshëm për <strong>1 orë</strong>.
    </p>
    ${actionButton(url, "🔑 &nbsp;Cakto fjalëkalim të ri")}
    ${fallbackLink(url)}
    <hr style="margin:28px 0;border:none;border-top:1px solid #E8E4DA">
    <p style="margin:0;font-size:12px;color:#aaa">
      Nëse nuk e ke kërkuar ti rivendosjen, mund ta injorosh këtë email — llogaria jote mbetet e sigurt.
    </p>
  `);
}

class ResendEmailProvider implements EmailProvider {
  private async send(to: string, subject: string, html: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY mungon në env");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Vleresomjekun <noreply@vlersomjekun.al>", to: [to], subject, html }),
    });
    if (!res.ok) throw new Error(`Resend dështoi: ${res.status} ${await res.text()}`);
  }

  async sendVerification(to: string, url: string): Promise<void> {
    await this.send(to, "Verifiko email-in tënd — Vleresomjekun", buildVerificationHtml(url));
  }

  async sendPasswordReset(to: string, url: string): Promise<void> {
    await this.send(to, "Rivendos fjalëkalimin — Vleresomjekun", buildPasswordResetHtml(url));
  }
}

export function getEmailProvider(): EmailProvider {
  return process.env.EMAIL_PROVIDER === "resend"
    ? new ResendEmailProvider()
    : new MockEmailProvider();
}
