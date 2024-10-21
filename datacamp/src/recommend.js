// Fonction pour lire un fichier CSV en utilisant PapaParse
function readCSV(file, callback) {
    Papa.parse(file, {
        header: true,   // Lit les en-têtes du fichier CSV
        dynamicTyping: true,  // Convertit automatiquement les valeurs en nombres, etc.
        complete: function(results) {
            callback(results.data);
        }
    });
}

// Fonction pour calculer la similarité cosinus
function cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitudeA = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
}

// Fonction pour normaliser un vecteur
function normalize(arr) {
    const max = Math.max(...arr);
    return arr.map(val => val / max);
}

// Fonction pour générer des recommandations
async function getRecommendations(userTracks, spotifyTracks) {
    // Extraire les caractéristiques pertinentes
    const userFeatures = userTracks.map(track => [
        track.Acousticness, track.Danceability, track.Duration_ms, track.Energy,
        track.Instrumentalness, track.Key, track.Liveness, track.Loudness,
        track.Mode, track.Speechiness, track.Tempo, track.Time_Signature, track.Valence
    ]);

    const spotifyFeatures = spotifyTracks.map(track => [
        track.acousticness, track.danceability, track.duration_ms, track.energy,
        track.instrumentalness, track.key, track.liveness, track.loudness,
        track.mode, track.speechiness, track.tempo, track.time_signature, track.valence
    ]);

    // Calculer la moyenne des caractéristiques de l'utilisateur
    const userAverageFeatures = userFeatures.reduce((acc, cur) => acc.map((val, i) => val + cur[i]), new Array(13).fill(0))
                                            .map(val => val / userFeatures.length);

    // Calculer la similarité cosinus entre chaque morceau de Spotify et les préférences de l'utilisateur
    const similarityScores = spotifyFeatures.map(features => cosineSimilarity(userAverageFeatures, features));

    // Ajouter les scores de similarité aux données Spotify
    spotifyTracks.forEach((track, index) => {
        track.similarity = similarityScores[index];
    });

    // Normaliser la popularité des morceaux Spotify
    const popularity = spotifyTracks.map(track => track.popularity);
    const normalizedPopularity = normalize(popularity);

    // Ajouter la popularité normalisée aux données Spotify
    spotifyTracks.forEach((track, index) => {
        track.normalized_popularity = normalizedPopularity[index];
    });

    // Calculer un score combiné en tenant compte de la similarité et de la popularité
    const weight_similarity = 0.5;
    const weight_popularity = 0.5;
    
    spotifyTracks.forEach(track => {
        track.combined_score = (weight_similarity * track.similarity) + 
                               (weight_popularity * track.normalized_popularity);
    });

    // Trier les morceaux par score combiné et extraire les 10 meilleurs
    const topTracks = spotifyTracks
        .sort((a, b) => b.combined_score - a.combined_score)
        .slice(0, 10);

    // Afficher les recommandations
    topTracks.forEach(track => {
        console.log(`Track: ${track.track_name} by ${track.artists} (Album: ${track.album_name})`);
        console.log(`Similarity: ${track.similarity.toFixed(2)}, Popularity: ${track.popularity}, Combined Score: ${track.combined_score.toFixed(2)}`);
    });

    return topTracks;
}

// Fonction pour démarrer la recommandation après chargement des fichiers CSV
function recommendFromCSV(userCSVFile, spotifyCSVFile) {
    readCSV(userCSVFile, (userTracks) => {
        readCSV(spotifyCSVFile, (spotifyTracks) => {
            getRecommendations(userTracks, spotifyTracks);
        });
    });
}

// Exemple d'utilisation
document.getElementById('startRecommender').addEventListener('click', function() {
    const userCSVFile = document.getElementById('userCSV').files[0];
    const spotifyCSVFile = document.getElementById('spotifyCSV').files[0];

    if (userCSVFile && spotifyCSVFile) {
        recommendFromCSV(userCSVFile, spotifyCSVFile);
    } else {
        alert("Veuillez charger les fichiers CSV des morceaux de l'utilisateur et de Spotify.");
    }
});
