"use client";

import { DirectionalLink as Link } from "@/components/navigation-motion";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export const socialLinks = [
  ["GitHub", "https://github.com/imjoshin"],
  ["LinkedIn", "https://www.linkedin.com/in/imjoshin/"],
  ["Instagram", "https://www.instagram.com/imjosh.in"],
  ["Twitter", "https://www.twitter.com/imjosh_in"],
  ["Facebook", "https://www.facebook.com/www.imjosh.in"],
] as const;

export function SocialLinks({ footer = false }: { footer?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-[18px] gap-y-3 text-[13px] font-medium tracking-[.06em] uppercase">
      {socialLinks.slice(0, footer ? 4 : undefined).map(([label, href]) => (
        <li key={label}><a className="social-link" href={href}>{label}</a></li>
      ))}
    </ul>
  );
}

function NavigationLinks({ pathname, mobile = false }: { pathname: string; mobile?: boolean }) {
  const className = mobile
    ? "flex min-h-11 items-center rounded-xl px-4 py-3 text-base font-medium hover:bg-ink hover:text-background aria-[current=page]:bg-line aria-[current=page]:text-accent"
    : "desktop-nav-link relative inline-flex min-h-11 items-center py-2 text-base font-medium whitespace-nowrap text-muted hover:text-ink aria-[current=page]:text-ink";
  return (
    <>
      <Link className={className} href="/projects/" aria-current={pathname.startsWith("/projects") ? "page" : undefined}>Projects</Link>
      <Link className={className} href="/uses/" aria-current={pathname.startsWith("/uses") ? "page" : undefined}>Uses</Link>
      <Link className={className} href="/music/" aria-current={pathname.startsWith("/music") ? "page" : undefined}>Music</Link>
      <Link className={className} href="/resume/" aria-current={pathname.startsWith("/resume") ? "page" : undefined}>Resume</Link>
      <a className={className} href="https://www.jj.photos" target="_blank" rel="noopener noreferrer">
        Photography
        <svg className="ml-1.5 shrink-0" aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h6v6m0-6L10 14" />
          <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
        </svg>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const details = menu.current;
    if (!details) return;
    const desktop = matchMedia("(min-width: 768px)");
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !details!.contains(event.target)) details!.open = false;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !details!.open) return;
      event.preventDefault();
      details!.open = false;
      details!.querySelector("summary")?.focus();
    }
    function onBreakpointChange() {
      if (desktop.matches) details!.open = false;
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpointChange);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpointChange);
    };
  }, []);

  useEffect(() => { if (menu.current) menu.current.open = false; }, [pathname]);

  function closeMenu() {
    if (!menu.current) return;
    menu.current.open = false;
    menu.current.querySelector("summary")?.focus();
  }

  return (
    <header data-scrolled={scrolled} className="site-header sticky top-0 z-20 flex items-center justify-between gap-4 px-gutter py-[22px]">
      <span aria-hidden="true" className="site-header-backdrop pointer-events-none absolute inset-x-0 top-0 -bottom-8 -z-10"><span /></span>
      <Link className="font-display text-[28px] leading-none tracking-[-.01em] italic" href="/" aria-label="imjosh.in home">imjosh.in</Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex lg:gap-9">
        <NavigationLinks pathname={pathname} />
      </nav>
      <details ref={menu} className="group md:hidden">
        <summary className="mobile-menu-toggle flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-ink bg-panel backdrop-blur-[10px] transition-colors hover:bg-ink hover:text-background" aria-controls="mobile-navigation">
          <span className="sr-only">Menu</span>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path className="group-open:hidden" d="M4 6h16M4 12h16M4 18h16" />
            <path className="hidden group-open:block" d="m6 6 12 12M6 18 18 6" />
          </svg>
        </summary>
        <nav id="mobile-navigation" aria-label="Main navigation" onClick={closeMenu} className="panel absolute top-[calc(100%-10px)] right-gutter flex w-[min(280px,calc(100%-2*var(--spacing-gutter)))] flex-col gap-1 rounded-[20px] p-2">
          <NavigationLinks pathname={pathname} mobile />
        </nav>
      </details>
    </header>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/" || pathname.replace(/\/$/, "") === "/music") return null;
  return (
    <footer className="site-footer relative z-10 mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-line bg-panel px-gutter py-6 backdrop-blur-[14px]">
      <Link className="text-[13px] font-medium tracking-[.06em] text-muted uppercase" href="/">imjosh.in</Link>
      <SocialLinks footer />
    </footer>
  );
}
