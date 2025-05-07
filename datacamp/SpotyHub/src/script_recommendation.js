document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Vérifier et rafraîchir le token si nécessaire
        const accessToken = await window.checkAndRefreshToken();
        
        if (!accessToken) {
            console.error('Access token not found or invalid');
            document.getElementById('errorMessage').textContent = 'Problème d\'authentification. Veuillez vous reconnecter.';
            return;
        }

        // Charger le profil pendant que le CSV se télécharge
        loadProfileData(accessToken);
        
        // Charger le dataset
        const url = 'https://raw.githubusercontent.com/PaulK841/datacamp/main/datacamp/SpotyHub/src/dataset.csv';
        loadRecommendations(url, accessToken);
    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('errorMessage').textContent = 'Une erreur est survenue. Veuillez réessayer.';
    }
});

async function loadProfileData(accessToken) {
    try {
        const profile = await fetchProfile(accessToken);
        populateUI_profile(profile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        document.getElementById('profileError').textContent = 'Impossible de charger votre profil.';
    }
}

async function loadRecommendations(url, accessToken) {
    // Afficher un message de chargement
    document.getElementById('loadingMessage').textContent = 'Chargement de vos recommandations...';
    
    Papa.parse(url, {
        download: true,
        header: true,
        dynamicTyping: true, // Convertit automatiquement les nombres
        skipEmptyLines: true,
        complete: async function(results) {
            console.log('Dataset chargé:', results.data.slice(0, 5));
            
            try {
                // Récupérer les top tracks
                const topTracks = await fetchTop(accessToken, 'tracks', 'long_term');
                console.log('Top tracks récupérées:', topTracks);
                
                if (!topTracks || !topTracks.items || topTracks.items.length === 0) {
                    throw new Error('Aucune chanson favorite trouvée');
                }

                // Récupérer les caractéristiques audio
                const audioFeatures = await fetchAudioFeatures(accessToken, topTracks.items);
                console.log('Caractéristiques audio récupérées:', audioFeatures);
                
                if (!audioFeatures || audioFeatures.length === 0) {
                    throw new Error('Impossible de récupérer les caractéristiques audio');
                }

                // Générer les recommandations
                const recommendations = recommendSongs(results.data, audioFeatures);
                console.log('Recommandations générées:', recommendations);
                
                // Afficher les recommandations
                displayRecommendations(recommendations);
                
                // Masquer le message de chargement
                document.getElementById('loadingMessage').textContent = '';
            } catch (error) {
                console.error('Error processing recommendations:', error);
                document.getElementById('errorMessage').textContent = 'Erreur lors de la génération des recommandations: ' + error.message;
            }
        },
        error: function(error) {
            console.error('Error parsing CSV:', error);
            document.getElementById('errorMessage').textContent = 'Erreur lors du chargement du dataset.';
        }
    });
}

async function fetchTop(token, type, time_range = 'long_term') {
    try {
        const result = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=${time_range}&limit=10&offset=0`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!result.ok) {
            if (result.status === 401) {
                // Token expiré, essayer de rafraîchir
                const newToken = await window.checkAndRefreshToken();
                if (newToken) {
                    return await fetchTop(newToken, type, time_range);
                }
            }
            throw new Error(`Error fetching top ${type}: ${result.status} ${result.statusText}`);
        }
        
        return await result.json();
    } catch (error) {
        console.error(`Error in fetchTop:`, error);
        throw error;
    }
}

async function fetchAudioFeatures(token, tracks) {
    if (!tracks || tracks.length === 0) {
        return [];
    }
    
    try {
        // Construire l'URL avec les IDs
        let trackIds = tracks.map(track => track.id).join(',');
        const url = `https://api.spotify.com/v1/audio-features?ids=${trackIds}`;
        
        const result = await fetch(url, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!result.ok) {
            if (result.status === 401) {
                // Token expiré, essayer de rafraîchir
                const newToken = await window.checkAndRefreshToken();
                if (newToken) {
                    return await fetchAudioFeatures(newToken, tracks);
                }
            }
            throw new Error(`Error fetching audio features: ${result.status} ${result.statusText}`);
        }
        
        const data = await result.json();
        
        if (!data.audio_features) {
            throw new Error('Format de réponse audio_features invalide');
        }
        
        return data.audio_features.filter(feature => feature !== null);
    } catch (error) {
        console.error('Error fetching audio features:', error);
        throw error;
    }
}

function recommendSongs(dataset, fetchedSongs) {
    // Vérification des données
    if (!dataset || dataset.length === 0) {
        throw new Error('Dataset vide');
    }
    
    if (!fetchedSongs || !Array.isArray(fetchedSongs) || fetchedSongs.length === 0) {
        console.warn('No fetched songs with features available, returning random recommendations');
        // Retourner des chansons aléatoires comme solution de secours
        return dataset
            .sort(() => 0.5 - Math.random())
            .slice(0, 16);
    }
    
    // Fonction pour calculer la similarité cosinus entre deux chansons
    function calculateCosineSimilarity(song1, song2) {
        // Utiliser uniquement les attributs disponibles dans les deux objets
        const attributes = ['danceability', 'energy', 'valence', 'acousticness', 'instrumentalness', 'liveness'];
        
        // Filtrer les attributs qui existent dans les deux chansons
        const validAttributes = attributes.filter(attr => 
            song1[attr] !== undefined && song1[attr] !== null && 
            song2[attr] !== undefined && song2[attr] !== null
        );
        
        if (validAttributes.length === 0) {
            return 0; // Pas d'attributs communs
        }
        
        const dotProduct = validAttributes.reduce((sum, attr) => {
            return sum + (song1[attr] * song2[attr]);
        }, 0);

        const magnitudeSong1 = Math.sqrt(validAttributes.reduce((sum, attr) => {
            return sum + Math.pow(song1[attr], 2);
        }, 0));

        const magnitudeSong2 = Math.sqrt(validAttributes.reduce((sum, attr) => {
            return sum + Math.pow(song2[attr], 2);
        }, 0));

        // Éviter la division par zéro
        if (magnitudeSong1 === 0 || magnitudeSong2 === 0) return 0;
        
        return dotProduct / (magnitudeSong1 * magnitudeSong2);
    }

    // Normaliser les valeurs numériques dans le dataset si nécessaire
    const processedDataset = dataset.filter(song => {
        // Vérifier que les attributs nécessaires sont présents
        return song && song.track_id && song.track_name;
    });
    
    // Calcul des recommandations
    const recommendations = processedDataset.map(song => {
        let totalSimilarity = 0;
        let validComparisons = 0;
        
        fetchedSongs.forEach(fetchedSong => {
            const similarity = calculateCosineSimilarity(song, fetchedSong);
            if (similarity > 0) {
                totalSimilarity += similarity;
                validComparisons++;
            }
        });
        
        // Calculer la similarité moyenne pour éviter les biais
        const avgSimilarity = validComparisons > 0 ? totalSimilarity / validComparisons : 0;
        return { song, similarity: avgSimilarity };
    });

    // Tri des recommandations par similarité décroissante
    recommendations.sort((a, b) => b.similarity - a.similarity);

    // Retourner les 16 meilleures recommandations
    return recommendations.slice(0, 16).map(rec => rec.song);
}

function displayRecommendations(recommendations) {
    const recommendationsContainer = document.getElementById('topRecommendations');
    if (!recommendationsContainer) {
        console.error('Container for recommendations not found');
        return;
    }
    
    recommendationsContainer.innerHTML = ''; // Effacer le contenu existant

    // Filtrer les recommandations uniques par track_id
    const uniqueRecommendations = [];
    const trackIds = new Set();

    recommendations.forEach(rec => {
        if (rec && rec.track_id && !trackIds.has(rec.track_id)) {
            trackIds.add(rec.track_id);
            uniqueRecommendations.push(rec);
        }
    });

    if (uniqueRecommendations.length === 0) {
        recommendationsContainer.innerHTML = '<p>Aucune recommandation trouvée.</p>';
        return;
    }

    // Créer un élément pour chaque recommandation
    uniqueRecommendations.forEach((rec, index) => {
        const songElement = document.createElement('div');
        songElement.className = 'recommendation-item';
        
        // Créer le contenu HTML pour la recommandation
        songElement.innerHTML = `
            <h3>${index + 1}. ${rec.track_name || 'Titre inconnu'}</h3>
            <p>Artiste: ${rec.artists || 'Inconnu'}</p>
            <p>Album: ${rec.album_name || 'Inconnu'}</p>
        `;
        
        recommendationsContainer.appendChild(songElement);
    });
}

function populateUI_profile(profile) {
    if (!profile) return;
    
    const displayNameElement = document.getElementById("displayName");
    if (displayNameElement) {
        displayNameElement.innerText = profile.display_name || 'Utilisateur';
    }
    
    localStorage.setItem('username', profile.display_name || '');
    localStorage.setItem('email', profile.email || '');

    const avatarContainer = document.getElementById("avatar");
    if (avatarContainer && profile.images && profile.images.length > 0 && profile.images[0].url) {
        avatarContainer.innerHTML = ''; // Effacer le contenu existant
        const profileImage = new Image();
        profileImage.src = profile.images[0].url;
        profileImage.height = 40;
        profileImage.width = 40;
        profileImage.alt = "Photo de profil";
        profileImage.className = "profile-image";
        avatarContainer.appendChild(profileImage);
    }
}

async function fetchProfile(token) {
    try {
        const result = await fetch("https://api.spotify.com/v1/me", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!result.ok) {
            if (result.status === 401) {
                // Token expiré, essayer de rafraîchir
                const newToken = await window.checkAndRefreshToken();
                if (newToken) {
                    return await fetchProfile(newToken);
                }
            }
            throw new Error(`Error fetching profile: ${result.status} ${result.statusText}`);
        }

        return await result.json();
    } catch (error) {
        console.error('Error in fetchProfile:', error);
        throw error;
    }
}