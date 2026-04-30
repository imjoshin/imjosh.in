import React from "react";
import { DateGroup, formatDate, itemTitle } from "./uses-data";
import * as styles from "./uses-shared.module.css";

type Props = {
  dateGroups: DateGroup[];
  activeDate: string;
  onDateSelect: (date: string) => void;
  dateRefs: React.MutableRefObject<Map<string, HTMLLIElement>>;
  className?: string;
};

const Timeline: React.FC<Props> = ({
  dateGroups,
  activeDate,
  onDateSelect,
  dateRefs,
  className,
}) => {
  return (
    <ol className={`${styles.timeline} ${className || ""}`}>
      {dateGroups.map((group) => {
        if (group.isGap) {
          return (
            <li
              key={`gap-${group.date}`}
              data-date={group.date}
              ref={(el) => {
                if (el) dateRefs.current.set(`gap-${group.date}`, el);
              }}
              className={styles.timelineGap}
              onClick={() => onDateSelect(group.date)}
            >
              <span className={styles.timelineGapDots}>
                <span />
              </span>
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
            onClick={() => onDateSelect(group.date)}
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
                {event.type === "acquired" ? "+" : "−"} {itemTitle(event.item)}
              </div>
            ))}
          </li>
        );
      })}
    </ol>
  );
};

export default Timeline;
