/* ---------- Clock + year ---------- */
const clock = document.getElementById("clock");
function tick() {
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  clock.textContent = t.toLowerCase();
}
if (clock) { tick(); setInterval(tick, 30000); }
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

/* ---------- Scroll reveals ---------- */
const reveals = document.querySelectorAll("[data-reveal]");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add("in"));
}

/* ---------- Underline the nav link for the section on screen ---------- */
const links = [...document.querySelectorAll(".nav ul a")];
const spy = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
  });
}, { rootMargin: "-45% 0px -50% 0px" });
["work", "about", "experience", "contact"].forEach((id) => { const el = document.getElementById(id); if (el) spy.observe(el); });

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
   By default this plays a soft lo-fi loop generated right in the
   browser, so there's no audio file to host or license.
   To use your own song instead, put an .mp3 in the folder and set
   MUSIC_FILE to its name, e.g. "music.mp3". */
const MUSIC_FILE = "music.mp3";

const musicBtn = document.getElementById("musicBtn");
const player = MUSIC_FILE ? fileMusic(MUSIC_FILE) : lofiMusic();
musicBtn.addEventListener("click", () => {
  const on = musicBtn.getAttribute("aria-pressed") !== "true";
  on ? player.play() : player.stop();
  musicBtn.setAttribute("aria-pressed", on);
  musicBtn.setAttribute("aria-label", on ? "Pause music" : "Play music");
  musicBtn.title = on ? "Pause music" : "Play music";
});

function fileMusic(src) {
  // preload "none" means the song only downloads once someone presses play
  const a = new Audio();
  a.preload = "none"; a.loop = true; a.src = src;
  const MAX = 0.4;
  let fade;
  function fadeTo(target, done) {
    clearInterval(fade);
    fade = setInterval(() => {
      const v = a.volume + (target > a.volume ? 0.02 : -0.02);
      if (Math.abs(target - a.volume) <= 0.02) { a.volume = target; clearInterval(fade); if (done) done(); }
      else a.volume = Math.min(1, Math.max(0, v));
    }, 40);
  }
  return {
    play() { a.volume = 0; a.play().catch(() => {}); fadeTo(MAX); },
    stop() { fadeTo(0, () => a.pause()); }
  };
}

function lofiMusic() {
  let ctx, out, bus, noise, timer, stopTimer, nextTime = 0, step = 0;
  const BPM = 72, beat = 60 / BPM;
  // Fmaj7, Em7, Dm7, Cmaj7 (MIDI note numbers)
  const chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  const roots = [41, 40, 38, 36];
  const melody = [72, 74, 76, 79, 81, 84];
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function setup() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    out = ctx.createGain(); out.gain.value = 0;
    const tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 2000;
    bus = ctx.createGain();
    const delay = ctx.createDelay(); delay.delayTime.value = beat * 0.75;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    const wet = ctx.createGain(); wet.gain.value = 0.25;
    bus.connect(tone);
    bus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(tone);
    tone.connect(out); out.connect(ctx.destination);

    // white noise, reused for hats and vinyl crackle
    const len = ctx.sampleRate * 2;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const crackleBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const c = crackleBuf.getChannelData(0);
    for (let i = 0; i < len; i++) c[i] = (Math.random() * 2 - 1) * 0.01 + (Math.random() < 0.0005 ? (Math.random() * 2 - 1) * 0.4 : 0);
    const crackle = ctx.createBufferSource(); crackle.buffer = crackleBuf; crackle.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1200;
    const cg = ctx.createGain(); cg.gain.value = 0.35;
    crackle.connect(hp); hp.connect(cg); cg.connect(out); crackle.start();
  }

  function keys(m, t, dur, vel) {
    [["triangle", 0], ["sine", 6]].forEach(([type, det]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = hz(m); o.detune.value = det;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel, t + 0.05);
      g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  function bass(m, t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 1.8);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + beat * 2);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.38, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.32);
  }
  function hit(t, freq, type, vol, len) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + len + 0.02);
  }

  function schedule(t) {
    const s = step % 32, ci = Math.floor(s / 8), pos = s % 8;
    if (s % 2) t += beat * 0.09;                       // a little swing
    if (pos === 0) chords[ci].forEach((m, i) => keys(m, t + i * 0.03, beat * 3.9, 0.045));
    if (pos === 0 || pos === 4) bass(roots[ci], t);
    if (pos === 0 || pos === 5) kick(t);
    if (pos === 2 || pos === 6) hit(t, 1800, "bandpass", 0.12, 0.14);  // soft snare
    if (s % 2) hit(t, 7000, "highpass", 0.03, 0.05);                   // hi-hat
    if (pos % 2 === 0 && Math.random() < 0.3) keys(melody[Math.floor(Math.random() * melody.length)], t, beat * 1.6, 0.03);
    step++;
  }
  function loop() {
    while (nextTime < ctx.currentTime + 0.3) { schedule(nextTime); nextTime += beat / 2; }
  }

  return {
    play() {
      if (!ctx) setup();
      clearTimeout(stopTimer);
      ctx.resume();
      if (!timer) { nextTime = ctx.currentTime + 0.1; timer = setInterval(loop, 60); }
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setTargetAtTime(0.5, ctx.currentTime, 0.6);   // fade in
    },
    stop() {
      if (!ctx) return;
      out.gain.cancelScheduledValues(ctx.currentTime);
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.25);    // fade out
      stopTimer = setTimeout(() => { clearInterval(timer); timer = null; ctx.suspend(); }, 1200);
    }
  };
}

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

/* ---------- Squiggles under section titles ---------- */
document.querySelectorAll(".sec-head h2").forEach((h) => {
  h.insertAdjacentHTML("beforeend", '<svg class="squig" viewBox="0 0 240 14" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8 C 22 1, 38 13, 58 7 S 96 1, 116 7 S 154 13, 174 7 S 212 1, 238 6"/></svg>');
});
if (!("IntersectionObserver" in window)) document.documentElement.classList.add("no-io");
