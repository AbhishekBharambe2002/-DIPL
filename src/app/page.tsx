import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { LogoMark, ThemeToggle } from "@/components/brand";

const stats = [
  { label: "Modules", value: "14" },
  { label: "Roles", value: "12" },
  { label: "Channel", value: "Web + mobile" },
  { label: "Books", value: "INR, ledger" },
];

const pillars = [
  {
    n: "01",
    title: "The site is the desk",
    body: "Engineers check in at site, log work done and raise material needs from a phone. The record lands where the office already looks.",
    img: "/landing/whatsapp.png",
    alt: "Site storekeeper logging fire-safety fittings from a phone on an unfinished Mumbai floor",
  },
  {
    n: "02",
    title: "Every item has a place",
    body: "Warehouses, transit and each site store tracked as stock movements — issue, return, transfer and adjust, never an overwritten number.",
    img: "/landing/warehouse.png",
    alt: "Organised warehouse of fire extinguishers, hoses and hydrant fittings",
  },
  {
    n: "03",
    title: "Progress, not just tasks",
    body: "Projects, sites and service tickets roll up into one control room — budget, progress and what needs action today.",
    img: "/landing/map.png",
    alt: "Aerial of western Mumbai high-rises under construction at dusk",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-paper-100 text-ink-900">
      <header className="sticky top-0 z-30 border-b border-paper-200 bg-paper-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <LogoMark />
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold leading-tight">{BRAND.name}</div>
              <div className="text-[11px] text-ink-400 leading-tight truncate hidden sm:block">
                {BRAND.tagline}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            <Link href="/login" className="btn-ghost text-[12.5px] py-1.5 px-3 hidden sm:inline-flex">
              Sign in
            </Link>
            <Link href="/app" className="btn-primary text-[12.5px] py-1.5 px-3">
              Control room
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-paper-200">
          <div className="mx-auto max-w-6xl grid lg:grid-cols-2 lg:min-h-[560px]">
            <div className="flex flex-col justify-center px-4 sm:px-5 py-10 sm:py-14 lg:py-20 lg:pr-12">
              <div className="kicker">{BRAND.company}</div>
              <h1 className="font-serif text-[34px] sm:text-[52px] lg:text-[56px] leading-[1.08] tracking-tight mt-3">
                Fire-safety operations — from the warehouse to the tower.
              </h1>
              <p className="mt-5 max-w-xl text-[15px] sm:text-[16px] leading-relaxed text-ink-600">
                {BRAND.full} runs projects, sites, inventory, procurement and service on one
                record. Every stock move is a ledger entry. Every exception has a name against it.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                <Link href="/login" className="btn-primary py-2.5 px-5 text-[14px] justify-center">
                  Sign in as administrator
                </Link>
                <Link href="/login" className="btn-ghost py-2.5 px-5 text-[14px] justify-center">
                  Demo credentials
                </Link>
              </div>
              <p className="mt-4 text-[12.5px] text-ink-400">
                Administrator ID <span className="font-medium text-ink-700">admin</span> · password{" "}
                <span className="font-medium text-ink-700">admin</span>
              </p>
            </div>
            <div className="relative min-h-[220px] aspect-[16/10] lg:aspect-auto lg:min-h-full border-t lg:border-t-0 lg:border-l border-paper-200">
              <Image
                src="/landing/hero.png"
                alt="Fire-hose reels, hydrant valves and sprinkler pipe staged on a Mumbai high-rise at golden hour"
                fill
                preload
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </section>

        <section className="border-b border-paper-200 bg-paper-50">
          <div className="mx-auto max-w-6xl px-5 grid grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={
                  "py-6 " +
                  (i % 2 === 1 ? "pl-6 border-l border-paper-200 " : "") +
                  (i > 0 ? "lg:pl-8 lg:border-l lg:border-paper-200" : "")
                }
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                  {s.label}
                </div>
                <div className="mt-1 font-serif text-[26px] text-ink-900">{s.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
          <div className="kicker">How it runs</div>
          <h2 className="font-serif text-[26px] sm:text-[32px] leading-tight mt-2 max-w-lg">
            One record. Every place stock can be. A person behind every exception.
          </h2>
          <div className="mt-8 sm:mt-10 grid md:grid-cols-3 gap-px bg-paper-200 border border-paper-200">
            {pillars.map((p) => (
              <article key={p.n} className="bg-paper-50 group">
                <div className="relative aspect-[4/3] overflow-hidden bg-paper-200">
                  <Image
                    src={p.img}
                    alt={p.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-6">
                  <div className="text-[11px] font-semibold tracking-[0.14em] text-ink-400">{p.n}</div>
                  <h3 className="mt-3 font-serif text-[22px] leading-snug">{p.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">{p.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="relative min-h-[280px] sm:min-h-[380px] lg:min-h-[460px] border-y border-paper-200 overflow-hidden">
          <Image
            src="/landing/login.png"
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            className="object-cover object-[center_40%]"
          />
          <div className="absolute inset-0 bg-[#0e0c0a]/60" />
          <div className="relative mx-auto max-w-6xl px-5 py-16 lg:py-24">
            <div className="max-w-xl text-[#fcfaf6]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#fcfaf6]/55">
                On the ground
              </div>
              <h2 className="font-serif text-[26px] sm:text-[32px] lg:text-[38px] leading-tight mt-2">
                Material leaves the store. The record follows it to the landing valve.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#fcfaf6]/75">
                Hydrant fittings, hose reels and sprinkler pipe tracked where they actually sit —
                warehouse, transit, and the floor store on site.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#161412] text-[#fcfaf6]">
          <div className="mx-auto max-w-6xl px-5 py-14 lg:py-16 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="max-w-lg">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-50">
                Built for DIPL
              </div>
              <h2 className="font-serif text-[26px] sm:text-[32px] leading-tight mt-2">
                The operating picture before a job overruns.
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-[#fcfaf6]/65">
                Projects, sites, stock movements, service tickets and an append-only audit trail — with
                role-based access for every person on the job.
              </p>
            </div>
            <Link
              href="/login"
              className="btn bg-[#fcfaf6] text-[#161412] hover:bg-[#e8e0d2] py-2.5 px-5 text-[14px] w-fit"
            >
              Open the control room
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-paper-200 bg-paper-50">
        <div className="mx-auto max-w-6xl px-5 py-5 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-400">
          <span>DIPL · Goregaon (E) · Mumbai</span>
          <span>{BRAND.full}</span>
        </div>
      </footer>
    </div>
  );
}
