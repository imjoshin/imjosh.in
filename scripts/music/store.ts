import { readFile, writeFile, mkdir, readdir, rename, copyFile, stat, rm } from "node:fs/promises";
import { createReadStream, createWriteStream, openAsBlob } from "node:fs";
import { createHash } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { resolve, dirname, relative, join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { getStore } from "@netlify/blobs";
import { digest, deduplicate } from "../../src/lib/music/normalize.ts";
import type { Listen } from "../../src/lib/music/types.ts";

export interface MusicStore {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, value: Uint8Array): Promise<void>;
  list(prefix: string): Promise<string[]>;
  acquireLock?(key: string, leaseMs: number): Promise<(() => Promise<void>) | null>;
  filePath?(key: string): string;
  setFile?(key: string, filename: string): Promise<void>;
  getStream?(key: string): Promise<ReadableStream<Uint8Array> | null>;
  setStream?(key: string, stream: ReadableStream<Uint8Array>, checksum?: string): Promise<void>;
}
export const PRIVATE_STORE = "music-private-v1";
export const PUBLIC_STORE = "music-public-v1";
export function localStore(root = resolve(".music")): MusicStore {
  const path = (key: string) => { const target = resolve(root, key); const rel = relative(root, target); if (!rel || rel.startsWith("..") || /^[A-Za-z]:/.test(rel)) throw new Error("Invalid music storage key"); return target; };
  return {
    filePath: path,
    async setFile(key, filename) { const target = path(key); await mkdir(dirname(target), { recursive: true }); const temp = `${target}.${process.pid}.tmp`; await copyFile(filename, temp); await rename(temp, target); },
    async getStream(key) { try { await stat(path(key)); return Readable.toWeb(createReadStream(path(key))) as ReadableStream<Uint8Array>; } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; } },
    async setStream(key, stream, checksum) {
      const target = path(key); await mkdir(dirname(target), { recursive: true }); const temp = `${target}.${process.pid}.tmp`, hash = createHash("sha256");
      try { await pipeline(Readable.fromWeb(stream as any), new Transform({ transform(chunk, _, callback) { hash.update(chunk); callback(null, chunk); } }), createWriteStream(temp)); if (checksum && hash.digest("hex") !== checksum) throw new Error(`Archive checksum failed: ${key}`); await rename(temp, target); }
      catch (error) { await rm(temp, { force: true }); throw error; }
    },
    async get(key) { try { return await readFile(path(key)); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; } },
    async set(key, value) { const target = path(key); await mkdir(dirname(target), { recursive: true }); const temp = `${target}.${process.pid}.tmp`; await writeFile(temp, value); await rename(temp, target); },
    async list(prefix) { const keys: string[] = []; const walk = async (dir: string) => { for (const entry of await readdir(dir, { withFileTypes: true }).catch((e: NodeJS.ErrnoException) => { if (e.code === "ENOENT") return []; throw e; })) { const full = join(dir, entry.name); if (entry.isDirectory()) await walk(full); else { const key = relative(root, full).replaceAll("\\", "/"); if (key.startsWith(prefix) && !key.endsWith(".tmp")) keys.push(key); } } }; await walk(root); return keys.sort(); },
  };
}
export function blobStore(name: string, credentials?: { siteID: string; token: string }): MusicStore {
  const store = getStore({ name, ...credentials, consistency: "strong" });
  return {
    async acquireLock(key, leaseMs) {
      const prior = await store.getWithMetadata(key, { type: "json" });
      if (prior && (prior.data as { expiresAt: number }).expiresAt > Date.now()) return null;
      const claim = await store.setJSON(key, { expiresAt: Date.now() + leaseMs }, prior?.etag ? { onlyIfMatch: prior.etag } : { onlyIfNew: true });
      if (!claim.modified) return null;
      return async () => { if (claim.etag) await store.setJSON(key, { expiresAt: 0 }, { onlyIfMatch: claim.etag }); };
    },
    async setFile(key, filename) { await store.set(key, await openAsBlob(filename)); },
    async getStream(key) { return await store.get(key, { type: "stream" }) as ReadableStream<Uint8Array> | null; },
    async get(key) { const data = await store.get(key, { type: "arrayBuffer" }); return data ? new Uint8Array(data) : null; },
    async set(key, value) { const body = value.byteOffset === 0 && value.byteLength === value.buffer.byteLength ? value.buffer : value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength); await store.set(key, body as ArrayBuffer); },
    async list(prefix) { const result = await store.list({ prefix }); return result.blobs.map(b => b.key).sort(); },
  };
}
export async function readJson<T>(store: MusicStore, key: string): Promise<T | null> {
  const bytes = await store.get(key); if (!bytes) return null;
  return JSON.parse(Buffer.from(key.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8")) as T;
}
export async function writeJson(store: MusicStore, key: string, data: unknown) {
  const bytes = Buffer.from(JSON.stringify(data)); await store.set(key, key.endsWith(".gz") ? gzipSync(bytes) : bytes);
}
export async function archive(store: MusicStore, name: string, bytes: Uint8Array): Promise<string> {
  const key = `raw/${digest(bytes)}/${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  if (!await store.get(key)) await store.set(key, bytes);
  return key;
}
export async function fileDigest(filename: string) {
  const hash = createHash("sha256"); for await (const chunk of createReadStream(filename)) hash.update(chunk); return hash.digest("hex");
}
export async function archiveFile(store: MusicStore, filename: string, name: string): Promise<string> {
  const hash = await fileDigest(filename), key = `raw/${hash}/${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  if (!(await store.list(`raw/${hash}/`)).includes(key)) {
    if (store.setFile) await store.setFile(key, filename); else await store.set(key, await readFile(filename));
  }
  return key;
}
export async function saveListens(store: MusicStore, rows: Listen[]) {
  const partitions = new Map<string, Listen[]>();
  for (const row of rows) { const key = `listens/${row.platform}/${row.playedAt.slice(0, 7)}.json.gz`; const part = partitions.get(key) || []; part.push(row); partitions.set(key, part); }
  for (const [key, values] of partitions) await writeJson(store, key, deduplicate([...(await readJson<Listen[]>(store, key) || []), ...values]));
}
export async function allListens(store: MusicStore): Promise<Listen[]> {
  const rows: Listen[] = [];
  for (const key of await store.list("listens/")) rows.push(...await readJson<Listen[]>(store, key) || []);
  return deduplicate(rows);
}
