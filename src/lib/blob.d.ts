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
  onInteraction?: (event: "blob_burst" | "blob_gravity_grab" | "pew_mode_enable" | "pew_mode_disable" | "pew_shot" | "pew_hit", params: Record<string, string | number | undefined>) => void;
}): BlobController;
