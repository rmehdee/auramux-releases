/*
 * Stamps the stylesheet and the scripts with a hash of their own contents.
 *
 * GitHub Pages serves every file with `Cache-Control: max-age=600` and the
 * filenames never change, so for ten minutes after a deploy a returning
 * visitor keeps the old CSS and the old JavaScript. That is long enough for a
 * fix to look like it did not work, which is exactly what happened while the
 * header behaviour was being sorted out.
 *
 * A content hash in the query string gives each version its own URL. Nothing
 * changes when the file does not, so this is a no-op on most runs.
 *
 * Two files are stamped in two different places. style.css and app.js are
 * referenced from index.html. release-notes.mjs is imported by app.js, so its
 * hash is written into app.js instead, and that has to happen first: changing
 * app.js changes app.js's own hash, and index.html has to end up with the
 * later one.
 */

import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const PAGE = "docs/index.html";
const SCRIPT = "docs/app.js";
const IN_PAGE = ["style.css", "app.js"];
const IN_SCRIPT = ["release-notes.mjs"];

const hashOf = async (file) =>
  createHash("sha256")
    .update(await readFile(`docs/${file}`))
    .digest("hex")
    .slice(0, 8);

// Matches the plain path and any previously stamped one.
const stamp = async (source, asset) => {
  const hash = await hashOf(asset);
  const pattern = new RegExp(
    `(["'])/${asset.replace(".", "\\.")}(\\?v=[a-f0-9]+)?\\1`,
    "g",
  );
  return source.replace(pattern, `$1/${asset}?v=${hash}$1`);
};

let changed = [];

/* ---------- what app.js imports ---------- */

const scriptBefore = await readFile(SCRIPT, "utf8");
let scriptAfter = scriptBefore;
for (const asset of IN_SCRIPT) scriptAfter = await stamp(scriptAfter, asset);

if (scriptAfter !== scriptBefore) {
  await writeFile(SCRIPT, scriptAfter);
  changed = changed.concat(IN_SCRIPT);
}

/* ---------- what the page references ---------- */

const pageBefore = await readFile(PAGE, "utf8");
let pageAfter = pageBefore;
for (const asset of IN_PAGE) pageAfter = await stamp(pageAfter, asset);

if (pageAfter !== pageBefore) {
  await writeFile(PAGE, pageAfter);
  changed = changed.concat(IN_PAGE);
}

console.log(
  changed.length
    ? `Stamped ${changed.join(", ")} with fresh content hashes.`
    : "Assets already stamped with their current contents.",
);
