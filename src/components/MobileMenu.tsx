"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";

export function MobileMenuButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Menu"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#5B6478] hover:bg-[#F4F2E9] hover:text-[#16213D] transition lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 bg-black/45 z-[45]"
            onClick={() => setOpen(false)}
          />
          {/* drawer */}
          <div
            className="fixed top-0 right-0 bottom-0 w-[280px] bg-[#FAFAF8] z-50 p-7 flex flex-col gap-1.5 shadow-[-8px_0_32px_rgba(0,0,0,0.12)]"
            style={{ animation: "vm-slide-right 0.25s ease both" }}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="font-display font-bold text-[18px] text-[#16213D]">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="text-[#8A8471] text-[20px] px-1 leading-none"
                aria-label="Mbyll"
              >✕</button>
            </div>
            <Link href="/kerko" onClick={() => setOpen(false)} className="px-3.5 py-3 rounded-xl text-[15px] font-bold text-[#16213D] border border-[#E8E4DA] hover:bg-[#EAF3EE] transition">Kërko mjekë</Link>
            <Link href="/shto-mjek" onClick={() => setOpen(false)} className="px-3.5 py-3 rounded-xl text-[15px] font-bold text-[#16213D] border border-[#E8E4DA] hover:bg-[#EAF3EE] transition">Shto mjek</Link>
            <Link href="/rreth-nesh" onClick={() => setOpen(false)} className="px-3.5 py-3 rounded-xl text-[15px] font-bold text-[#16213D] border border-[#E8E4DA] hover:bg-[#EAF3EE] transition">Rreth nesh</Link>
            <div className="h-px bg-[#E8E4DA] my-2" />
            <Link href="/identifikohu" onClick={() => setOpen(false)} className="px-3.5 py-3 rounded-xl text-[15px] font-bold text-[#5B6478] border border-[#E8E4DA] hover:bg-[#EAF3EE] transition">Identifikohu</Link>
            <Link href="/regjistrohu" onClick={() => setOpen(false)} className="px-3.5 py-3 rounded-xl text-[15px] font-bold text-white bg-primary text-center hover:bg-primary-dark transition">Regjistrohu</Link>
          </div>
        </>
      )}
    </>
  );
}
