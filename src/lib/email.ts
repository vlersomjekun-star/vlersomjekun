export interface EmailProvider {
  sendVerification(to: string, verifyUrl: string): Promise<void>;
}

/** Dev: logon linkun e verifikimit në console, nuk dërgon asgjë. */
class MockEmailProvider implements EmailProvider {
  async sendVerification(to: string, verifyUrl: string): Promise<void> {
    console.log(`[MockEmailProvider] Verifikim për ${to}: ${verifyUrl}`);
  }
}

/** Prod: Resend (tier falas). Env: RESEND_API_KEY. */
class ResendEmailProvider implements EmailProvider {
  async sendVerification(to: string, verifyUrl: string): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY mungon në env");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "VlersoMjekun <noreply@vlersomjekun.al>",
        to: [to],
        subject: "Verifiko email-in tënd — VlersoMjekun",
        html: `<p>Mirë se erdhe në VlersoMjekun!</p>
<p>Kliko linkun për të verifikuar email-in tënd (skadon pas 24 orësh):</p>
<p><a href="${verifyUrl}">${verifyUrl}</a></p>
<p>Nëse nuk je regjistruar ti, injoroje këtë email.</p>`,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend dështoi: ${res.status} ${await res.text()}`);
    }
  }
}

export function getEmailProvider(): EmailProvider {
  return process.env.EMAIL_PROVIDER === "resend"
    ? new ResendEmailProvider()
    : new MockEmailProvider();
}
