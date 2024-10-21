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
        for (let i = 0; i < features.audio_features.length; i++) {
            const track = tracks.items[i];
            const feature = features.audio_features[i];
            const trackElement = document.createElement('div');
            trackElement.innerHTML = `<h3>${track.name}</h3>
            <ul>
                <li>Duration: ${track.duration_ms} ms</li>
                <li>Popularity: ${track.popularity}</li>
                <li>Acousticness: ${feature.acousticness}</li>
                <li>Danceability: ${feature.danceability}</li>
                <li>Energy: ${feature.energy}</li>
                <li>Instrumentalness: ${feature.instrumentalness}</li>
                <li>Liveness: ${feature.liveness}</li>
                <li>Loudness: ${feature.loudness}</li>
                <li>Speechiness: ${feature.speechiness}</li>
                <li>Tempo: ${feature.tempo}</li>
                <li>Valence: ${feature.valence}</li>
            </ul>`;
            topTracksElement.appendChild(trackElement);
        }

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



export async function fetchAudioFeatures(token, trackId) {
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



document.addEventListener('DOMContentLoaded', async function() {
    const url = 'https://raw.githubusercontent.com/PaulK841/datacamp/main/datacamp/SpotyHub/src/dataset.csv';
    Papa.parse(url, {
        download: true,
        header: true, // Utilisez false si vous n'avez pas de ligne d'en-tête
        complete: async function(results) {
            console.log('Premiers éléments du dataset:', results.data.slice(0, 5)); // Affiche les 5 premiers éléments

            // Appel de la fonction asynchrone pour récupérer les chansons
            try {
                const fetchedSongs = await fetchAudioFeatures();  // Attend la récupération des chansons
                console.log('Chansons récupérées:', fetchedSongs);

                // Appel de la fonction de recommandation
                const recommendations = recommendSongs(results.data, fetchedSongs);
                console.log('Recommandations:', recommendations);
                
                // Ici, tu peux ajouter du code pour afficher les recommandations sur ta page
            } catch (error) {
                console.error('Erreur lors de la récupération des chansons:', error);
            }
        },
        error: function(error) {
            console.error('Erreur de chargement du CSV:', error);
        }
    });
});

// Fonction de recommandation de chansons
function recommendSongs(dataset, fetchedSongs) {
    // Fonction pour calculer la similarité entre deux chansons
    function calculateSimilarity(song1, song2) {
        let similarity = 0;
        const attributes = ['danceability', 'energy', 'valence']; // Exemple d'attributs
        attributes.forEach(attr => {
            similarity += Math.abs(song1[attr] - song2[attr]);
        });
        return similarity;
    }

    // Calcul des recommandations
    const recommendations = dataset.map(song => {
        let totalSimilarity = 0;
        fetchedSongs.forEach(fetchedSong => {
            totalSimilarity += calculateSimilarity(song, fetchedSong);
        });
        return { song, similarity: totalSimilarity };
    });

    // Tri des recommandations par similarité croissante
    recommendations.sort((a, b) => a.similarity - b.similarity);

    // Retourne les 10 meilleures recommandations
    return recommendations.slice(0, 10).map(rec => rec.song);
}
