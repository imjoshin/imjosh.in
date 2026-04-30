import * as React from "react";
import { PageProps } from "gatsby";
import Layout from "../components/layout/Layout";
import { SEO } from "../components/seo";
import { usesItems, UsesItem, Category } from "../../content/uses";
import * as styles from "./uses.module.css";

// ── Helpers ──────────────────────────────────────────────────────────

const categoryOrder: Category[] = ["desktop", "laptop", "camera", "phone"];
const categoryLabel: Record<Category, string> = {
  desktop: "Desktop",
  laptop: "Laptop",
  camera: "Camera",
  phone: "Phone",
};

const subtypeLabel: Record<string, string> = {
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

function itemKey(item: UsesItem): string {
  return `${item.category}-${item.subtype}-${item.make}-${item.model}`;
}

function itemTitle(item: UsesItem): string {
  return `${item.make} ${item.model}`;
}

function formatDate(d: string): string {
  const [year, month] = d.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

// ── Build timeline events ────────────────────────────────────────────

type TimelineEvent = {
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

function isActiveAt(item: UsesItem, date: string): boolean {
  if (item.acquireDate > date) return false;
  if (!item.active && item.doneDate <= date) return false;
  return true;
}

// ── Pre-compute all items grouped by category > subtype ──────────────

type SubtypeGroup = { subtype: string; items: UsesItem[] };
type CategoryGroup = { category: Category; subtypes: SubtypeGroup[] };

function buildAllGroups(): CategoryGroup[] {
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

const allGroups = buildAllGroups();

// ── Item detail renderers ────────────────────────────────────────────

function getSpecs(item: UsesItem): { label: string; value: string }[] | null {
  if (item.category === "desktop" && item.subtype === "computer") {
    const specs = [
      { label: "CPU", value: item.cpu },
    ];
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
    const specs = [
      { label: "CPU", value: item.cpu },
    ];
    if (item.gpu) specs.push({ label: "GPU", value: item.gpu });
    specs.push({ label: "RAM", value: item.ram });
    if (item.storage) specs.push({ label: "Storage", value: item.storage });
    if (item.display) specs.push({ label: "Display", value: item.display });
    if (item.os) specs.push({ label: "OS", value: item.os });
    return specs;
  }
  return null;
}

const CollapsibleSpecs: React.FC<{ specs: { label: string; value: string }[] }> = ({ specs }) => {
  const [open, setOpen] = React.useState(false);
  const summary = specs.slice(0, 2);
  const rest = specs.slice(2);

  return (
    <div>
      <dl className={styles.specList}>
        {summary.map((s) => (
          <div key={s.label} className={styles.specRow}>
            <dt className={styles.specLabel}>{s.label}</dt>
            <dd className={styles.specValue}>{s.value}</dd>
          </div>
        ))}
      </dl>
      {rest.length > 0 && (
        <>
          <div
            className={`${styles.specCollapsible} ${open ? styles.specCollapsibleOpen : ""}`}
          >
            <div className={styles.specCollapsibleInner}>
              <dl className={styles.specList}>
                {rest.map((s) => (
                  <div key={s.label} className={styles.specRow}>
                    <dt className={styles.specLabel}>{s.label}</dt>
                    <dd className={styles.specValue}>{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <button
            className={styles.specToggle}
            onClick={() => setOpen(!open)}
          >
            {open ? "Less" : "More specs"}
          </button>
        </>
      )}
    </div>
  );
};

function renderItemDetail(item: UsesItem): React.ReactNode {
  const specs = getSpecs(item);
  if (specs) {
    return <CollapsibleSpecs specs={specs} />;
  }

  if (item.category === "camera" && item.subtype === "lens") {
    return (
      <div className={styles.itemDetail}>
        {item.focalLength} {item.maxAperture}
      </div>
    );
  }

  if (item.category === "desktop" && item.subtype === "monitor") {
    const parts = [item.size, item.resolution, item.refreshRate].filter(
      Boolean
    );
    return <div className={styles.itemDetail}>{parts.join(" · ")}</div>;
  }

  if (item.category === "phone") {
    const parts = [item.storage, item.display, item.os].filter(Boolean);
    if (parts.length === 0) return null;
    return <div className={styles.itemDetail}>{parts.join(" · ")}</div>;
  }

  return null;
}

// ── Component ────────────────────────────────────────────────────────

// Build every month from earliest date to now, with events attached
// Collapse gaps > 6 months: show 3 months after prev event, gap marker, 3 months before next
type DateGroup = { date: string; events: TimelineEvent[]; isGap?: boolean };
function buildDateGroups(): DateGroup[] {
  const allDates = usesItems.flatMap((item) =>
    item.active ? [item.acquireDate] : [item.acquireDate, item.doneDate]
  );
  const earliest = allDates.reduce((a, b) => (a < b ? a : b));
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Index events by date
  const eventsByDate = new Map<string, TimelineEvent[]>();
  for (const event of allEvents) {
    const list = eventsByDate.get(event.date) || [];
    list.push(event);
    eventsByDate.set(event.date, list);
  }

  // Generate all months newest-first
  const allGroups: DateGroup[] = [];
  let [y, m] = currentYM.split("-").map(Number);
  const [ey, em] = earliest.split("-").map(Number);
  while (y > ey || (y === ey && m >= em)) {
    const date = `${y}-${String(m).padStart(2, "0")}`;
    allGroups.push({ date, events: eventsByDate.get(date) || [] });
    m--;
    if (m < 1) { m = 12; y--; }
  }

  // Find event month indices
  const eventIndices = allGroups
    .map((g, i) => (g.events.length > 0 ? i : -1))
    .filter((i) => i >= 0);

  // Determine which months to keep
  const keepSet = new Set<number>();
  for (const idx of eventIndices) {
    // Keep 3 months after (lower index = newer) and 3 before (higher index = older)
    for (let d = -3; d <= 3; d++) {
      const target = idx + d;
      if (target >= 0 && target < allGroups.length) keepSet.add(target);
    }
  }

  // Build final list with gap markers
  const result: DateGroup[] = [];
  let lastKept = -1;
  for (let i = 0; i < allGroups.length; i++) {
    if (keepSet.has(i)) {
      if (lastKept >= 0 && i - lastKept > 1) {
        // Insert gap marker using the midpoint date for scroll-to
        const midIdx = Math.floor((lastKept + i) / 2);
        result.push({ date: allGroups[midIdx].date, events: [], isGap: true });
      }
      result.push(allGroups[i]);
      lastKept = i;
    }
  }

  return result;
}
const dateGroups = buildDateGroups();
const allMonths = dateGroups.filter((g) => !g.isGap).map((g) => g.date);

const UsesPage: React.FC<PageProps> = () => {
  const [activeDate, setActiveDate] = React.useState(allMonths[0]);
  const dateRefs = React.useRef<Map<string, HTMLLIElement>>(new Map());

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let topEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (
              !topEntry ||
              entry.boundingClientRect.top < topEntry.boundingClientRect.top
            ) {
              topEntry = entry;
            }
          }
        }
        if (topEntry) {
          const date = (topEntry.target as HTMLElement).dataset.date;
          if (date) setActiveDate(date);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );

    dateRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <Layout>
      <div className={styles.wrapper}>
      <h2>What I Use</h2>

      <div className={styles.page}>
        {/* ── Equipment panel ── */}
        <div className={styles.equipment}>
          <div className={styles.equipmentDate}>{formatDate(activeDate)}</div>

          {allGroups.map(({ category: cat, subtypes }) => {
            const hasAnyVisible = subtypes.some((sg) =>
              sg.items.some((item) => isActiveAt(item, activeDate))
            );

            return (
              <div key={cat} className={styles.categorySection}>
                <h3>{categoryLabel[cat]}</h3>

                <div
                  className={`${styles.emptyCategory} ${hasAnyVisible ? styles.emptyCategoryHidden : ""}`}
                >
                  {hasAnyVisible ? "" : "Nothing yet"}
                </div>

                {subtypes.map((sg) => {
                  const anyVisible = sg.items.some((item) =>
                    isActiveAt(item, activeDate)
                  );
                  const showLabel = cat === "desktop" || cat === "camera";

                  return (
                    <div
                      key={sg.subtype}
                      className={`${styles.subtypeGroup} ${!anyVisible ? styles.subtypeGroupHidden : ""}`}
                    >
                      <div className={styles.subtypeGroupInner}>
                        {showLabel && (
                          <div className={styles.subtypeLabel}>
                            {subtypeLabel[sg.subtype] || sg.subtype}
                          </div>
                        )}
                        {sg.items.map((item) => {
                          const visible = isActiveAt(item, activeDate);
                          return (
                            <div
                              key={itemKey(item)}
                              className={`${styles.itemWrapper} ${!visible ? styles.itemWrapperHidden : ""}`}
                            >
                              <div className={styles.itemWrapperInner}>
                                <div className={styles.itemCard}>
                                  <span className={styles.itemName}>
                                    {itemTitle(item)}
                                  </span>
                                  {item.notes && (
                                    <span className={styles.itemNote}>
                                      {" "}
                                      &middot; {item.notes}
                                    </span>
                                  )}
                                  {renderItemDetail(item)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* ── Timeline ── */}
          <ol className={styles.timeline}>
            {dateGroups.map((group, i) => {
              if (group.isGap) {
                return (
                  <li
                    key={`gap-${group.date}`}
                    data-date={group.date}
                    ref={(el) => {
                      if (el) dateRefs.current.set(`gap-${group.date}`, el);
                    }}
                    className={styles.timelineGap}
                    onClick={() => setActiveDate(group.date)}
                  >
                    <span className={styles.timelineGapDots}><span /></span>
                  </li>
                );
              }
              const isActive = group.date === activeDate;
              const hasEvents = group.events.length > 0;
              return (
                <li
                  key={group.date}
                  ref={(el) => {
                    if (el) dateRefs.current.set(group.date, el);
                  }}
                  data-date={group.date}
                  className={`${styles.timelineEvent} ${isActive ? styles.timelineEventActive : ""} ${!hasEvents ? styles.timelineEventEmpty : ""}`}
                  onClick={() => setActiveDate(group.date)}
                >
                  <span className={styles.timelineDot} />
                  <span className={styles.timelineEventDate}>
                    {formatDate(group.date)}
                  </span>
                  {group.events.map((event) => (
                    <div
                      key={`${event.type}-${itemTitle(event.item)}`}
                      className={`${styles.timelineEventLabel} ${event.type === "acquired" ? styles.acquired : styles.retired}`}
                    >
                      {event.type === "acquired" ? "+" : "−"}{" "}
                      {itemTitle(event.item)}
                    </div>
                  ))}
                </li>
              );
            })}
          </ol>
      </div>
      </div>
    </Layout>
  );
};

export default UsesPage;

export const Head = () => <SEO title="Uses" />;
