import { copyFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

// Next.js currently leaves Windows path separators in nested RSC segment names.
// Publish the flat filenames its browser router requests, just as Linux builds do.
const root = resolve("out");
async function flattenSegments(directory, destination) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await flattenSegments(path, destination);
    else {
      const filename = relative(destination, path).replaceAll(/[\\/]/g, ".");
      await copyFile(path, join(destination, filename));
    }
  }
}

async function normalize(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(directory, entry.name);
    if (entry.name.startsWith("__next.")) await flattenSegments(path, directory);
    else if (entry.name !== "_next") await normalize(path);
  }
}

await normalize(root);
