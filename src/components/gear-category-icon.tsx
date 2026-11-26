import type { ReactNode } from "react";
import type { GearCategory } from "@/lib/uses";

const paths: Record<GearCategory, ReactNode> = {
  desktop: <><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M9 7h6M9 11h6" /><circle cx="12" cy="17" r=".75" fill="currentColor" stroke="none" /></>,
  laptop: <><path d="M5 16V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v11" /><path d="M2 16h20l-1.5 4h-17L2 16Z" /><path d="M10 16h4" /></>,
  monitor: <><rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M12 17v4M8 21h8" /></>,
  keyboard: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 9h1m4 0h1m4 0h1M6 12h1m4 0h1m4 0h1M7 15h10" /></>,
  mouse: <><rect x="7" y="2.5" width="10" height="19" rx="5" /><path d="M7 11h10M12 2.5v5" /></>,
  camera: <><path d="M8 6l1.5-3h5L16 6h4a2 2 0 0 1 2 2v11H2V8a2 2 0 0 1 2-2h4Z" /><circle cx="12" cy="12.5" r="3.5" /></>,
  lens: <><ellipse cx="12" cy="5.5" rx="6" ry="2.5" /><path d="M6 5.5v13c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-13M6 11c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5M6 15c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" /></>,
  phone: <><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M10 5h4M11 19h2" /></>,
};

export function GearCategoryIcon({ category, muted = false }: { category: GearCategory; muted?: boolean }) {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${muted ? "text-muted" : "text-accent/80"}`}>{paths[category]}</svg>;
}
