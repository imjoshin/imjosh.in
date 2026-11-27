import type { Metadata } from "next";
import { UsesExplorer } from "@/components/uses-explorer";

export const metadata: Metadata = { title: "Uses", description: "Every piece of Josh Johnson’s gear since 2010. Explore the computers, cameras, and phones through time.", alternates: { canonical: "/uses/" } };

export default function UsesPage() {
  return <main id="main" className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-9 px-gutter pt-[clamp(24px,5vw,72px)] pb-16"><UsesExplorer initialMonth={new Date().toISOString().slice(0, 7)} /></main>;
}
