import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BRAND } from "@/config/brand";
import { LogoMark, ThemeToggle } from "@/components/brand";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-paper-100">
      <header className="sticky top-0 z-30 border-b border-paper-200 bg-paper-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <LogoMark size="sm" />
            <span className="text-[13.5px] font-semibold text-ink-900 truncate">{BRAND.name}</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-2">
        <div className="relative h-44 sm:h-56 lg:h-full lg:min-h-[520px] overflow-hidden">
          <Image
            src="/landing/login.png"
            alt="Fire landing valve, copper sprinkler pipe and hose against concrete"
            fill
            preload
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[#0e0c0a]/52" />
          <div className="relative z-10 h-full flex flex-col justify-end lg:justify-between px-5 py-5 sm:px-8 lg:px-10 lg:py-12 text-[#fcfaf6]">
            <div className="hidden lg:block">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#fcfaf6]/55">
                {BRAND.company}
              </div>
              <h1 className="font-serif text-[40px] leading-[1.12] mt-3 max-w-md">
                The record behind every fire-safety job.
              </h1>
              <p className="mt-4 text-[14.5px] leading-relaxed text-[#fcfaf6]/75 max-w-sm">
                Projects, sites and stores on one book. Every movement posted. Every exception owned.
              </p>
            </div>
            <div>
              <div className="lg:hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[#fcfaf6]/70">
                {BRAND.company}
              </div>
              <h1 className="lg:hidden font-serif text-[22px] leading-tight mt-1">
                The record behind every fire-safety job.
              </h1>
              <div className="hidden lg:block text-[12px] text-[#fcfaf6]/55">
                {BRAND.full} · Goregaon (E) · Mumbai
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 sm:px-5 py-10 sm:py-16 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
          <div className="w-full max-w-[380px]">
            <div className="kicker">Administrator</div>
            <h2 className="font-serif text-[28px] sm:text-[32px] leading-tight text-ink-900 mt-1">Sign in</h2>
            <p className="text-[13.5px] text-ink-500 mt-2 mb-8">
              Restricted to DIPL store, site and management staff.
            </p>
            <Suspense fallback={<div className="h-48 bg-paper-200 animate-pulse" />}>
              <LoginForm />
            </Suspense>
            <Link href="/" className="mt-8 inline-block text-[12.5px] text-ink-500 hover:text-ink-900">
              ← Back to overview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
