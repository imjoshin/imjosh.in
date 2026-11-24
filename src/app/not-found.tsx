import { DirectionalLink as Link } from "@/components/navigation-motion";

export default function NotFound() {
  return (
    <main id="main" className="relative z-10 flex flex-1 flex-col items-start justify-center gap-8 px-gutter py-24">
      <p className="eyebrow">404 · A wrong turn</p>
      <h1 className="page-title">Nothing <em>here.</em></h1>
      <p className="max-w-[32ch] text-xl text-muted">This page has moved on. There&apos;s plenty to explore back at home.</p>
      <Link href="/" className="pill">Back home</Link>
    </main>
  );
}
