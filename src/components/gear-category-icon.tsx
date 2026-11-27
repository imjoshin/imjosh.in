import type { ReactNode } from "react";
import type { GearCategory } from "@/lib/uses";

type GearIconCategory = GearCategory | "microphone";

const paths: Record<GearIconCategory, ReactNode> = {
  desktop: <><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M9 7h6M9 11h6" /><circle cx="12" cy="17" r=".75" fill="currentColor" stroke="none" /></>,
  laptop: <><path d="M5 16V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v11" /><path d="M2 16h20l-1.5 4h-17L2 16Z" /><path d="M10 16h4" /></>,
  monitor: <><rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M12 17v4M8 21h8" /></>,
  keyboard: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 9h1m4 0h1m4 0h1M6 12h1m4 0h1m4 0h1M7 15h10" /></>,
  mouse: <><rect x="7" y="2.5" width="10" height="19" rx="5" /><path d="M7 11h10M12 2.5v5" /></>,
  camera: <><path d="M8 6l1.5-3h5L16 6h4a2 2 0 0 1 2 2v11H2V8a2 2 0 0 1 2-2h4Z" /><circle cx="12" cy="12.5" r="3.5" /></>,
  lens: <><ellipse cx="12" cy="5.5" rx="6" ry="2.5" /><path d="M6 5.5v13c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-13M6 11c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5M6 15c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" /></>,
  phone: <><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M10 5h4M11 19h2" /></>,
  desk: <><path d="M3 9h18M5 9v12M19 9v12M5 16h14" /><rect x="7" y="3" width="10" height="6" rx="1" /></>,
  audio: <><path d="M4 14v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="12" width="4" height="8" rx="2" /><rect x="17" y="12" width="4" height="8" rx="2" /></>,
  av: <><rect x="3" y="4" width="18" height="12" rx="3" /><circle cx="12" cy="10" r="3" /><path d="M12 16v4M7 20h10" /></>,
  microphone: <><rect x="8" y="2" width="8" height="13" rx="4" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></>,
  console: <><path d="M7 7h10a3 3 0 0 1 2.9 2.2l2 7.5a2.5 2.5 0 0 1-4.2 2.4L15 16H9l-2.7 3.1a2.5 2.5 0 0 1-4.2-2.4l2-7.5A3 3 0 0 1 7 7Z" /><path d="M7.5 10v5M5 12.5h5" /><circle cx="16" cy="11" r=".75" fill="currentColor" stroke="none" /><circle cx="18.5" cy="13.5" r=".75" fill="currentColor" stroke="none" /></>,
};

export function GearCategoryIcon({ category, muted = false }: { category: GearIconCategory; muted?: boolean }) {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${muted ? "text-muted" : "text-accent/80"}`}>{paths[category]}</svg>;
}
