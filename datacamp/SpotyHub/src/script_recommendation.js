// ---------- Gestion du token + fetch sécurisé ----------
async function refreshAccessToken() {
    const CLIENT_ID    = '495b2ab2886a41ed81645991f98bcbcb';
    const refreshToken = localStorage.getItem('refreshToken');
    const body = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
      client_id:     CLIENT_ID
    });
  
    const res  = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await res.json();
    if (data.error) throw new Error('Échec du rafraîchissement de token');
    localStorage.setItem('accessToken', data.access_token);
    return data.access_token;
  }
  
  async function safeFetch(url, opts = {}) {
    let token = localStorage.getItem('accessToken');
    opts.headers = { ...(opts.headers || {}), Authorization: `Bearer ${token}` };
  
    // logs de debug
    console.log('🛠 safeFetch URL   →', url);
    console.log('🛠 safeFetch headers →', opts.headers);
  
    let res = await fetch(url, { ...opts, mode: 'cors' });
    if (res.status === 401) {
      // token expiré → on rafraîchit et on renvoie
      token = await refreshAccessToken();
      opts.headers.Authorization = `Bearer ${token}`;
      console.log('🛠 safeFetch retry headers →', opts.headers);
      res = await fetch(url, { ...opts, mode: 'cors' });
    }
    if (!res.ok) {
      const txt = await res.text();
      console.error('🛠 safeFetch erreur body →', txt);
      let errMsg = res.statusText;
      try { errMsg = JSON.parse(txt).error.message; } catch {}
      throw new Error(`Spotify ${res.status}: ${errMsg}`);
    }
    return res.json();
  }
  
  // ---------- Appels Spotify ----------
  async function fetchProfile() {
    return safeFetch('https://api.spotify.com/v1/me');
  }
  
  async function fetchTopTracks(time_range = 'long_term', limit = 10) {
    const json = await safeFetch(
      `https://api.spotify.com/v1/me/top/tracks?time_range=${time_range}&limit=${limit}`
    );
    return json.items;
  }
  
  async function fetchAudioFeaturesFor(tracks) {
    const ids = tracks.map(t => t.id).join(',');
    const json = await safeFetch(
      `https://api.spotify.com/v1/audio-features?ids=${ids}`
    );
    return json.audio_features;
  }
  
  // ---------- Recommandation cosinus ----------
  function recommendSongs(dataset, features) {
    const attrs = ['danceability','energy','valence'];
    const cosine = (a,b) => {
      const dot = attrs.reduce((s,k)=>s + a[k]*b[k], 0);
      const magA = Math.sqrt(attrs.reduce((s,k)=>s + a[k]**2,0));
      const magB = Math.sqrt(attrs.reduce((s,k)=>s + b[k]**2,0));
      return magA && magB ? dot/(magA*magB) : 0;
    };
  
    return dataset
      .map(song => ({
        song,
        score: features.reduce((sum,f)=>sum + cosine(song, f), 0)
      }))
      .sort((a,b)=>b.score - a.score)
      .slice(0, 10)
      .map(r => r.song);
  }
  
  // ---------- Affichage / UI ----------
  function populateUIProfile(profile) {
    document.getElementById('displayName').innerText = profile.display_name;
    if (profile.images.length) {
      const img = new Image(40,40);
      img.src = profile.images[0].url;
      document.getElementById('avatar').appendChild(img);
    }
  }
  
  function displayRecommendations(recs) {
    const ul = document.getElementById('topRecommendations');
    ul.innerHTML = '';
    recs.forEach((s,i) => {
      const li = document.createElement('li');
      li.textContent = `${i+1}. ${s.track_name} — ${s.artists} (album : ${s.album_name})`;
      ul.appendChild(li);
    });
  }
  
  // ---------- Initialisation ----------
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // 1. Profil
      const profile   = await fetchProfile();
      populateUIProfile(profile);
  
      // 2. Chargement CSV
      const urlCSV = 'https://raw.githubusercontent.com/PaulK841/datacamp/main/datacamp/SpotyHub/src/dataset.csv';
      const dataset = await new Promise((res, rej) => {
        Papa.parse(urlCSV, {
          download: true, header: true,
          complete: r => res(r.data),
          error: e    => rej(e)
        });
      });
  
      // 3. Top tracks + audio-features
      const topTracks = await fetchTopTracks('long_term', 10);
      const features  = await fetchAudioFeaturesFor(topTracks);
  
      // 4. Calcul & affichage
      const recs = recommendSongs(dataset, features);
      displayRecommendations(recs);
  
    } catch (err) {
      console.error('Erreur générale →', err);
    }
  });
  