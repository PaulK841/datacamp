document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Vérifier le token d'accès
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            console.error('Access token not found');
            return;
        }

        // 2. Charger le dataset CSV
        const dataset = await loadDataset();
        console.log('Dataset chargé:', dataset.slice(0, 5));

        // 3. Récupérer le profil utilisateur
        const profile = await fetchProfile(accessToken);
        populateUI_profile(profile);

        // 4. Processus de recommandation
        const recommendations = await getRecommendations(accessToken, dataset);
        displayRecommendations(recommendations);

    } catch (error) {
        console.error('Erreur principale:', error);
    }
});

// Fonctions principales
async function loadDataset() {
    return new Promise((resolve, reject) => {
        const url = 'https://raw.githubusercontent.com/PaulK841/datacamp/main/datacamp/SpotyHub/src/dataset.csv';
        
        Papa.parse(url, {
            download: true,
            header: true,
            complete: (results) => {
                // Nettoyer les données et convertir les nombres
                const cleanedData = results.data
                    .filter(item => item.track_id) // Supprimer les lignes vides
                    .map(item => {
                        // Convertir les chaînes numériques en nombres
                        const numericFields = ['danceability', 'energy', 'valence', 'acousticness', 
                                             'instrumentalness', 'liveness', 'speechiness'];
                        numericFields.forEach(field => {
                            if (item[field]) item[field] = parseFloat(item[field]);
                        });
                        return item;
                    });
                resolve(cleanedData);
            },
            error: (error) => reject(error)
        });
    });
}

async function getRecommendations(token, dataset) {
    try {
        // 1. Récupérer les tops titres
        const topTracks = await fetchTopTracks(token);
        if (!topTracks.length) throw new Error('Aucun titre trouvé');

        // 2. Récupérer les caractéristiques audio
        const trackIds = topTracks.map(track => track.id);
        const audioFeatures = await fetchAudioFeatures(token, trackIds);

        // 3. Combiner les données
        const seedSongs = topTracks.map((track, i) => ({
            ...track,
            ...(audioFeatures[i] || {})
        }));

        // 4. Générer les recommandations
        return generateRecommendations(dataset, seedSongs);
        
    } catch (error) {
        console.error('Erreur dans getRecommendations:', error);
        return []; // Retourne un tableau vide en cas d'erreur
    }
}

// Fonctions Spotify API
async function fetchProfile(token) {
    const response = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
        throw new Error(`Erreur profil: ${response.status}`);
    }

    return await response.json();
}

async function fetchTopTracks(token, limit = 10) {
    const response = await fetch(
        `https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=${limit}`,
        {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    if (!response.ok) {
        throw new Error(`Erreur top titres: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
}

async function fetchAudioFeatures(token, trackIds) {
    if (!trackIds.length) return [];

    // Limite de l'API: 100 IDs par requête
    const ids = trackIds.slice(0, 100).join(',');
    const response = await fetch(
        `https://api.spotify.com/v1/audio-features?ids=${ids}`,
        {
            method: "GET",
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Erreur audio features: ${response.status}`);
    }

    const data = await response.json();
    return data.audio_features || [];
}

// Algorithme de recommandation
function generateRecommendations(dataset, seedSongs) {
    if (!seedSongs.length) return [];

    // 1. Calculer la similarité pour chaque chanson du dataset
    const recommendations = dataset.map(song => {
        let totalSimilarity = 0;

        seedSongs.forEach(seed => {
            totalSimilarity += calculateSimilarityScore(song, seed);
        });

        const avgSimilarity = totalSimilarity / seedSongs.length;
        return { ...song, similarity: avgSimilarity };
    });

    // 2. Trier par similarité (descendante)
    recommendations.sort((a, b) => b.similarity - a.similarity);

    // 3. Retourner les meilleures recommandations (sans doublons)
    return filterUniqueTracks(recommendations).slice(0, 16);
}

function calculateSimilarityScore(song1, song2) {
    const attributes = [
        'danceability', 'energy', 'valence', 
        'acousticness', 'instrumentalness'
    ];

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    attributes.forEach(attr => {
        const val1 = song1[attr] || 0;
        const val2 = song2[attr] || 0;

        dotProduct += val1 * val2;
        magnitude1 += val1 * val1;
        magnitude2 += val2 * val2;
    });

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    return magnitude1 && magnitude2 
        ? dotProduct / (magnitude1 * magnitude2) 
        : 0;
}

function filterUniqueTracks(songs) {
    const seen = new Set();
    return songs.filter(song => {
        const key = song.track_id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Affichage UI
function populateUI_profile(profile) {
    if (!profile) return;

    document.getElementById("displayName").innerText = profile.display_name || 'Utilisateur Spotify';
    
    if (profile.images?.[0]?.url) {
        const img = document.createElement('img');
        img.src = profile.images[0].url;
        img.alt = 'Profile';
        img.style.borderRadius = '50%';
        img.width = 40;
        img.height = 40;
        document.getElementById("avatar").appendChild(img);
    }
}

function displayRecommendations(recommendations) {
    const container = document.getElementById('topRecommendations');
    if (!container) return;

    container.innerHTML = '';

    if (!recommendations.length) {
        container.innerHTML = '<p>Aucune recommandation disponible</p>';
        return;
    }

    recommendations.forEach((track, index) => {
        const div = document.createElement('div');
        div.className = 'recommendation-item';
        div.innerHTML = `
            <strong>#${index + 1}</strong>
            <div class="track-name">${track.track_name || 'Titre inconnu'}</div>
            <div class="artist">${track.artists || 'Artiste inconnu'}</div>
            <div class="album">${track.album_name || 'Album inconnu'}</div>
            <div class="similarity">Similarité: ${track.similarity?.toFixed(3) || 'N/A'}</div>
        `;
        container.appendChild(div);
    });
}