"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import VerifyNotice from "./VerifyNotice";
import NicknameForm from "./NicknameForm";

export type GateView = "login" | "signup" | "verify" | "nickname";

type AuthGateContextValue = {
  /** true nëse user-i mund të veprojë; ndryshe hap modal-in e duhur dhe kthen false. */
  requireAuth: () => boolean;
  openGate: (view?: GateView) => void;
  closeGate: () => void;
};

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function useAuthGate(): AuthGateContextValue {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate përdoret vetëm brenda AuthGateProvider");
  return ctx;
}

export default function AuthGateProvider({
  children,
  googleEnabled,
}: {
  children: ReactNode;
  googleEnabled: boolean;
}) {
  const { data: session, status } = useSession();
  const t = useTranslations("auth");
  const [view, setView] = useState<GateView | null>(null);

  const openGate = useCallback((v: GateView = "login") => setView(v), []);
  const closeGate = useCallback(() => setView(null), []);

  const requireAuth = useCallback((): boolean => {
    if (status !== "authenticated" || !session?.user?.id || session.user.banned) {
      setView("login");
      return false;
    }
    if (!session.user.verified) {
      setView("verify");
      return false;
    }
    if (!session.user.nickname) {
      setView("nickname");
      return false;
    }
    return true;
  }, [status, session]);

  return (
    <AuthGateContext.Provider value={{ requireAuth, openGate, closeGate }}>
      {children}
      {view && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && closeGate()}
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {view === "login" && t("loginTitle")}
                {view === "signup" && t("signupTitle")}
                {view === "verify" && t("verifyTitle")}
                {view === "nickname" && t("nicknameTitle")}
              </h2>
              <button
                onClick={closeGate}
                aria-label={t("close")}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {view === "login" && (
              <LoginForm
                googleEnabled={googleEnabled}
                onSuccess={closeGate}
                onSwitchToSignup={() => setView("signup")}
              />
            )}
            {view === "signup" && (
              <SignupForm
                googleEnabled={googleEnabled}
                onVerifyNeeded={() => setView("verify")}
                onSwitchToLogin={() => setView("login")}
              />
            )}
            {view === "verify" && <VerifyNotice />}
            {view === "nickname" && <NicknameForm onDone={closeGate} />}
          </div>
        </div>
      )}
    </AuthGateContext.Provider>
  );
}
