import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { artistGenreKey, normalizeArtistGenres, parseArtistGenreCatalog, resolveArtistGenres, type ArtistGenreCatalog, type ArtistGenreEntry } from "../src/lib/music/artist-genres.ts";
import { discoverGenreArtists, generateArtistGenres, genrePrompt, parseGenreClassification, parseGenreOptions, pendingGenreArtists, pullArtistGenreInputs, seedArtistGenres, type GenreCandidate } from "../scripts/music/artist-genres.ts";
import { readJson, saveListens, writeJson, type MusicStore } from "../scripts/music/store.ts";
import { spotifyListen } from "../src/lib/music/normalize.ts";
import { publishMusic } from "../scripts/music/publish.ts";
import type { MusicDataset, MusicEntityDataset, SpotifySnapshot } from "../src/lib/music/types.ts";

const memory = (): MusicStore => {
  const data = new Map<string, Uint8Array>();
  return { async get(key) { return data.get(key) || null; }, async set(key, value) { data.set(key, value); }, async list(prefix) { return [...data.keys()].filter(key => key.startsWith(prefix)); } };
};
const now = new Date("2026-11-26T20:00:00Z");
const entry = (name: string, genres: string[], source: ArtistGenreEntry["source"] = "codex"): ArtistGenreEntry => ({ name, genres, source, spotifyArtistId: null, updatedAt: source ? now.toISOString() : null });
const candidate = (name: string): GenreCandidate => ({ name, key: artistGenreKey(name), spotifyArtistId: "spotify-id", examples: [{ title: "Song", album: "Album" }], plays: 30, yearPlays: 2 });
const event = (name: string, id = name) => ({ ...spotifyListen({ ts: now.toISOString(), master_metadata_track_name: "Song", master_metadata_album_artist_name: name }, "PRIVATE-RAW")!, id });

test("committed genres win, Spotify fills missing labels, and unknowns stay unknown", () => {
  const catalog: ArtistGenreCatalog = { version: 1, artists: { artist: entry("Artist", ["synthpop", "indietronica"]), unknown: entry("Unknown", [], null) } };
  const before = JSON.stringify(catalog);
  assert.deepEqual(resolveArtistGenres({ artist: { genres: ["pop"] } }, catalog).artist.genres, ["synthpop", "indietronica"]);
  assert.deepEqual(resolveArtistGenres({ " ARTIST ": { genres: [] } }, catalog).artist.genres, ["synthpop", "indietronica"]);
  assert.deepEqual(resolveArtistGenres({}, catalog).artist.genres, ["synthpop", "indietronica"]);
  assert.deepEqual(resolveArtistGenres({ unknown: { genres: ["rock"] }, absent: { genres: ["pop"] } }, catalog).unknown.genres, ["rock"]);
  assert.deepEqual(resolveArtistGenres({ absent: { genres: ["pop"] } }, catalog).absent.genres, ["pop"]);
  assert.equal(resolveArtistGenres({}, catalog).unknown, undefined);
  assert.equal(JSON.stringify(catalog), before);
  assert.throws(() => parseArtistGenreCatalog({ version: 1, artists: { bad: { ...entry("Different", []), genres: "pop" } } }), /Invalid artist/);
});

test("genre rules remove Christmas labels, separate christian styles, and fold worship/ccm into christian", () => {
  assert.deepEqual(normalizeArtistGenres(["Christmas", "christmas jazz", "christian alternative rock", "christian", "pop worship", "worship", "CHRISTIAN WORSHIP", "indie pop"]), ["christian", "alternative rock", "pop", "indie pop"]);
  assert.deepEqual(normalizeArtistGenres(["country christian", "christian hip hop", "praise & worship", "christian & worship"]), ["christian", "country", "hip hop", "praise"]);
  assert.deepEqual(normalizeArtistGenres(["lo-fi worship"]), ["lo-fi", "christian"]);
  assert.deepEqual(normalizeArtistGenres(["worship"]), ["christian"]);
  assert.deepEqual(normalizeArtistGenres(["ccm"]), ["christian"]);
  assert.deepEqual(normalizeArtistGenres(["CCM", "worship", "christian", "lo-fi worship", "ccm pop"]), ["christian", "lo-fi", "pop"]);
  const once = normalizeArtistGenres(["Christian Rock", "christian", "worship pop"]);
  assert.deepEqual(normalizeArtistGenres(once), once);
  const catalog: ArtistGenreCatalog = { version: 1, artists: { artist: entry("Artist", ["christmas"]) } };
  assert.deepEqual(resolveArtistGenres({ artist: { genres: ["christian rock"] } }, catalog).artist.genres, ["christian", "rock"]);
  assert.deepEqual(resolveArtistGenres({ artist: { genres: ["ccm", "pop worship"] } }, catalog).artist.genres, ["christian", "pop"]);
});

test("discovery seeds Spotify metadata and preserves generated and manually unresolved entries", async () => {
  const store = memory();
  const spotify = { artist: { genres: [], artistId: "id", provider: "spotify", fetchedAt: now.toISOString() }, known: { genres: ["rock"], artistId: "known-id", provider: "spotify", fetchedAt: now.toISOString() } };
  await writeJson(store, "catalog/genres.json", spotify);
  await writeJson(store, "catalog/spotify-tracks.json.gz", { song: { name: "Song", artists: [{ name: "Artist", id: "id" }] } });
  await saveListens(store, [...["Artist", "Export Only", "Known"].flatMap(name => Array.from({ length: 26 }, (_, i) => event(name, `${name}-${i}`))), { ...event("Private"), privateSession: true }]);
  const { candidates } = await discoverGenreArtists(store, now);
  assert.ok(candidates.some(c => c.name === "Export Only"));
  assert.equal(candidates.some(c => c.name === "Private"), false);
  assert.equal(candidates.find(c => c.name === "Artist")?.yearPlays, 26);
  const catalog: ArtistGenreCatalog = { version: 1, artists: { artist: entry("Artist", ["synthpop"]), manual: entry("Manual", [], "manual") } };
  candidates.push(candidate("Manual"));
  seedArtistGenres(catalog, candidates, spotify);
  assert.deepEqual(catalog.artists.artist.genres, ["synthpop"]);
  assert.deepEqual(catalog.artists.known.genres, ["rock"]);
  assert.equal(catalog.artists["export only"].source, null);
  assert.equal(catalog.artists.manual.source, "manual");
  catalog.artists.artist.genres = ["dance-pop", "neo-soul"];
  seedArtistGenres(catalog, candidates, { ...spotify, known: { ...spotify.known, genres: ["dance pop", "neo soul"] } });
  assert.deepEqual(catalog.artists.artist.genres, ["dance pop", "neo soul"]);
  assert.equal(JSON.stringify(catalog).includes("PRIVATE-RAW"), false);
  assert.equal(JSON.stringify(catalog).includes("yearPlays"), false);
  assert.equal(JSON.stringify(catalog).includes('"examples"'), false);
});

test("queue prioritizes this year, skips known and attempted unknown artists, and allows explicit retries", () => {
  const a = { ...candidate("A"), plays: 100, yearPlays: 0 }, b = candidate("B"), c = candidate("C"), d = candidate("D");
  const catalog: ArtistGenreCatalog = { version: 1, artists: { a: entry("A", [], null), b: entry("B", [], null), c: entry("C", []), d: entry("D", [], "manual") } };
  const options = { artists: [], retryUnknown: false, limit: 25 };
  assert.deepEqual(pendingGenreArtists(catalog, [a, b, c, d], {}, options).map(a => a.name), ["B", "A"]);
  assert.deepEqual(pendingGenreArtists(catalog, [a, b, c], { b: { genres: ["pop"], provider: "spotify", artistId: null, fetchedAt: now.toISOString() } }, { ...options, retryUnknown: true }).map(a => a.name), ["C", "A"]);
  assert.throws(() => pendingGenreArtists(catalog, [a], {}, { ...options, artists: ["missing"] }), /not found/);
});

test("Codex generation requires strictly more than 25 cumulative listens, even for explicitly selected artists", () => {
  const atCutoff = { ...candidate("At cutoff"), plays: 25, yearPlays: 25 };
  const eligible = { ...candidate("Eligible"), plays: 26, yearPlays: 0 };
  const catalog: ArtistGenreCatalog = { version: 1, artists: { "at cutoff": entry("At cutoff", [], null), eligible: entry("Eligible", [], null) } };
  const options = { artists: [], retryUnknown: true, limit: Infinity };
  assert.deepEqual(pendingGenreArtists(catalog, [atCutoff, eligible], {}, options).map(a => a.name), ["Eligible"]);
  assert.deepEqual(pendingGenreArtists(catalog, [atCutoff, eligible], {}, { ...options, artists: ["at cutoff"] }), []);
  assert.equal(catalog.artists["at cutoff"].source, null);
  seedArtistGenres(catalog, [atCutoff, eligible], {});
  assert.equal(catalog.artists["at cutoff"], undefined);
  assert.equal(catalog.artists.eligible.source, null);
});

test("one-genre artists are queued even with Spotify tags, with an expansion-only mode", () => {
  const one = candidate("One"), missing = candidate("Missing"), many = candidate("Many");
  const catalog: ArtistGenreCatalog = { version: 1, artists: { one: entry("One", ["synthpop"], "spotify"), missing: entry("Missing", [], null), many: entry("Many", ["pop", "rock"]) } };
  const spotify = { one: { genres: ["synthpop"], provider: "spotify", artistId: null, fetchedAt: now.toISOString() } };
  const options = { artists: [], retryUnknown: false, limit: Infinity };
  assert.deepEqual(pendingGenreArtists(catalog, [one, missing, many], spotify, options).map(a => a.name), ["Missing", "One"]);
  const queue = pendingGenreArtists(catalog, [one, missing, many], spotify, { ...options, expandSingles: true });
  assert.deepEqual(queue.map(a => a.name), ["One"]);
  assert.deepEqual(queue[0].existingGenres, ["synthpop"]);
  assert.deepEqual(pendingGenreArtists(catalog, [{ ...one, plays: 25 }], spotify, { ...options, expandSingles: true }), []);
});

test("Codex responses must identify the artist and contain 2-5 distinct raw genres or an explained unknown", () => {
  const artist = candidate("Artist"), valid = { artist: "Artist", genres: ["Synthpop", "pop", "SYNTHPOP"], note: "Broad classification.", sources: [] };
  assert.deepEqual(parseGenreClassification(valid, artist).genres, ["synthpop", "pop"]);
  assert.deepEqual(parseGenreClassification({ ...valid, genres: ["rock", "pop"] }, artist).genres, ["rock", "pop"]);
  assert.equal(parseGenreClassification({ ...valid, genres: ["rock", "pop", "indie pop", "synthpop", "electropop"] }, artist).genres.length, 5);
  assert.deepEqual(parseGenreClassification({ ...valid, genres: [], note: "Artist identity is uncertain" }, artist).genres, []);
  assert.throws(() => parseGenreClassification({ ...valid, artist: "Artist (stage name)" }, artist), /artist name must match Artist/);
  assert.throws(() => parseGenreClassification({ ...valid, note: "x".repeat(1501) }, artist), /note must be a string of at most 1500/);
  assert.throws(() => parseGenreClassification({ ...valid, sources: ["spotify:artist:id"] }, artist), /HTTP\(S\) URLs/);
  for (const genres of [["pop"], ["POP", "pop"]]) assert.throws(() => parseGenreClassification({ ...valid, genres }, artist), /2-5 distinct genres/);
  const expansion = { ...artist, existingGenres: ["synthpop"] };
  assert.deepEqual(parseGenreClassification({ ...valid, genres: ["pop"] }, expansion).genres, ["pop"]);
  assert.throws(() => parseGenreClassification({ ...valid, genres: ["pop", "rock", "folk"] }, expansion), /at most 2/);
  assert.match(genrePrompt(expansion), /1-2 additional/);
  for (const change of [{ artist: "Someone Else" }, { genres: Array(6).fill("pop") }, { genres: [""] }, { genres: [], note: "" }, { sources: ["invented-url"] }]) assert.throws(() => parseGenreClassification({ ...valid, ...change }, artist), /Invalid|explain/);
  const prompt = genrePrompt(artist);
  assert.ok(prompt.includes("spotify-id")); assert.ok(prompt.includes("Song"));
  assert.equal(prompt.includes('"plays"'), false); assert.equal(prompt.includes('"yearPlays"'), false);
  for (const args of [["--limit", "0"], ["--limit", "NaN"], ["--artist"], ["--prod"], ["--effort", "unknown"]]) assert.throws(() => parseGenreOptions(args));
  assert.equal(parseGenreOptions(["--limit", "all"]).limit, Infinity);
  assert.equal(parseGenreOptions([]).model, "gpt-6.1-terra");
  assert.equal(parseGenreOptions([]).effort, "medium");
  assert.equal(parseGenreOptions(["--effort", "high"]).effort, "high");
});

test("raw Codex genres pass through shared rules before checkpointing, and interrupted runs resume", async () => {
  const dir = await mkdtemp(join(tmpdir(), "imjosh-genre-test-")), path = join(dir, "artist_genres.json");
  try {
    await writeFile(path, JSON.stringify({ version: 1, artists: {} }));
    const store = memory(), options = parseGenreOptions(["--no-pull", "--limit", "all"]);
    await writeJson(store, "catalog/genres.json", Object.fromEntries(["a", "b", "c"].map(name => [name, { genres: [], provider: "spotify", artistId: null, fetchedAt: now.toISOString() }])));
    await saveListens(store, ["a", "b", "c"].flatMap(name => Array.from({ length: 26 }, (_, i) => event(name, `${name}-${i}`))));
    await assert.rejects(generateArtistGenres(store, options, async artist => {
      if (artist.key === "b") throw new Error("connection lost");
      return { artist: artist.name, genres: ["Christmas", "lo-fi worship", "ccm", "christian alternative rock", "alternative rock"], note: "Classified", sources: [] };
    }, path), /connection lost/);
    const saved = JSON.parse(await readFile(path, "utf8"));
    assert.equal(saved.artists.a.source, "codex"); assert.equal(saved.artists.b.source, null);
    assert.equal(saved.artists.a.model, "gpt-6.1-terra");
    assert.equal(saved.artists.a.reasoningEffort, "medium");
    assert.deepEqual(saved.artists.a.genres, ["lo-fi", "christian", "alternative rock"]);
    const visited: string[] = [];
    await generateArtistGenres(store, options, async artist => {
      visited.push(artist.key);
      return { artist: artist.name, genres: artist.key === "b" ? [] : ["ccm", "worship"], note: artist.key === "b" ? "Uncertain identity" : "Classified", sources: [] };
    }, path);
    assert.deepEqual(visited, ["b", "c"]);
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")).artists.c.genres, ["christian"]);
    await generateArtistGenres(store, options, async artist => {
      assert.equal(artist.key, "c"); assert.deepEqual(artist.existingGenres, ["christian"]);
      return { artist: artist.name, genres: ["pop"], note: "Additional style", sources: [] };
    }, path);
    await generateArtistGenres(store, options, async () => { throw new Error("should not repeat"); }, path);
    await writeFile(`${path}.lock`, "active");
    await assert.rejects(generateArtistGenres(store, options, undefined, path), /Another genre run/);
    assert.equal(await readFile(`${path}.lock`, "utf8"), "active");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("expansion preserves original genre and provenance, appends at most two normalized additions, and checkpoints no-op results", async () => {
  const dir = await mkdtemp(join(tmpdir(), "imjosh-genre-expansion-")), path = join(dir, "artist_genres.json");
  try {
    const a = entry("A", ["christian"], "spotify"), b = entry("B", ["synthpop"], "spotify");
    const catalog: ArtistGenreCatalog = { version: 1, artists: { a, b } };
    await writeFile(path, JSON.stringify(catalog));
    const store = memory(), options = parseGenreOptions(["--no-pull", "--expand-singles", "--limit", "all"]);
    const spotify = { a: { genres: ["christian"], provider: "spotify", artistId: null, fetchedAt: now.toISOString() }, b: { genres: ["synthpop"], provider: "spotify", artistId: null, fetchedAt: now.toISOString() } };
    await writeJson(store, "catalog/genres.json", spotify);
    await saveListens(store, ["A", "B"].flatMap(name => Array.from({ length: 26 }, (_, i) => event(name, `${name}-${i}`))));
    const result = await generateArtistGenres(store, options, async artist => ({ artist: artist.name, genres: artist.key === "a" ? ["christian hip hop", "lo-fi worship"] : ["synth-pop", "synth pop"], note: "Suggested additional styles", sources: [] }), path);
    assert.deepEqual(result.artists.a.genres, ["christian", "hip hop", "lo-fi"]);
    assert.equal(result.artists.a.source, "spotify"); assert.equal(result.artists.a.updatedAt, a.updatedAt);
    assert.deepEqual(result.artists.a.genreExpansion?.originalGenres, ["christian"]);
    assert.deepEqual(result.artists.a.genreExpansion?.addedGenres, ["hip hop", "lo-fi"]);
    assert.equal(result.artists.a.genreExpansion?.model, "gpt-6.1-terra");
    assert.equal(result.artists.a.genreExpansion?.reasoningEffort, "medium");
    assert.deepEqual(result.artists.b.genres, ["synthpop"]);
    assert.deepEqual(result.artists.b.genreExpansion?.addedGenres, []);
    assert.match(result.artists.b.genreExpansion!.note, /No distinct additions/);
    const { candidates } = await discoverGenreArtists(store, now);
    seedArtistGenres(result, candidates, { ...spotify, a: { ...spotify.a, genres: ["gospel"] } });
    assert.deepEqual(result.artists.a.genres, ["christian", "hip hop", "lo-fi"]);
    assert.deepEqual(pendingGenreArtists(result, candidates, spotify, options), []);
    assert.deepEqual(pendingGenreArtists(result, candidates, spotify, { ...options, retryUnknown: true }).map(a => a.name), ["B"]);
    await generateArtistGenres(store, options, async () => { throw new Error("should not repeat"); }, path);
    assert.throws(() => parseArtistGenreCatalog({ version: 1, artists: { a: { ...a, genreExpansion: { ...result.artists.a.genreExpansion, addedGenres: ["one", "two", "three"] } } } }), /Invalid artist genre expansion/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("targeted pull merges listening history without copying raw files, secrets, or curated metadata", async () => {
  const source = memory(), target = memory();
  await saveListens(source, [event("Artist", "new")]); await saveListens(target, [event("Artist", "local")]);
  await writeJson(source, "catalog/genres.json", {});
  await writeJson(target, "catalog/genres.json", { local: { genres: ["pop"] } });
  for (const key of ["raw/secret.zip", "secrets/spotify.json", "catalog/artist_genres.json", "public/spotify.json"]) await writeJson(source, key, { secret: true });
  await pullArtistGenreInputs(source, target);
  const rows = await readJson<unknown[]>(target, "listens/spotify/2026-11.json.gz"); assert.equal(rows?.length, 2);
  assert.deepEqual(await readJson(target, "catalog/genres.json"), { local: { genres: ["pop"] } });
  for (const key of ["raw/secret.zip", "secrets/spotify.json", "catalog/artist_genres.json", "public/spotify.json"]) assert.equal(await target.get(key), null);
});

test("scheduled publication uses committed genres everywhere, falls back to Spotify, and retains private kids records", async () => {
  const privateStore = memory(), publicStore = memory(), row = event("Artist");
  await saveListens(privateStore, Array.from({ length: 12 }, (_, i) => ({ ...row, id: String(i) })));
  await writeJson(privateStore, "catalog/genres.json", { artist: { genres: [], provider: "spotify", artistId: null, fetchedAt: now.toISOString() } });
  await writeJson(privateStore, "public/spotify.json", { generatedAt: now.toISOString(), ranges: { short_term: { tracks: [{ key: "song", name: "Song", artists: ["Artist"] }], artists: [{ key: "artist", name: "Artist", artists: [] }] } }, playlists: [] });
  const catalog: ArtistGenreCatalog = { version: 1, artists: { artist: entry("Artist", ["indie pop", "synthpop"]) } };
  const first = await publishMusic(privateStore, publicStore, now, catalog);
  const stats = await readJson<MusicDataset>(publicStore, first.manifest.files["all/2026"]);
  assert.equal(stats?.stats.genreUnknown, 0);
  const entities = await readJson<MusicEntityDataset>(publicStore, first.manifest.files.entities);
  assert.deepEqual(Object.values(entities!.entities).find(e => e.kind === "track")?.genres, ["indie pop", "synthpop"]);
  const soundtrack = await readJson<{ metrics: { genres: { series: { name: string }[] } } }>(publicStore, first.manifest.files["all/soundtrack/all"]);
  assert.ok(soundtrack?.metrics.genres.series.some(s => s.name === "synthpop"));
  assert.ok(Object.keys(first.manifest.files).some(key => key.startsWith("all/soundtrack/all/genre/")));
  catalog.artists.artist.genres = ["children's music"];
  const filtered = await publishMusic(privateStore, publicStore, now, catalog);
  assert.equal((await readJson<MusicDataset>(publicStore, filtered.manifest.files["all/all"]))?.stats.plays, 0);
  assert.deepEqual((await readJson<SpotifySnapshot>(publicStore, filtered.manifest.files.spotify))?.ranges.short_term, { tracks: [], artists: [] });
  assert.equal((await readJson<unknown[]>(privateStore, "listens/spotify/2026-11.json.gz"))?.length, 12);
  await writeJson(privateStore, "catalog/genres.json", { artist: { genres: ["rock"], provider: "spotify", artistId: null, fetchedAt: now.toISOString() } });
  const stillFiltered = await publishMusic(privateStore, publicStore, now, catalog);
  assert.equal((await readJson<MusicDataset>(publicStore, stillFiltered.manifest.files["all/all"]))?.stats.plays, 0);
  catalog.artists.artist.genres = [];
  const provider = await publishMusic(privateStore, publicStore, now, catalog);
  assert.equal((await readJson<MusicDataset>(publicStore, provider.manifest.files["all/all"]))?.stats.plays, 12);
  const providerEntities = await readJson<MusicEntityDataset>(publicStore, provider.manifest.files.entities);
  assert.deepEqual(Object.values(providerEntities!.entities).find(e => e.kind === "track")?.genres, ["rock"]);
});
