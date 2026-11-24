export function initBlob(canvas: HTMLCanvasElement, options?: {
  count?: number;
  scale?: number;
  pull?: number;
  timeOffset?: () => number;
}): () => void;
