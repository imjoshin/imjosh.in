import type { Metadata, Viewport } from "next";
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "./globals.css";
import { BlobCanvas } from "@/components/blob-canvas";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import socialImage from "../../public/social.png";

export const metadata: Metadata = {
  metadataBase: new URL("https://imjosh.in"),
  title: { default: "I'm Joshin' - Josh Johnson", template: "%s - Josh Johnson" },
  description: "Hey! I’m Josh Johnson. I’m passionate about solving interesting problems and currently work at Tern.",
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "imjosh.in", locale: "en_US", images: [{ url: socialImage.src, width: socialImage.width, height: socialImage.height, alt: "I'm Joshin' - Josh Johnson" }] },
  twitter: { card: "summary_large_image", creator: "@imjosh_in" },
};

export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#eceaf3" }, { media: "(prefers-color-scheme: dark)", color: "#0c0b12" }] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <a className="skip-link fixed top-3 left-gutter z-50 -translate-y-24 rounded-full bg-ink px-5 py-3 text-background focus:translate-y-0" href="#main">Skip to content</a>
        <BlobCanvas />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
