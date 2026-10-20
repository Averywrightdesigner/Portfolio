/* ---------- Clock ---------- */
function tick() {
  const clock = document.getElementById("clock");
  if (!clock) return;
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  clock.textContent = t.toLowerCase();
}
setInterval(tick, 30000);

/* ---------- Things that run on every page (and again after a page change) ---------- */
const hasIO = "IntersectionObserver" in window;
const io = hasIO ? new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }) : null;
const spy = hasIO ? new IntersectionObserver((entries) => {
  const links = [...document.querySelectorAll(".nav ul a")];
  entries.forEach((e) => {
    if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
  });
}, { rootMargin: "-45% 0px -50% 0px" }) : null;

function initPage() {
  tick();
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // scroll reveals
  document.querySelectorAll("[data-reveal]").forEach((el) => io ? io.observe(el) : el.classList.add("in"));

  // underline the nav link for the section on screen
  if (spy) { spy.disconnect(); ["work", "about", "experience", "contact"].forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); }); }

  // squiggles under section titles
  document.querySelectorAll(".sec-head h2").forEach((h) => {
    if (h.querySelector(".squig")) return;
    h.insertAdjacentHTML("beforeend", '<svg class="squig" viewBox="0 0 240 14" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M2 8 C 22 1, 38 13, 58 7 S 96 1, 116 7 S 154 13, 174 7 S 212 1, 238 6"/></svg>');
  });
}
if (!hasIO) document.documentElement.classList.add("no-io");

/* ---------- Day / night ---------- */
const root = document.documentElement;
const themeBtn = document.getElementById("themeBtn");
function labelTheme() {
  const next = root.dataset.theme === "dark" ? "day" : "night";
  themeBtn.setAttribute("aria-label", "Switch to " + next + " mode");
  themeBtn.title = "Switch to " + next + " mode";
}
labelTheme();
themeBtn.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  labelTheme();
});

/* ---------- Music ----------
   Plays music.mp3 on a loop. It keeps playing while visitors move
   between pages (see "Page changes" below), and if a page is
   reloaded it picks up where it left off. */
const MUSIC_FILE = "music.mp3";
const musicBtn = document.getElementById("musicBtn");
const player = fileMusic(MUSIC_FILE);

function setMusicBtn(on) {
  musicBtn.setAttribute("aria-pressed", on);
  musicBtn.setAttribute("aria-label", on ? "Pause music" : "Play music");
  musicBtn.title = on ? "Pause music" : "Play music";
}
musicBtn.addEventListener("click", () => {
  const on = !player.isOn();
  if (on) player.play().catch(() => {}); else player.stop();
  setMusicBtn(on);
});

function fileMusic(src) {
  // preload "none" means the song only downloads once someone presses play
  const a = new Audio();
  a.preload = "none"; a.loop = true; a.src = src;
  const MAX = 0.4;
  let fade, on = false;
  // Time-based fade. It always finishes on schedule, even on iPhones and
  // iPads, where websites can't change the volume at all.
  function fadeTo(target, ms, done) {
    clearInterval(fade);
    const from = a.volume, t0 = Date.now();
    fade = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      try { a.volume = from + (target - from) * k; } catch (e) {}
      if (k >= 1) { clearInterval(fade); if (done) done(); }
    }, 40);
  }
  function save() {
    try { sessionStorage.setItem("music", JSON.stringify({ on: on, t: a.currentTime || 0 })); } catch (e) {}
  }
  addEventListener("pagehide", save);
  setInterval(() => { if (on) save(); }, 2000);
  return {
    play(fromTime) {
      on = true;
      if (fromTime) { a.preload = "auto"; try { a.currentTime = fromTime; } catch (e) {} }
      try { a.volume = 0; } catch (e) {}
      const p = a.play() || Promise.resolve();
      fadeTo(MAX, 800); save();
      return p.catch((err) => { on = false; clearInterval(fade); throw err; });
    },
    stop() {
      on = false; save();
      fadeTo(0, 350, () => a.pause());
      setTimeout(() => { if (!on) a.pause(); }, 450);   // safety net: always pauses
    },
    isOn() { return on; },
    seek(t) { const go = () => { try { a.currentTime = t; } catch (e) {} }; a.readyState ? go() : a.addEventListener("loadedmetadata", go, { once: true }); }
  };
}

// Resume after a reload or a regular page load, if music was on
(function () {
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem("music") || "null"); } catch (e) {}
  if (!saved || !saved.on) return;
  setMusicBtn(true);
  player.seek(saved.t || 0);
  player.play().catch(() => {
    // The browser wants a tap or click first: resume on the next one
    const go = (e) => {
      if (e && e.target && e.target.closest && e.target.closest("#musicBtn")) return;   // let the button decide
      if (musicBtn.getAttribute("aria-pressed") === "true" && !player.isOn()) player.play();
    };
    addEventListener("pointerdown", go, { once: true, capture: true });
    addEventListener("keydown", go, { once: true, capture: true });
  });
})();

/* ---------- Snail scroll progress ---------- */
(function () {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  const prog = document.createElement("div");
  prog.className = "progress"; prog.setAttribute("aria-hidden", "true");
  prog.innerHTML = '<div class="bar"></div><img src="images/snail.png" alt="">';
  nav.appendChild(prog);
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    prog.style.setProperty("--p", max > 0 ? Math.min(1, scrollY / max) : 0);
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();
})();

initPage();

/* ---------- Page changes ----------
   Links between your own pages swap the content in place instead of
   reloading the whole page, so the music keeps playing. If anything
   goes wrong it falls back to a normal page load. */
(function () {
  if (!window.fetch || !window.DOMParser || !history.pushState) return;
  const page = (u) => u.pathname.replace(/index\.html$/, "");

  let go = async function (url, push) {
    let html;
    try {
      const res = await fetch(url.href, { credentials: "same-origin", cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      html = await res.text();
    } catch (e) { location.href = url.href; return; }
    const doc = new DOMParser().parseFromString(html, "text/html");
    const newMain = doc.querySelector("main"), newFoot = doc.querySelector("footer");
    if (!newMain) { location.href = url.href; return; }
    document.querySelector("main").replaceWith(document.adoptNode(newMain));
    const foot = document.querySelector("footer");
    if (foot && newFoot) foot.replaceWith(document.adoptNode(newFoot));
    const newNav = doc.querySelector(".nav ul"), nav = document.querySelector(".nav ul");
    if (newNav && nav) nav.innerHTML = newNav.innerHTML;
    const newLogo = doc.querySelector(".nav .logo"), logo = document.querySelector(".nav .logo");
    if (newLogo && logo) logo.setAttribute("href", newLogo.getAttribute("href"));
    const newSkip = doc.querySelector(".skip"), skip = document.querySelector(".skip");
    if (newSkip && skip) { skip.setAttribute("href", newSkip.getAttribute("href")); skip.textContent = newSkip.textContent; }
    document.title = doc.title;
    if (push) history.pushState({}, "", url.href);
    initPage();
    const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (target) target.scrollIntoView(); else scrollTo(0, 0);
    dispatchEvent(new Event("scroll"));
    const h1 = document.querySelector("main h1");
    if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
  };

  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/(\.html|\/)$/.test(url.pathname)) return;
    if (page(url) === page(location)) return;            // same page: let the #section link scroll normally
    e.preventDefault();
    go(url, true);
  });
  let current = page(location);
  addEventListener("popstate", () => {
    const u = new URL(location.href);
    if (page(u) === current) return;                   // only the #section changed
    current = page(u); go(u, false);
  });
  const _go = go; go = async (url, push) => { current = page(url); return _go(url, push); };
})();

// pause / play for the screen carousel (works after in-place page swaps too)
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".car-toggle");
  if (!btn) return;
  const paused = btn.closest(".carousel").classList.toggle("paused");
  btn.setAttribute("aria-pressed", String(paused));
  btn.textContent = paused ? "Play" : "Pause";
});
