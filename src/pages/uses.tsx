import * as React from "react";
import { PageProps } from "gatsby";
import Layout from "../components/layout/Layout";
import { SEO } from "../components/seo";
import { buildDateGroups } from "../components/uses/uses-data";
import EquipmentPanel from "../components/uses/EquipmentPanel";
import Timeline from "../components/uses/Timeline";
import * as styles from "./uses.module.css";

const dateGroups = buildDateGroups();
const allMonths = dateGroups.filter((g) => !g.isGap).map((g) => g.date);

function useRemainingHeight(ref: React.RefObject<HTMLElement | null>) {
  const [height, setHeight] = React.useState<number | undefined>(undefined);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setHeight(window.innerHeight - rect.top);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ref]);

  return height;
}

const UsesPage: React.FC<PageProps> = () => {
  const [activeDate, setActiveDate] = React.useState(allMonths[0]);
  const dateRefs = React.useRef<Map<string, HTMLLIElement>>(new Map());
  const mobileDateRefs = React.useRef<Map<string, HTMLLIElement>>(new Map());
  const mobileTimelineRef = React.useRef<HTMLDivElement>(null);

  const desktopEquipRef = React.useRef<HTMLDivElement>(null);
  const mobileEquipRef = React.useRef<HTMLDivElement>(null);
  const desktopHeight = useRemainingHeight(desktopEquipRef);
  const mobileHeight = useRemainingHeight(mobileEquipRef);

  // Desktop: IntersectionObserver on page scroll for the timeline
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

  // Mobile: IntersectionObserver scoped to the timeline scroll container
  React.useEffect(() => {
    const root = mobileTimelineRef.current;
    if (!root) return;

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
      { root, rootMargin: "-20% 0px -70% 0px" }
    );

    mobileDateRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <Layout>
      <h2>What I Use</h2>

      {/* ── Desktop layout ── */}
      <div className={styles.desktopLayout}>
        <div
          ref={desktopEquipRef}
          className={styles.desktopEquipment}
          style={desktopHeight ? { height: desktopHeight } : undefined}
        >
          <EquipmentPanel activeDate={activeDate} />
        </div>
        <Timeline
          dateGroups={dateGroups}
          activeDate={activeDate}
          onDateSelect={setActiveDate}
          dateRefs={dateRefs}
          className={styles.desktopTimeline}
        />
      </div>

      {/* ── Mobile layout ── */}
      <div className={styles.mobileLayout}>
        <div className={styles.mobileTimelineWrapper} ref={mobileTimelineRef}>
          <Timeline
            dateGroups={dateGroups}
            activeDate={activeDate}
            onDateSelect={setActiveDate}
            dateRefs={mobileDateRefs}
            className={styles.mobileTimeline}
          />
        </div>
        <div
          ref={mobileEquipRef}
          className={styles.mobileEquipment}
          style={mobileHeight ? { height: mobileHeight } : undefined}
        >
          <EquipmentPanel activeDate={activeDate} />
        </div>
      </div>
    </Layout>
  );
};

export default UsesPage;

export const Head = () => <SEO title="Uses" />;
