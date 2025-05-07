// → PKCE + échange code→access_token+refresh_token + stockage local

(async () => {
    const CLIENT_ID    = '495b2ab2886a41ed81645991f98bcbcb';
    const REDIRECT_URI = window.location.origin + '/recommendation.html';
    const SCOPE        = 'user-top-read user-read-email';
  
    function base64url(buffer) {
      return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  
    async function pkceChallenge() {
      const verifier = base64url(window.crypto.getRandomValues(new Uint8Array(32)));
      const digest   = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      const challenge = base64url(digest);
      localStorage.setItem('pkce_verifier', verifier);
      return challenge;
    }
  
    // Si on a déjà un accessToken valide, on ne relance pas l’authent.
    if (localStorage.getItem('accessToken')) return;
  
    const params = new URLSearchParams(window.location.search);
    if (!params.has('code')) {
      // pas de code → on redirige vers Spotify
      const challenge = await pkceChallenge();
      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.search = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: SCOPE,
        redirect_uri: REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: challenge
      });
      return window.location.href = authUrl.toString();
    }
  
    // on a un code → échange contre tokens
    const code     = params.get('code');
    const verifier = localStorage.getItem('pkce_verifier');
    const body     = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
      client_id:     CLIENT_ID,
      code_verifier: verifier
    });
  
    const res  = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await res.json();
    if (data.error) {
      console.error('Échange token échoué', data);
      return;
    }
    localStorage.setItem('accessToken',  data.access_token);
    localStorage.setItem('refreshToken', data.refresh_token);
    // on retire le code de l’URL
    window.history.replaceState({}, '', REDIRECT_URI);
  })();
  