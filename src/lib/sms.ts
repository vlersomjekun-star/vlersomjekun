export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

/** Dev: logon kodin në console, nuk dërgon asgjë. */
class MockSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<void> {
    console.log(`[MockSmsProvider] OTP për ${phone}: ${code}`);
  }
}

/** Prod: Twilio (mbështet +355). Konfigurohet me env TWILIO_*. */
class TwilioSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string): Promise<void> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !token || !from) {
      throw new Error("Konfigurimi i Twilio mungon (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER)");
    }
    const body = new URLSearchParams({
      To: phone,
      From: from,
      Body: `VlersoMjekun: kodi yt i verifikimit është ${code}. Skadon pas 5 minutash.`,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );
    if (!res.ok) {
      throw new Error(`Twilio dështoi: ${res.status} ${await res.text()}`);
    }
  }
}

export function getSmsProvider(): SmsProvider {
  return process.env.SMS_PROVIDER === "twilio"
    ? new TwilioSmsProvider()
    : new MockSmsProvider();
}
