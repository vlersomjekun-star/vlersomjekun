"use client";

import { useRouter } from "@/i18n/navigation";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPageForm({
  googleEnabled,
  callbackUrl,
}: {
  googleEnabled: boolean;
  callbackUrl?: string;
}) {
  const router = useRouter();
  return (
    <LoginForm
      googleEnabled={googleEnabled}
      callbackUrl={callbackUrl ?? "/"}
      onSwitchToSignup={() =>
        router.push(
          `/regjistrohu${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`
        )
      }
    />
  );
}
