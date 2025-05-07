// Gestion PKCE + échange code→access/refresh token + refresh automatique
(async () => {
    const CLIENT_ID = '495b2ab2886a41ed81645991f98bcbcb';
    const REDIRECT_URI = window.location.origin + '/recommendation.html';
    const SCOPE = 'user-top-read user-read-email';
  
    function base64urlEncode(str) {
      return btoa(String.fromCharCode.apply(null, new Uint8Array(str)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  
    async function generatePKCE() {
      const verifier = base64urlEncode(window.crypto.getRandomValues(new Uint8Array(32)));
      const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      const challenge = base64urlEncode(digest);
      localStorage.setItem('pkce_verifier', verifier);
      return challenge;
    }
  
    // Si on a déjà un token, on ne fait rien
    if (localStorage.getItem('accessToken')) return;
  
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('code')) {
      // On n’a pas de code : on lance l’authentification
      const challenge = await generatePKCE();
      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.search = new URLSearchParams({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: SCOPE,
        redirect_uri: REDIRECT_URI,
        code_challenge_method: 'S256',
        code_challenge: challenge,
      });
      window.location.href = authUrl.toString();
      return;
    }
  
    // On a un code → on échange contre tokens
    const code = urlParams.get('code');
    const verifier = localStorage.getItem('pkce_verifier');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    });
  
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await res.json();
    if (data.error) return console.error('Échange token:', data);
    localStorage.setItem('accessToken', data.access_token);
    localStorage.setItem('refreshToken', data.refresh_token);
    // on nettoie le code de l’URL
    window.history.replaceState({}, '', REDIRECT_URI);
  })();
  