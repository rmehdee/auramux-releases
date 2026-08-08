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

})();
