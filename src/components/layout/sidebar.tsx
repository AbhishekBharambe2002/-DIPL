"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { navigation } from "@/config/navigation";
import { BRAND } from "@/config/brand";
import { LogoMark, ThemeToggle } from "@/components/brand";
import { GlobalSearch } from "./global-search";

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  if (href === "/inventory") return pathname === "/inventory";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const permissions = (session?.user?.permissions as string[]) || [];
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const panel = (
    <>
      <div className="px-4 pt-5 pb-4 max-lg:pt-4">
        <Link href="/app" className="flex items-center gap-2.5">
          <LogoMark />
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-ink-900 leading-tight truncate">{BRAND.name}</div>
            <div className="text-[11px] text-ink-400 leading-tight truncate">{BRAND.tagline}</div>
          </div>
        </Link>
        <div className="mt-4">
          <GlobalSearch />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 space-y-5">
        {navigation.map((group) => {
          const items = group.items.filter((i) => !i.permission || permissions.includes(i.permission));
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "relative flex items-center gap-2.5 px-2.5 py-2.5 lg:py-[8px] text-[14px] lg:text-[13px] transition-colors duration-150",
                        active
                          ? "bg-paper-200 text-ink-900 font-medium"
                          : "text-ink-600 hover:bg-paper-200/70 hover:text-ink-900"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.7} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-paper-200 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full text-left text-[12px] font-medium text-ink-600 hover:text-ink-900 border border-paper-300 bg-paper-50 hover:bg-paper-100 px-3 py-2.5 transition-colors"
        >
          Sign out
        </button>
        {session?.user && (
          <div className="bg-paper-100 border border-paper-200 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.12em] text-ink-400">Signed in</div>
            <div className="text-[12.5px] font-semibold text-ink-800 mt-0.5 truncate">{session.user.name}</div>
            {role && (
              <div className="text-[11px] text-ink-400 mt-0.5 capitalize truncate">
                {role.replace(/_/g, " ").toLowerCase()}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <div className="lg:hidden sticky top-0 z-40 flex items-center gap-2 border-b border-paper-200 bg-paper-50 px-2 min-h-12 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="app-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
          className="h-11 w-11 grid place-items-center text-ink-900 shrink-0"
        >
          {open ? <X className="w-5 h-5" strokeWidth={1.8} /> : <Menu className="w-5 h-5" strokeWidth={1.8} />}
        </button>
        <Link href="/app" className="flex items-center gap-2 min-w-0">
          <LogoMark size="sm" />
          <span className="text-[13px] font-semibold text-ink-900 truncate">{BRAND.name}</span>
        </Link>
        <div className="ml-auto shrink-0">
          <ThemeToggle />
        </div>
      </div>

      {open && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-[#0e0c0a]/45"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        id="app-nav"
        className={clsx(
          "bg-paper-50 text-ink-800 flex flex-col border-paper-200",
          "max-lg:fixed max-lg:z-50 max-lg:inset-y-0 max-lg:left-0 max-lg:w-[min(100%-3rem,280px)] max-lg:border-r max-lg:pt-[env(safe-area-inset-top)] max-lg:transition-transform max-lg:duration-200",
          open ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
          "lg:static lg:translate-x-0 lg:w-[248px] lg:shrink-0 lg:h-full lg:border-r"
        )}
      >
        {panel}
      </aside>
    </>
  );
}
