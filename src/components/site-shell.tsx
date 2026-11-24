"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 px-gutter py-[22px]">
      <Link className="font-display text-[28px] leading-none tracking-[-.01em] italic" href="/" aria-label="imjosh.in — home">imjosh.in</Link>
      <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-2">
        <Link className="pill" href="/uses/" aria-current={pathname.startsWith("/uses") ? "page" : undefined}>Uses</Link>
        <Link className="pill" href="/resume/" aria-current={pathname.startsWith("/resume") ? "page" : undefined}>Resume</Link>
        <a className="pill" href="https://www.jj.photos" target="_blank" rel="noopener noreferrer">Photography<span className="sr-only"> (opens in a new tab)</span></a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <footer className="site-footer relative z-10 mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-line bg-panel px-gutter py-6 backdrop-blur-[14px]">
      <Link className="text-[13px] font-medium tracking-[.06em] text-muted uppercase" href="/">imjosh.in</Link>
      <SocialLinks footer />
    </footer>
  );
}
