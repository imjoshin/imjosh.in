import { readFile, mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { homedir } from "node:os";
import { randomBytes } from "node:crypto";
import { localStore, blobStore, PRIVATE_STORE, PUBLIC_STORE, readJson, writeJson, fileDigest, type MusicStore } from "./music/store.ts";
import { importMusic, importDirectory } from "./music/import.ts";
import { authorizeSpotify } from "./music/auth.ts";
import { collectSpotify } from "./music/spotify.ts";
import { publishMusic } from "./music/publish.ts";
import type { MusicManifest } from "../src/lib/music/types.ts";
import type { Listen } from "../src/lib/music/types.ts";
import { deduplicate, digest } from "../src/lib/music/normalize.ts";
import { generateArtistGenres, parseGenreOptions, pullArtistGenreInputs } from "./music/artist-genres.ts";

const args = process.argv.slice(2), command = args.shift();
const flag = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const local = localStore(), localPublic = localStore(resolve(".music/public"));
async function production() {
  const state = JSON.parse(await readFile(resolve(".netlify/state.json"), "utf8"));
  let token = process.env.NETLIFY_AUTH_TOKEN;
  if (!token) {
    const configPath = process.platform === "win32" ? join(process.env.APPDATA || join(homedir(), "AppData/Roaming"), "netlify/Config/config.json") : join(homedir(), ".config/netlify/config.json");
    const config = JSON.parse(await readFile(configPath, "utf8"));
    token = config.users?.[config.userId]?.auth?.token;
  }
  if (!token || !state.siteId) throw new Error("Run npx netlify login and link this checkout to the existing site first.");
  const credentials = { siteID: state.siteId as string, token };
  return { privateStore: blobStore(PRIVATE_STORE, credentials), publicStore: blobStore(PUBLIC_STORE, credentials) };
}
async function copyStore(source: MusicStore, target: MusicStore, prefix = "", skipSecrets = true, merge = false) {
  let count = 0;
  const keys = (await source.list(prefix)).filter(key => !skipSecrets || /^(raw|imports|listens|catalog|snapshots|state|public)\//.test(key));
  const existingRaw = new Set(keys.some(key => key.startsWith("raw/")) ? await target.list("raw/") : []);
  for (let i = 0; i < keys.length; i += 4) {
    await Promise.all(keys.slice(i, i + 4).map(async key => {
      if (merge && key.startsWith("state/")) return;
      if (merge && key.startsWith("listens/")) {
        const a = await readJson<Listen[]>(source, key) || [], b = await readJson<Listen[]>(target, key) || [];
        await writeJson(target, key, deduplicate([...b, ...a])); count++; return;
      }
      if (merge && (key === "catalog/genres.json" || key === "catalog/spotify-tracks.json.gz" || key === "catalog/google-tracks.json.gz" || key === "catalog/excluded-imports.json")) {
        await writeJson(target, key, { ...await readJson<Record<string, unknown>>(target, key), ...await readJson<Record<string, unknown>>(source, key) }); count++; return;
      }
      if (key.startsWith("raw/") && existingRaw.has(key)) return;
      if (key.startsWith("raw/") && source.filePath && target.setFile) {
        if (await fileDigest(source.filePath(key)) !== key.split("/")[1]) throw new Error(`Archive checksum failed: ${key}`);
        await target.setFile(key, source.filePath(key)); count++; return;
      }
      if (key.startsWith("raw/") && source.getStream && target.setStream) {
        const stream = await source.getStream(key); if (stream) { await target.setStream(key, stream, key.split("/")[1]); count++; } return;
      }
      const bytes = await source.get(key);
      if (bytes) {
        if (key.startsWith("raw/") && digest(bytes) !== key.split("/")[1]) throw new Error(`Archive checksum failed: ${key}`);
        await target.set(key, bytes); count++;
      }
    }));
  }
  return count;
}
async function browserFiles() {
  const targetRoot = resolve("public/music"), target = localStore(targetRoot);
  const manifest = await readJson<MusicManifest>(localPublic, "manifest.json"); if (!manifest) return;
  const files = new Set(Object.values(manifest.files));
  for (const file of files) { const bytes = await localPublic.get(file); if (!bytes) throw new Error(`Missing local summary: ${file}`); await target.set(file, bytes); }
  await writeJson(target, "manifest.json", manifest);
  // Remove only obsolete generated payloads from the public mirror, never private originals.
  const datasetRoot = join(targetRoot, "datasets");
  for (const entry of await readdir(datasetRoot, { withFileTypes: true }).catch(() => [])) {
    if (entry.isFile() && /^[a-f0-9]{24}\.json$/.test(entry.name) && !files.has(`datasets/${entry.name}`)) await rm(join(datasetRoot, entry.name));
  }
}
try {
  switch (command) {
    case "auth": await authorizeSpotify(local, flag("--client-id") || ""); break;
    case "import": {
      const path = args.find(a => !a.startsWith("--")); if (!path) throw new Error("Usage: npm run music:import -- path/to/export.zip [--directory]");
      console.log(args.includes("--directory") ? await importDirectory(local, path) : await importMusic(local, path));
      console.log(await publishMusic(local, localPublic)); await browserFiles(); break;
    }
    case "sync": {
      const stores = args.includes("--prod") ? await production() : { privateStore: local, publicStore: localPublic };
      console.log(await collectSpotify(stores.privateStore, !args.includes("--recent"), 10000, args.includes("--backfill")));
      const result = await publishMusic(stores.privateStore, stores.publicStore); console.log({ listens: result.listens, datasets: result.datasets });
      if (!args.includes("--prod")) await browserFiles(); break;
    }
    case "aggregate": { const stores = args.includes("--prod") ? await production() : { privateStore: local, publicStore: localPublic }; const result = await publishMusic(stores.privateStore, stores.publicStore); console.log({ listens: result.listens, datasets: result.datasets }); if (!args.includes("--prod")) await browserFiles(); break; }
    case "genres": {
      if (args.includes("--help")) {
        console.log("Usage: npm run music:genres -- [--limit 25|all] [--artist NAME] [--no-pull] [--dry-run] [--discover-only] [--retry-unknown] [--expand-singles] [--model MODEL] [--effort LEVEL] [--codex-bin PATH]\nPulls current production Spotify inputs, asks Codex for 2-5 genres when missing or 1-2 additions when only one is saved, then normalizes and checkpoints each result. --expand-singles targets only the one-genre pass. Original genres and provenance are preserved; additions have separate Codex metadata. Uses your saved Codex login. Default: gpt-6.1-terra, medium effort, at most 25 artists with more than 25 cumulative listens, ranked by this year's plays then all-time plays. Repeat --artist for multiple artists. No automatic Git commits, production writes, or deployment.");
        break;
      }
      const options = parseGenreOptions(args);
      if (!options.noPull) console.log(`Pulled ${await pullArtistGenreInputs((await production()).privateStore, local)} Spotify input objects.`);
      const catalog = await generateArtistGenres(local, options);
      if (!options.dryRun && !options.discoverOnly) {
        const result = await publishMusic(local, localPublic, new Date(), catalog); await browserFiles();
        console.log(`Updated local summaries (${result.datasets} datasets). Review and commit content/artist_genres.json to release the artist genre catalog.`);
      }
      break;
    }
    case "pull": {
      const prod = await production();
      const manifest = await readJson<MusicManifest>(prod.publicStore, "manifest.json");
      if (!manifest) throw new Error("Production has no music manifest yet. Import or sync, then run music:push.");
      // Stats by default. --all also downloads the complete private archive, excluding credentials.
      for (const file of Object.values(manifest.files)) { const bytes = await prod.publicStore.get(file); if (!bytes) throw new Error(`Production dataset is missing: ${file}`); await localPublic.set(file, bytes); }
      await writeJson(localPublic, "manifest.json", manifest);
      const count = args.includes("--all") ? await copyStore(prod.privateStore, local) : 0;
      await browserFiles(); console.log(`Pulled ${Object.keys(manifest.files).length} public datasets and ${count} private objects.`); break;
    }
    case "push": {
      const prod = await production();
      // Preserve production token rotation. Credentials move only with the explicit bootstrap flag.
      const count = await copyStore(local, prod.privateStore, "", true, true);
      if (args.includes("--credentials")) { const bytes = await local.get("secrets/spotify.json"); if (!bytes) throw new Error("Connect Spotify first"); await prod.privateStore.set("secrets/spotify.json", bytes); }
      const result = await publishMusic(prod.privateStore, prod.publicStore); console.log({ uploaded: count, listens: result.listens, datasets: result.datasets }); break;
    }
    case "prepare": {
      if (!await localPublic.get("manifest.json")) {
        try {
          const origin = "https://imjosh.in/api/music";
          const response = await fetch(origin, { signal: AbortSignal.timeout(15000) });
          if (!response.ok) throw new Error("Production summaries not available yet");
          const manifest = await response.json() as MusicManifest;
          if (manifest.version !== 1 || !manifest.files) throw new Error("Unsupported public music manifest");
          for (const file of Object.values(manifest.files)) {
            if (!/^datasets\/[a-f0-9]{24}\.json$/.test(file)) throw new Error("Invalid public dataset filename");
            const data = await fetch(`${origin}?file=${encodeURIComponent(file)}`, { signal: AbortSignal.timeout(15000) });
            if (!data.ok) throw new Error("Production dataset not available");
            await localPublic.set(file, new Uint8Array(await data.arrayBuffer()));
          }
          await writeJson(localPublic, "manifest.json", manifest);
        } catch { await publishMusic(local, localPublic); }
      }
      await browserFiles(); break;
    }
    case "status": {
      const stores = args.includes("--prod") ? await production() : { privateStore: local, publicStore: localPublic };
      const manifest = await readJson<MusicManifest>(stores.publicStore, "manifest.json");
      console.log({ rawObjects: (await stores.privateStore.list("raw/")).length, listeningPartitions: (await stores.privateStore.list("listens/")).length, generatedAt: manifest?.generatedAt || null, datasets: Object.keys(manifest?.files || {}).length, lastJob: await readJson(stores.privateStore, "state/job.json") }); break;
    }
    case "job-key": {
      const path = resolve(".music/job.env"); await mkdir(dirname(path), { recursive: true });
      await writeFile(path, `MUSIC_JOB_SECRET=${randomBytes(32).toString("hex")}\n`, { flag: "wx" });
      console.log("Saved private job key to .music/job.env. Import with netlify env:import; never commit this file."); break;
    }
    default: console.log("Music commands: auth, import, sync, genres [--help], aggregate, pull [--all], push [--credentials], prepare, job-key");
  }
} catch (error) { console.error(error instanceof Error ? error.message : "Music command failed"); process.exitCode = 1; }
