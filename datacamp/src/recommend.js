// Recommandation de musique à partir du CSV et des 50 morceaux de l'utilisateur
document.getElementById('recommendation-btn').addEventListener('click', async function() {
    // Charger le dataset.csv avec PapaParse
    Papa.parse('./dataset.csv', {
        download: true,
        header: true,
        complete: function(results) {
            const spotifyData = results.data;

            // Simuler l'obtention des morceaux de l'utilisateur
            const userTracks = JSON.parse(localStorage.getItem('userTracks'));
            if (!userTracks) {
                alert("No user tracks found. Please connect to Spotify first.");
                return;
            }

            // Extraire les caractéristiques des morceaux de l'utilisateur
            const userFeatures = userTracks.map(track => ({
                acousticness: track.features.acousticness,
                danceability: track.features.danceability,
                duration_ms: track.features.duration_ms,
                energy: track.features.energy,
                instrumentalness: track.features.instrumentalness,
                key: track.features.key,
                liveness: track.features.liveness,
                loudness: track.features.loudness,
                mode: track.features.mode,
                speechiness: track.features.speechiness,
                tempo: track.features.tempo,
                time_signature: track.features.time_signature,
                valence: track.features.valence
            }));

            // Calculer la moyenne des caractéristiques utilisateur
            const userAverageFeatures = calculateAverageFeatures(userFeatures);

            // Calculer les similarités entre les morceaux du dataset et les morceaux de l'utilisateur
            const recommendations = getRecommendations(spotifyData, userAverageFeatures);

            // Afficher les recommandations dans la page
            displayRecommendations(recommendations);
        }
    });
});

// Fonction pour calculer la moyenne des caractéristiques
function calculateAverageFeatures(features) {
    const average = {};
    const keys = Object.keys(features[0]);

    keys.forEach(key => {
        average[key] = features.reduce((acc, feature) => acc + parseFloat(feature[key]), 0) / features.length;
    });

    return average;
}

// Fonction pour calculer la similarité cosinus entre les morceaux de Spotify et les préférences de l'utilisateur
function getRecommendations(spotifyData, userAverageFeatures) {
    const recommendations = spotifyData.map(track => {
        // Calculer la similarité cosinus
        const trackFeatures = [
            track.acousticness, track.danceability, track.duration_ms, track.energy,
            track.instrumentalness, track.key, track.liveness, track.loudness,
            track.mode, track.speechiness, track.tempo, track.time_signature, track.valence
        ].map(parseFloat);

        const similarity = cosineSimilarity(Object.values(userAverageFeatures), trackFeatures);
        
        return {
            track_name: track.track_name,
            artists: track.artists,
            album_name: track.album_name,
            popularity: track.popularity,
            similarity: similarity
        };
    });

    // Trier par similarité décroissante
    recommendations.sort((a, b) => b.similarity - a.similarity);

    // Retourner les 10 meilleures recommandations
    return recommendations.slice(0, 10);
}

// Fonction pour calculer la similarité cosinus
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (normA * normB);
}

// Fonction pour afficher les recommandations dans la page
function displayRecommendations(recommendations) {
    const recommendationList = document.getElementById('recommendation-list');
    recommendationList.innerHTML = '';  // Vider la liste précédente

    recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = `${rec.track_name} by ${rec.artists} (Album: ${rec.album_name}) - Similarity: ${(rec.similarity * 100).toFixed(2)}%`;
        recommendationList.appendChild(li);
    });
}
