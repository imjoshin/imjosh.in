import { usesItems, type UsesItem } from "../../content/uses.ts";

export const categories = [
  ["desktop", "Desktop"], ["laptop", "Laptop"], ["monitor", "Monitors"],
  ["keyboard", "Keyboard"], ["mouse", "Mouse"], ["camera", "Camera"],
  ["lens", "Lenses"], ["phone", "Phone"],
] as const;

export type GearCategory = (typeof categories)[number][0];
export type GearEvent = { date: string; op: "+" | "-"; category: GearCategory; item: UsesItem };

export function itemCategory(item: UsesItem): GearCategory {
  if (item.category === "desktop") return item.subtype === "computer" || item.subtype === "peripheral" ? "desktop" : item.subtype;
  if (item.category === "camera") return item.subtype === "lens" ? "lens" : "camera";
  return item.category;
}

export function itemName(item: UsesItem) { return `${item.make} ${item.model}`; }
export function itemId(item: UsesItem) { return `${item.category}:${item.subtype}:${itemName(item)}:${item.acquireDate}`; }

export function itemSpec(item: UsesItem): string {
  if ((item.category === "desktop" && item.subtype === "computer") || item.category === "laptop") {
    return [item.cpu, item.gpu, item.ram, item.storage].filter(Boolean).join(" · ");
  }
  if (item.category === "desktop" && item.subtype === "monitor") {
    return [item.resolution.replace("x", "×"), item.panelType, item.refreshRate, item.notes].filter(Boolean).join(" · ");
  }
  if (item.category === "camera" && item.subtype === "lens") return `${item.focalLength} ${item.maxAperture}`;
  if (item.category === "desktop" && item.subtype === "peripheral") return item.description ?? "";
  return item.notes ?? "";
}

export function buildEvents(items: UsesItem[] = usesItems): GearEvent[] {
  return items.flatMap((item): GearEvent[] => {
    const category = itemCategory(item);
    const acquired: GearEvent = { date: item.acquireDate, op: "+", category, item };
    return item.active ? [acquired] : [acquired, { date: item.doneDate, op: "-", category, item }];
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.op === b.op ? 0 : a.op === "-" ? -1 : 1));
}

export function usesAt(year: number, items: UsesItem[] = usesItems) {
  const cutoff = `${year}-12`;
  const active = items.filter((item) => item.acquireDate <= cutoff && (item.active || item.doneDate > cutoff));
  return {
    categories: categories.map(([key, label]) => ({
      key, label,
      items: active.filter((item) => itemCategory(item) === key)
        .sort((a, b) => b.acquireDate.localeCompare(a.acquireDate))
        .map((item) => ({ id: itemId(item), name: itemName(item), spec: itemSpec(item), isNew: item.acquireDate.startsWith(`${year}-`) })),
    })),
    changes: buildEvents(items).filter((event) => event.date.startsWith(`${year}-`)),
  };
}

export function parseYear(value: string | null, currentYear: number): number {
  if (!value || !/^\d{4}$/.test(value)) return currentYear;
  const year = Number(value);
  return year >= 2010 && year <= currentYear ? year : currentYear;
}
