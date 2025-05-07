// Main configuration
const SPOTIFY_API_ENDPOINT = 'https://api.spotify.com/v1';
const CLIENT_ID = '495b2ab2886a41ed81645991f98bcbcb'; // Replace with your actual client ID
const CLIENT_SECRET = '3444321fbab64a3f93c4875436675454'; // Replace with your actual client secret
const REDIRECT_URI = 'https://datacamp40.netlify.app/datacamp/spotyhub/redirect.html'; // Replace with your actual redirect URI

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Check for access token in URL (after redirect)
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        
        // 2. If we have a code, exchange it for a token
        if (code) {
            await exchangeCodeForToken(code);
            // Remove code from URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // 3. Get or refresh access token
        let accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            // If no token, redirect to Spotify login
            redirectToSpotifyLogin();
            return;
        }

        // 4. Verify token is still valid
        try {
            await testTokenValidity(accessToken);
        } catch (error) {
            console.log('Token might be expired, attempting to refresh...');
            accessToken = await refreshAccessToken();
            if (!accessToken) {
                redirectToSpotifyLogin();
                return;
            }
        }

        // 5. Load dataset and get recommendations
        const dataset = await loadDataset();
        const recommendations = await getRecommendations(accessToken, dataset);
        displayRecommendations(recommendations);

        // 6. Load user profile
        const profile = await fetchProfile(accessToken);
        populateUI_profile(profile);

    } catch (error) {
        console.error('Main error:', error);
        showErrorToUser('Failed to load recommendations. Please try again later.');
    }
});

// ======================
// AUTHENTICATION FUNCTIONS
// ======================

function redirectToSpotifyLogin() {
    const scopes = ['user-top-read', 'user-read-private'];
    const authUrl = new URL('https://accounts.spotify.com/authorize');
    
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('scope', scopes.join(' '));
    authUrl.searchParams.append('show_dialog', 'true');
    
    window.location.href = authUrl.toString();
}

async function exchangeCodeForToken(code) {
    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI
            })
        });

        if (!response.ok) {
            throw new Error(`Token exchange failed: ${response.status}`);
        }

        const data = await response.json();
        localStorage.setItem('accessToken', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token);
        return data.access_token;
    } catch (error) {
        console.error('Token exchange error:', error);
        throw error;
    }
}

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
        // Spotify may return a new refresh token
        if (data.refresh_token) {
            localStorage.setItem('refreshToken', data.refresh_token);
        }
        return data.access_token;
    } catch (error) {
        console.error('Token refresh error:', error);
        return null;
    }
}

async function testTokenValidity(token) {
    const response = await fetch(`${SPOTIFY_API_ENDPOINT}/me`, {
        method: "GET",
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Token test failed: ${response.status}`);
    }
}

// ======================
// DATA LOADING FUNCTIONS
// ======================

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

// ======================
// RECOMMENDATION ENGINE
// ======================

async function getRecommendations(token, dataset) {
    try {
        // Get user's top tracks
        const topTracks = await fetchTopTracks(token);
        if (!topTracks.length) {
            showErrorToUser('No top tracks found. Please listen to more music on Spotify.');
            return [];
        }

        // Get audio features for these tracks
        const trackIds = topTracks.map(track => track.id);
        const audioFeatures = await fetchAudioFeatures(token, trackIds);

        // Combine track info with audio features
        const seedSongs = topTracks.map((track, i) => ({
            ...track,
            ...(audioFeatures[i] || {})
        }));

        // Generate recommendations
        return generateRecommendations(dataset, seedSongs);
    } catch (error) {
        console.error('Recommendation error:', error);
        showErrorToUser('Failed to generate recommendations. Please try again.');
        return [];
    }
}

async function fetchTopTracks(token, limit = 10) {
    const response = await fetch(
        `${SPOTIFY_API_ENDPOINT}/me/top/tracks?time_range=long_term&limit=${limit}`,
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
            const response = await fetch(
                `${SPOTIFY_API_ENDPOINT}/audio-features?ids=${chunk.join(',')}`,
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

function generateRecommendations(dataset, seedSongs) {
    if (!seedSongs.length || !dataset.length) return [];

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

// ======================
// UI FUNCTIONS
// ======================

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
                <div class="track-name">${escapeHtml(track.track_name || 'Unknown track')}</div>
                <div class="artist">${escapeHtml(track.artists || 'Unknown artist')}</div>
                <div class="album">${escapeHtml(track.album_name || 'Unknown album')}</div>
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

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}