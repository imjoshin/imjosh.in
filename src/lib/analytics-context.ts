import type { AnalyticsParams } from "./analytics.ts";
import type { MusicEntityRef } from "./music/types.ts";

export interface AnalyticsNode {
  parentElement: AnalyticsNode | null;
  getAttribute(name: string): string | null;
}

const fields = ["section", "chart", "metric", "period", "bucket", "item_type", "item_name", "item_artists", "item_rank", "item_slot", "item_group", "method"] as const;
const attribute = (field: string) => `data-analytics-${field.replaceAll("_", "-")}`;
export const analyticsContextAttributes = fields.map(attribute);

/** Resolve each field independently, so a song row can refine its enclosing section. */
export function analyticsContext(element: AnalyticsNode): AnalyticsParams {
  const context: AnalyticsParams = {};
  for (const field of fields) {
    for (let node: AnalyticsNode | null = element; node; node = node.parentElement) {
      const value = node.getAttribute(attribute(field)) ?? (field === "section" ? node.getAttribute("data-analytics-view") : null);
      if (value === null) continue;
      if (field === "item_rank") {
        const rank = Number(value);
        if (Number.isSafeInteger(rank) && rank > 0) context[field] = rank;
      } else if (value) context[field] = value;
      break;
    }
  }
  return context;
}

/** Carry public context onto a portal without changing layout or accessibility. */
export function analyticsDataAttributes(context: AnalyticsParams) {
  return Object.fromEntries(fields.filter(field => context[field] !== undefined).map(field => [attribute(field), context[field]]));
}

export function musicInspectionContext(anchor: AnalyticsNode, entity: MusicEntityRef, method: "hover" | "keyboard" | "touch" | "click") {
  return {
    ...analyticsContext(anchor),
    item_type: entity.kind,
    item_name: entity.name,
    item_artists: entity.kind === "artist" ? entity.name : entity.artists?.join(", "),
    method,
  } satisfies AnalyticsParams;
}
