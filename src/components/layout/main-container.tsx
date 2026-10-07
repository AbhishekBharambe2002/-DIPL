"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const FULL_BLEED = new Set(["/app"]);

export function MainContainer({ children }: { children: ReactNode }) {
  if (FULL_BLEED.has(usePathname())) {
    return <div className="relative h-[calc(100dvh-3rem)] lg:h-dvh">{children}</div>;
  }
  return <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">{children}</div>;
}
