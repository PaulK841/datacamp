document.addEventListener('DOMContentLoaded', async () => {
    const accessToken = localStorage.getItem('accessToken');
    const profile = await fetchProfile(accessToken);
    populateUI_profile(profile);

    // Fetch the top 10 artists and tracks
    await refreshTopArtists();
    await refreshTopTracks();
    const topTracks = await fetchTopTracks(accessToken, 'tracks');
    await fetchTopTracksFeatures(accessToken, topTracks);
});

// Add event listeners to the select elements
document.getElementById("artists-time-range").addEventListener('change', refreshTopArtists);
document.getElementById("tracks-time-range").addEventListener('change', refreshTopTracks);

async function refreshTopArtists() {
    const timeRange = document.getElementById("artists-time-range").value;
    const topArtists = await fetchTop(accessToken, 'artists', timeRange);
    populateUI(topArtists, 'topArtists');
}

async function refreshTopTracks() {
    const timeRange = document.getElementById("tracks-time-range").value;
    const topTracks = await fetchTop(accessToken, 'tracks', timeRange);
    populateUI(topTracks, 'topTracks');
}

async function fetchTopTracks(token, type, time_range = 'long_term') {
    const result = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=${time_range}&limit=50&offset=0`, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    return await result.json();
}

async function fetchTopTracksFeatures(token, tracks) {
    const topTracks = document.getElementById("top-tracks-features");

    if (!topTracks) {
        console.error("L'élément avec l'ID 'top-tracks-features' n'existe pas.");
        return;
    }

    const csvRows = [];
    const headers = ["Name", "Acousticness", "Danceability", "Duration (ms)", "Energy", "Instrumentalness", "Key", "Liveness", "Loudness", "Mode", "Speechiness", "Tempo", "Time Signature", "Valence"];
    csvRows.push(headers.join(","));

    for (const track of tracks.items) {
        let result;

        // Récupération des caractéristiques avec gestion des erreurs
        while (true) {
            try {
                result = await fetch(`https://api.spotify.com/v1/audio-features/${track.id}`, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (result.status === 429) {
                    const retryAfter = result.headers.get('Retry-After') || 2;
                    console.warn(`Rate limit exceeded for track ${track.name}. Retrying after ${retryAfter} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    continue;
                }

                if (!result.ok) {
                    throw new Error(`Error fetching audio features for track ${track.name}: ${result.statusText}`);
                }

                break; // Sortir de la boucle si la requête réussit
            } catch (error) {
                console.error(error);
                break; // Sortir de la boucle sur une autre erreur
            }
        }

        // Ajouter une pause entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 500)); // Attendre 500ms avant de faire la prochaine requête

        // Si la requête a réussi, traiter les fonctionnalités
        if (result) {
            const features = await result.json();
            track.features = features;

            // Display track features
            const li = document.createElement("li");
            li.textContent = `${track.name} - Danceability: ${features.danceability}, Energy: ${features.energy}, Tempo: ${features.tempo}`;
            topTracks.appendChild(li);

            // Prepare CSV row
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
        }
    }

    // Save CSV
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", "top-tracks-features.csv");
    a.click();
}



// Fetch top items (artists or tracks) with a limit of 10
async function fetchTop(token, type, time_range = 'long_term') {
    const result = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=${time_range}&limit=10&offset=0`, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    return await result.json();
}

// Populate the UI with the top items (artists or tracks)
function populateUI(top, id) {
    const list = document.getElementById(id);
    list.innerHTML = ''; // Clear the list before populating it

    // Check if the top object has any items
    if (top.items.length > 0) {
        // Loop over each item and create a new list item for it
        top.items.forEach(item => {
            const listItem = document.createElement('li');
            listItem.innerText = item.name;
            list.appendChild(listItem);
        });
    } else {
        // If no items were found, display a message
        const listItem = document.createElement('li');
        listItem.innerText = `No top ${id} found`;
        list.appendChild(listItem);
    }
}

// La fonction fetchProfile envoie une requête GET à Spotify pour obtenir le profil de l'utilisateur.
async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    // Renvoyer le profil de l'utilisateur sous forme de JSON.
    return await result.json();
}

// La fonction populateUI met à jour l'interface utilisateur avec les informations du profil de l'utilisateur.
function populateUI_profile(profile) {
    // Mettre à jour les éléments HTML avec les informations du profil de l'utilisateur.
    // Les informations affichées incluent le nom d'affichage de l'utilisateur, l'image de profil, l'ID de l'utilisateur, le pays, l'e-mail, l'URI Spotify de l'utilisateur et l'URL de l'utilisateur.
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
