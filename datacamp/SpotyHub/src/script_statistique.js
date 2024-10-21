// Récupère le token d'accès depuis le stockage local du navigateur. 
document.addEventListener('DOMContentLoaded', async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('Access token not found');
        return;
    }

    try {
        const profile = await fetchProfile(accessToken);
        populateUI_profile(profile);

        // Fetch the top 10 artists and tracks
        await refreshTopData(accessToken);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
});

// Add event listeners to the select elements
document.getElementById("artists-time-range").addEventListener('change', () => refreshTopData(localStorage.getItem('accessToken')));
document.getElementById("tracks-time-range").addEventListener('change', () => refreshTopData(localStorage.getItem('accessToken')));

async function refreshTopData(token) {
    const [topArtists, topTracks] = await Promise.all([
        fetchTop(token, 'artists', document.getElementById("artists-time-range").value),
        fetchTop(token, 'tracks', document.getElementById("tracks-time-range").value)
    ]);

    populateUI(topArtists, 'topArtists');
    populateUI(topTracks, 'topTracks');
    refreshFeatures(token, topTracks);
}

async function refreshFeatures(token, tracks) {
    const topTracksElement = document.getElementById("top-tracks-features");
    if (!topTracksElement) {
        console.error("Element with ID 'top-tracks-features' not found.");
        return;
    }

    const csvRows = [];
    const headers = ["Name", "Acousticness", "Danceability", "Duration (ms)", "Energy", "Instrumentalness", "Key", "Liveness", "Loudness", "Mode", "Speechiness", "Tempo", "Time Signature", "Valence"];
    csvRows.push(headers.join(","));

    for (const track of tracks.items) {
        try {
            const features = await fetchAudioFeatures(token, track.id);
            track.features = features;

            const li = document.createElement("li");
            li.textContent = `${track.name} - Danceability: ${features.danceability}, Energy: ${features.energy}, Tempo: ${features.tempo}`;
            topTracksElement.appendChild(li);

            const row = [
                track.name,
                features.acousticness,
                features.danceability,
                features.duration_ms,
                features.energy,
                features.instrumentalness,
                features.key,
                features.liveness,
                features.loudness,
                features.mode,
                features.speechiness,
                features.tempo,
                features.time_signature,
                features.valence
            ];
            csvRows.push(row.join(","));
        } catch (error) {
            console.error(`Error fetching audio features for track ${track.name}:`, error);
        }
    }

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", "top_tracks_features.csv");
    a.click();
}

async function fetchTop(token, type, time_range = 'long_term') {
    const result = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=${time_range}&limit=10&offset=0`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });
    return await result.json();
}

async function fetchAudioFeatures(token, trackId) {
    const result = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!result.ok) {
        throw new Error(`Error fetching audio features: ${result.statusText}`);
    }

    return await result.json();
}

function populateUI(top, id) {
    const list = document.getElementById(id);
    list.innerHTML = '';

    if (top.items.length > 0) {
        top.items.forEach(item => {
            const listItem = document.createElement('li');
            listItem.innerText = item.name;
            list.appendChild(listItem);
        });
    } else {
        const listItem = document.createElement('li');
        listItem.innerText = `No top ${id} found`;
        list.appendChild(listItem);
    }
}

async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

function populateUI_profile(profile) {
    document.getElementById("displayName").innerText = profile.display_name;
    localStorage.setItem('username', profile.display_name);
    localStorage.setItem('email', profile.email);

    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        profileImage.height = "40";
        profileImage.width = "40";
        document.getElementById("avatar").appendChild(profileImage);
    }
}