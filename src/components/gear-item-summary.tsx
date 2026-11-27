import type { ReactNode } from "react";
import type { usesAt } from "@/lib/uses";

export type GearSummaryItem = ReturnType<typeof usesAt>["categories"][number]["items"][number];
export const gearItemHeadingClassName = "text-[18px] leading-[1.2] font-medium";

// Shared by live gear and the inert sizing snapshots so their wrapping stays identical.
export function GearItemSummary({ item, children }: { item: GearSummaryItem; children: ReactNode }) {
  return <div className="flex flex-col gap-[3px]">
    {children}
    {item.spec && <p className={`text-[14px] leading-[1.35] text-muted ${item.details.category === "laptop" ? "line-clamp-2" : ""}`}>
      {item.details.subtype === "computer"
        ? Object.entries(item.details.specs).slice(0, 2).map(([label, value]) => <span key={label} className="block truncate">{value}</span>)
        : item.spec}
    </p>}
  </div>;
}
