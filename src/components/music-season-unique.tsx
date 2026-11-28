import type { MusicDataset, MusicSeason } from "@/lib/music/types";
import { musicSeasons } from "@/lib/music/seasons";
import { MusicLink } from "./music-entity-link";
import "./music-season-unique.css";

const notes: Record<MusicSeason, string> = {
  winter: "Cold days, warm records.",
  spring: "A little fresh air.",
  summer: "Windows down, volume up.",
  autumn: "Leaves fall. Records turn.",
};
const number = new Intl.NumberFormat("en-US");

function SeasonIcon({ season }: { season: MusicSeason }) {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {season === "winter" && <>
      <path d="M24 5v38M7.5 14.5l33 19M7.5 33.5l33-19M18 9l6 6 6-6M18 39l6-6 6 6M8 21l8-2-2-8M34 37l-2-8 8-2M8 27l8 2-2 8M34 11l-2 8 8 2" />
      <circle cx="24" cy="24" r="3" fill="var(--bg)" />
    </>}
    {season === "spring" && <>
      <path d="M24 42V25M24 33C9 35 7 23 8 18c11-1 16 4 16 15ZM24 28c0-12 8-17 17-16 0 11-7 17-17 16Z" />
      <path d="m14 25 10 8m0-5 10-9M17 43h14M10 7v6m-3-3h6" />
    </>}
    {season === "summer" && <>
      <circle cx="24" cy="24" r="12" />
      <path d="M24 3v4m0 34v4M3 24h4m34 0h4M9 9l3 3m24 24 3 3M9 39l3-3M36 12l3-3" />
      <path d="M14 21h20m-19 0 1 5h5l2-5m2 0 2 5h5l1-5M21 31q3 3 6 0" />
    </>}
    {season === "autumn" && <>
      <path d="M12 35C2 19 22 7 39 7c0 17-8 36-24 30M9 43l24-29M16 34l-1-11m8 2 10 1M23 25l-1-10" />
      <path d="m36 37 2 2m3-8 2 1" />
    </>}
  </svg>;
}

export function MusicSeasonUnique({ data, period, loading }: { data: MusicDataset | null; period: string; loading: boolean }) {
  const displayedPeriod = data?.period || period;
  const range = displayedPeriod === "all" ? "All time" : displayedPeriod === "365d" ? "Last year" : displayedPeriod === "30d" ? "Last 30 days" : displayedPeriod;
  return <section className="music-season-unique" data-analytics-view="season_unique" data-analytics-period={displayedPeriod} data-analytics-metric="artists" aria-labelledby="season-unique-title" aria-busy={loading}>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><p className="music-label">A change in the air</p><h2 id="season-unique-title" className="mt-2 font-display text-[clamp(36px,4vw,48px)] leading-none">Season <em className="text-accent">unique.</em></h2></div>
      <p className="text-[14px] text-muted">{range}</p>
    </div>
    <p className="mb-6 max-w-[72ch] text-[14px] leading-relaxed text-muted">Five favorites for each season, beyond my all-time top five artists. Winter starts in December of the previous year.</p>
    <div className="music-season-grid">
      {musicSeasons.map(({ key, name, months }, index) => {
        const season = data?.stats.seasonUnique?.find(season => season.season === key);
        const status = displayedPeriod === "30d" ? "not_applicable" : season?.status;
        const disabled = status !== "ready";
        const message = status === "not_applicable" ? "Seasons need a little more time." : status === "incomplete" ? `${name} is still in the making.` : "Seasonal history is being updated.";
        const help = status === "not_applicable" ? "Choose Last year, All time, or a year." : status === "incomplete" ? `Available when ${name.toLowerCase()} ends.` : "Check back after the next collection update.";
        return <article key={`${key}:${disabled}`} className="music-season-card panel" data-season={key} data-disabled={disabled || undefined} aria-labelledby={`season-${key}-title`} aria-describedby={disabled ? `season-${key}-status` : undefined} aria-disabled={disabled || undefined} data-analytics-chart={!disabled ? "season_unique" : undefined} data-analytics-bucket={key} data-analytics-item-group={key}>
          <header className="music-season-header">
            <div><p className="music-season-months">{months}</p><h3 id={`season-${key}-title`} className="font-display text-[34px] leading-none">{name}</h3></div>
            <span className="music-season-icon"><SeasonIcon season={key} /></span>
          </header>
          <p className="music-season-note">{notes[key]}</p>
          <div className="music-season-table-wrap">
            {disabled ? <>
              <div className="music-season-placeholder" inert aria-hidden="true">
                <div className="music-season-placeholder-head"><span>Artist</span><span>Plays</span></div>
                {Array.from({ length: 5 }, (_, row) => <div className="music-season-placeholder-row" key={row}><span>{String(row + 1).padStart(2, "0")}</span><i style={{ width: `${48 + (row * 17 + index * 11) % 40}%` }} /><i /></div>)}
              </div>
              <div className="music-season-status" id={`season-${key}-status`}><p>{message}</p><p>{help}</p></div>
            </> : <table className="music-season-table">
              <caption className="sr-only">{name} artists, {range}, excluding my all-time top five</caption>
              <colgroup><col style={{ width: 26 }} /><col /><col style={{ width: 54 }} /></colgroup>
              <thead><tr><th scope="col" colSpan={2}>Artist</th><th scope="col">Plays</th></tr></thead>
              <tbody>{season!.artists.map((artist, rank) => <tr key={artist.key} data-analytics-item-rank={rank + 1}>
                <td className="music-season-rank">{String(rank + 1).padStart(2, "0")}</td>
                <th scope="row"><MusicLink entity={{ kind: "artist", name: artist.name, url: artist.url, image: artist.image }} className="block truncate">{artist.name}</MusicLink></th>
                <td className="music-season-plays">{number.format(artist.plays)}</td>
              </tr>)}{!season!.artists.length && <tr><td colSpan={3} className="music-season-empty">No recorded favorites this season yet.</td></tr>}</tbody>
            </table>}
          </div>
          <span className="music-season-flourish" aria-hidden="true" />
        </article>;
      })}
    </div>
  </section>;
}
