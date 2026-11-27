"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { analyticsUrl, flushAnalytics, initializeAnalytics, trackEvent, trackPageView } from "@/lib/analytics";
import { analyticsContext, analyticsContextAttributes } from "@/lib/analytics-context";

const id = process.env.NEXT_PUBLIC_GA_ID;
const debug = process.env.NEXT_PUBLIC_GA_DEBUG === "true";
const viewSelector = "[data-analytics-view], [data-analytics-chart], [data-analytics-inspect]";

/** Dwell distinguishes seeing a chart from quickly scrolling past it. */
function observeViews() {
  if (!("IntersectionObserver" in window)) return () => {};
  const observed = new Set<Element>(), visible = new Set<Element>(), seen = new Set<string>();
  const timers = new Map<Element, ReturnType<typeof setTimeout>>(), inspected = new Map<string, number>();
  function cancel(element: Element) { clearTimeout(timers.get(element)); timers.delete(element); }
  function schedule(element: Element) {
    if (document.hidden || timers.has(element)) return;
    const inspection = (element as HTMLElement).dataset.analyticsInspect;
    timers.set(element, setTimeout(() => {
      timers.delete(element);
      if (!element.isConnected || document.hidden || !visible.has(element) || element.closest('[inert], [hidden], [aria-hidden="true"]') || getComputedStyle(element).visibility === "hidden") return;
      const params = analyticsContext(element);
      const name = inspection === "chart" ? "chart_inspect" : inspection === "entity" ? "music_details_view" : params.chart ? "chart_view" : "section_view";
      const key = JSON.stringify([name, params]);
      if (inspection) {
        if (Date.now() - (inspected.get(key) || 0) < 10000) return;
        inspected.set(key, Date.now());
      } else {
        if (seen.has(key)) return;
        seen.add(key);
      }
      trackEvent(name, params);
    }, inspection ? 750 : 1000));
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting && entry.intersectionRatio >= .1) { visible.add(entry.target); schedule(entry.target); }
      else { visible.delete(entry.target); cancel(entry.target); }
    }
  }, { threshold: .1 });
  function collect(root: Element) {
    for (const element of [ ...(root.matches(viewSelector) ? [root] : []), ...root.querySelectorAll(viewSelector)]) {
      if (observed.has(element)) continue;
      observed.add(element); observer.observe(element);
    }
  }
  collect(document.body);
  const mutations = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "attributes" && record.target instanceof Element && visible.has(record.target)) {
        cancel(record.target); schedule(record.target);
      }
      for (const node of record.addedNodes) if (node instanceof Element) collect(node);
    }
    for (const element of observed) if (!element.isConnected) {
      cancel(element); observer.unobserve(element); observed.delete(element); visible.delete(element);
    }
  });
  mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: analyticsContextAttributes });
  function visibility() {
    if (document.hidden) { for (const element of timers.keys()) cancel(element); flushAnalytics(); }
    else for (const element of visible) schedule(element);
  }
  document.addEventListener("visibilitychange", visibility);
  return () => {
    observer.disconnect(); mutations.disconnect();
    for (const element of timers.keys()) cancel(element);
    document.removeEventListener("visibilitychange", visibility);
  };
}

export function SiteAnalytics() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { setEnabled(initializeAnalytics(id, process.env.NODE_ENV === "production", debug)); }, []);
  useEffect(() => {
    if (!enabled) return;
    trackPageView(pathname);
    const stopViews = observeViews();
    const depths = new Set<number>();
    const hovered = new Map<string, number>();
    let hover: { element: Element; timer: ReturnType<typeof setTimeout> } | null = null;
    function cancelHover() { if (hover) clearTimeout(hover.timer); hover = null; }
    function over(event: PointerEvent) {
      if (event.pointerType === "touch" || document.hidden) return;
      const element = event.target instanceof Element ? event.target.closest('[data-analytics-hover="music"]') : null;
      if (!element || hover?.element === element || element.closest('[inert], [hidden], [aria-hidden="true"]')) return;
      cancelHover();
      const params = { ...analyticsContext(element), method: "hover" };
      const key = JSON.stringify(params);
      hover = { element, timer: setTimeout(() => {
        if (document.hidden || !element.isConnected || !element.matches(":hover") || element.closest('[inert], [hidden], [aria-hidden="true"]')) return;
        if (JSON.stringify({ ...analyticsContext(element), method: "hover" }) !== key || Date.now() - (hovered.get(key) || 0) < 10000) return;
        hovered.set(key, Date.now()); trackEvent("music_item_hover", params);
      }, 750) };
    }
    function out(event: PointerEvent) {
      if (hover && !(event.relatedTarget instanceof Node && hover.element.contains(event.relatedTarget))) cancelHover();
    }
    function visibility() { if (document.hidden) cancelHover(); }
    function scroll() {
      if (document.hidden) return;
      const height = document.documentElement.scrollHeight;
      if (height <= innerHeight + 100) return;
      const percent = (scrollY + innerHeight) / height * 100;
      for (const depth of [25, 50, 75, 90]) if (percent >= depth && !depths.has(depth)) {
        depths.add(depth); trackEvent("scroll_depth", { percent_scrolled: depth });
      }
    }
    function click(event: MouseEvent) {
      if (event.type === "auxclick" && event.button !== 1) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor) return;
      const href = analyticsUrl(anchor.href);
      if (!href) return;
      const url = new URL(href);
      // Next Link prevents the native navigation; music's first touch prevents an outbound visit.
      if (event.defaultPrevented && url.origin !== location.origin) return;
      const placement = anchor.closest("header") ? "header" : anchor.closest("footer") ? "footer" : "content";
      const params = { ...analyticsContext(anchor), link_url: href, link_domain: url.hostname, link_text: anchor.dataset.analyticsLabel || anchor.textContent?.trim().replace(/\s+/g, " "), link_location: placement, method: event.type === "auxclick" ? "middle_click" : event.detail === 0 ? "keyboard" : "click" };
      if (url.origin === location.origin) {
        if (url.pathname !== location.pathname) trackEvent("navigation_click", params);
      } else if (anchor.dataset.analyticsSocial) trackEvent("social_click", { ...params, social_network: anchor.dataset.analyticsSocial });
      else trackEvent("outbound_click", params);
    }
    document.addEventListener("click", click);
    document.addEventListener("auxclick", click);
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerout", out);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pagehide", flushAnalytics);
    return () => {
      stopViews(); cancelHover(); flushAnalytics();
      document.removeEventListener("click", click); document.removeEventListener("auxclick", click);
      document.removeEventListener("pointerover", over); document.removeEventListener("pointerout", out);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("scroll", scroll); window.removeEventListener("pagehide", flushAnalytics);
    };
  }, [enabled, pathname]);
  return enabled ? <Script id="google-analytics" src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" /> : null;
}
