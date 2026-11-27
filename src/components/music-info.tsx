"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./music-info.css";

function Icon({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{children}</svg>;
}

function SpotifyMark() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="12" /><g fill="none" stroke="var(--bg)" strokeLinecap="round"><path d="M5.5 8.8c4.8-1.4 9.1-1 13 1" strokeWidth="1.9" /><path d="M6.4 12.2c3.9-1.1 7.6-.7 11 1" strokeWidth="1.6" /><path d="M7.2 15.4c3.2-.8 6.3-.5 9.1.9" strokeWidth="1.4" /></g></svg>;
}

function GoogleMusicMark() {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M7 4v24l21-12L7 4Z" fill="#f9ab00" /><path d="m7 4 13 12L7 28V4Z" fill="#ea4335" /><path d="M20 10v11.2a3.3 3.3 0 1 1-2-3V12l-5 1.4v9.8a3.3 3.3 0 1 1-2-3V12l9-2Z" fill="var(--bg)" /></svg>;
}

function YouTubeMusicMark() {
  return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="#f03" /><circle cx="16" cy="16" r="10" stroke="white" strokeWidth="1.5" /><path d="m13 10 9 6-9 6V10Z" fill="white" /></svg>;
}

function DataFlow() {
  return <figure className="music-info-flow" aria-label="Spotify sends its historical archive and new plays to a listening collection, which powers this page. Google Play Music and YouTube Music history are pending.">
    <div className="music-info-sources">
      <div className="music-info-source music-info-source-spotify"><span className="music-info-service"><SpotifyMark /></span><div><p>Spotify</p><span>Archive + new plays</span></div><span className="music-info-connected">Connected</span></div>
      <div className="music-info-source music-info-source-google"><div className="music-info-google-marks"><GoogleMusicMark /><YouTubeMusicMark /></div><div><p>Google Play Music<br />YouTube Music</p><span>History pending</span></div></div>
    </div>
    <div className="music-info-flow-lines" aria-hidden="true"><svg viewBox="0 0 70 150" preserveAspectRatio="none"><path className="music-info-flow-active" d="M0 37H20Q35 37 35 52V60Q35 75 50 75H70" /><path className="music-info-flow-pending" d="M0 118H20Q35 118 35 103V90Q35 75 50 75H70" /></svg><span /></div>
    <div className="music-info-archive"><div className="music-info-orbit" aria-hidden="true"><span /><Icon><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" /></Icon></div><p>One collection</p><span>History, brought together</span></div>
    <div className="music-info-output-line" aria-hidden="true"><span /></div>
    <div className="music-info-output"><div className="music-info-mini-chart" aria-hidden="true">{[28, 46, 36, 65, 51, 78, 64, 90, 74].map((height, i) => <span key={i} style={{ height: `${height}%` }} />)}</div><p>My <em>music.</em></p><span>Your view into my listening</span></div>
    <figcaption className="sr-only">Solid lines show the connected Spotify flow. The dashed line represents Google history that has not arrived yet.</figcaption>
  </figure>;
}

function MusicInfoContent({ titleId, descriptionId }: { titleId: string; descriptionId: string }) {
  return <>
    <header className="music-info-heading">
      <p className="music-info-eyebrow">Behind the music</p>
      <h2 id={titleId}>From a play<br className="music-info-title-break" /> to a <em>pattern.</em></h2>
      <p id={descriptionId}>Part time capsule, part living record. Here’s how my listening becomes the page you’re looking at.</p>
    </header>

    <DataFlow />

    <section className="music-info-cadence" aria-label="How often the page updates">
      <div className="music-info-refresh"><div className="music-info-refresh-top"><Icon><path d="M3 12h4l3-8 4 16 3-8h4" /></Icon><span>Fresh from Spotify</span></div><p className="music-info-interval">1 <span>minute</span></p><h3>What’s playing, what just played.</h3><p>Now Playing and the latest tracks are checked every minute.</p></div>
      <div className="music-info-refresh"><div className="music-info-refresh-top"><Icon><path d="M4 19V9m8 10V4m8 15v-7" /></Icon><span>The bigger picture</span></div><p className="music-info-interval">10 <span>minutes</span></p><h3>New listens become new patterns.</h3><p>Listening totals, charts, and rankings refresh every ten minutes.</p></div>
    </section>
    <p className="music-info-daily"><Icon><path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5m-4 8a8 8 0 0 0 14 3l3-3m0 5v-5h-5" /></Icon>Spotify’s favorites and library refresh daily.</p>

    <section className="music-info-history" aria-labelledby={`${titleId}-history`}>
      <h3 id={`${titleId}-history`} className="music-info-eyebrow">A little history about the history</h3>
      <div className="music-info-history-grid">
        <div className="music-info-history-item"><span className="music-info-history-icon"><Icon><path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5" /></Icon></span><div><p className="music-info-history-label">The starting point</p><h4><time dateTime="2026-11-26">November 26, 2026</time></h4><p>One Spotify Extended Streaming History export, downloaded on this date, supplied the archive. New Spotify listens keep it growing automatically.</p></div></div>
        <div className="music-info-history-item music-info-history-pending"><span className="music-info-history-icon"><Icon><path d="M8 3h8M8 21h8M8 3v4l8 10v4M16 3v4L8 17v4" /></Icon></span><div><p className="music-info-history-label">Still filling in the gaps</p><h4>Waiting on Google</h4><p>I’m waiting on a Google export to fill the missing Google Play Music and YouTube Music history. Those blank stretches don’t necessarily mean I wasn’t listening.</p></div></div>
      </div>
    </section>

    <footer className="music-info-footer"><Icon><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></Icon><p>A window into the music. Original records and account details stay private; this page shares summaries and selected music details.</p></footer>
  </>;
}

export function MusicHeading() {
  const dialog = useRef<HTMLDialogElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const backdropDown = useRef(false);
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    element.showModal();
    scroll.current?.scrollTo({ top: 0, behavior: "instant" });
    root.style.overflow = "hidden";
    return () => { element.close(); root.style.overflow = previousOverflow; };
  }, [open]);

  return <div className="music-title-row">
    <h1 className="page-title">For the <span className="whitespace-nowrap"><em className="text-accent">record</em><button type="button" className="music-info-trigger" aria-label="How this music page works" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => setOpen(true)}><Icon><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.01" /></Icon></button></span></h1>
    <dialog ref={dialog} id={id} className="music-info-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onClose={() => setOpen(false)} onPointerDown={event => { backdropDown.current = event.target === event.currentTarget; }} onClick={event => { if (backdropDown.current && event.target === event.currentTarget) dialog.current?.close(); }}>
      <button type="button" className="music-info-close" aria-label="Close music information" autoFocus onClick={() => dialog.current?.close()}><Icon><path d="m6 6 12 12M6 18 18 6" /></Icon></button>
      <div ref={scroll} className="music-info-scroll"><MusicInfoContent titleId={`${id}-title`} descriptionId={`${id}-description`} /></div>
    </dialog>
    <noscript><style>{".music-info-trigger { display: none; }"}</style><details className="music-info-fallback"><summary>How this page works</summary><p>Spotify’s historical archive was downloaded on November 26, 2026. New Spotify activity is checked every minute; listening totals, charts, and rankings refresh every ten minutes. Favorites and library refresh daily. A Google export is still pending for the missing Google Play Music and YouTube Music history. Original records and account details stay private.</p></details></noscript>
  </div>;
}
