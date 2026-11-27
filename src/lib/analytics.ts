export type AnalyticsParams = Record<string, string | number | boolean | undefined>;
export type AnalyticsEvent =
  | "page_view" | "navigation_click" | "outbound_click" | "social_click" | "scroll_depth"
  | "section_view" | "chart_view" | "chart_inspect" | "music_item_hover" | "music_details_view"
  | "music_period_change" | "music_ranking_change" | "music_metric_change" | "music_drilldown"
  | "now_playing_dismiss" | "theme_change" | "menu_open" | "uses_period_change" | "gear_details_view"
  | "resume_print" | "blob_burst" | "blob_gravity_grab" | "pew_mode_enable" | "pew_mode_disable"
  | "pew_shot" | "pew_hit";

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window { dataLayer?: unknown[]; gtag?: Gtag }
  interface Navigator { globalPrivacyControl?: boolean }
}

const productionHosts = new Set(["imjosh.in", "www.imjosh.in"]);
// App Router can commit the URL before streaming its new document title.
const routeTitles: Record<string, string> = {
  "/": "Josh Johnson",
  "/projects": "Projects | Josh Johnson",
  "/uses": "Uses | Josh Johnson",
  "/music": "Music | Josh Johnson",
  "/resume": "Resume | Josh Johnson",
};
export function analyticsEnabled(id: string | undefined, hostname: string, production: boolean, debug: boolean, optedOut: boolean) {
  return !!id && /^G-[A-Z0-9]+$/.test(id) && !optedOut && (debug || production && productionHosts.has(hostname));
}

/** Keep campaign attribution, but never forward arbitrary query strings or fragments. */
export function analyticsUrl(value: string, campaigns = false) {
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return "";
    url.username = ""; url.password = ""; url.hash = "";
    const query = new URLSearchParams();
    if (campaigns) for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_term", "utm_content"]) {
      const value = url.searchParams.get(key);
      if (value) query.set(key, value.slice(0, 100));
    }
    url.search = query.toString();
    return url.href;
  } catch { return ""; }
}

export function analyticsParams(params: AnalyticsParams): AnalyticsParams {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && (typeof value !== "number" || Number.isFinite(value)))
    .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, key === "page_location" || key === "link_url" ? 1000 : key === "page_referrer" ? 420 : key === "page_title" ? 300 : 100) : value]));
}

let configuredId = "";
let debugMode = false;
let lastPath = "";
let previousLocation = "";
const pending = new Map<string, { name: AnalyticsEvent; params: AnalyticsParams; count: number }>();
let batchTimer: ReturnType<typeof setTimeout> | undefined;

export function initializeAnalytics(id: string | undefined, production: boolean, debug = false) {
  if (typeof window === "undefined") return false;
  if (!analyticsEnabled(id, location.hostname, production, debug, navigator.globalPrivacyControl === true || navigator.doNotTrack === "1")) return false;
  if (configuredId) return true;
  configuredId = id!; debugMode = debug;
  window.dataLayer ??= [];
  // Google's queue expects Arguments objects, including while the external script loads.
  window.gtag ??= function () { window.dataLayer!.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", configuredId, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    page_location: analyticsUrl(location.href, true),
    page_referrer: analyticsUrl(document.referrer),
    ...(debug ? { debug_mode: true } : {}),
  });
  return true;
}

export function trackEvent(name: AnalyticsEvent, params: AnalyticsParams = {}) {
  if (!configuredId || typeof window === "undefined" || navigator.globalPrivacyControl === true || navigator.doNotTrack === "1") return;
  try {
    const payload = analyticsParams({ page_path: location.pathname, page_location: analyticsUrl(location.href, true), ...params, send_to: configuredId, ...(debugMode ? { debug_mode: true } : {}) });
    window.gtag?.("event", name, payload);
    if (debugMode) console.info(`[analytics] ${name} ${JSON.stringify(payload)}`);
  } catch { /* Optional analytics must never interrupt the site. */ }
}

/** Route changes count as visits; timeline/filter query changes do not. */
export function trackPageView(pathname: string) {
  if (!configuredId || pathname === lastPath) return;
  flushAnalytics();
  lastPath = pathname;
  const pageLocation = analyticsUrl(location.href, true);
  const referrer = previousLocation || analyticsUrl(document.referrer);
  const title = routeTitles[pathname.replace(/\/$/, "") || "/"] || document.title;
  window.gtag?.("set", { page_location: pageLocation, page_referrer: referrer, page_title: title });
  trackEvent("page_view", { page_location: pageLocation, page_referrer: referrer, page_title: title });
  previousLocation = pageLocation;
}

/** Preserve exact action counts without sending one network event per projectile. */
export function countEvent(name: AnalyticsEvent, params: AnalyticsParams = {}) {
  if (!configuredId) return;
  const context = analyticsParams({ page_path: location.pathname, page_location: analyticsUrl(location.href, true), ...params });
  const key = JSON.stringify([name, context]);
  const item = pending.get(key);
  if (item) item.count++; else pending.set(key, { name, params: context, count: 1 });
  batchTimer ??= setTimeout(flushAnalytics, 5000);
}

export function flushAnalytics() {
  clearTimeout(batchTimer); batchTimer = undefined;
  for (const item of pending.values()) trackEvent(item.name, { ...item.params, interaction_count: item.count });
  pending.clear();
}
