import { usesItems, UsesItem, Category } from "../../../content/uses";

// ── Constants ────────────────────────────────────────────────────────

export const categoryOrder: Category[] = ["desktop", "laptop", "camera", "phone"];
export const categoryLabel: Record<Category, string> = {
  desktop: "Desktop",
  laptop: "Laptop",
  camera: "Camera",
  phone: "Phone",
};

export const subtypeLabel: Record<string, string> = {
  computer: "Computer",
  monitor: "Monitor",
  keyboard: "Keyboard",
  mouse: "Mouse",
  peripheral: "Peripheral",
  laptop: "Laptop",
  body: "Body",
  lens: "Lenses",
  phone: "Phone",
};

// ── Helpers ──────────────────────────────────────────────────────────

export function itemKey(item: UsesItem): string {
  return `${item.category}-${item.subtype}-${item.make}-${item.model}`;
}

export function itemTitle(item: UsesItem): string {
  return `${item.make} ${item.model}`;
}

export function formatDate(d: string): string {
  const [year, month] = d.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

export function isActiveAt(item: UsesItem, date: string): boolean {
  if (item.acquireDate > date) return false;
  if (!item.active && item.doneDate <= date) return false;
  return true;
}

// ── Timeline events ──────────────────────────────────────────────────

export type TimelineEvent = {
  date: string;
  type: "acquired" | "retired";
  item: UsesItem;
};

function buildEvents(): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const item of usesItems) {
    events.push({ date: item.acquireDate, type: "acquired", item });
    if (!item.active) {
      events.push({ date: item.doneDate, type: "retired", item });
    }
  }
  events.sort((a, b) => b.date.localeCompare(a.date));
  return events;
}

const allEvents = buildEvents();

// ── Date groups with gap collapsing ──────────────────────────────────

export type DateGroup = { date: string; events: TimelineEvent[]; isGap?: boolean };

export function buildDateGroups(): DateGroup[] {
  const allDates = usesItems.flatMap((item) =>
    item.active ? [item.acquireDate] : [item.acquireDate, item.doneDate]
  );
  const earliest = allDates.reduce((a, b) => (a < b ? a : b));
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const eventsByDate = new Map<string, TimelineEvent[]>();
  for (const event of allEvents) {
    const list = eventsByDate.get(event.date) || [];
    list.push(event);
    eventsByDate.set(event.date, list);
  }

  const allGroups: DateGroup[] = [];
  let [y, m] = currentYM.split("-").map(Number);
  const [ey, em] = earliest.split("-").map(Number);
  while (y > ey || (y === ey && m >= em)) {
    const date = `${y}-${String(m).padStart(2, "0")}`;
    allGroups.push({ date, events: eventsByDate.get(date) || [] });
    m--;
    if (m < 1) { m = 12; y--; }
  }

  const eventIndices = allGroups
    .map((g, i) => (g.events.length > 0 ? i : -1))
    .filter((i) => i >= 0);

  const keepSet = new Set<number>();
  for (const idx of eventIndices) {
    for (let d = -3; d <= 3; d++) {
      const target = idx + d;
      if (target >= 0 && target < allGroups.length) keepSet.add(target);
    }
  }

  const result: DateGroup[] = [];
  let lastKept = -1;
  for (let i = 0; i < allGroups.length; i++) {
    if (keepSet.has(i)) {
      if (lastKept >= 0 && i - lastKept > 1) {
        const midIdx = Math.floor((lastKept + i) / 2);
        result.push({ date: allGroups[midIdx].date, events: [], isGap: true });
      }
      result.push(allGroups[i]);
      lastKept = i;
    }
  }

  return result;
}

// ── Pre-computed groups ──────────────────────────────────────────────

export type SubtypeGroup = { subtype: string; items: UsesItem[] };
export type CategoryGroup = { category: Category; subtypes: SubtypeGroup[] };

export function buildAllGroups(): CategoryGroup[] {
  const map: Record<string, Record<string, UsesItem[]>> = {};
  for (const item of usesItems) {
    if (!map[item.category]) map[item.category] = {};
    if (!map[item.category][item.subtype])
      map[item.category][item.subtype] = [];
    map[item.category][item.subtype].push(item);
  }
  return categoryOrder.map((cat) => ({
    category: cat,
    subtypes: map[cat]
      ? Object.entries(map[cat]).map(([st, items]) => ({
          subtype: st,
          items,
        }))
      : [],
  }));
}

// ── Spec extraction ──────────────────────────────────────────────────

export function getSpecs(item: UsesItem): { label: string; value: string }[] | null {
  if (item.category === "desktop" && item.subtype === "computer") {
    const specs = [{ label: "CPU", value: item.cpu }];
    if (item.gpu) specs.push({ label: "GPU", value: item.gpu });
    specs.push({ label: "RAM", value: item.ram });
    if (item.storage) specs.push({ label: "Storage", value: item.storage });
    if (item.motherboard) specs.push({ label: "Motherboard", value: item.motherboard });
    if (item.case) specs.push({ label: "Case", value: item.case });
    if (item.cooling) specs.push({ label: "Cooling", value: item.cooling });
    if (item.psu) specs.push({ label: "PSU", value: item.psu });
    if (item.os) specs.push({ label: "OS", value: item.os });
    return specs;
  }
  if (item.category === "laptop") {
    const specs = [{ label: "CPU", value: item.cpu }];
    if (item.gpu) specs.push({ label: "GPU", value: item.gpu });
    specs.push({ label: "RAM", value: item.ram });
    if (item.storage) specs.push({ label: "Storage", value: item.storage });
    if (item.display) specs.push({ label: "Display", value: item.display });
    if (item.os) specs.push({ label: "OS", value: item.os });
    return specs;
  }
  return null;
}
