"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { usesAt } from "@/lib/uses";
import { GearDetails } from "@/components/gear-details";
import { GearItemSummary } from "@/components/gear-item-summary";
import styles from "./animated-gear-items.module.css";

type GearItem = ReturnType<typeof usesAt>["categories"][number]["items"][number];
type Entry = { id: string; item: GearItem | null; emptyLabel?: string; phase: "idle" | "enter" | "exit" };

function entriesFor(items: GearItem[], emptyLabel: string): Entry[] {
  return items.length
    ? items.map((item) => ({ id: item.id, item, phase: "idle" }))
    : [{ id: `empty:${emptyLabel}`, item: null, emptyLabel, phase: "idle" }];
}

export function AnimatedGearItems({ items, emptyLabel, month, direction }: { items: GearItem[]; emptyLabel: string; month: string; direction: number }) {
  const [snapshot, setSnapshot] = useState(() => ({ items, emptyLabel, entries: entriesFor(items, emptyLabel) }));

  if (snapshot.items !== items || snapshot.emptyLabel !== emptyLabel) {
    const next = entriesFor(items, emptyLabel).map((entry): Entry => {
      const previous = snapshot.entries.find(({ id }) => id === entry.id);
      return { ...entry, phase: !previous || previous.phase === "exit" ? "enter" : previous.phase };
    });
    // Keep departing rows beside their former neighbors until their exit finishes.
    snapshot.entries.forEach((entry, index) => {
      if (next.some(({ id }) => id === entry.id)) return;
      const following = snapshot.entries.slice(index + 1).find((old) => next.some(({ id }) => id === old.id));
      const position = following ? next.findIndex(({ id }) => id === following.id) : next.length;
      next.splice(position, 0, { ...entry, phase: "exit" });
    });
    setSnapshot({ items, emptyLabel, entries: next });
  }

  useEffect(() => {
    if (snapshot.entries.every(({ phase }) => phase === "idle")) return;
    const timer = setTimeout(() => {
      setSnapshot((current) => ({
        ...current,
        entries: current.entries.filter(({ phase }) => phase !== "exit").map((entry) => ({ ...entry, phase: "idle" })),
      }));
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
    return () => clearTimeout(timer);
  }, [snapshot]);

  return (
    <div className={styles.list} style={{ "--date-offset": `${direction * .45}em` } as CSSProperties}>
      {snapshot.entries.map(({ id, item, emptyLabel: entryEmptyLabel, phase }) => (
        <div key={id} className={styles.item} data-phase={phase} inert={phase === "exit"} aria-hidden={phase === "exit" ? true : undefined}>
          <div className={styles.clip}>
            <div className={`${styles.content} ${phase === "enter" ? "date-value" : ""}`}>
              {item ? <GearItemSummary item={item}>
                <GearDetails key={`${id}:${month}`} item={item.details} heading>{item.name}</GearDetails>
              </GearItemSummary> : <p className="font-display text-[22px] text-muted italic">{entryEmptyLabel}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
