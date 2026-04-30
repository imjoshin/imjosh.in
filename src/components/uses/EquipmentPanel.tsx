import React from "react";
import { UsesItem } from "../../../content/uses";
import {
  categoryOrder,
  categoryLabel,
  subtypeLabel,
  itemKey,
  itemTitle,
  isActiveAt,
  formatDate,
  getSpecs,
  buildAllGroups,
} from "./uses-data";
import * as styles from "./uses-shared.module.css";

const allGroups = buildAllGroups();

const CollapsibleSpecs: React.FC<{
  specs: { label: string; value: string }[];
}> = ({ specs }) => {
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
          <button className={styles.specToggle} onClick={() => setOpen(!open)}>
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
    const parts = [item.size, item.resolution, item.refreshRate].filter(Boolean);
    return <div className={styles.itemDetail}>{parts.join(" · ")}</div>;
  }

  if (item.category === "phone") {
    const parts = [item.storage, item.display, item.os].filter(Boolean);
    if (parts.length === 0) return null;
    return <div className={styles.itemDetail}>{parts.join(" · ")}</div>;
  }

  return null;
}

type Props = {
  activeDate: string;
  className?: string;
};

const EquipmentPanel: React.FC<Props> = ({ activeDate, className }) => {
  return (
    <div className={className}>
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
  );
};

export default EquipmentPanel;
