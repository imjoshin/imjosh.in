"use client";

import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { MusicEntityDataset, MusicEntityRef } from "@/lib/music/types";
import { directSpotifyUrl, musicEntityKey, spotifyEntityUrl, spotifyImage } from "@/lib/music/entity-links";

interface Active { id: string; entity: MusicEntityRef; anchor: HTMLAnchorElement; focus: boolean; dismissed?: () => void }
interface HoverContext {
  activeId: string | null;
  cardId: string;
  data: MusicEntityDataset | null;
  show: (value: Active, delayed?: boolean) => void;
  leave: () => void;
  closeOwner: (id: string) => void;
}
const Context = createContext<HoverContext | null>(null);
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)) : "Not recorded";

export function MusicHoverProvider({ file, api, resetKey, children }: { file?: string; api: boolean; resetKey: string; children: ReactNode }) {
  const [active, setActive] = useState<Active | null>(null), [data, setData] = useState<MusicEntityDataset | null>(null), [failed, setFailed] = useState(false);
  const cache = useRef(new Map<string, Promise<MusicEntityDataset>>());
  const current = useRef(active); current.current = active;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), card = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: 12, top: 12, ready: false });
  const suppressFocus = useRef<HTMLAnchorElement | null>(null);
  const id = useId();
  const cancel = useCallback(() => { if (timer.current) clearTimeout(timer.current); timer.current = null; }, []);
  const close = useCallback(() => {
    cancel(); const previous = current.current; current.current = null; setActive(null); previous?.dismissed?.();
  }, [cancel]);
  const show = useCallback((value: Active, delayed = false) => {
    cancel();
    if (suppressFocus.current === value.anchor) { suppressFocus.current = null; return; }
    const reveal = () => { if (value.anchor.isConnected) { setPosition(old => ({ ...old, ready: false })); setActive(value); } };
    if (delayed) timer.current = setTimeout(reveal, 180); else reveal();
  }, [cancel]);
  const leave = useCallback(() => { cancel(); timer.current = setTimeout(() => { if (document.activeElement !== current.current?.anchor && !card.current?.contains(document.activeElement)) close(); }, 180); }, [cancel, close]);
  const closeOwner = useCallback((owner: string) => { if (current.current?.id === owner) close(); }, [close]);
  const restore = useCallback((anchor: HTMLAnchorElement) => { if (document.activeElement !== anchor) suppressFocus.current = anchor; close(); anchor.focus({ preventScroll: true }); }, [close]);
  useEffect(() => { close(); }, [resetKey, close]);
  useEffect(() => () => cancel(), [cancel]);
  useEffect(() => {
    setFailed(false);
  }, [file]);
  useEffect(() => {
    if (!active || !file) return;
    let cancelled = false;
    setFailed(false);
    let request = cache.current.get(file);
    if (!request) {
      request = fetch(api ? `/api/music?file=${encodeURIComponent(file)}` : `/music/${file}`).then(async response => {
        if (!response.ok) throw new Error("Listening details unavailable");
        const value = await response.json() as MusicEntityDataset;
        if (value.version !== 1 || !value.entities) throw new Error("Unsupported listening details");
        return value;
      });
      cache.current.set(file, request);
      while (cache.current.size > 3) cache.current.delete(cache.current.keys().next().value!);
    }
    request.then(value => { if (!cancelled) setData(value); }).catch(() => { cache.current.delete(file); if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [active?.id, file, api]);
  const entity = active ? data?.entities[musicEntityKey(active.entity.kind, active.entity.name, active.entity.artists)] : undefined;
  useLayoutEffect(() => {
    if (!active || !card.current) return;
    const reposition = () => {
      if (!active.anchor.isConnected) { close(); return; }
      const bounds = active.anchor.getBoundingClientRect(), popup = card.current!.getBoundingClientRect();
      const viewport = window.visualViewport;
      const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
      const offsetX = viewport?.offsetLeft || 0, offsetY = viewport?.offsetTop || 0;
      const below = height + offsetY - bounds.bottom - 12, above = bounds.top - offsetY - 12;
      const top = below >= popup.height || below >= above ? bounds.bottom + 10 : bounds.top - popup.height - 10;
      const next = { left: Math.max(offsetX + 12, Math.min(offsetX + width - popup.width - 12, bounds.left + bounds.width / 2 - popup.width / 2)), top: Math.max(offsetY + 12, Math.min(offsetY + height - popup.height - 12, top)), ready: true };
      setPosition(old => old.left === next.left && old.top === next.top && old.ready ? old : next);
    };
    reposition();
    const observer = new ResizeObserver(reposition); observer.observe(card.current); observer.observe(active.anchor);
    addEventListener("scroll", reposition, true); addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("resize", reposition); window.visualViewport?.addEventListener("scroll", reposition);
    return () => { observer.disconnect(); removeEventListener("scroll", reposition, true); removeEventListener("resize", reposition); window.visualViewport?.removeEventListener("resize", reposition); window.visualViewport?.removeEventListener("scroll", reposition); };
  }, [active, entity, failed, close]);
  useLayoutEffect(() => {
    if (!active?.focus) return;
    const frame = requestAnimationFrame(() => card.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [active?.id, active?.focus]);
  useEffect(() => {
    if (!active) return;
    const outside = (event: globalThis.PointerEvent) => { if (!card.current?.contains(event.target as Node) && !active.anchor.contains(event.target as Node)) close(); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (card.current?.contains(document.activeElement)) restore(active.anchor); else close(); } };
    document.addEventListener("pointerdown", outside, true); document.addEventListener("keydown", escape, true);
    return () => { document.removeEventListener("pointerdown", outside, true); document.removeEventListener("keydown", escape, true); };
  }, [active, close, restore]);
  const context = useMemo(() => ({ activeId: active?.id || null, cardId: id, data, show, leave, closeOwner }), [active?.id, id, data, show, leave, closeOwner]);
  const ref = entity || active?.entity;
  const lookupUrl = (value: MusicEntityRef) => spotifyEntityUrl(data?.entities[musicEntityKey(value.kind, value.name, value.artists)] || value);
  return <Context value={context}>{children}{active && ref && createPortal(<div ref={card} id={id} role="dialog" aria-label={`${ref.name} ${ref.kind} details`} tabIndex={-1} className="music-entity-card" data-ready={position.ready || undefined} style={{ left: position.left, top: position.top }} onPointerEnter={cancel} onPointerLeave={leave} onFocus={cancel} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) leave(); }}>
    <button type="button" className="music-entity-close" aria-label="Close music details" onClick={() => restore(active.anchor)}>×</button>
    <div className="flex items-start gap-4 pr-5">{spotifyImage(ref.image) ? <img className={`music-entity-art ${ref.kind === "artist" ? "rounded-full" : "rounded-xl"}`} src={spotifyImage(ref.image)} width="72" height="72" alt="" /> : <span className="music-entity-art music-cover rounded-xl" aria-hidden="true">{ref.name.slice(0, 1)}</span>}<div className="min-w-0"><p className="music-label">{ref.kind} · All time</p><h3 className="mt-2 font-display text-[28px] leading-none"><a href={lookupUrl(ref)} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{ref.name}<span className="sr-only"> on Spotify (opens in a new tab)</span></a></h3>{ref.artists?.length ? <p className="mt-2 text-[13px] leading-relaxed text-muted">{ref.artists.map((name, index) => <span key={name}>{index > 0 && ", "}<a href={lookupUrl({ kind: "artist", name })} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{name}</a></span>)}</p> : null}</div></div>
    {entity ? <>
      {entity.kind === "track" && entity.album && <p className="mt-4 text-[13px] text-muted">From <a className="text-ink hover:text-accent" href={lookupUrl({ kind: "album", name: entity.album, artists: entity.albumArtists })} target="_blank" rel="noopener noreferrer">{entity.album}</a></p>}
      <div className="mt-5 flex items-baseline justify-between gap-4 border-b border-line pb-4"><p className="text-[13px] text-muted">Total listens</p><p className="font-display text-[42px] leading-none tabular-nums">{number.format(entity.plays)}</p></div>
      <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-[13px]"><div><dt className="text-muted">First listened</dt><dd className="mt-1">{date(entity.firstListen)}</dd></div><div><dt className="text-muted">Last listened</dt><dd className="mt-1">{date(entity.lastListen)}</dd></div>{entity.kind !== "track" && entity.tracks > 0 && <div><dt className="text-muted">Different tracks</dt><dd className="mt-1 tabular-nums">{number.format(entity.tracks)}</dd></div>}{entity.durationKnown > 0 && <div><dt className="text-muted">Measured listening</dt><dd className="mt-1 tabular-nums">{number.format(Math.round(entity.msPlayed / 60000))} min</dd></div>}</dl>
      {entity.genres.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Genres">{entity.genres.slice(0, 5).map(genre => <span key={genre} className="rounded-full border border-line px-2 py-1 text-[11px] text-muted">{genre}</span>)}</div>}
    </> : <p role="status" className="py-6 text-[13px] text-muted">{failed ? "Listening details are unavailable. Try hovering again." : !file ? "Listening details are being updated." : data ? "No listens in the recorded history yet." : "Loading listening history…"}</p>}
    <div className="mt-5 flex items-center justify-between gap-4 border-t border-line pt-4 text-[12px]"><span className="text-muted">Recorded listening history</span><a className="text-accent underline underline-offset-4" href={lookupUrl(ref)} target="_blank" rel="noopener noreferrer">{directSpotifyUrl(ref.url, ref.kind) ? "Open in Spotify" : "Find on Spotify"} ↗<span className="sr-only"> (opens in a new tab)</span></a></div>
  </div>, document.body)}</Context>;
}

export function MusicLink({ entity, children, className = "", onCardClose }: { entity: MusicEntityRef; children?: ReactNode; className?: string; onCardClose?: () => void }) {
  const context = useContext(Context), id = useId();
  const pointer = useRef({ touch: false, wasOpen: false });
  const closeOwner = context?.closeOwner;
  useEffect(() => () => closeOwner?.(id), [closeOwner, id]);
  const details = context?.data?.entities[musicEntityKey(entity.kind, entity.name, entity.artists)];
  const active = context?.activeId === id;
  const open = (anchor: HTMLAnchorElement, delayed = false, focus = false) => context?.show({ id, entity, anchor, focus, dismissed: onCardClose }, delayed);
  return <a href={spotifyEntityUrl(details || entity)} target="_blank" rel="noopener noreferrer" className={`music-entity-link ${className}`} aria-label={`${entity.name} on Spotify (opens in a new tab)`} aria-haspopup="dialog" aria-expanded={active} aria-controls={active ? context?.cardId : undefined} onPointerEnter={event => { if (event.pointerType !== "touch") open(event.currentTarget, true); }} onPointerLeave={event => { if (event.pointerType !== "touch") context?.leave(); }} onPointerDown={event => { pointer.current = { touch: event.pointerType === "touch", wasOpen: active }; }} onFocus={event => { if (!pointer.current.touch) open(event.currentTarget); }} onBlur={() => context?.leave()} onClick={event => { if (pointer.current.touch && !pointer.current.wasOpen) { event.preventDefault(); open(event.currentTarget); } pointer.current.touch = false; }} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); event.stopPropagation(); open(event.currentTarget, false, true); } }}>
    {children || entity.name}<span className="sr-only"> on Spotify (opens in a new tab)</span>
  </a>;
}

export const isMusicCardTarget = (target: EventTarget | null) => target instanceof Element && !!target.closest(".music-entity-card");

export function MusicArtists({ names, className = "", onCardClose }: { names: string[]; className?: string; onCardClose?: () => void }) {
  return <span className={className}>{names.map((name, index) => <span key={`${name}:${index}`}>{index > 0 && ", "}<MusicLink entity={{ kind: "artist", name }} onCardClose={onCardClose}>{name}</MusicLink></span>)}</span>;
}
