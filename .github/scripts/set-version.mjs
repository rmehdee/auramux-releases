/*
 * Writes the released version into the published page.
 *
 * app.js already corrects the version in the browser, but the value sitting in
 * the HTML source is what a crawler that does not run JavaScript sees, and what
 * shows on the first paint before the fetch returns. This keeps that value
 * true so neither ever goes stale.
 *
 * Run by .github/workflows/publish-version.yml on release. Takes the tag as an
 * argument, or asks GitHub for the latest release when run by hand.
 */

import { readFile, writeFile } from "node:fs/promises";

const PAGE = "docs/index.html";

async function resolveVersion() {
  const fromArg = process.argv[2];
  if (fromArg) return fromArg;

  const res = await fetch(
    "https://api.github.com/repos/rmehdee/auramux-releases/releases/latest",
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  return (await res.json()).tag_name;
}

const raw = await resolveVersion();
const version = String(raw).trim().replace(/^v/, "");

// A malformed tag must not be written into the page. Better to fail the run.
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Refusing to publish "${raw}": not a version number.`);
  process.exit(1);
}

const before = await readFile(PAGE, "utf8");

const after = before
  // The pill in the header.
  .replace(
    /(id="version-pill">)v[\d.]+( &middot; beta<)/,
    `$1v${version}$2`,
  )
  // The same number in the structured data, which is what answer engines read.
  .replace(
    /("softwareVersion":\s*")[\d.]+(")/,
    `$1${version}$2`,
  );

if (after === before) {
  console.log(`Already at ${version}. Nothing to write.`);
  process.exit(0);
}

await writeFile(PAGE, after);
console.log(`Wrote ${version} into ${PAGE}.`);
