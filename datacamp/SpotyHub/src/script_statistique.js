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
    console.log(topTracks);

    populateUI(topArtists, 'topArtists');

    populateUI(topTracks, 'topTracks');
    //mettre un temps d'attente

    refreshFeatures(token, topTracks);
}

async function refreshFeatures(token, tracks) {
    const topTracksElement = document.getElementById("top-tracks-features");
    if (!topTracksElement) {
        console.error("Element with ID 'top-tracks-features' not found.");
        return;
    }
    try {
        const features = await fetchAudioFeatures(token, tracks.items);
        tracks.features = features;
        console.log(features);
        //les afficher en créant des éléments html
        const list = document.createElement('ul');
        list.className = "list-group";
        topTracksElement.innerHTML = '';
        topTracksElement.appendChild(list);
        features.audio_features.forEach(item => {
            const listItem = document.createElement('li');
            listItem.className = "list-group-item";
            listItem.innerText = item.name;
            list.appendChild(listItem);
        });
        
    } catch (error) {
        console.error(error);
    }
}

async function fetchTop(token, type, time_range = 'long_term') {
    const result = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=${time_range}&limit=10&offset=0`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });
    return await result.json();
}



async function fetchAudioFeatures(token, trackId) {
    let requete= 'https://api.spotify.com/v1/audio-features/?ids='
    for (let i = 0; i < trackId.length; i++) {
        requete = requete + trackId[i].id + ','
        if (i == trackId.length - 1) {
            requete = requete.slice(0, -1)
        }
    }
    const result = await fetch(requete, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }

    });
    console.log(result);
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