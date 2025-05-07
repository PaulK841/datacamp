import { clientId } from './authentification.js';

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
    try {
        const profile = await fetchProfile(accessToken);
        populateUI_profile(profile);

    } catch (error) {
        console.error('Error fetching data:', error);
    }
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
    return recommendations.slice(0, 16).map(rec => rec.song);
}

async function fetchTop(token, type, time_range = 'long_term') {
    const result = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=${time_range}&limit=10&offset=0`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });
    return await result.json();
}

/**
 * Récupère les audio features pour une liste de tracks,
 * et tente de rafraîchir le token si nécessaire.
 *
 * @param {string} token - L'access token Spotify actuel.
 * @param {Array} tracks - Tableau d’objets track avec propriété .id.
 * @returns {Promise<Array>} audio_features
 */
async function fetchAudioFeatures(token, tracks) {
    // Construire l’URL avec tous les IDs
    const ids = tracks.map(t => t.id).join(',');
    const url = `https://api.spotify.com/v1/audio-features?ids=${ids}`;
  
    // Fonction interne pour faire la requête
    async function doFetch(currentToken) {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      return res;
    }
  
    // Première tentative
    let res = await doFetch(token);
  
    // Si jeton expiré / non autorisé, on rafraîchit et on réessaye
    if (res.status === 401 || res.status === 403) {
      try {
        const newToken = await refreshAccessToken();
        res = await doFetch(newToken);
      } catch (err) {
        console.error('Impossible de rafraîchir le token :', err);
        throw err;
      }
    }
  
    // Toujours vérifier le statut final
    if (!res.ok) {
      throw new Error(`Error fetching audio features: ${res.status} ${res.statusText}`);
    }
  
    const data = await res.json();
    return data.audio_features;
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

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
  
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refreshToken);
    params.append('client_id', clientId);
  
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
  
    if (!res.ok) {
      throw new Error(`Error refreshing token: ${res.statusText}`);
    }
  
    const { access_token: newAccessToken, refresh_token: newRefreshToken } = await res.json();
  
    // Mettre à jour les tokens en mémoire
    localStorage.setItem('accessToken', newAccessToken);
    if (newRefreshToken) {
      // Spotify ne renvoie parfois pas de nouveau refresh_token, donc on ne l'écrase
      localStorage.setItem('refreshToken', newRefreshToken);
    }
  
    return newAccessToken;
  }

// Fonction pour afficher les recommandations sur la page
// Fonction pour afficher les recommandations sur la page
function displayRecommendations(recommendations) {
    const recommendationsContainer = document.getElementById('topRecommendations');
    recommendationsContainer.innerHTML = ''; // Clear any existing content

    const uniqueRecommendations = [];
    const trackIds = new Set();

    recommendations.forEach(rec => {
        if (!trackIds.has(rec.track_id)) {
            trackIds.add(rec.track_id);
            uniqueRecommendations.push(rec);
        }
    });

    uniqueRecommendations.forEach((rec, index) => {
        const songElement = document.createElement('div');
        songElement.textContent = `Recommendation ${index + 1}: Track Name: ${rec.track_name}, Artist: ${rec.artists}, Album: ${rec.album_name}`;
        recommendationsContainer.appendChild(songElement);
    });
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

async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}