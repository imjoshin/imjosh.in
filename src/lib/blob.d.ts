export type BlobController = {
  destroy(): void;
  setHome(home: boolean): void;
  setPaused(paused: boolean): void;
};

export function initBlob(canvas: HTMLCanvasElement, options?: {
  count?: number;
  scale?: number;
  pull?: number;
  home?: boolean;
  onPewHintChange?: (visible: boolean) => void;
}): BlobController;
