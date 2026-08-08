/*
 * Stamps the stylesheet and the script with a hash of their own contents.
 *
 * GitHub Pages serves every file with `Cache-Control: max-age=600` and the
 * filenames never change, so for ten minutes after a deploy a returning
 * visitor keeps the old CSS and the old JavaScript. That is long enough for a
 * fix to look like it did not work, which is exactly what happened while the
 * header behaviour was being sorted out.
 *
 * A content hash in the query string gives each version its own URL. Nothing
 * changes when the file does not, so this is a no-op on most runs.
 */

import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const PAGE = "docs/index.html";
const ASSETS = ["style.css", "app.js"];

const hashOf = async (file) =>
  createHash("sha256")
    .update(await readFile(`docs/${file}`))
    .digest("hex")
    .slice(0, 8);

const before = await readFile(PAGE, "utf8");
let after = before;

for (const asset of ASSETS) {
  const hash = await hashOf(asset);
  // Matches the plain path and any previously stamped one.
  const pattern = new RegExp(`(["'])/${asset.replace(".", "\\.")}(\\?v=[a-f0-9]+)?\\1`, "g");
  after = after.replace(pattern, `$1/${asset}?v=${hash}$1`);
}

if (after === before) {
  console.log("Assets already stamped with their current contents.");
  process.exit(0);
}

await writeFile(PAGE, after);
console.log("Stamped " + ASSETS.join(" and ") + " with fresh content hashes.");
