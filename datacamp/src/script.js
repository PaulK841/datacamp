const clientId = "a80cc994deaf48b6a7363687970d729b"; // Remplacez par votre client ID
const redirectUri = "https://datacamp40.netlify.app/datacamp/callback"; // URL de redirection

const code = new URLSearchParams(window.location.search).get("code");

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    (async () => {
        try {
            const accessToken = await getAccessToken(clientId, code);
            const profile = await fetchProfile(accessToken);
            populateUI(profile);
            const tracks = await fetchTopTracks(accessToken, 'tracks');
            await fetchTopTracksFeatures(accessToken, tracks);
        } catch (err) {
            console.error("Error during authentication process:", err);
            alert("Failed to authenticate: " + err.message);
        }
    })();
}

async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!result.ok) {
        const error = await result.json();
        throw new Error(`Error fetching profile: ${error.error.message}`);
    }

    return await result.json();
}

async function fetchTopTracks(token, type, time_range = 'long_term') {
    const result = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=${time_range}&limit=50&offset=0`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!result.ok) {
        const error = await result.json();
        throw new Error(`Error fetching top tracks: ${error.error.message}`);
    }

    return await result.json();
}

async function fetchTopTracksFeatures(token, tracks) {
    const topTracks = document.getElementById("tracks-list");
    const csvRows = [];
    const headers = ["Name", "Acousticness", "Danceability", "Duration (ms)", "Energy", "Instrumentalness", "Key", "Liveness", "Loudness", "Mode", "Speechiness", "Tempo", "Time Signature", "Valence"];
    csvRows.push(headers.join(","));

    for (const track of tracks.items) {
        const result = await fetch(`https://api.spotify.com/v1/audio-features/${track.id}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!result.ok) {
            const error = await result.json();
            throw new Error(`Error fetching track features: ${error.error.message}`);
        }

        const features = await result.json();
        track.features = features;

        // Affiche les caractéristiques de la piste
        const li = document.createElement("li");
        li.textContent = `${track.name} - Danceability: ${features.danceability}, Energy: ${features.energy}, Tempo: ${features.tempo}`;
        topTracks.appendChild(li);
    }
}

async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    // Stockez le code_verifier dans le stockage local
    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", redirectUri);
    params.append("scope", "user-read-private user-read-email user-top-read");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const hash = await window.crypto.subtle.digest('SHA-256', data);
    const base64Url = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return base64Url;
}

async function getAccessToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    if (!result.ok) {
        const error = await result.json();
        throw new Error(`Failed to fetch access token: ${error.error_description}`);
    }

    const data = await result.json();
    return data.access_token;
}

function populateUI(profile) {
    document.getElementById("displayName").textContent = profile.display_name;
    document.getElementById("id").textContent = profile.id;
    document.getElementById("email").textContent = profile.email;
    document.getElementById("uri").textContent = profile.uri;
    document.getElementById("uri").href = profile.uri;
    document.getElementById("url").textContent = profile.external_urls.spotify;
    document.getElementById("url").href = profile.external_urls.spotify;
    document.getElementById("imgUrl").textContent = profile.images[0]?.url || "No image available";

    const avatar = document.getElementById("avatar");
    avatar.innerHTML = `<img src="${profile.images[0]?.url}" alt="Profile Image" width="150">`;
}

function populateTopTracks(tracks) {
    const topTracks = document.getElementById("tracks-list");
    topTracks.innerHTML = "";
    tracks.items.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item.name;
        topTracks.appendChild(li);
    });
}

