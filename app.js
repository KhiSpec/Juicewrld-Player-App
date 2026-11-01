const API_BASE = "https://juicewrldapi.com/juicewrld";
const audioPlayer = document.getElementById('audio-player');
const coverArt = document.getElementById('cover-art');
const trackTitle = document.getElementById('track-title');
const trackArtist = document.getElementById('track-artist');
const lyricsText = document.getElementById('lyrics');
const playPauseBtn = document.getElementById('play-pause');
const nextBtn = document.getElementById('next-track');

let isPlaying = false;

async function loadRandomSong() {
    try {
        // Fetch a random playable song
        const response = await fetch(`${API_BASE}/radio/random/`);
        const data = await response.json();

        // Update UI with track information
        trackTitle.textContent = data.song.name || "Unknown Title";
        trackArtist.textContent = data.song.credited_artists || "Juice WRLD";
        
        // Set cover art (prepend the base URL if needed)
        if (data.song.image_url) {
            coverArt.src = `https://juicewrldapi.com${data.song.image_url}`;
        } else {
            coverArt.src = ""; // Clear if no art
        }

        // Display lyrics if available
        lyricsText.textContent = data.song.lyrics || "Lyrics not available for this track.";

        // Set the audio source to the stream path
        audioPlayer.src = `${API_BASE}/files/download/?path=${encodeURIComponent(data.path)}`;
        
        // Reset play state
        isPlaying = false;
        playPauseBtn.textContent = "Play";

    } catch (error) {
        console.error("Error fetching song:", error);
        trackTitle.textContent = "Error loading song";
        trackArtist.textContent = "Check your connection";
    }
}

function togglePlay() {
    if (!audioPlayer.src) return;

    if (isPlaying) {
        audioPlayer.pause();
        playPauseBtn.textContent = "Play";
    } else {
        audioPlayer.play();
        playPauseBtn.textContent = "Pause";
    }
    isPlaying = !isPlaying;
}

// Event Listeners
playPauseBtn.addEventListener('click', togglePlay);
nextBtn.addEventListener('click', loadRandomSong);

// Load the first song when the app starts
loadRandomSong();