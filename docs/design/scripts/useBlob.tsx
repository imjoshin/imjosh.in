// React wrapper around scripts/blob.js. Drop <BlobCanvas /> once at the app root.
import { useEffect, useRef } from 'react';
import { initBlob } from './blob';

export function BlobCanvas({ dimmed = false }: { dimmed?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // see handoff.md
    return initBlob(ref.current, { count: 7, pull: 0.24 });
  }, []);
  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: 'fixed', inset: 0, width: '100vw', height: '100vh',
        pointerEvents: 'none', transition: 'opacity .8s', opacity: dimmed ? 0.5 : 1,
      }}
    />
  );
}
