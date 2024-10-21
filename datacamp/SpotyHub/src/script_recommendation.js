document.addEventListener('DOMContentLoaded', async () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
        console.error('Access token not found');
        return;
    }
    const url = 'https://raw.githubusercontent.com/PaulK841/datacamp/main/datacamp/SpotyHub/src/dataset.csv';
    Papa.parse(url, {
        download: true,
        header: true, // Utilisez false si vous n'avez pas de ligne d'en-tête
        complete: async function(results) {
            console.log('Premiers éléments du dataset:', results.data.slice(0, 5)); // Affiche les 5 premiers éléments
        },
        error: function(error) {
            console.error('Error parsing CSV:', error);
        }
    });

    try {
        const trackId = await fetchTop(accessToken, 'tracks', 'long_term');  // Attend la récupération des chansons
        console.log('Chansons récupérées:', trackId);
        const fetchedSongs2 = await refreshFeatures(accessToken); 
        console.log(fetchedSongs2) // Attend la récupération des chansons
        const fetchedSongs = await fetchAudioFeatures(accessToken, trackId);  // Attend la récupération des chansons
        console.log('Features des chansons récupérées:', fetchedSongs);

        // Appel de la fonction de recommandation
        const recommendations = recommendSongs(results.data, fetchedSongs);
        console.log('Recommandations:', recommendations);
        
        // Ici, tu peux ajouter du code pour afficher les recommandations sur ta page
    } catch (error) {
        console.error('Error fetching data:', error);
    }
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
    console.log(result);
    if (!result.ok) {
        throw new Error(`Error fetching audio features: ${result.statusText}`);
    }
    const data = await result.json();
    console.log('Fetched audio features:', data);
    return data;
}

async function refreshFeatures(token) {
    try {
        const features = await fetchAudioFeatures(token, tracks.items);
        tracks.features = features;
        console.log(features);
    } catch (error) {
        console.error('Error fetching audio features:', error);
    }
}
