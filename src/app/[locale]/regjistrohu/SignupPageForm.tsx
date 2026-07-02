"use client";

import { useRouter } from "@/i18n/navigation";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupPageForm({
  googleEnabled,
  callbackUrl,
}: {
  googleEnabled: boolean;
  callbackUrl?: string;
}) {
  const router = useRouter();
  return (
    <SignupForm
      googleEnabled={googleEnabled}
      callbackUrl={callbackUrl ?? "/"}
      onSwitchToLogin={() =>
        router.push(
          `/identifikohu${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`
        )
      }
    />
  );
}
