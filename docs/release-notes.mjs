/*
 * Turns GitHub release notes into the markup for the What's new section.
 *
 * This file is used from two places, and that is the whole point of it being a
 * file rather than part of either one:
 *
 *   .github/scripts/sync-releases.mjs imports it in Actions and writes the
 *   result into index.html, so the notes are in the HTML source for anyone
 *   reading the page without JavaScript, and for anything crawling it.
 *
 *   app.js imports it in the browser and renders the same markup from the
 *   GitHub API. GitHub Pages serves the HTML with max-age=600, so for up to
 *   ten minutes after a release the page a visitor is handed still has the
 *   previous notes in it. The version pill has always corrected itself this
 *   way; the notes do it now too, and would otherwise sit there contradicting
 *   the pill right above them.
 *
 * One renderer, so the two can never drift into showing different things. If
 * you change how a release is rendered, both follow.
 *
 * It is an ES module so Node can import it directly. The browser loads it with
 * a dynamic import, and treats a failure as "keep what was published", so the
 * page is never worse off than the HTML it arrived as.
 */

/*
 * Four fits the tab row on a phone without wrapping. Older notes are a click
 * away on GitHub, which is where the complete history belongs.
 */
export const SHOWN = 4;

/*
 * A long release would push the reviews and the FAQ off the bottom of the page.
 * If one ever runs past this, the panel stops at a whole block and the link
 * below it says so rather than quietly ending mid-thought.
 */
const MAX_BLOCKS = 16;

/* ---------- which releases ---------- */

/*
 * Takes the array the releases API returns and gives back only what the page
 * shows, newest first. Kept here rather than in the caller so the browser and
 * Actions agree on which four releases those are, not just how to draw them.
 */
export const pickReleases = (list) =>
  (Array.isArray(list) ? list : [])
    // A prerelease is not what the site should be advertising, and a draft is
    // not public at all.
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
// Written with fromCharCode so the character itself never has to survive a
// copy, paste or an editor that helpfully normalises it away.
const MARK = String.fromCharCode(0xe000);

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
 * Release bodies are headings, paragraphs, bullet lists and fenced code. That
 * is the whole grammar, and anything richer would be a sign the notes are
 * trying to do too much.
 */
const blocksOf = (body) => {
  const lines = String(body).replace(/\r/g, "").split("\n");
  const blocks = [];

  let paragraph = [];
  let list = null;
  let fence = null;

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
      if (fence) {
        blocks.push({ type: "pre", text: fence.join("\n") });
        fence = null;
      } else {
        endBoth();
        // The opening line may carry a language hint. Nothing here highlights,
        // so it is the fence itself that matters, not what it claims to be.
        fence = [];
      }
      continue;
    }
    // Every line inside the fence is content, including the blank ones and
    // anything that would otherwise look like a heading or a bullet.
    if (fence) {
      fence.push(line);
      continue;
    }

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

  // A fence nobody closed. Keep what is in it rather than losing the block.
  if (fence && fence.length) blocks.push({ type: "pre", text: fence.join("\n") });

  endBoth();
  return blocks;
};

/*
 * One thing in the notes is for somebody reading them on GitHub and is noise
 * here: the heading that repeats what this section is already called.
 *
 * There used to be two more rules, dropping the sign-off that tells you how to
 * update and the command under it. Both matched on how the sentence happened to
 * be worded, so rewording the notes silently broke them: 1.7.1 said "Update by
 * pasting this into any terminal:" where 1.6.0 had said "Update — paste into
 * any terminal:", and the page kept the sentence while still dropping the
 * command it introduced. A colon pointing at nothing. The command is rendered
 * now, which is both more useful and one less thing to get wrong.
 */
const isRedundant = (block) => block.type === "h" && /^what'?s new$/i.test(block.text);

const renderBody = (body) => {
  const all = blocksOf(body).filter((b) => !isRedundant(b));
  const blocks = all.slice(0, MAX_BLOCKS);
  const cut = blocks.length < all.length;

  const html = blocks
    .map((block) => {
      if (block.type === "h") {
        return `              <h4>${inline(block.text)}</h4>`;
      }
      if (block.type === "pre") {
        // esc, not inline. Everything in here is meant literally.
        return `              <pre><code>${esc(block.text)}</code></pre>`;
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

/* ---------- the section ---------- */

/*
 * Forced to en-GB rather than the reader's locale. Actions and the browser have
 * to produce the same string, or every visitor outside the UK would see the
 * date flip the moment the script re-rendered a section that was already right.
 */
const when = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// Used for ids, so it has to survive being put in a selector.
const slug = (version) => version.replace(/\./g, "-");

/*
 * The tab strip is written hidden and the panels are written stacked, in full.
 * That is the page with JavaScript off, and it is a complete changelog rather
 * than a tab control that cannot be operated. app.js unhides the strip, adds
 * the tab roles and closes all but one.
 *
 * Returns a single element so the browser has one thing to swap. Empty string
 * if there is nothing to show, which leaves the section quietly blank rather
 * than announcing that it has no content.
 */
export const renderSection = (releases) => {
  if (!releases.length) return "";

  const tabs = releases
    .map(
      (release) => `          <button class="rel-tab" type="button" data-rel="${slug(
        release.version,
      )}">${esc(release.version)}</button>`,
    )
    .join("\n");

  const panels = releases.map((release) => {
    const { html, cut } = renderBody(release.body);

    return `
        <article class="rel" id="rel-${slug(release.version)}">
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

  return `<div class="rel-tabs" id="rel-tabs">
        <div class="rel-tablist" id="rel-tablist" aria-label="Releases" hidden>
${tabs}
        </div>
${panels.join("\n")}
      </div>`;
};
