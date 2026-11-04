/* ============================================================
   CONFIG — verify these against the Juice WRLD API docs
   If the app shows "No audio path", open the browser console
   (F12) and check the debug panel for what the API returned.
   ============================================================ */
const CONFIG = {
  API_BASE: "https://juicewrldapi.com",
  RANDOM_PATH: "/juicewrld/radio/random/",
  FILE_PATH: "/juicewrld/files/download/",
  DEBUG: true,
};

// ---- elements ----
const el = (id) => document.getElementById(id);
const audio = el("audio");
const art = el("art");
const artPlaceholder = el("art-placeholder");
const wash = el("wash");
const titleEl = el("title");
const artistNameEl = el("artist-name");
const albumEl = el("album");
const lyricsScroll = el("lyrics-scroll");
const iconPlay = el("icon-play");
const iconPause = el("icon-pause");
const playBtn = el("play");
const nextBtn = el("next");
const prevBtn = el("prev");
const shuffleBtn = el("shuffle");
const repeatBtn = el("repeat");
const likeBtn = el("like");
const track = el("track");
const fill = el("fill");
const thumb = el("thumb");
const timeElapsed = el("time-elapsed");
const timeRemaining = el("time-remaining");
const statusEl = el("status");
const debugEl = el("debug");

let isPlaying = false;
let syncedLines = [];
let shuffleOn = false;
let repeatMode = "off";
let liked = false;
let currentArtUrl = "";

// ---- debug ----
function debug(...args) {
  if (!CONFIG.DEBUG) return;
  const line = args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" ");
  debugEl.textContent += line + "\n";
  debugEl.classList.add("on");
  debugEl.scrollTop = debugEl.scrollHeight;
  console.log(...args);
}

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

function setStatus(text, state) {
  statusEl.textContent = text;
  statusEl.className = state || "";
}

// ---- artwork ----
function setArtwork(url) {
  currentArtUrl = url;
  if (!url) {
    art.classList.add("empty");
    artPlaceholder.style.display = "flex";
    wash.classList.remove("on");
    return;
  }
  const full = url.startsWith("http") ? url : CONFIG.API_BASE + url;
  debug("Setting artwork:", full);
  art.onerror = () => {
    debug("Artwork failed to load:", full);
    art.classList.add("empty");
    artPlaceholder.style.display = "flex";
  };
  art.onload = () => {
    art.classList.remove("empty");
    artPlaceholder.style.display = "none";
  };
  art.src = full;
  wash.style.backgroundImage = `url("${full}")`;
  wash.classList.add("on");
}

// ---- lyrics ----
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
    debug("Lyrics format: LRC (synced)");
    raw.split("\n").forEach((line) => {
      const m = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d+))?\](.*)$/);
      if (!m) return;
      const t = parseInt(m[1]) * 60 + parseInt(m[2]) + (m[3] ? parseFloat("0." + m[3]) : 0);
      const text = m[4].trim();
      if (!text) return;
      const div = document.createElement("div");
      div.className = "lyric";
      div.textContent = text;
      lyricsScroll.appendChild(div);
      syncedLines.push({ time: t, el: div });
    });
    if (!syncedLines.length) {
      lyricsScroll.innerHTML = '<div class="lyric placeholder">No lyrics for this track</div>';
    }
  } else {
    debug("Lyrics format: plain text");
    raw.split("\n").forEach((line) => {
      if (!line.trim()) return;
      const div = document.createElement("div");
      div.className = "lyric";
      div.textContent = line.trim();
      lyricsScroll.appendChild(div);
    });
    const first = lyricsScroll.querySelector(".lyric");
    if (first) first.classList.add("active");
  }
}

function highlightLyrics(time) {
  if (!syncedLines.length) return;
  let idx = -1;
  for (let i = 0; i < syncedLines.length; i++) {
    if (time >= syncedLines[i].time) idx = i;
    else break;
  }
  syncedLines.forEach((l, i) => l.el.classList.toggle("active", i === idx));
  if (idx >= 0) {
    const lineEl = syncedLines[idx].el;
    const stage = lyricsScroll.parentElement;
    const offset = lineEl.offsetTop + lineEl.offsetHeight / 2 - stage.clientHeight / 2;
    lyricsScroll.style.transform = `translateY(${-offset}px)`;
  }
}

// ---- load ----
async function loadRandom() {
  setStatus("Loading…", "");
  titleEl.textContent = "Loading…";
  artistNameEl.textContent = "Juice WRLD";
  albumEl.style.display = "none";
  lyricsScroll.innerHTML = '<div class="lyric placeholder">Loading lyrics…</div>';
  syncedLines = [];

  try {
    const url = CONFIG.API_BASE + CONFIG.RANDOM_PATH;
    debug("Fetching:", url);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    debug("Response status:", res.status);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json();
    debug("Raw API response:", data);

    const song = data.song || data.data || data;
    const title = pick(song, "name", "title", "track_name", "song_name") || "Unknown Title";
    const artist = pick(song, "credited_artists", "artist", "artists", "artist_name") || "Juice WRLD";
    const album = pick(song, "album", "album_name");
    const artUrl = pick(song, "image_url", "cover_art", "artwork", "image", "cover");
    const lyrics = pick(song, "synced_lyrics", "lyrics", "plain_lyrics", "lyric", "lyric_text");
    const path = pick(data, "path", "song.path", "file", "download_path", "url") ||
                 pick(song, "path", "file_path", "stream_path", "download_url");

    debug("Extracted → title:", title, "| artist:", artist, "| art:", artUrl, "| path:", path);

    titleEl.textContent = title;
    artistNameEl.textContent = artist;
    if (album) {
      albumEl.textContent = album;
      albumEl.style.display = "inline";
    }

    setArtwork(artUrl);
    renderLyrics(lyrics);

    if (path) {
      const audioUrl = CONFIG.API_BASE + CONFIG.FILE_PATH + "?path=" + encodeURIComponent(path);
      debug("Audio URL:", audioUrl);
      audio.src = audioUrl;
      setStatus("Ready to play", "");
    } else {
      debug("ERROR: No path found in API response. Check field names in CONFIG / pick().");
      audio.src = "";
      setStatus("No audio path", "error");
    }

    isPlaying = false;
    iconPlay.style.display = "";
    iconPause.style.display = "none";
    liked = false;
    likeBtn.classList.remove("liked");
    fill.style.width = "0%";
    thumb.style.left = "0%";
    timeElapsed.textContent = "0:00";
    timeRemaining.textContent = "0:00";

  } catch (err) {
    debug("FETCH ERROR:", err.message, err.stack);
    titleEl.textContent = "Couldn't load track";
    artistNameEl.textContent = "Check connection";
    setStatus("Error: " + err.message, "error");
    lyricsScroll.innerHTML = '<div class="lyric placeholder">—</div>';
  }
}

// ---- controls ----
function togglePlay() {
  if (!audio.src) return;
  if (isPlaying) {
    audio.pause();
  } else {
    audio.play().catch((e) => {
      debug("Play blocked:", e.message);
      setStatus("Play blocked: " + e.message, "error");
    });
  }
}

playBtn.addEventListener("click", togglePlay);
nextBtn.addEventListener("click", loadRandom);
prevBtn.addEventListener("click", () => {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
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

// ---- audio events ----
audio.addEventListener("play", () => {
  isPlaying = true;
  iconPlay.style.display = "none";
  iconPause.style.display = "";
  setStatus("Playing", "playing");
});

audio.addEventListener("pause", () => {
  isPlaying = false;
  iconPlay.style.display = "";
  iconPause.style.display = "none";
  setStatus("Paused", "paused");
});

audio.addEventListener("timeupdate", () => {
  const d = audio.duration || 0;
  const c = audio.currentTime || 0;
  const f = d ? c / d : 0;
  fill.style.width = (f * 100) + "%";
  fill.classList.toggle("paused", !isPlaying);
  thumb.style.left = (f * 100) + "%";
  timeElapsed.textContent = fmt(c);
  timeRemaining.textContent = "-" + fmt(d - c);
  highlightLyrics(c);
});

audio.addEventListener("ended", () => {
  if (repeatMode === "one") {
    audio.currentTime = 0;
    audio.play().catch(() => {});
    return;
  }
  loadRandom();
});

audio.addEventListener("error", () => {
  const code = audio.error ? audio.error.code : "?";
  const msg = {
    1: "aborted",
    2: "network error",
    3: "decode error (codec not supported?)",
    4: "format not supported or source not found",
  }[code] || "unknown";
  debug("AUDIO ERROR:", code, msg, "| src:", audio.src);
  setStatus("Audio error: " + msg, "error");
});

// ---- seek ----
track.addEventListener("click", (e) => {
  const r = track.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  if (audio.duration) {
    audio.currentTime = ratio * audio.duration;
    debug("Seek to", Math.round(ratio * audio.duration), "s");
  }
});

// ---- boot ----
debugEl.classList.toggle("on", CONFIG.DEBUG);
debug("App started. CONFIG:", CONFIG);
loadRandom();
