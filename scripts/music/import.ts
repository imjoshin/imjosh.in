import { readFile, readdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { basename, join } from "node:path";
import { Unzip, UnzipInflate, UnzipPassThrough, strFromU8, type AsyncFlateStreamHandler } from "fflate";
import { parse } from "csv-parse/sync";
import { spotifyListen, googleListen, googleLibraryTrack, digest } from "../../src/lib/music/normalize.ts";
import { archiveFile, readJson, saveListens, writeJson, type MusicStore } from "./store.ts";
import type { Listen, MusicTrack } from "../../src/lib/music/types.ts";

async function zipMetadata(filename: string): Promise<Record<string, Uint8Array>> {
  const files: Record<string, Uint8Array> = {}, pending = new Set<string>();
  const unzip = new Unzip(file => {
    if (!/\.(json|csv)$/i.test(file.name)) {
      // Start a discard decoder so fflate doesn't buffer every skipped audio entry.
      class Discard { static compression = file.compression; ondata: AsyncFlateStreamHandler = () => {}; push(_: Uint8Array, final: boolean) { this.ondata(null, new Uint8Array(), final); } }
      unzip.register(Discard); file.ondata = () => {}; file.start(); return;
    }
    unzip.register(UnzipInflate); unzip.register(UnzipPassThrough);
    pending.add(file.name); const chunks: Uint8Array[] = [];
    file.ondata = (error, chunk, final) => { if (error) throw error; if (chunk) chunks.push(chunk); if (final) { files[file.name] = Buffer.concat(chunks); pending.delete(file.name); } };
    file.start();
  });
  unzip.register(UnzipInflate);
  for await (const chunk of createReadStream(filename)) unzip.push(chunk, false);
  unzip.push(new Uint8Array(), true);
  if (pending.size) throw new Error("ZIP metadata is incomplete. Wait for the archive to finish downloading.");
  return files;
}

export async function importMusic(store: MusicStore, filename: string): Promise<{ files: number; listens: number; retained: number; rejected: number }> {
  const rawRef = await archiveFile(store, filename, basename(filename));
  const files = /\.zip$/i.test(filename) ? await zipMetadata(filename) : { [basename(filename)]: await readFile(filename) };
  const events: Listen[] = [];
  const googleCatalog = await readJson<Record<string, MusicTrack>>(store, "catalog/google-tracks.json.gz") || {};
  let libraryTracks = 0;
  let retained = 0, rejected = 0;
  const errors: { file: string; error: string }[] = [];
  for (const [name, data] of Object.entries(files)) {
    if (!/\.(json|csv)$/i.test(name)) continue;
    try {
      const text = strFromU8(data).replace(/^\uFEFF/, "");
      const value = /\.csv$/i.test(name) ? parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true }) : JSON.parse(text);
      const rows: Record<string, any>[] = Array.isArray(value) ? value : Array.isArray(value.items) ? value.items : [];
      retained += rows.length;
      for (const row of rows) {
        const reference = `${rawRef}#${name}`;
        const listen = (row.ts || row.endTime || row.played_at) ? spotifyListen(row, reference) : googleListen(row, reference, name);
        if (listen) events.push(listen);
        const track = googleLibraryTrack(row, name);
        if (track) { googleCatalog[track.platformId || track.key] = track; libraryTracks++; }
      }
      // Library, playlists, genre fields, and records that are not listening events remain available.
      await writeJson(store, `imports/${digest(`${rawRef}#${name}`)}.json.gz`, { filename: name, rawRef, data: value });
    } catch (error) { rejected++; errors.push({ file: name, error: error instanceof Error ? error.message : "Could not parse file" }); }
  }
  await saveListens(store, events);
  if (libraryTracks) await writeJson(store, "catalog/google-tracks.json.gz", googleCatalog);
  const result = { files: Object.keys(files).length, listens: events.length, retained, rejected };
  await writeJson(store, `imports/reports/${digest(rawRef)}.json`, { ...result, rawRef, errors, importedAt: new Date().toISOString() });
  return result;
}

export async function importDirectory(store: MusicStore, dir: string): Promise<{ filename: string; files: number; listens: number; retained: number; rejected: number }[]> {
  const results = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...await importDirectory(store, path));
    else if (/\.(json|csv|zip)$/i.test(entry.name)) results.push({ filename: path, ...await importMusic(store, path) });
  }
  return results;
}
