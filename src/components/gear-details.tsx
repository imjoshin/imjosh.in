"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { itemName } from "@/lib/uses";
import type { UsesItem } from "../../content/uses";

export function GearDetails({ item, children, heading = false, className = "" }: { item: UsesItem; children: ReactNode; heading?: boolean; className?: string }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false);

  function cancelClose() { clearTimeout(closeTimer.current); }

  function position() {
    if (!trigger.current || !panel.current) return;
    const anchor = trigger.current.getBoundingClientRect();
    const popup = panel.current;
    const gutter = 16;
    const gap = 10;
    const width = Math.min(384, window.innerWidth - gutter * 2);
    popup.style.width = `${width}px`;
    popup.style.maxHeight = `${window.innerHeight - gutter * 2}px`;
    const height = popup.getBoundingClientRect().height;
    const beside = window.innerWidth >= 768;
    let left = anchor.left;
    let top = anchor.bottom + gap;
    if (beside && anchor.right + gap + width <= window.innerWidth - gutter) {
      left = anchor.right + gap;
      top = anchor.top - 20;
    } else if (beside && anchor.left - gap - width >= gutter) {
      left = anchor.left - gap - width;
      top = anchor.top - 20;
    } else if (top + height > window.innerHeight - gutter && anchor.top - gap - height >= gutter) {
      top = anchor.top - gap - height;
    }
    popup.style.left = `${Math.max(gutter, Math.min(window.innerWidth - width - gutter, left))}px`;
    popup.style.top = `${Math.max(gutter, Math.min(window.innerHeight - height - gutter, top))}px`;
    popup.dataset.positioned = "true";
  }

  function show() {
    cancelClose();
    if (!panel.current || typeof panel.current.showPopover !== "function") return;
    panel.current.showPopover();
    position();
  }

  function queueClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      if (panel.current?.matches(":hover") || panel.current?.contains(document.activeElement) || trigger.current === document.activeElement) return;
      panel.current?.hidePopover();
    }, 180);
  }

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open) return;
    function dismissOnScroll(event: Event) {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      panel.current?.hidePopover();
    }
    window.addEventListener("resize", position);
    window.addEventListener("scroll", dismissOnScroll, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", dismissOnScroll, true);
    };
  }, [open]);

  const name = itemName(item);
  const button = (
    <button ref={trigger} type="button" popoverTarget={id} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} className={`gear-trigger text-left ${className}`} onPointerEnter={(event) => { if (event.pointerType === "mouse") show(); }} onPointerLeave={(event) => { if (event.pointerType === "mouse") queueClose(); }} onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) show(); }} onBlur={queueClose} onClick={(event) => { if (panel.current?.matches(":popover-open") && event.currentTarget.matches(":hover") && matchMedia("(hover: hover)").matches) event.preventDefault(); }}>
      {children}
    </button>
  );

  return (
    <>
      {heading ? <h3 className="text-[18px] leading-[1.2] font-medium">{button}</h3> : button}
      <div ref={panel} id={id} popover="auto" role="dialog" aria-labelledby={`${id}-title`} className="gear-popover" onToggle={(event) => { const next = event.newState === "open"; setOpen(next); if (next) position(); }} onPointerEnter={cancelClose} onPointerLeave={(event) => { if (event.pointerType === "mouse") queueClose(); }} onFocus={cancelClose} onBlur={queueClose}>
        <div className="relative flex min-h-44 items-center justify-center rounded-t-[19px] bg-line/30 px-10 py-6">
          <img src={item.image.src} alt={item.image.alt} width={320} height={200} loading="lazy" className="h-40 w-full object-contain" />
          <button type="button" popoverTarget={id} popoverTargetAction="hide" aria-label={`Close details for ${name}`} className="absolute top-3 right-3 grid size-8 place-items-center rounded-full border border-line bg-background text-lg text-muted hover:text-ink">×</button>
        </div>
        <div className="flex flex-col gap-5 p-5">
          <div className="flex flex-col gap-2">
            <p className="eyebrow">{item.make === "Custom" ? "Custom build" : <>{item.producer} <span aria-hidden="true">·</span> {item.releaseYear ? `Released ${item.releaseYear}` : "Release year unconfirmed"}</>}</p>
            <h3 id={`${id}-title`} className="font-display text-[30px] leading-[1.05] text-ink">{name}</h3>
            {item.image.note && <p className="text-[13px] leading-snug text-muted">{item.image.note}</p>}
          </div>
          <dl className="flex flex-col divide-y divide-line text-[14px] leading-snug">
            {Object.entries(item.specs).map(([key, value]) => <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4 py-2 first:pt-0 last:pb-0"><dt className="text-muted">{key}</dt><dd className="text-ink">{value}</dd></div>)}
          </dl>
          {item.sources.length > 0 && <a href={item.sources[0].url} target="_blank" rel="noreferrer" className="w-fit text-[13px] text-muted underline decoration-line underline-offset-4 hover:text-accent">Product information<span className="sr-only"> for {name} (opens in a new tab)</span></a>}
        </div>
      </div>
    </>
  );
}
