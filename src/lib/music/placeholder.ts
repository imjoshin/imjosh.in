import type { CSSProperties } from "react";

// Lavender, indigo, blue, teal, sage, gold, rose, and plum.
const colors = ["#8063b8", "#626fc0", "#4e83ad", "#458c91", "#628c6b", "#a58a50", "#b36b78", "#a46b9f"];

export function musicPlaceholderStyle(name: string): CSSProperties {
  const text = name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return { "--music-placeholder-color": colors[(hash >>> 0) % colors.length] } as CSSProperties;
}
