/*
 * auramux.com
 *
 * Three small jobs, all of them optional. The page is complete and correct with
 * JavaScript switched off: the version in the markup is right at publish time,
 * and the install command is selectable text. Nothing here is load-bearing.
 */

(function () {
  "use strict";

  /* ---------- copy a command ---------- */

  /*
   * Shared by the install command in the hero and by any command inside the
   * release notes, so they behave identically: same wording, same timings, same
   * fallback when the clipboard is refused.
   */
  var attachCopy = function (button, source) {
    button.addEventListener("click", function () {
      // Strip the "$ " prompt, which is punctuation for the reader rather than
      // part of the command. Pasting it would break the line.
      var text = source.textContent.replace(/^\s*\$\s*/, "").trim();

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
  };

  var button = document.getElementById("copy");
  var command = document.querySelector(".install code");

  if (button && command && navigator.clipboard) {
    attachCopy(button, command);
  } else if (button) {
    button.classList.add("hidden");
  }

  /*
   * The version and the release notes are both corrected from the GitHub API
   * further down, in one request. See "keep the page honest".
   */

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


  /* ---------- the animated tour ---------- */

  /*
   * A scripted walkthrough of the window above: scenes drive a fake pointer
   * through the things the app actually does. Everything here paints over the
   * static still that ships in the HTML, so with this file missing or blocked
   * the page keeps a truthful screenshot and loses only the motion.
   *
   * The engine is a list of scenes, each a list of (delay, step) pairs played
   * with setTimeout. Scenes only run while the window is on screen, both to
   * spare the battery and because motion nobody can see is pure cost.
   */

  var demo = document.getElementById("app");
  if (demo) {
    var THEMES = {
      aura: {
        label: "Aura (default)",
        v: { "--t-bg": "#070b0a", "--t-fg": "#cdd8d1", "--t-green": "#4dff9e",
             "--t-yellow": "#ffb84d", "--t-cyan": "#38e1ff", "--t-violet": "#b48ead",
             "--s-bg": "#101715", "--s-sel": "#1a2420", "--s-text": "#cdd8d1",
             "--s-dim": "#7f8f88", "--s-line": "#1d2924" },
      },
      dracula: {
        label: "Dracula",
        v: { "--t-bg": "#282a36", "--t-fg": "#f8f8f2", "--t-green": "#50fa7b",
             "--t-yellow": "#f1fa8c", "--t-cyan": "#8be9fd", "--t-violet": "#bd93f9",
             "--s-bg": "#31333f", "--s-sel": "#3c3f4d", "--s-text": "#f8f8f2",
             "--s-dim": "#9ba0b0", "--s-line": "#3d404e" },
      },
      classic: {
        label: "Classic (light)",
        v: { "--t-bg": "#ffffff", "--t-fg": "#1a1a1a", "--t-green": "#127a12",
             "--t-yellow": "#8a6d00", "--t-cyan": "#007a8a", "--t-violet": "#8e24aa",
             "--s-bg": "#f0f0f0", "--s-sel": "#dedede", "--s-text": "#1a1a1a",
             "--s-dim": "#6e6e6e", "--s-line": "#d8d8d8" },
      },
    };
    var applyTheme = function (key) {
      for (var k in THEMES[key].v) demo.style.setProperty(k, THEMES[key].v[k]);
      document.getElementById("themefoot").textContent =
        "Theme: " + THEMES[key].label;
    };

    var PROMPT = '<span class="pr">robin@mehdee</span>';

    /* -- the pointer -- */
    var cursorEl = document.getElementById("cursor");
    var rippleEl = document.getElementById("ripple");
    var cursorTo = function (target, dx, dy) {
      var el = typeof target === "string" ? document.getElementById(target) : target;
      if (!el) return;
      var a = demo.getBoundingClientRect();
      var r = el.getBoundingClientRect();
      cursorEl.style.left = r.left - a.left + r.width * (dx === undefined ? 0.5 : dx) + "px";
      cursorEl.style.top = r.top - a.top + r.height * (dy === undefined ? 0.5 : dy) + "px";
    };
    var clickFx = function (kind) {
      cursorEl.classList.add("press");
      setTimeout(function () { cursorEl.classList.remove("press"); }, 140);
      rippleEl.style.left = parseFloat(cursorEl.style.left || "0") - 12 + "px";
      rippleEl.style.top = parseFloat(cursorEl.style.top || "0") - 12 + "px";
      rippleEl.classList.toggle("right", kind === "right");
      rippleEl.classList.remove("go");
      void rippleEl.offsetWidth;
      rippleEl.classList.add("go");
    };
    var pressCursor = function (down) { cursorEl.classList.toggle("press", down); };
    var parkCursor = function () { cursorEl.style.left = "78%"; cursorEl.style.top = "88%"; };

    /* -- the context menu -- */
    var ctxEl = document.getElementById("ctx");
    var showCtx = function (items) {
      ctxEl.innerHTML = items
        .map(function (it) {
          return it.swatches
            ? '<div class="sw">' + it.swatches.map(function (c) {
                return '<i id="sw-' + c + '" style="background:var(--t-' + c + ')"></i>';
              }).join("") + "</div>"
            : '<div class="mi" id="mi-' + it.id + '">' + it.label + "</div>";
        })
        .join("");
      ctxEl.style.left = parseFloat(cursorEl.style.left || "0") + 6 + "px";
      ctxEl.style.top = parseFloat(cursorEl.style.top || "0") + 4 + "px";
      ctxEl.classList.add("show");
    };
    var hideCtx = function () { ctxEl.classList.remove("show"); };

    /* -- the sidebar -- */
    var noteGlyph = function (id) {
      return '<svg class="glyph" id="' + id + '" width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="2" width="11" height="12" rx="1.5"/><path d="M5 5.5h6M5 8h6"/></svg>';
    };
    var pinGlyph = function (id) {
      return '<svg class="glyph" id="' + id + '" width="8" height="8" viewBox="0 0 16 16" fill="currentColor"><path d="M9.9 1.2 14.8 6.1a.7.7 0 0 1-.4 1.2l-1.9.3-3 3 .3 2.3a.7.7 0 0 1-1.2.6L6 11l-3.5 3.5a.6.6 0 0 1-.9-.9L5.1 10 2.5 7.4a.7.7 0 0 1 .6-1.2l2.3.3 3-3 .3-1.9a.7.7 0 0 1 1.2-.4Z"/></svg>';
    };
    var bellSvg = function (id) {
      return '<svg class="bell" id="' + id + '" width="12" height="12" viewBox="0 0 16 16" fill="var(--t-yellow)"><path d="M8 1.5a.9.9 0 0 1 .9.9v.44a4.1 4.1 0 0 1 3.2 4v2.3l1 1.5a.6.6 0 0 1-.5.94H3.4a.6.6 0 0 1-.5-.94l1-1.5v-2.3a4.1 4.1 0 0 1 3.2-4V2.4a.9.9 0 0 1 .9-.9Zm0 12.9a1.7 1.7 0 0 1-1.6-1.2h3.2A1.7 1.7 0 0 1 8 14.4Z"/></svg>';
    };

    var st = {
      order: ["co", "agent", "logs"],
      sel: "co",
      pinned: {}, bells: {}, notesFlag: {},
      tabs: {
        co: { name: "checkout revamp", path: "~/dev/app ⌥ feat/v2", cwd: "cwd ~/dev/app", screen: [], typing: true },
        agent: { name: "agent · api", path: "~/dev/api ⌥ main", cwd: "cwd ~/dev/api", screen: [], typing: true },
        logs: { name: "logs", path: "~/dev/api/logs", cwd: "cwd ~/dev/api/logs",
          screen: ['<span class="dim2">tail -f access.log</span>',
                   '<span class="dim2">200 GET /api/orders 41ms</span>',
                   '<span class="dim2">200 POST /api/checkout 87ms</span>'],
          typing: true },
      },
    };
    var renderTabs = function () {
      document.getElementById("tabs").innerHTML = st.order
        .map(function (id) {
          var t = st.tabs[id];
          return (
            '<div class="tab ' + (st.sel === id ? "sel" : "") + '" id="tab-' + id + '">' +
            '<span class="dot"></span>' +
            '<span class="m">' +
            '<span class="n">' + t.name + pinGlyph("pin-" + id) + noteGlyph("ng-" + id) + "</span>" +
            '<span class="p">' + t.path + "</span>" +
            "</span>" + bellSvg("bell-" + id) + "</div>" +
            '<div class="ins" id="ins-' + id + '"></div>'
          );
        })
        .join("");
      st.order.forEach(function (id) {
        document.getElementById("pin-" + id).classList.toggle("show", !!st.pinned[id]);
        document.getElementById("ng-" + id).classList.toggle("show", !!st.notesFlag[id]);
        document.getElementById("bell-" + id).classList.toggle("show", !!st.bells[id]);
      });
    };
    var screenEl = document.getElementById("screen");
    var drawScreen = function () {
      var t = st.tabs[st.sel];
      screenEl.innerHTML =
        t.screen.map(function (l) { return "<div>" + l + "</div>"; }).join("") +
        (t.typing
          ? "<div>" + PROMPT + " " + t.cwd.replace("cwd ", "") + ' $ <span class="caret"></span></div>'
          : "");
      document.getElementById("panetitle").textContent = t.name;
      document.getElementById("wintitle").textContent = t.name;
      document.getElementById("cwd").textContent = t.cwd;
    };
    var push = function (id, html) {
      var sc = st.tabs[id].screen;
      sc.push(html);
      if (sc.length > 13) sc.shift();
      if (st.sel === id) drawScreen();
    };
    var selectTab = function (id) {
      st.sel = id;
      if (st.bells[id]) {
        delete st.bells[id];
        document.getElementById("wait").classList.remove("show");
      }
      renderTabs();
      drawScreen();
    };

    /* -- the notes panel -- */
    var notesEl = document.getElementById("notes");
    var noteRows = [];
    var noteSel = -1;
    var renderNotes = function () {
      document.getElementById("notelist").innerHTML = noteRows
        .map(function (r, i) {
          return (
            '<div class="note-row ' + (i === noteSel ? "sel" : "") + '" id="nrow-' + i + '">' +
            '<span class="cdot ' + (r.color || "") + '"></span>' +
            '<span class="nm"><div class="nn">' + r.name + (r.caret ? '<span class="ncaret"></span>' : "") +
            '</div><div class="nt">' + r.time + "</div></span></div>"
          );
        })
        .join("");
      var t = st.tabs[st.sel];
      document.getElementById("ntitle").textContent = noteRows.length
        ? "NOTES : " + t.name + " : " + noteRows.length
        : "NOTES : " + t.name;
      document.getElementById("crumb").textContent =
        noteRows.length && noteSel >= 0 ? t.name + " : " + noteRows[noteSel].name : "";
    };
    var noteLines = [];
    var noteTypingLine = "";
    var noteedEl = document.getElementById("noteed");
    var drawNote = function (caret) {
      noteedEl.innerHTML =
        noteLines
          .map(function (l) {
            return "<div" + (l.cls ? ' class="' + l.cls + '"' : "") +
              (l.id ? ' id="' + l.id + '"' : "") + ">" + l.html + "</div>";
          })
          .join("") +
        (caret === false ? "" : "<div>" + noteTypingLine + '<span class="ncaret"></span></div>');
    };

    /* -- scenes -- */
    var SCENES = [];
    var scene = function (caption, build) {
      var steps = [];
      var t = 0;
      var at = function (d, fn) { t += d; steps.push([t, fn]); };
      var type = function (d, per, text, each, done) {
        at(d, function () {});
        for (var i = 1; i <= text.length; i++) {
          (function (sfx) { at(per, function () { each(sfx); }); })(text.slice(0, i));
        }
        if (done) at(120, done);
      };
      build({ at: at, type: type });
      SCENES.push({ caption: caption, steps: steps, total: t + 2400 });
    };

    // Scene 1: Claude runs in a tab. Also the reset every loop passes through.
    scene(
      "<b>Claude in a tab.</b> robin@mehdee runs Claude Code like any command. The session, folder and scrollback all persist.",
      function (h) {
        h.at(0, function () {
          applyTheme("aura");
          st.order = ["co", "agent", "logs"];
          st.sel = "co";
          st.pinned = {}; st.bells = {}; st.notesFlag = {};
          st.tabs.co.screen = []; st.tabs.agent.screen = [];
          st.tabs.co.typing = true;
          notesEl.classList.remove("open");
          document.getElementById("notebtn").classList.remove("active");
          document.getElementById("wait").classList.remove("show");
          hideCtx();
          noteRows = []; noteSel = -1; renderNotes();
          noteLines = []; noteTypingLine = ""; drawNote(false);
          renderTabs(); drawScreen(); parkCursor();
        });
        h.type(500, 70, "claude", function (sfx) {
          st.tabs.co.screen[0] = PROMPT + " ~/dev/app $ " + sfx;
          drawScreen();
        });
        h.at(500, function () {
          st.tabs.co.typing = false;
          push("co", '<span class="dim2">╭──────────────────────────╮</span>');
          push("co", '<span class="dim2">│</span> <span class="vi">✳ Claude Code</span> <span class="dim2">v2.1 · fable │</span>');
          push("co", '<span class="dim2">╰──────────────────────────╯</span>');
        });
        h.at(700, function () { push("co", '<span class="dim2">❯</span> fix the flaky checkout test'); });
        h.at(900, function () { push("co", '<span class="cy">●</span> Reading tests/checkout.spec.ts <span class="dim2">(218 lines)</span>'); });
        h.at(900, function () { push("co", '<span class="cy">●</span> Edit src/checkout/flow.ts <span class="dim2">+6 −2</span>'); });
        h.at(900, function () { push("co", '<span class="pr">✓</span> 48 passed <span class="dim2">· 0 failed · 3.1s</span>'); });
      }
    );

    // Scene 2: switching; Claude finishes in the background and rings.
    scene(
      "<b>Instant switching.</b> One click, no delay: each tab keeps its own shell. Claude finishes in the background: bell, status count, Dock badge.",
      function (h) {
        h.at(500, function () { cursorTo("tab-agent"); });
        h.at(600, function () {
          clickFx();
          selectTab("agent");
          st.tabs.agent.screen = [
            PROMPT + " ~/dev/api $ npm run agent",
            '<span class="dim2">watching 3 queues…</span>',
            '<span class="cy">●</span> processed 214 jobs',
          ];
          drawScreen();
        });
        h.at(1200, function () { cursorTo("tab-logs"); });
        h.at(600, function () { clickFx(); selectTab("logs"); });
        h.at(1000, function () {
          st.bells.co = true;
          renderTabs();
          document.getElementById("wait").classList.add("show");
          push("co", '<span class="yel">●</span> Claude is waiting: <span class="dim2">approve the edit?</span>');
        });
        h.at(1400, function () { cursorTo("tab-co"); });
        h.at(600, function () { clickFx(); selectTab("co"); });
      }
    );

    // Scene 3: pin from the context menu, then drag to reorder.
    scene(
      "<b>Pin and reorder, with the mouse.</b> Right click pins agent · api to the top. Then logs is dragged up, the line showing where it lands.",
      function (h) {
        h.at(500, function () { cursorTo("tab-agent"); });
        h.at(550, function () {
          clickFx("right");
          showCtx([
            { id: "pin", label: "Pin to Top" },
            { id: "ren", label: "Rename" },
            { id: "col", label: "Color" },
            { id: "cls", label: "Close" },
          ]);
        });
        h.at(700, function () { cursorTo("mi-pin"); });
        h.at(500, function () {
          var mi = document.getElementById("mi-pin");
          if (mi) mi.classList.add("hot");
        });
        h.at(350, function () {
          clickFx();
          hideCtx();
          st.pinned.agent = true;
          st.order = ["agent"].concat(st.order.filter(function (x) { return x !== "agent"; }));
          renderTabs();
        });
        h.at(1100, function () { cursorTo("tab-logs"); });
        h.at(550, function () {
          pressCursor(true);
          document.getElementById("tab-logs").classList.add("lift");
        });
        h.at(500, function () { cursorTo("tab-co", 0.5, 0.1); });
        h.at(450, function () { document.getElementById("ins-agent").classList.add("show"); });
        h.at(650, function () {
          pressCursor(false);
          st.order = ["agent", "logs", "co"];
          renderTabs();
        });
      }
    );

    // Scene 4: notes, end to end.
    scene(
      "<b>Notes for this tab.</b> Open the panel, + creates a note, name it, type a checklist, click a box to tick it, right click for a colour label.",
      function (h) {
        h.at(400, function () { selectTab("co"); cursorTo("notebtn"); });
        h.at(550, function () {
          clickFx();
          document.getElementById("notebtn").classList.add("active");
          notesEl.classList.add("open");
          renderNotes();
        });
        h.at(700, function () { cursorTo("plusbtn"); });
        h.at(550, function () {
          clickFx();
          var b = document.getElementById("plusbtn");
          b.classList.add("press");
          setTimeout(function () { b.classList.remove("press"); }, 250);
          noteRows = [{ name: "Untitled", time: "just now", caret: true }];
          noteSel = 0;
          renderNotes();
        });
        h.type(500, 90, "Standup", function (sfx) { noteRows[0].name = sfx; renderNotes(); });
        h.at(250, function () { noteRows[0].caret = false; renderNotes(); });
        h.at(300, function () { cursorTo("noteed", 0.4, 0.25); });
        h.type(300, 45, "Standup",
          function (sfx) { noteTypingLine = '<span style="font-size:14px;font-weight:700">' + sfx + "</span>"; drawNote(); },
          function () { noteLines.push({ html: "Standup", cls: "h" }); noteTypingLine = ""; drawNote(); });
        h.type(250, 40, "- [ ] demo the notes panel",
          function (sfx) { noteTypingLine = sfx.replace("- [ ]", '<span class="cb">- [ ]</span>'); drawNote(); },
          function () { noteLines.push({ html: '<span class="cb">- [ ]</span> demo the notes panel', id: "nl-todo" }); noteTypingLine = ""; drawNote(); });
        h.type(200, 40, "- [ ] ship 1.8.0",
          function (sfx) { noteTypingLine = sfx.replace("- [ ]", '<span class="cb">- [ ]</span>'); drawNote(); },
          function () { noteLines.push({ html: '<span class="cb">- [ ]</span> ship 1.8.0' }); noteTypingLine = ""; drawNote(false); });
        h.at(600, function () { cursorTo("nl-todo", 0.06, 0.5); });
        h.at(550, function () {
          clickFx();
          noteLines[1] = { html: '<span class="cb">- [x]</span> demo the notes panel', cls: "done", id: "nl-todo" };
          drawNote(false);
        });
        h.at(800, function () { cursorTo("nrow-0"); });
        h.at(550, function () {
          clickFx("right");
          showCtx([
            { id: "ren", label: "Rename" },
            { swatches: ["green", "cyan", "violet", "yellow"] },
            { id: "del", label: "Delete" },
          ]);
        });
        h.at(700, function () { cursorTo("sw-violet"); });
        h.at(450, function () {
          var sw = document.getElementById("sw-violet");
          if (sw) sw.classList.add("hot");
        });
        h.at(350, function () {
          clickFx();
          hideCtx();
          noteRows[0].color = "violet";
          renderNotes();
          st.notesFlag.co = true;
          renderTabs();
        });
      }
    );

    // Scene 5: themes restyle the whole window.
    scene(
      "<b>Themes.</b> Pick a palette and the terminal, sidebar and notes all follow, light themes included. Nothing keeps its own colours.",
      function (h) {
        h.at(300, function () { parkCursor(); });
        h.at(400, function () { applyTheme("dracula"); });
        h.at(1600, function () { applyTheme("classic"); });
        h.at(1700, function () { applyTheme("aura"); });
      }
    );

    /* -- the projector -- */
    var capEl = document.getElementById("cap");
    var dotsEl = document.getElementById("dots");
    dotsEl.innerHTML = SCENES.map(function (_, i) { return '<i id="dot' + i + '"></i>'; }).join("");

    var scn = 0;
    var timers = [];
    var playing = true;
    // Assumed true until the observer says otherwise, so the tour never waits
    // on a callback that some embedded browsers simply do not deliver.
    var visible = true;
    var reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var clearTimers = function () {
      timers.forEach(clearTimeout);
      timers = [];
    };
    var run = function (i) {
      clearTimers();
      scn = i % SCENES.length;
      SCENES.forEach(function (_, d) {
        document.getElementById("dot" + d).classList.toggle("on", d === scn);
      });
      capEl.innerHTML = SCENES[scn].caption;
      SCENES[scn].steps.forEach(function (step) {
        timers.push(setTimeout(step[1], reduced ? 0 : step[0]));
      });
      if (playing && visible && !reduced) {
        timers.push(setTimeout(function () { run(scn + 1); }, SCENES[scn].total));
      }
    };

    document.getElementById("next").addEventListener("click", function () {
      run(scn + 1);
    });
    var playBtn = document.getElementById("play");
    playBtn.addEventListener("click", function () {
      playing = !playing;
      playBtn.textContent = playing ? "Pause" : "Play";
      playBtn.setAttribute("aria-pressed", String(playing));
      if (playing) run(scn);
      else clearTimers();
    });

    if (reduced) {
      playing = false;
      playBtn.textContent = "Play";
      playBtn.setAttribute("aria-pressed", "false");
      cursorEl.style.opacity = "0";
    }

    /*
     * Pause while the window is off screen, purely as a refinement: the tour
     * starts playing regardless, and the observer only takes motion away from
     * a window nobody can see. Scenes restart from the top of the current one
     * when it scrolls back in, which is cheaper than pausing mid-flight and
     * looks intentional rather than broken.
     */
    if ("IntersectionObserver" in window && !reduced) {
      new IntersectionObserver(
        function (entries) {
          var wasVisible = visible;
          visible = entries[0].isIntersecting;
          if (visible && !wasVisible && playing) run(scn);
          if (!visible && wasVisible) clearTimers();
        },
        { threshold: 0.25 }
      ).observe(demo);
    }
    run(0);
  }

  /* ---------- back to top ---------- */

  var toTop = document.getElementById("to-top");

  if (toTop) {
    var ticking = false;

    /*
     * Read inside requestAnimationFrame. Reading scrollY in the handler itself
     * forces the browser to settle layout on every scroll event, which is what
     * turns a scroll into a stutter.
     */
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        toTop.classList.toggle("shown", window.scrollY > 900);
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    toTop.addEventListener("click", function () {
      var reduce =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }

  /* ---------- what's new, one release at a time ---------- */

  /*
   * The notes for the last few releases are in the HTML, written there when a
   * release is published. Without this they read as a stacked changelog, which
   * is correct but long. This turns them into a tab strip.
   *
   * The roles are added here rather than shipped in the markup on purpose. A
   * tablist that cannot be operated is worse for someone on a screen reader
   * than four plain headings, so the page only claims to be tabs once it can
   * actually behave like them.
   *
   * Written to be run more than once, because the section below replaces the
   * whole section when GitHub has notes newer than the ones the page was
   * served with. Replacing the markup throws away the old listeners with it.
   */
  var wireTabs = function () {
    var tablist = document.getElementById("rel-tablist");
    var tabs = tablist
      ? Array.prototype.slice.call(tablist.querySelectorAll(".rel-tab"))
      : [];

    if (tabs.length < 2) return;

    var panels = tabs.map(function (tab) {
      return document.getElementById("rel-" + tab.getAttribute("data-rel"));
    });

    // If the markup and the script ever disagree, leave the stack alone.
    if (!panels.every(Boolean)) return;

    tablist.hidden = false;
    tablist.setAttribute("role", "tablist");

    var select = function (index, moveFocus) {
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute("aria-selected", on ? "true" : "false");
        // Only the selected tab is in the tab order. Arrow keys move between
        // them, which is how a tablist is expected to behave.
        tab.tabIndex = on ? 0 : -1;
        // Both, not just one. The stylesheet shows the first panel by default
        // so there is something on screen before this runs, and it takes an
        // explicit `is-open` to put a later release in front of that.
        panels[i].classList.toggle("is-open", on);
        panels[i].classList.toggle("is-closed", !on);
      });
      if (moveFocus) tabs[index].focus();
    };

    tabs.forEach(function (tab, i) {
      var panel = panels[i];

      tab.id = tab.id || "rel-tab-" + tab.getAttribute("data-rel");
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panel.id);

      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      // So the notes can be scrolled and read by keyboard once a tab is
      // chosen. The panel is a block of text, not a widget.
      panel.tabIndex = 0;

      tab.addEventListener("click", function () {
        select(i, false);
      });

      tab.addEventListener("keydown", function (event) {
        var step =
          event.key === "ArrowRight" || event.key === "ArrowDown"
            ? 1
            : event.key === "ArrowLeft" || event.key === "ArrowUp"
              ? -1
              : 0;

        if (step) {
          event.preventDefault();
          select((i + step + tabs.length) % tabs.length, true);
          return;
        }
        if (event.key === "Home") {
          event.preventDefault();
          select(0, true);
        }
        if (event.key === "End") {
          event.preventDefault();
          select(tabs.length - 1, true);
        }
      });
    });

    select(0, false);
  };

  /*
   * A Copy button beside any command in the notes, matching the one in the
   * hero. Added here rather than written into the markup for the same reason
   * the tab roles are: a Copy button is a promise, and without a script behind
   * it there is nothing to press. Where the clipboard is unavailable none is
   * added at all, and the command stays what it already was, selectable text.
   */
  var wireCopy = function () {
    if (!navigator.clipboard) return;

    var blocks = document.querySelectorAll(".rel-body pre");
    Array.prototype.forEach.call(blocks, function (pre) {
      // Wiring runs again whenever the section is replaced. Anything already
      // sitting in a row has its button.
      if (pre.parentNode.className === "rel-cmd") return;

      var row = document.createElement("div");
      row.className = "rel-cmd";
      pre.parentNode.insertBefore(row, pre);
      row.appendChild(pre);

      var copy = document.createElement("button");
      copy.type = "button";
      copy.className = "copy";
      copy.textContent = "Copy";
      // So a screen reader hears the button confirm itself, rather than the
      // confirmation being a visual change nobody is told about.
      copy.setAttribute("aria-live", "polite");
      row.appendChild(copy);

      attachCopy(copy, pre.querySelector("code") || pre);
    });
  };

  var wireSection = function () {
    wireTabs();
    wireCopy();
  };

  /*
   * Captured before anything is wired. Wiring adds roles, aria attributes and a
   * Copy button, and the markup no longer looks like what a render produces, so
   * it could never be compared against one.
   */
  var section = document.getElementById("rel-tabs");
  var published = section ? section.outerHTML : "";

  wireSection();

  /* ---------- keep the page honest ---------- */

  /*
   * The markup ships with the current version and the current notes, so the
   * page is complete and right on first paint, and right for anything that
   * does not run scripts. This asks GitHub what the releases actually are and
   * corrects both if they have moved on.
   *
   * It is needed because GitHub Pages serves this page with max-age=600. For up
   * to ten minutes after a release, a visitor is handed the previous HTML from
   * a CDN that has not expired it yet. The version pill has always corrected
   * itself this way. Until the notes did too, the pill would say 1.7.0 directly
   * above a panel still describing 1.6.1.
   *
   * One request answers both. GitHub's API sends CORS headers, so this works
   * from the browser with no server involved. Unauthenticated requests are rate
   * limited per IP; on a miss the page keeps what it was published with rather
   * than showing an error.
   */
  fetch("https://api.github.com/repos/rmehdee/auramux-releases/releases?per_page=30")
    .then(function (r) {
      return r.ok ? r.json() : null;
    })
    .then(function (list) {
      if (!list || !list.length) return null;

      /*
       * The pill first, and deliberately without the module. It is one short
       * string, it has been corrected this way since long before the notes
       * were, and it should not start depending on a second file loading.
       */
      var newest = list
        .filter(function (r) {
          return (
            !r.draft &&
            !r.prerelease &&
            /^v?\d+\.\d+\.\d+$/.test(r.tag_name || "")
          );
        })
        .sort(function (a, b) {
          return new Date(b.published_at) - new Date(a.published_at);
        })[0];

      if (newest) showVersion(String(newest.tag_name).replace(/^v/, ""));

      // The renderer Actions uses, so what is drawn here is what would have
      // been published. A failure to load it leaves the published notes alone.
      return import("/release-notes.mjs?v=943e5d19").then(function (notes) {
        var releases = notes.pickReleases(list);
        if (releases.length) showNotes(notes.renderSection(releases));
      });
    })
    .catch(function () {
      /* offline, rate limited, or blocked. What was published stands. */
    });

  function showVersion(version) {
    var pill = document.getElementById("version-pill");
    var shown = "v" + version + " \u00b7 beta";

    // Nothing to do in the normal case. The published version is written into
    // the markup on release, so this usually confirms what is already on screen
    // rather than replacing it. Writing anyway would repaint for no reason, and
    // would turn any lag into a visible flicker.
    if (!pill || pill.textContent === shown) return;

    pill.textContent = shown;

    // Keep the structured data in step with what is shown.
    var ld = document.getElementById("ld-app");
    if (!ld) return;
    try {
      var data = JSON.parse(ld.textContent);
      data["@graph"][0].softwareVersion = version;
      ld.textContent = JSON.stringify(data);
    } catch (e) {
      /* leave the published version in place */
    }
  }

  function showNotes(markup) {
    if (!section || !markup) return;

    var probe = document.createElement("div");
    probe.innerHTML = markup;
    var fresh = probe.firstElementChild;
    if (!fresh) return;

    /*
     * Both sides of this comparison have been through the browser's parser, so
     * they are normalised the same way and can be compared as strings. In the
     * ordinary case they are identical, which is the answer we want: leave the
     * section exactly as it was served, listeners and chosen tab included.
     */
    if (fresh.outerHTML === published) return;

    section.replaceWith(fresh);
    section = fresh;
    published = fresh.outerHTML;
    wireSection();
  }
})();
