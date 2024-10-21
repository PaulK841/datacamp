document.addEventListener('DOMContentLoaded', async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('Access token not found');
        return;
    }

    const url = 'https://raw.githubusercontent.com/PaulK841/datacamp/main/datacamp/SpotyHub/src/dataset.csv';
    Papa.parse(url, {
        download: true,
        header: true,
        complete: async function(results) {
            console.log('Premiers éléments du dataset:', results.data.slice(0, 5));

            try {
                const trackId = await fetchTop(accessToken, 'tracks', 'long_term');
                console.log('Chansons récupérées:', trackId);
                const fetchedSongs = await refreshFeatures(accessToken, trackId);
                console.log('Chansons avec caractéristiques récupérées:', fetchedSongs);

                // Appel de la fonction de recommandation
                const recommendations = recommendSongs(results.data, fetchedSongs);
                console.log('Recommandations:', recommendations);
                
                // Afficher les recommandations sur la page
                displayRecommendations(recommendations);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        },
        error: function(error) {
            console.error('Error parsing CSV:', error);
        }
    });
});

// Fonction de recommandation de chansons
function recommendSongs(dataset, fetchedSongs) {
    // Fonction pour calculer la similarité cosinus entre deux chansons
    function calculateCosineSimilarity(song1, song2) {
        const attributes = ['danceability', 'energy', 'valence']; // Exemple d'attributs
        const dotProduct = attributes.reduce((sum, attr) => {
            return sum + (song1[attr] * song2[attr]);
        }, 0);

        const magnitudeSong1 = Math.sqrt(attributes.reduce((sum, attr) => {
            return sum + Math.pow(song1[attr], 2);
        }, 0));

        const magnitudeSong2 = Math.sqrt(attributes.reduce((sum, attr) => {
            return sum + Math.pow(song2[attr], 2);
        }, 0));

        // Évite la division par zéro
        if (magnitudeSong1 === 0 || magnitudeSong2 === 0) return 0;
        
        return dotProduct / (magnitudeSong1 * magnitudeSong2);
    }

    // Calcul des recommandations
    const recommendations = dataset.map(song => {
        let totalSimilarity = 0;
        fetchedSongs.forEach(fetchedSong => {
            totalSimilarity += calculateCosineSimilarity(song, fetchedSong);
        });
        return { song, similarity: totalSimilarity };
    });

    // Tri des recommandations par similarité décroissante
    recommendations.sort((a, b) => b.similarity - a.similarity);

    // Retourne les 10 meilleures recommandations
    return recommendations.slice(0, 10).map(rec => rec.song);
}

async function fetchTop(token, type, time_range = 'long_term') {
    const result = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=${time_range}&limit=10&offset=0`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });
    return await result.json();
}

async function fetchAudioFeatures(token, trackId) {
    let requete = 'https://api.spotify.com/v1/audio-features/?ids=';
    for (let i = 0; i < trackId.length; i++) {
        requete = requete + trackId[i].id + ',';
        if (i == trackId.length - 1) {
            requete = requete.slice(0, -1);
        }
    }
    const result = await fetch(requete, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!result.ok) {
        throw new Error(`Error fetching audio features: ${result.statusText}`);
    }
    const data = await result.json();
    return data.audio_features; // Renvoie seulement les caractéristiques audio
}

async function refreshFeatures(token, tracks) {
    try {
        const features = await fetchAudioFeatures(token, tracks.items);
        tracks.features = features;
        return tracks.features; // Renvoie les caractéristiques audio
    } catch (error) {
        console.error('Error fetching audio features:', error);
    }
}

// Fonction pour afficher les recommandations sur la page
function displayRecommendations(recommendations) {
    const recommendationsContainer = document.getElementById('topRecommendations');
    recommendationsContainer.innerHTML = ''; // Clear any existing content

    recommendations.forEach(song => {
        const songElement = document.createElement('div');
        songElement.textContent = `${song.name} by ${song.artists.map(artist => artist.name).join(', ')}`;
        recommendationsContainer.appendChild(songElement);
    });
}