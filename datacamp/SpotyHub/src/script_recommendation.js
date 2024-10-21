// Récupère le token d'accès depuis le stockage local du navigateur. 
const accessToken = localStorage.getItem('accessToken');

const profile = await fetchProfile(accessToken);
    // Les données de profil et les artistes les plus écoutés sont ensuite affichés sur la page Web.
    populateUI_profile(profile)


async function loadSpotifyDataset() {
  const response = await fetch('dataset.csv');
  const text = await response.text();
  const rows = text.split('\n').slice(1);

  // Extract the column names
  const columns = ['acousticness', 'danceability', 'duration_ms', 'energy', 'instrumentalness', 'key', 'liveness', 'loudness', 'mode', 'speechiness', 'tempo', 'time_signature', 'valence', 'track_name', 'artists', 'album_name', 'popularity'];

  // Convert CSV data to JSON format
  const dataset = rows.map(row => {
    const values = row.split(',');
    const entry = {};
    columns.forEach((col, index) => {
      if (values[index] !== undefined) {
        entry[col] = isNaN(parseFloat(values[index])) ? values[index].trim() : parseFloat(values[index]);
      }
    });
    return entry;
  });

  console.log(dataset); // Debug line to check the parsed data
  return dataset;
}

// Function to calculate cosine similarity
function dotp(x, y) {
  return x.reduce((sum, xi, i) => sum + xi * y[i], 0);
}

function cosineSimilarity(A, B) {
  const similarity = dotp(A, B) / (Math.sqrt(dotp(A, A)) * Math.sqrt(dotp(B, B)));
  return similarity;
}

// Calculate user average features
function calculateUserAverageFeatures(userProfileData) {
  const featureKeys = ['acousticness', 'danceability', 'duration_ms', 'energy', 'instrumentalness', 'key', 'liveness', 'loudness', 'mode', 'speechiness', 'tempo', 'time_signature', 'valence'];
  const averages = {};

  featureKeys.forEach(key => {
    const values = userProfileData.map(item => item[key]);
    averages[key] = values.reduce((sum, value) => sum + value, 0) / values.length;
  });

  return averages;
}

// Find top 10 similar tracks based on user data
async function findTop10SimilarTracks(userProfileData) {
  const spotifyData = await loadSpotifyDataset();
  const userAverageFeatures = calculateUserAverageFeatures(userProfileData);

  const userFeaturesArray = [
    userAverageFeatures.acousticness, userAverageFeatures.danceability, userAverageFeatures.duration_ms,
    userAverageFeatures.energy, userAverageFeatures.instrumentalness, userAverageFeatures.key,
    userAverageFeatures.liveness, userAverageFeatures.loudness, userAverageFeatures.mode,
    userAverageFeatures.speechiness, userAverageFeatures.tempo, userAverageFeatures.time_signature, userAverageFeatures.valence
  ];

  // Calculate similarity for each track in the dataset
  spotifyData.forEach(track => {
    const trackFeaturesArray = [
      track.acousticness, track.danceability, track.duration_ms, track.energy,
      track.instrumentalness, track.key, track.liveness, track.loudness,
      track.mode, track.speechiness, track.tempo, track.time_signature, track.valence
    ];
    track.similarity = cosineSimilarity(userFeaturesArray, trackFeaturesArray);

    // Debug line to verify if the track properties are present
    console.log(track);
  });

  // Sort tracks by similarity and remove duplicates based on track_name
  const top10SimilarTracks = spotifyData
    .filter((track, index, self) => self.findIndex(t => t.track_name === track.track_name) === index)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);

  // Populate the UI with top 10 similar tracks
  const recommendationsList = document.getElementById('topRecommendations');
  recommendationsList.innerHTML = '';
  top10SimilarTracks.forEach(track => {
    const listItem = document.createElement('li');
    listItem.innerText = `${track.track_name} by ${track.artists} (Album: ${track.album_name}) - Popularity: ${track.popularity}`;
    recommendationsList.appendChild(listItem);
  });
}

// Fetch user profile from Spotify
async function fetchProfile(token) {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET", headers: { Authorization: `Bearer ${token}` }
  });
  return await result.json();
}

// Get user profile data from previous JS code and use it to calculate recommendations
(async function() {
  // Assuming user data is available from previous Spotify API calls
  const userProfileData = [
    // This should be the user's top listened tracks or profile features similar to the Spotify dataset
    // Here you would use features like 'acousticness', 'danceability', etc.
    // For this example, we'll use mock data:
    {
      acousticness: 0.3,
      danceability: 0.7,
      duration_ms: 200000,
      energy: 0.8,
      instrumentalness: 0,
      key: 5,
      liveness: 0.1,
      loudness: -5,
      mode: 1,
      speechiness: 0.04,
      tempo: 120,
      time_signature: 4,
      valence: 0.5
    }
  ];

  await findTop10SimilarTracks(userProfileData);
})();

function populateUI_profile(profile) {
    // Mettre à jour les éléments HTML avec les informations du profil de l'utilisateur.
    // Les informations affichées incluent le nom d'affichage de l'utilisateur, l'image de profil, l'ID de l'utilisateur, le pays, l'e-mail, l'URI Spotify de l'utilisateur et l'URL de l'utilisateur.
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

// Add event listener for the recommendation page load
document.addEventListener('DOMContentLoaded', async () => {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    console.error("Access token is missing");
    return;
  }
  const userProfile = await fetchProfile(accessToken);
  populateUI_profile(userProfile);

  // Fetch and display top 10 recommendations based on user's profile
  await findTop10SimilarTracks([userProfile]);
});
