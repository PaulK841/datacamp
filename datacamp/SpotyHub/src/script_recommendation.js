document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Check and refresh access token
        let accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            console.error('Access token not found');
            return;
        }

        // 2. Verify token is still valid
        try {
            await fetchProfile(accessToken);
        } catch (error) {
            console.log('Token might be expired, attempting to refresh...');
            accessToken = await refreshAccessToken();
            if (!accessToken) throw new Error('Failed to refresh token');
        }

        // 3. Load dataset
        const dataset = await loadDataset();
        console.log('Dataset loaded:', dataset.slice(0, 5));

        // 4. Get user profile
        const profile = await fetchProfile(accessToken);
        populateUI_profile(profile);

        // 5. Get recommendations
        const recommendations = await getRecommendations(accessToken, dataset);
        displayRecommendations(recommendations);

    } catch (error) {
        console.error('Main error:', error);
        showErrorToUser('Failed to load recommendations. Please try again later.');
    }
});

// Token management
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        console.error('No refresh token available');
        return null;
    }

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            })
        });

        if (!response.ok) {
            throw new Error(`Refresh failed: ${response.status}`);
        }

        const data = await response.json();
        localStorage.setItem('accessToken', data.access_token);
        return data.access_token;
    } catch (error) {
        console.error('Token refresh error:', error);
        return null;
    }
}

// Data loading
async function loadDataset() {
    return new Promise((resolve, reject) => {
        const url = 'https://raw.githubusercontent.com/PaulK841/datacamp/main/datacamp/SpotyHub/src/dataset.csv';
        
        Papa.parse(url, {
            download: true,
            header: true,
            complete: (results) => {
                const cleanedData = results.data
                    .filter(item => item.track_id)
                    .map(item => {
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

// Recommendation engine
async function getRecommendations(token, dataset) {
    try {
        const topTracks = await fetchTopTracks(token);
        if (!topTracks.length) throw new Error('No tracks found');

        const trackIds = topTracks.map(track => track.id);
        const audioFeatures = await fetchAudioFeatures(token, trackIds);

        const seedSongs = topTracks.map((track, i) => ({
            ...track,
            ...(audioFeatures[i] || {})
        }));

        return generateRecommendations(dataset, seedSongs);
    } catch (error) {
        console.error('Recommendation error:', error);
        return [];
    }
}

// Spotify API functions
async function fetchProfile(token) {
    const response = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Profile error: ${response.status}`);
    }

    return await response.json();
}

async function fetchTopTracks(token, limit = 10) {
    const response = await fetch(
        `https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=${limit}`,
        {
            method: "GET",
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Top tracks error: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
}

async function fetchAudioFeatures(token, trackIds) {
    if (!trackIds.length) return [];

    // Split into chunks of 50 to avoid URI too long errors
    const chunks = [];
    for (let i = 0; i < trackIds.length; i += 50) {
        chunks.push(trackIds.slice(i, i + 50));
    }

    try {
        const results = await Promise.all(chunks.map(async chunk => {
            const ids = chunk.join(',');
            const response = await fetch(
                `https://api.spotify.com/v1/audio-features?ids=${ids}`,
                {
                    method: "GET",
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                console.error(`Audio features chunk failed: ${response.status}`);
                return [];
            }

            const data = await response.json();
            return data.audio_features || [];
        }));

        return results.flat();
    } catch (error) {
        console.error('Audio features error:', error);
        throw error;
    }
}

// Recommendation algorithm
function generateRecommendations(dataset, seedSongs) {
    if (!seedSongs.length) return [];

    const recommendations = dataset.map(song => {
        let totalSimilarity = 0;
        seedSongs.forEach(seed => {
            totalSimilarity += calculateSimilarityScore(song, seed);
        });
        return { ...song, similarity: totalSimilarity / seedSongs.length };
    });

    recommendations.sort((a, b) => b.similarity - a.similarity);
    return filterUniqueTracks(recommendations).slice(0, 16);
}

function calculateSimilarityScore(song1, song2) {
    const attributes = ['danceability', 'energy', 'valence', 'acousticness'];
    let dotProduct = 0, magnitude1 = 0, magnitude2 = 0;

    attributes.forEach(attr => {
        const val1 = song1[attr] || 0;
        const val2 = song2[attr] || 0;
        dotProduct += val1 * val2;
        magnitude1 += val1 * val1;
        magnitude2 += val2 * val2;
    });

    const magnitude = Math.sqrt(magnitude1) * Math.sqrt(magnitude2);
    return magnitude ? dotProduct / magnitude : 0;
}

function filterUniqueTracks(songs) {
    const seen = new Set();
    return songs.filter(song => {
        const key = song.track_id;
        return seen.has(key) ? false : (seen.add(key), true);
    });
}

// UI functions
function populateUI_profile(profile) {
    if (!profile) return;

    const displayName = document.getElementById("displayName");
    if (displayName) {
        displayName.innerText = profile.display_name || 'Spotify User';
    }

    const avatar = document.getElementById("avatar");
    if (avatar && profile.images?.[0]?.url) {
        avatar.innerHTML = '';
        const img = document.createElement('img');
        img.src = profile.images[0].url;
        img.alt = 'Profile';
        img.style.borderRadius = '50%';
        img.width = 40;
        img.height = 40;
        avatar.appendChild(img);
    }
}

function displayRecommendations(recommendations) {
    const container = document.getElementById('topRecommendations');
    if (!container) return;

    container.innerHTML = '';

    if (!recommendations.length) {
        container.innerHTML = '<div class="error-message">No recommendations available</div>';
        return;
    }

    recommendations.forEach((track, index) => {
        const div = document.createElement('div');
        div.className = 'recommendation-item';
        div.innerHTML = `
            <div class="rank">#${index + 1}</div>
            <div class="track-info">
                <div class="track-name">${track.track_name || 'Unknown track'}</div>
                <div class="artist">${track.artists || 'Unknown artist'}</div>
            </div>
            <div class="similarity">Match: ${(track.similarity * 100).toFixed(1)}%</div>
        `;
        container.appendChild(div);
    });
}

function showErrorToUser(message) {
    const container = document.getElementById('topRecommendations') || document.body;
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    container.appendChild(errorDiv);
}