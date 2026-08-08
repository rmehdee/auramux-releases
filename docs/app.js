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


  /* ---------- the annotated walkthrough ---------- */

  /*
   * Labels sit in a legend below the window rather than as pins on top of it.
   * Numbered pins covered the exact details they pointed at, the traffic
   * lights, the git branch, the clock, which defeated the point.
   *
   * The ring is measured from the real elements, tagged with data-tour, not
   * from hardcoded percentages, so it follows the mockup wherever the layout
   * puts it. Anything measuring zero is not on screen at this width and drops
   * out of the legend by itself.
   */

  var STOPS = [
    ["sessions", "Sessions", "One tab per task. Agents in some, a dev server or logs in others. Click to switch, double-click to rename."],
    ["needs-input", "Waiting for you", "An amber bell means that session has stopped and is waiting on input. This is what lets you walk away while an agent works."],
    ["new-output", "New output", "A cyan dot means the session has produced output since you last looked at it. No dot means nothing has changed."],
    ["git", "Git branch", "Each session shows its current branch, with an amber marker when the working tree is dirty."],
    ["split", "Split view", "Two sessions side by side, with a draggable divider. Each pane keeps its own title and its own find."],
    ["archived", "Archived", "Finished with a session but not ready to lose it? Archive it, then restore or delete it later."],
    ["autosave", "Autosave", "The check confirms sessions are saved, which happens every 20 seconds. Beside it: screenshot to Desktop, lock now, and more."],
    ["titlebar", "Title bar", "The window title is the active session's name, so you can tell which task you are looking at from the Dock or Mission Control."],
    ["statusbar", "Status bar", "Working directory, shell, how many sessions were restored on launch, and the scrollback limit."]
  ];

  var host = document.getElementById("tour-host");
  var ring = document.getElementById("tour-ring");
  var stopList = document.getElementById("tour-stops");
  var caption = document.getElementById("tour-caption");

  if (host && ring && stopList && caption) {
    var active = null;

    var show = function (id) {
      active = id;
      var scroller = host.parentElement;
      var target = id && host.querySelector('[data-tour="' + id + '"]');
      var stop = STOPS.filter(function (s) { return s[0] === id; })[0];

      if (!target || !stop) {
        ring.style.opacity = "0";
        caption.textContent = "";
      } else {
        var base = host.getBoundingClientRect();
        var r = target.getBoundingClientRect();
        ring.style.opacity = "1";
        ring.style.left = r.left - base.left - 3 + "px";
        ring.style.top = r.top - base.top - 3 + "px";
        ring.style.width = r.width + 6 + "px";
        ring.style.height = r.height + 6 + "px";

        caption.textContent = "";
        var strong = document.createElement("span");
        strong.textContent = stop[1] + ". ";
        caption.appendChild(strong);
        caption.appendChild(document.createTextNode(stop[2]));

        /*
         * On a narrow screen the window is wider than the viewport and scrolls
         * sideways, so the region being pointed at is often off-screen. The
         * ring was drawn correctly and nobody could see it, which reads as a
         * label that does nothing. Bring it into view.
         */
        if (scroller && scroller.scrollWidth > scroller.clientWidth) {
          var sRect = scroller.getBoundingClientRect();
          var wanted =
            r.left + r.width / 2 - (sRect.left + sRect.width / 2);
          if (Math.abs(wanted) > 8) {
            var reduce =
              window.matchMedia &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            scroller.scrollBy({
              left: wanted,
              behavior: reduce ? "auto" : "smooth",
            });
          }
        }
      }

      Array.prototype.forEach.call(stopList.children, function (li) {
        var button = li.firstChild;
        var on = button.getAttribute("data-id") === id;
        button.setAttribute("aria-pressed", on ? "true" : "false");
        button.classList.toggle("on", on);
      });
    };

    var build = function () {
      stopList.textContent = "";
      STOPS.forEach(function (stop) {
        var target = host.querySelector('[data-tour="' + stop[0] + '"]');
        if (!target) return;
        var r = target.getBoundingClientRect();
        if (!r.width || !r.height) return;

        var li = document.createElement("li");
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = stop[1];
        button.setAttribute("data-id", stop[0]);
        button.setAttribute("aria-pressed", "false");

        button.addEventListener("mouseenter", function () { show(stop[0]); });
        button.addEventListener("mouseleave", function () { show(null); });
        button.addEventListener("focus", function () { show(stop[0]); });
        button.addEventListener("blur", function () { show(null); });
        /*
         * On a touch screen there is no hover to leave, so tapping has to
         * toggle. With a mouse, hover has already set this one active by the
         * time the click lands, and toggling would immediately undo it, which
         * looks like a broken button.
         */
        button.addEventListener("click", function () {
          var hoverable =
            window.matchMedia && window.matchMedia("(hover: hover)").matches;
          show(!hoverable && active === stop[0] ? null : stop[0]);
        });

        li.appendChild(button);
        stopList.appendChild(li);
      });
      if (active) show(active);
    };

    build();
    window.addEventListener("resize", build);
    // Fonts land after first paint and shift everything underneath.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(build).catch(function () {});
    }
  }
})();
