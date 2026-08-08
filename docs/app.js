/*
 * auramux.com
 *
 * Three small jobs, all of them optional. The page is complete and correct with
 * JavaScript switched off: the version in the markup is right at publish time,
 * and the install command is selectable text. Nothing here is load-bearing.
 */

(function () {
  "use strict";

  /* ---------- copy the install command ---------- */

  var button = document.getElementById("copy");
  var command = document.querySelector(".install code");

  if (button && command && navigator.clipboard) {
    button.addEventListener("click", function () {
      // Strip the "$ " prompt, which is punctuation for the reader rather than
      // part of the command. Pasting it would break the line.
      var text = command.textContent.replace(/^\s*\$\s*/, "").trim();

      navigator.clipboard.writeText(text).then(
        function () {
          button.textContent = "Copied";
          button.setAttribute("data-done", "1");
          window.setTimeout(function () {
            button.textContent = "Copy";
            button.removeAttribute("data-done");
          }, 2000);
        },
        function () {
          // Clipboard access can be refused. The text is still selectable.
          button.textContent = "Select and copy";
          window.setTimeout(function () {
            button.textContent = "Copy";
          }, 2500);
        },
      );
    });
  } else if (button) {
    button.classList.add("hidden");
  }

  /* ---------- keep the version honest ---------- */

  /*
   * The markup ships with the current version so the page is never blank or
   * wrong on first paint. This asks GitHub for the real latest release and
   * corrects it if a newer one exists, which means cutting a release is the
   * only step needed to update this page. GitHub's API sends CORS headers, so
   * this works from the browser with no server involved.
   *
   * Unauthenticated requests are rate limited per IP. On a miss, the page keeps
   * the version it shipped with rather than showing an error.
   */
  fetch("https://api.github.com/repos/rmehdee/auramux-releases/releases/latest")
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (release) {
      if (!release || !release.tag_name) return;

      var version = String(release.tag_name).replace(/^v/, "");
      if (!/^\d+\.\d+\.\d+$/.test(version)) return;

      var pill = document.getElementById("version-pill");
      var shown = "v" + version + " · beta";

      // Nothing to do in the normal case. The published version is written
      // into the markup on release, so this fetch usually confirms what is
      // already on screen rather than replacing it. Writing anyway would
      // repaint for no reason, and would turn any lag into a visible flicker.
      if (!pill || pill.textContent === shown) return;

      pill.textContent = shown;

      // Keep the structured data in step with what is shown.
      var ld = document.getElementById("ld-app");
      if (ld) {
        try {
          var data = JSON.parse(ld.textContent);
          data["@graph"][0].softwareVersion = version;
          ld.textContent = JSON.stringify(data);
        } catch (e) {
          /* leave the published version in place */
        }
      }
    })
    .catch(function () {
      /* offline, rate limited, or blocked. The shipped version stands. */
    });

  /* ---------- install count ---------- */

  /*
   * Summed from GitHub release download counts by a function on
   * robinmehdee.com, which caches for an hour so GitHub's rate limit is never
   * a factor. It answers 503 with no number if anything is wrong, and this
   * shows nothing at all in that case. A download counter that guesses is
   * worse than no counter.
   */
  fetch("https://robinmehdee.com/api/installs")
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (data) {
      if (!data || typeof data.downloads !== "number" || data.downloads < 1) {
        return;
      }
      var badge = document.getElementById("installs-badge");
      if (!badge) return;

      badge.textContent =
        data.downloads.toLocaleString() +
        (data.downloads === 1 ? " install" : " installs");
      badge.classList.remove("hidden");
    })
    .catch(function () {
      /* the badge stays hidden */
    });

  /* ---------- reviews ---------- */

  /*
   * Read and written through a function on robinmehdee.com, because GitHub
   * Pages serves files and nothing else. Everything submitted waits for
   * approval, so nothing here publishes itself.
   */

  var API = "https://robinmehdee.com/api/reviews";

  var stars = function (n) {
    return "\u2605".repeat(n) + "\u2606".repeat(5 - n);
  };

  var when = function (iso) {
    var then = new Date(iso);
    if (isNaN(then)) return "";
    var days = Math.floor((Date.now() - then) / 86400000);
    if (days < 1) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return days + " days ago";
    return then.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  };

  /* textContent throughout, never innerHTML: this is text other people wrote. */
  var renderReviews = function (data) {
    if (!data || !data.count || !Array.isArray(data.reviews)) return;

    var summary = document.getElementById("review-summary");
    var list = document.getElementById("review-list");
    if (!summary || !list) return;

    document.getElementById("review-stars").textContent = stars(
      Math.round(data.average),
    );
    document.getElementById("review-average").textContent = data.average.toFixed(1);
    document.getElementById("review-count").textContent =
      "from " + data.count + (data.count === 1 ? " review" : " reviews");

    list.textContent = "";
    data.reviews.forEach(function (r) {
      var li = document.createElement("li");

      var top = document.createElement("div");
      top.className = "r-top";
      var st = document.createElement("span");
      st.className = "r-stars";
      st.textContent = stars(r.rating);
      st.setAttribute("aria-label", r.rating + " out of 5");
      top.appendChild(st);
      if (r.title) {
        var t = document.createElement("span");
        t.className = "r-title";
        t.textContent = r.title;
        top.appendChild(t);
      }
      li.appendChild(top);

      var body = document.createElement("p");
      body.className = "r-body";
      body.textContent = r.body;
      li.appendChild(body);

      var who = document.createElement("p");
      who.className = "r-who";
      who.textContent = (r.name || "Anonymous") + ", " + when(r.approvedAt || r.at);
      li.appendChild(who);

      list.appendChild(li);
    });

    summary.classList.remove("hidden");

    /*
     * Ratings go into the structured data only once they are real, and only
     * ever the ones actually shown. There is no seeded or placeholder rating
     * anywhere in this file.
     */
    var ld = document.getElementById("ld-app");
    if (ld) {
      try {
        var d = JSON.parse(ld.textContent);
        d["@graph"][0].aggregateRating = {
          "@type": "AggregateRating",
          ratingValue: data.average,
          reviewCount: data.count,
          bestRating: 5,
          worstRating: 1,
        };
        d["@graph"][0].review = data.reviews.slice(0, 10).map(function (r) {
          return {
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
            author: { "@type": "Person", name: r.name || "Anonymous" },
            datePublished: (r.approvedAt || r.at || "").slice(0, 10),
            name: r.title || undefined,
            reviewBody: r.body,
          };
        });
        ld.textContent = JSON.stringify(d);
      } catch (e) {
        /* the page is fine without it */
      }
    }
  };

  fetch(API)
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(renderReviews)
    .catch(function () {
      /* the section stays hidden and the form still works */
    });

  var form = document.getElementById("review-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var note = document.getElementById("review-note");
      var button = document.getElementById("review-submit");
      var data = new FormData(form);
      var say = function (text, state) {
        note.textContent = text;
        note.setAttribute("data-state", state);
      };

      if (!data.get("rating")) return say("Pick a rating first.", "bad");
      if (String(data.get("body") || "").trim().length < 12) {
        return say("A sentence or two, please.", "bad");
      }

      button.disabled = true;
      say("Sending.", "");

      fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: Number(data.get("rating")),
          name: data.get("name"),
          title: data.get("title"),
          body: data.get("body"),
          website: data.get("website"),
        }),
      })
        .then(function (r) {
          return r.json().then(function (b) {
            return { ok: r.ok, body: b };
          });
        })
        .then(function (res) {
          if (!res.ok) {
            say(res.body.error || "That did not go through.", "bad");
            button.disabled = false;
            return;
          }
          form.reset();
          say("Thank you. It will appear once I have read it.", "ok");
        })
        .catch(function () {
          say("Could not reach the server. Please try again later.", "bad");
          button.disabled = false;
        });
    });
  }
})();
