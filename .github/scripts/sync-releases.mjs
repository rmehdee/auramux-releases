/*
 * Writes the recent release notes into the published page.
 *
 * Same reasoning as sync-reviews.mjs: baked into the HTML rather than left to
 * the browser, so a crawler that does not run JavaScript reads what changed in
 * each version. "What's new" is one of the things people and answer engines
 * actually search for by version number, and it is worth having in the source.
 *
 * The release notes on GitHub are the only copy. Nothing is written by hand
 * here and nothing is summarised: whatever is in the release body is what shows
 * on the page, minus the install command, which the hero already carries.
 *
 * The rendering itself lives in docs/release-notes.mjs, because app.js renders
 * the same notes in the browser to cover the ten minutes GitHub Pages spends
 * serving the previous HTML from its cache. One renderer, so the published page
 * and the corrected one cannot disagree.
 *
 * Run by .github/workflows/publish-version.yml when a release is published or
 * edited, and once a day so an edit made outside those events still lands.
 */

import { readFile, writeFile } from "node:fs/promises";
import { pickReleases, renderSection } from "../../docs/release-notes.mjs";

const PAGE = "docs/index.html";
const SITEMAP = "docs/sitemap.xml";
const OWNER = "rmehdee";
const REPO = "auramux-releases";

/* ---------- what GitHub says ---------- */

const headers = { Accept: "application/vnd.github+json" };
// Optional. Anonymous requests work, but in Actions the token raises the rate
// limit from 60 an hour per IP to 1000, and the runner's IP is shared.
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

const res = await fetch(
  `https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=30`,
  { headers },
);
// Fail the run rather than continue. Carrying on from here would write an empty
// section over notes that are perfectly good.
if (!res.ok) throw new Error(`GitHub answered ${res.status}`);

const releases = pickReleases(await res.json());

/* ---------- write it in ---------- */

const between = (source, marker, replacement) => {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const from = source.indexOf(start);
  const to = source.indexOf(end);
  if (from === -1 || to === -1) {
    throw new Error(`Markers for "${marker}" are missing from ${PAGE}.`);
  }
  return source.slice(0, from + start.length) + replacement + source.slice(to);
};

const section = renderSection(releases);
const before = await readFile(PAGE, "utf8");
const after = between(before, "whats-new", section ? `\n      ${section}\n` : "");

/*
 * The page changes every time a release goes out, so a lastmod written by hand
 * months ago is a claim that is no longer true. The newest release date is the
 * honest answer: it is the day the content actually changed.
 */
if (releases.length) {
  const sitemap = await readFile(SITEMAP, "utf8");
  const stamped = sitemap.replace(
    /<lastmod>[^<]*<\/lastmod>/,
    `<lastmod>${releases[0].at.slice(0, 10)}</lastmod>`,
  );
  if (stamped !== sitemap) {
    await writeFile(SITEMAP, stamped);
    console.log(`Dated the sitemap ${releases[0].at.slice(0, 10)}.`);
  }
}

if (after === before) {
  console.log(`No change. ${releases.length} release notes already published.`);
  process.exit(0);
}

await writeFile(PAGE, after);
console.log(
  releases.length
    ? `Published notes for ${releases.map((r) => r.version).join(", ")}.`
    : "No published releases with notes. The section stays empty.",
);
