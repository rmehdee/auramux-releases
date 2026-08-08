/*
 * Writes the reviews from GitHub Discussions into the published page.
 *
 * Why baked in rather than fetched: the Discussions API needs a token, so a
 * browser cannot read it, and even if it could, anything arriving by fetch is
 * invisible to a crawler that does not run JavaScript. Ratings are exactly the
 * kind of thing that should be in the HTML source. So this runs in Actions,
 * where a token exists, and rewrites index.html between markers.
 *
 * Every review here is a real GitHub account with a real profile behind it.
 * Nothing is seeded, and if there are no reviews the section stays hidden
 * rather than showing a zero.
 */

import { readFile, writeFile } from "node:fs/promises";

const PAGE = "docs/index.html";
const OWNER = "rmehdee";
const REPO = "auramux-releases";
const CATEGORY = "Reviews";
const MAX_SHOWN = 24;

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("GITHUB_TOKEN is required.");
  process.exit(1);
}

async function graphql(query, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors));
  return body.data;
}

const data = await graphql(
  `
    query ($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        discussions(
          first: 100
          orderBy: { field: CREATED_AT, direction: DESC }
        ) {
          nodes {
            number
            title
            body
            createdAt
            url
            isAnswered
            category { name }
            author { login url avatarUrl }
            authorAssociation
          }
        }
      }
    }
  `,
  { owner: OWNER, repo: REPO },
);

/*
 * A category form renders as "### Rating" followed by the chosen option, so the
 * rating is a field rather than something inferred from the prose. A post
 * without one is a conversation, not a review, and is skipped.
 */
const ratingOf = (body) => {
  const match = body.match(/#+\s*Rating\s*\n+\s*([1-5])\b/i);
  return match ? Number(match[1]) : null;
};

const sectionOf = (body, heading) => {
  const re = new RegExp(`#+\\s*${heading}\\s*\\n+([\\s\\S]*?)(?=\\n#+\\s|$)`, "i");
  const match = body.match(re);
  if (!match) return "";
  return match[1]
    .replace(/^_No response_$/im, "")
    .replace(/\r/g, "")
    .trim();
};

const reviews = (data.repository.discussions.nodes ?? [])
  .filter((d) => d.category?.name === CATEGORY && d.author)
  .map((d) => {
    const rating = ratingOf(d.body ?? "");
    if (!rating) return null;
    const text = sectionOf(d.body, "What you think");
    if (text.length < 10) return null;
    return {
      rating,
      // The form prefixes titles with "[Review] ". Strip it; the reader does
      // not need to be told what section they are in.
      headline:
        sectionOf(d.body, "Headline") ||
        (d.title ?? "").replace(/^\[Review\]\s*/i, "").trim(),
      body: text,
      author: d.author.login,
      avatar: d.author.avatarUrl,
      profile: d.author.url,
      at: d.createdAt,
      url: d.url,
    };
  })
  .filter(Boolean)
  .slice(0, MAX_SHOWN);

const count = reviews.length;
const average = count
  ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
  : null;

/*
 * JSON.stringify does not escape "<", ">" or "&", so a review body containing
 * the characters that close a script tag would end the JSON-LD block early and
 * everything after it would become live HTML on the page. These escapes are
 * valid JSON and parse back to the same characters, so the structured data is
 * unchanged; it simply cannot break out of its element.
 *
 * U+2028 and U+2029 go too: they are legal in JSON strings but not in
 * JavaScript ones, and they break some parsers.
 */
const safeJson = (value) =>
  JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

const when = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/*
 * Truncated for the page, with a link to the whole thing. A review is somebody
 * else's writing, and cutting it silently would misrepresent them, so the link
 * is always there.
 */
const shorten = (text, max = 420) => {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return { text: flat, cut: false };
  return { text: flat.slice(0, max).replace(/\s+\S*$/, "") + "…", cut: true };
};

const html = count
  ? `
          <div class="rating-line">
            <span class="stars-static" aria-hidden="true">${stars(Math.round(average))}</span>
            <span class="rating-num">${average.toFixed(1)}</span>
            <span class="rating-count">from ${count} ${count === 1 ? "review" : "reviews"} on GitHub</span>
          </div>

          <ul class="reviews">
${reviews
  .map((r) => {
    const { text, cut } = shorten(r.body);
    return `            <li>
              <div class="r-top">
                <span class="r-stars" aria-label="${r.rating} out of 5">${stars(r.rating)}</span>
                ${r.headline ? `<span class="r-title">${esc(r.headline)}</span>` : ""}
              </div>
              <p class="r-body">${esc(text)}</p>
              <p class="r-who">
                <img src="${esc(r.avatar)}&amp;s=40" width="20" height="20" alt="" loading="lazy" decoding="async" />
                <a href="${esc(r.profile)}" target="_blank" rel="noopener">${esc(r.author)}</a>
                &middot; ${when(r.at)}
                &middot; <a href="${esc(r.url)}" target="_blank" rel="noopener">${cut ? "read it all" : "on GitHub"}</a>
              </p>
            </li>`;
  })
  .join("\n")}
          </ul>
`
  : "";

const schema = count
  ? `    <script type="application/ld+json" id="ld-reviews">
${safeJson(
  {
    "@context": "https://schema.org",
    "@id": "https://auramux.com/#app",
    "@type": "SoftwareApplication",
    name: "AuraMux",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: average,
      reviewCount: count,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.slice(0, 10).map((r) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: { "@type": "Person", name: r.author, url: r.profile },
      datePublished: r.at.slice(0, 10),
      name: r.headline || undefined,
      reviewBody: r.body,
      url: r.url,
    })),
  },
)}
    </script>`
  : "";

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
let after = between(before, "reviews", `\n${html}`);
after = between(after, "reviews-schema", `\n${schema}\n`);

if (after === before) {
  console.log(`No change. ${count} review${count === 1 ? "" : "s"} already published.`);
  process.exit(0);
}

await writeFile(PAGE, after);
console.log(
  count
    ? `Published ${count} review${count === 1 ? "" : "s"}, averaging ${average}.`
    : "No reviews yet. The section stays hidden.",
);
