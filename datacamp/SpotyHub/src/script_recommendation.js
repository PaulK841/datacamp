// ---------- Helpers pour token + fetch sécurisé ----------
async function refreshAccessToken() {
    const CLIENT_ID = 'VOTRE_SPOTIFY_CLIENT_ID';
    const refreshToken = localStorage.getItem('refreshToken');
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID
    });
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await res.json();
    if (data.error) throw new Error('Impossible de rafraîchir le token');
    localStorage.setItem('accessToken', data.access_token);
    return data.access_token;
  }
  
  async function safeFetch(url, opts = {}) {
    let token = localStorage.getItem('accessToken');
    opts.headers = { ...(opts.headers||{}), Authorization: `Bearer ${token}` };
    let res = await fetch(url, opts);
    if (res.status === 401) {
      token = await refreshAccessToken();
      opts.headers.Authorization = `Bearer ${token}`;
      res = await fetch(url, opts);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Spotify ${res.status}: ${err.error?.message || res.statusText}`);
    }
    return res.json();
  }
  
  // ---------- Fonctions métier Spotify ----------
  async function fetchProfile() {
    return safeFetch('https://api.spotify.com/v1/me');
  }
  
  async function fetchTopTracks(time_range = 'long_term', limit = 10) {
    return safeFetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${time_range}&limit=${limit}`)
      .then(json => json.items);
  }
  
  async function fetchAudioFeaturesFor(tracks) {
    const ids = tracks.map(t => t.id).join(',');
    return safeFetch(`https://api.spotify.com/v1/audio-features?ids=${ids}`)
      .then(json => json.audio_features);
  }
  
  // ---------- Recommandation cosinus ----------
  function recommendSongs(dataset, features) {
    const attrs = ['danceability','energy','valence'];
    const cos = (a,b) => {
      const dot = attrs.reduce((s,k)=>s + a[k]*b[k],0);
      const magA = Math.sqrt(attrs.reduce((s,k)=>s + a[k]**2,0));
      const magB = Math.sqrt(attrs.reduce((s,k)=>s + b[k]**2,0));
      return magA && magB ? dot/(magA*magB) : 0;
    };
  
    const scores = dataset.map(song => ({
      song,
      score: features.reduce((s,f)=>s + cos(song,f), 0)
    }));
    return scores
      .sort((a,b)=>b.score - a.score)
      .slice(0, 10)
      .map(r=>r.song);
  }
  
  // ---------- Affichage dans le DOM ----------
  function displayRecommendations(recs) {
    const ul = document.getElementById('topRecommendations');
    ul.innerHTML = '';
    recs.forEach((song,i) => {
      const li = document.createElement('li');
      li.textContent = `${i+1}. ${song.track_name} — ${song.artists} (album : ${song.album_name})`;
      ul.appendChild(li);
    });
  }
  
  function populateUIProfile(profile) {
    document.getElementById('displayName').innerText = profile.display_name;
    if (profile.images.length) {
      const img = document.createElement('img');
      img.src = profile.images[0].url;
      img.width = 40;
      img.height = 40;
      document.getElementById('avatar').appendChild(img);
    }
  }
  
  // ---------- Chargement initial ----------
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // 1) Profil utilisateur
      const profile = await fetchProfile();
      populateUIProfile(profile);
  
      // 2) Charger le dataset CSV
      const urlCSV = 'https://raw.githubusercontent.com/PaulK841/datacamp/main/datacamp/SpotyHub/src/dataset.csv';
      const parsed = await new Promise((res, rej) => {
        Papa.parse(urlCSV, {
          download: true,
          header: true,
          complete: r => res(r.data),
          error: e => rej(e)
        });
      });
  
      // 3) Top tracks + leurs features
      const topTracks = await fetchTopTracks('long_term', 10);
      const features  = await fetchAudioFeaturesFor(topTracks);
  
      // 4) Générer et afficher les recommandations
      const recs = recommendSongs(parsed, features);
      displayRecommendations(recs);
  
    } catch (err) {
      console.error('Erreur générale :', err);
    }
  });
  