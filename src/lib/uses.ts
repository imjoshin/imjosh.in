import { usesItems, type UsesItem } from "../../content/uses.ts";

export const timelineStartYear = Math.min(...usesItems.map((item) => Number(item.acquireDate.slice(0, 4))));

export const categories = [
  ["desktop", "Desktop"], ["monitor", "Monitors"], ["keyboard", "Keyboard"], ["mouse", "Mouse"],
  ["laptop", "Laptop"], ["phone", "Phone"], ["camera", "Camera"], ["lens", "Lenses"],
  ["desk", "Desk"], ["audio", "Audio"], ["av", "AV"], ["console", "Consoles"],
] as const;

export type GearCategory = (typeof categories)[number][0];
export type GearEvent = { date: string; op: "+" | "-"; category: GearCategory; item: UsesItem };

export function itemCategory(item: UsesItem): GearCategory {
  if (item.category === "desktop") return item.subtype === "computer" || item.subtype === "peripheral" ? "desktop" : item.subtype;
  if (item.category === "camera") return item.subtype === "lens" ? "lens" : "camera";
  if (item.category === "microphone" || (item.category === "desk" && item.subtype === "webcam")) return "av";
  return item.category;
}

export function itemName(item: UsesItem) { return `${item.make} ${item.model}`; }
export function itemId(item: UsesItem) { return `${item.category}:${item.subtype}:${itemName(item)}:${item.acquireDate}`; }

const gearMonthDate = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const gearDayDate = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export function formatGearDate(value: string): string {
  if (value.length === 4) return value;
  const [year, month, day] = value.split("-").map(Number);
  return (day ? gearDayDate : gearMonthDate).format(new Date(Date.UTC(year, month - 1, day ?? 1)));
}

export function itemSpec(item: UsesItem): string {
  if ((item.category === "desktop" && item.subtype === "computer") || item.category === "laptop") {
    return Object.values(item.specs).slice(0, 2).join(" · ");
  }
  if (item.category === "desktop" && item.subtype === "monitor") {
    return [item.resolution.replace("x", "×"), item.panelType, item.refreshRate, item.notes].filter(Boolean).join(" · ");
  }
  if (item.category === "camera" && item.subtype === "lens") return `${item.focalLength} ${item.maxAperture}`;
  if (item.category === "desktop" && item.subtype === "peripheral") return item.description ?? "";
  if (item.category === "desk" || item.category === "audio" || item.category === "microphone" || item.category === "console") return item.description;
  return item.notes ?? "";
}

export function buildEvents(items: UsesItem[] = usesItems): GearEvent[] {
  return items.flatMap((item): GearEvent[] => {
    const category = itemCategory(item);
    const acquired: GearEvent = { date: item.acquireDate, op: "+", category, item };
    return item.active ? [acquired] : [acquired, { date: item.doneDate, op: "-", category, item }];
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.op === b.op ? 0 : a.op === "-" ? -1 : 1));
}

export function usesAt(period: number | string, items: UsesItem[] = usesItems) {
  const cutoffMonth = typeof period === "number" ? `${period}-12` : period;
  const [year, month] = cutoffMonth.split("-").map(Number);
  const cutoff = `${cutoffMonth}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`;
  const prefix = String(period);
  const active = items.filter((item) => item.acquireDate <= cutoff && (item.active || item.doneDate > cutoff));
  return {
    categories: categories.map(([key, label]) => ({
      key, label,
      hasHistory: items.some((item) => itemCategory(item) === key && item.acquireDate <= cutoff),
      items: active.filter((item) => itemCategory(item) === key)
        .sort((a, b) => b.acquireDate.localeCompare(a.acquireDate))
        .map((item) => ({ id: itemId(item), name: itemName(item), spec: itemSpec(item), details: item, isNew: item.acquireDate === prefix || item.acquireDate.startsWith(`${prefix}-`) || item.acquireDate === String(year) })),
    })),
    changes: buildEvents(items).filter((event) => event.date === prefix || event.date.startsWith(`${prefix}-`)),
  };
}

// A category only changes at an acquisition or retirement month. Keep each distinct
// rendered inventory so the layout can reserve its largest real snapshot.
export type GearCategorySnapshot = ReturnType<typeof usesAt>["categories"][number];

export function usesSizingSnapshots(items: UsesItem[] = usesItems) {
  const firstYear = items.length ? Math.min(...items.map((item) => Number(item.acquireDate.slice(0, 4)))) : timelineStartYear;
  const periods = new Set([`${firstYear}-01`, ...items.flatMap((item) => [item.acquireDate, ...(!item.active ? [item.doneDate] : [])]).map((date) => date.length === 4 ? `${date}-01` : date.slice(0, 7))]);
  const snapshots = Object.fromEntries(categories.map(([key]) => [key, new Map<string, GearCategorySnapshot>()])) as Record<GearCategory, Map<string, GearCategorySnapshot>>;
  for (const period of [...periods].sort()) {
    for (const category of usesAt(period, items).categories) {
      const signature = JSON.stringify([category.hasHistory, category.items.map((item) => item.id)]);
      if (!snapshots[category.key].has(signature)) snapshots[category.key].set(signature, category);
    }
  }
  return Object.fromEntries(categories.map(([key]) => [key, [...snapshots[key].values()]])) as Record<GearCategory, GearCategorySnapshot[]>;
}

export function monthIndex(month: string): number {
  const [year, value] = month.split("-").map(Number);
  return (year - timelineStartYear) * 12 + value - 1;
}

export function monthAt(position: number): string {
  const index = Math.max(0, Math.round(position));
  return `${timelineStartYear + Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, "0")}`;
}

export function parseMonth(value: string | null, currentMonth: string): string {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return currentMonth;
  return value >= `${timelineStartYear}-01` && value <= currentMonth ? value : currentMonth;
}

export function readTimelineMonth(params: URLSearchParams, currentMonth: string): string {
  if (params.has("month")) return parseMonth(params.get("month"), currentMonth);
  // Preserve existing year links as year-end snapshots, capped at today.
  if (params.has("year")) {
    const year = parseYear(params.get("year"), Number(currentMonth.slice(0, 4)));
    const month = `${year}-12`;
    return month > currentMonth ? currentMonth : month;
  }
  return currentMonth;
}

export function parseYear(value: string | null, currentYear: number): number {
  if (!value || !/^\d{4}$/.test(value)) return currentYear;
  const year = Number(value);
  return year >= timelineStartYear && year <= currentYear ? year : currentYear;
}
