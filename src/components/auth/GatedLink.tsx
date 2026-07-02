"use client";

import type { ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";
import { useAuthGate } from "./AuthGate";

/**
 * Link që kërkon autentikim të plotë: në klik, nëse user-i s'është gati
 * (login/verifikim/nickname), hapet modal-i përkatës; ndryshe navigon te href.
 */
export default function GatedLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { requireAuth } = useAuthGate();

  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        if (requireAuth()) router.push(href);
      }}
    >
      {children}
    </a>
  );
}
