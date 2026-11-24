import type { CSSProperties } from "react";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function AnimatedDate({ month, direction }: { month: string; direction: number }) {
  const [year, number] = month.split("-");
  return (
    <output htmlFor="gear-date" aria-label={new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })} aria-live="off" className="flex shrink-0 flex-col items-end gap-2 font-display max-sm:flex-row max-sm:items-baseline max-sm:gap-4" style={{ "--date-offset": `${direction * .45}em` } as CSSProperties}>
      <span aria-hidden="true" className="date-part min-w-[4ch] text-right text-[clamp(80px,12vw,168px)] leading-[.8] tracking-[-.03em] tabular-nums"><span key={year} className="date-value">{year}</span></span>
      <span aria-hidden="true" className="date-part min-w-[4ch] text-right text-[clamp(28px,3vw,40px)] leading-none text-accent italic"><span key={month} className="date-value">{months[Number(number) - 1]}</span></span>
    </output>
  );
}
