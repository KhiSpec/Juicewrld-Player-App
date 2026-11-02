// ---- CONFIG: verify these against https://juicewrldapi.com docs ----
const API_BASE = "https://juicewrldapi.com";
const RANDOM_PATH = "/juicewrld/radio/random/";
const FILE_PATH = "/juicewrld/files/download/";
const ART_PREFIX = "";

// ---- ELEMENTS ----
const audio = document.getElementById("audio");
const art = document.getElementById("art");
const wash = document.getElementById("wash");
const titleEl = document.getElementById("title");
const artistNameEl = document.getElementById("artist-name");
const albumEl = document.getElementById("album");
const lyricsScroll = document.getElementById("lyrics-scroll");
const iconPlay = document.getElementById("icon-play");
const iconPause = document.getElementById("icon-pause");
const playBtn = document.getElementById("play");
const nextBtn = document.getElementById("next");
const prevBtn = document.getElementById("prev");
const shuffleBtn = document.getElementById("shuffle");
const repeatBtn = document.getElementById("repeat");
const likeBtn = document.getElementById("like");
const track = document.getElementById("track");
const fill = document.getElementById("fill");
const thumb = document.getElementById("thumb");
const timeElapsed = document.getElementById("time-elapsed");
const timeRemaining = document.getElementById("time-remaining");
const statusEl = document.getElementById("status");

let isPlaying = false;
let syncedLines = [];
let shuffleOn = false;
let repeatMode = "off";
let liked = false;

// ---- helpers ----
const pick = (obj, ...keys) => {
  for (const k of keys) {
    const v = k.split(".").reduce((o, p) => (o && o[p] !== undefined ? o[p] : undefined), obj);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

const fmt = (s) => {
  if (!isFinite(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
};

function setArtwork(url) {
  if (!url) {
    art.classList.add("empty");
    wash.classList.remove("on");
    return;
  }
  const full = url.startsWith("http") ? url : ART_PREFIX + url;
  art.src = full;
  art.classList.remove("empty");
  wash.style.backgroundImage = `url("${full}")`;
  wash.classList.add("on");
}

function renderLyrics(raw) {
  lyricsScroll.innerHTML = "";
  lyricsScroll.style.transform = "translateY(0)";
  syncedLines = [];
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    lyricsScroll.innerHTML = '<div class="lyric placeholder">No lyrics for this track</div>';
    return;
  }
  const isLRC = /\[\d{1,2}:\d{2}(\.\d+)?\]/.test(raw);
  if (isLRC) {
    raw.split("\n").forEach((line) => {
      const m = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d+))?\](.*)$/);
      if (!m) return;
      const t = parseInt(m[1]) * 60 + parseInt(m[2]) + (m[3] ? parseFloat("0." + m[3]) : 0);
      const text = m[4].trim();
      if (!text) return;
      const el = document.createElement("div");
      el.className = "lyric";
      el.textContent = text;
      lyricsScroll.appendChild(el);
      syncedLines.push({ time: t, el });
    });
  } else {
    raw.split("\n").forEach((line) => {
      if (!line.trim()) return;
      const el = document.createElement("div");
      el.className = "lyric";
      el.textContent = line.trim();
      lyricsScroll.appendChild(el);
    });
    const first = lyricsScroll.querySelector(".lyric");
    if (first) first.classList.add("active");
  }
}

function highlight(time) {
  if (!syncedLines.length) return;
  let idx = -1;
  for (let i = 0; i < syncedLines.length; i++) {
    if (time >= syncedLines[i].time) idx = i; else break;
  }
  syncedLines.forEach((l, i) => l.el.classList.toggle("active", i === idx));
  if (idx >= 0) {
    const el = syncedLines[idx].el;
    const stage = lyricsScroll.parentElement;
    const offset = el.offsetTop + el.offsetHeight / 2 - stage.clientHeight / 2;
    lyricsScroll.style.transform = `translateY(${-offset}px)`;
  }
}

async function loadRandom() {
  try {
    titleEl.textContent = "Loading…";
    artistNameEl.textContent = "Juice WRLD";
    albumEl.style.display = "none";
    statusEl.textContent = "Loading…";
    statusEl.className = "status-line";

    const res = await fetch(API_BASE + RANDOM_PATH, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const song = data.song || data.data || data;

    const title = pick(song, "name", "title", "track_name") || "Unknown Title";
    const artist = pick(song, "credited_artists", "artist", "artists", "artist_name") || "Juice WRLD";
    const album = pick(song, "album", "album_name");
    const artUrl = pick(song, "image_url", "cover_art", "artwork", "image");
    const lyrics = pick(song, "lyrics", "synced_lyrics", "plain_lyrics", "lyric");
    const path = pick(data, "path", "song.path", "file", "download_path") ||
                 pick(song, "path", "file_path", "stream_path");

    titleEl.textContent = title;
    artistNameEl.textContent = artist;
    if (album) {
      albumEl.textContent = album;
      albumEl.style.display = "inline";
    }
    setArtwork(artUrl);
    renderLyrics(lyrics);

    if (path) {
      audio.src = API_BASE + FILE_PATH + "?path=" + encodeURIComponent(path);
      statusEl.textContent = "Ready";
    } else {
      audio.src = "";
      statusEl.textContent = "No audio path";
    }
    isPlaying = false;
    iconPlay.style.display = "";
    iconPause.style.display = "none";
    liked = false;
    likeBtn.classList.remove("liked");
  } catch (e) {
    console.error(e);
    titleEl.textContent = "Couldn't load track";
    artistNameEl.textContent = "Check connection";
    statusEl.textContent = "Error";
    statusEl.className = "status-line paused";
  }
}

function togglePlay() {
  if (!audio.src) return;
  if (isPlaying) {
    audio.pause();
    iconPlay.style.display = "";
    iconPause.style.display = "none";
    statusEl.textContent = "Paused";
    statusEl.className = "status-line paused";
  } else {
    audio.play().catch((e) => console.warn("play blocked:", e));
    iconPlay.style.display = "none";
    iconPause.style.display = "";
    statusEl.textContent = "Playing";
    statusEl.className = "status-line";
  }
  isPlaying = !isPlaying;
}

playBtn.addEventListener("click", togglePlay);
nextBtn.addEventListener("click", loadRandom);
prevBtn.addEventListener("click", () => {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  loadRandom();
});
shuffleBtn.addEventListener("click", () => {
  shuffleOn = !shuffleOn;
  shuffleBtn.classList.toggle("on", shuffleOn);
});
repeatBtn.addEventListener("click", () => {
  repeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
  repeatBtn.classList.toggle("on", repeatMode !== "off");
  repeatBtn.querySelector(".label").textContent =
    repeatMode === "off" ? "Repeat" : repeatMode === "all" ? "Repeat all" : "Repeat one";
});
likeBtn.addEventListener("click", () => {
  liked = !liked;
  likeBtn.classList.toggle("liked", liked);
});

audio.addEventListener("timeupdate", () => {
  const d = audio.duration || 0;
  const c = audio.currentTime || 0;
  const f = d ? c / d : 0;
  fill.style.width = f * 100 + "%";
  fill.classList.toggle("paused", !isPlaying);
  thumb.style.left = f * 100 + "%";
  timeElapsed.textContent = fmt(c);
  timeRemaining.textContent = "-" + fmt(d - c);
  highlight(c);
});

audio.addEventListener("ended", () => {
  if (repeatMode === "one") {
    audio.currentTime = 0;
    audio.play();
    return;
  }
  loadRandom();
});

track.addEventListener("click", (e) => {
  const r = track.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  if (audio.duration) audio.currentTime = ratio * audio.duration;
});

loadRandom();
