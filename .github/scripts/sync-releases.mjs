/*
 * Writes the recent release notes into the published page.
 *
 * Same reasoning as sync-reviews.mjs: baked into the HTML rather than fetched
 * in the browser, so a crawler that does not run JavaScript reads what changed
 * in each version. "What's new" is one of the things people and answer engines
 * actually search for by version number, and it is worth having in the source.
 *
 * The release notes on GitHub are the only copy. Nothing is written by hand
 * here and nothing is summarised: whatever is in the release body is what shows
 * on the page, minus the install command, which the hero already carries.
 *
 * Run by .github/workflows/publish-version.yml when a release is published or
 * edited, and once a day so an edit made outside those events still lands.
 */

import { readFile, writeFile } from "node:fs/promises";

const PAGE = "docs/index.html";
const SITEMAP = "docs/sitemap.xml";
const OWNER = "rmehdee";
const REPO = "auramux-releases";

// Four fits the tab row on a phone without wrapping. Older notes are a click
// away on GitHub, which is where the complete history belongs.
const SHOWN = 4;

/*
 * A long release would push the reviews and the FAQ off the bottom of the page.
 * If one ever runs past this, the panel stops at a whole block and the link
 * below it says so rather than quietly ending mid-thought.
 */
const MAX_BLOCKS = 16;

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

const releases = (await res.json())
  .filter((r) => !r.draft && !r.prerelease)
  // A tag that is not a version number is not something to show as one.
  .filter((r) => /^v?\d+\.\d+\.\d+$/.test(r.tag_name ?? ""))
  .filter((r) => (r.body ?? "").trim())
  .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
  .slice(0, SHOWN)
  .map((r) => ({
    version: r.tag_name.replace(/^v/, ""),
    at: r.published_at,
    url: r.html_url,
    body: r.body,
  }));

/* ---------- markdown, only as much as the notes use ---------- */

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/*
 * Inline spans. Code is lifted out first and put back last, so a `**` or an
 * underscore inside a command is left alone instead of being read as emphasis.
 *
 * The placeholder is fenced with a private-use character rather than something
 * prose might contain by itself. A bare number would not do: "autosaves every
 * 20 seconds" would come back as a code span pointing at nothing.
 */
const MARK = "\uE000";

const inline = (text) => {
  const code = [];
  let out = String(text).replace(/`([^`]+)`/g, (_, body) => {
    code.push(body);
    return `${MARK}${code.length - 1}${MARK}`;
  });

  // Everything below runs on already-escaped text, so nothing here escapes a
  // second time. Doing so would turn an "&" in a URL into "&amp;amp;".
  out = esc(out)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, label, href) => {
      // Only http(s), and always off-site, so target and rel are safe to
      // hard-code. Anything else stays the literal text it was written as.
      return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  return out.replace(
    new RegExp(`${MARK}(\\d+)${MARK}`, "g"),
    (_, i) => `<code>${esc(code[i])}</code>`,
  );
};

/*
 * Release bodies are headings, paragraphs and bullet lists. That is the whole
 * grammar, and anything richer would be a sign the notes are trying to do too
 * much. Fenced code is dropped rather than rendered: the only thing ever fenced
 * in these notes is the install command, which is already at the top of the
 * page in a form you can copy.
 */
const blocksOf = (body) => {
  const lines = String(body).replace(/\r/g, "").split("\n");
  const blocks = [];

  let paragraph = [];
  let list = null;
  let fenced = false;

  const endParagraph = () => {
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join(" ") });
    paragraph = [];
  };
  const endList = () => {
    if (list?.length) blocks.push({ type: "ul", items: list });
    list = null;
  };
  const endBoth = () => {
    endParagraph();
    endList();
  };

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      endBoth();
      continue;
    }
    if (fenced) continue;

    if (!line.trim()) {
      endBoth();
      continue;
    }

    const heading = line.match(/^\s*#{2,4}\s+(.*)$/);
    if (heading) {
      endBoth();
      blocks.push({ type: "h", text: heading[1].trim() });
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      endParagraph();
      list = list ?? [];
      list.push(bullet[1].trim());
      continue;
    }

    // A wrapped continuation of the bullet above, not a new paragraph.
    if (list) {
      list[list.length - 1] += ` ${line.trim()}`;
      continue;
    }

    paragraph.push(line.trim());
  }

  endBoth();
  return blocks;
};

/*
 * Two things in the notes are for somebody reading them on GitHub and would be
 * noise here: the heading that repeats what this section is already called, and
 * the sign-off telling you how to update, which the hero says better.
 */
const isRedundant = (block) => {
  if (block.type === "h") return /^what'?s new$/i.test(block.text);
  if (block.type === "p") {
    return /^update\s*[—–-]/i.test(block.text) || /install\.sh/.test(block.text);
  }
  return false;
};

const render = (body) => {
  const all = blocksOf(body).filter((b) => !isRedundant(b));
  const blocks = all.slice(0, MAX_BLOCKS);
  const cut = blocks.length < all.length;

  const html = blocks
    .map((block) => {
      if (block.type === "h") {
        return `              <h4>${inline(block.text)}</h4>`;
      }
      if (block.type === "ul") {
        return `              <ul>\n${block.items
          .map((item) => `                <li>${inline(item)}</li>`)
          .join("\n")}\n              </ul>`;
      }
      return `              <p>${inline(block.text)}</p>`;
    })
    .join("\n");

  return { html, cut };
};

/* ---------- the panel ---------- */

const when = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Used for ids, so it has to survive being put in a selector.
const slug = (version) => version.replace(/\./g, "-");

const panels = releases.map((release) => {
  const { html, cut } = render(release.body);
  const id = slug(release.version);

  return `
        <article class="rel" id="rel-${id}">
          <h3 class="rel-v">${esc(release.version)}</h3>
          <p class="rel-meta">
            <time datetime="${release.at.slice(0, 10)}">${when(release.at)}</time>
          </p>

          <div class="rel-body">
${html}
          </div>

          <p class="rel-more">
            <a href="${esc(release.url)}" target="_blank" rel="noopener"
              >${cut ? "The rest of" : "All of"} the ${esc(release.version)} notes on GitHub &rarr;</a
            >
          </p>
        </article>`;
});

const tabs = releases
  .map(
    (release) => `          <button class="rel-tab" type="button" data-rel="${slug(
      release.version,
    )}">${esc(release.version)}</button>`,
  )
  .join("\n");

/*
 * The tab strip ships hidden and the panels ship stacked, in full. That is the
 * page with JavaScript off, and it is a complete changelog rather than a broken
 * tab control. app.js unhides the strip, adds the tab roles and closes all but
 * one. Nothing here depends on that happening.
 */
const html = releases.length
  ? `
        <div class="rel-tablist" id="rel-tablist" aria-label="Releases" hidden>
${tabs}
        </div>
${panels.join("\n")}
`
  : "";

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

const before = await readFile(PAGE, "utf8");
const after = between(before, "whats-new", html);

/*
 * The page now changes every time a release goes out, so a lastmod written by
 * hand months ago is a claim that is no longer true. The newest release date is
 * the honest answer: it is the day the content actually changed.
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
