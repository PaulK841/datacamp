// script_recommendation.js

// === CONFIGURATION ===
const clientId     = "a80cc994deaf48b6a7363687970d729b";      // Votre Client ID
const redirectUri  = "https://datacamp40.netlify.app/datacamp/spotyhub/redirect.html";
const scopes       = "user-read-private user-read-email user-top-read playlist-modify-public playlist-modify-private";

// === PKCE / AUTHORIZATION CODE FLOW ===
// Génère un code verifier aléatoire
function generateCodeVerifier(length = 128) {
  let text = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

// Génère le code challenge (SHA-256 + base64-urlencode)
async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Redirige l’utilisateur vers Spotify pour autorisation
async function redirectToAuthCodeFlow() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  localStorage.setItem("pkce_verifier", verifier);

  const params = new URLSearchParams({
    client_id:           clientId,
    response_type:       "code",
    redirect_uri:        redirectUri,
    scope:               scopes,
    code_challenge_method: "S256",
    code_challenge:      challenge
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Récupère l’access token en échange du code d’autorisation
async function getAccessToken(code) {
  const verifier = localStorage.getItem("pkce_verifier");
  const body = new URLSearchParams({
    client_id:     clientId,
    grant_type:    "authorization_code",
    code:          code,
    redirect_uri:  redirectUri,
    code_verifier: verifier
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString()
  });
  if (!res.ok) {
    throw new Error(`Token error ${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  localStorage.setItem("spotify_access_token", json.access_token);
  return json.access_token;
}

// Retourne l’access token stocké ou lance le flow si besoin
async function ensureAccessToken() {
  const params = new URLSearchParams(window.location.search);
  const code   = params.get("code");
  let token     = localStorage.getItem("spotify_access_token");

  if (code && !token) {
    // On vient de rediriger depuis Spotify : échange du code
    token = await getAccessToken(code);
    // Nettoyage de l’URL
    window.history.replaceState({}, document.title, redirectUri);
  }
  if (!token) {
    // Jamais authentifié : on démarre le PKCE flow
    await redirectToAuthCodeFlow();
    return null; // la page va reload / rediriger
  }
  return token;
}

// === FONCTIONS DE RECOMMANDATION ===
async function fetchTopTracks(token, limit = 10, time_range = "long_term") {
  const url = `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=${time_range}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Top tracks error ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.items;
}

async function fetchAudioFeatures(token, ids=[]) {
  if (!ids.length) return [];
  const url = `https://api.spotify.com/v1/audio-features?ids=${ids.join(",")}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Audio features error ${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  return json.audio_features.filter(f => f); // on retire les éventuels null
}

function recommendSongs(features, topN = 5) {
  // par exemple, on choisit les plus « énergétiques »
  return features
    .sort((a, b) => b.energy - a.energy)
    .slice(0, topN);
}

// === MAIN ===
async function onRecommendClick() {
  try {
    const token  = await ensureAccessToken();
    if (!token) return;  // redirection en cours

    const tracks   = await fetchTopTracks(token);
    console.log("Top tracks:", tracks);

    const ids      = tracks.map(t => t.id);
    const features = await fetchAudioFeatures(token, ids);
    console.log("Audio features:", features);

    const recs     = recommendSongs(features, 5);
    console.log("Recommendations:", recs);

    const list = document.getElementById("recommendation-list");
    list.innerHTML = "";
    recs.forEach(f => {
      const track = tracks.find(t => t.id === f.id);
      const li    = document.createElement("li");
      li.textContent = `${track.name} – ${track.artists.map(a => a.name).join(", ")}`;
      list.appendChild(li);
    });

  } catch (err) {
    console.error("Erreur lors de la recommandation :", err);
    alert("Oups, une erreur est survenue : " + err.message);
  }
}

// On branche le bouton après chargement
window.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("recommend-btn")
    .addEventListener("click", onRecommendClick);
});
