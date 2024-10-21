// Définir l'ID du client pour l'application Spotify
const clientId = "a80cc994deaf48b6a7363687970d729b"; //Client ID de Tristan

// Extraire le paramètre "code" de l'URL. Il s'agit du code d'autorisation fourni par Spotify pour obtenir un access_token.
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

// Si le code n'est pas présent, cela signifie que l'utilisateur n'a pas encore été redirigé vers la page d'autorisation de Spotify.
// Dans ce cas, l'utilisateur est redirigé vers la page d'autorisation.
if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    // Si le code est présent, cela signifie que l'utilisateur a été redirigé depuis la page d'autorisation de Spotify.
    // L'access_token est alors récupéré en utilisant le code d'autorisation.
    const accessToken = await getAccessToken(clientId, code);
    // L'access_token est ensuite stocké dans le local storage pour une utilisation ultérieure.
    localStorage.setItem('accessToken', accessToken);
    // L'access_token est également renvoyé par la fonction. 
    
    console.log(accessToken);
}

// La fonction redirectToAuthCodeFlow redirige l'utilisateur vers la page d'autorisation de Spotify.
// Elle génère également un code de vérification pour la méthode PKCE (Proof Key for Code Exchange) utilisée dans le flux d'autorisation.
async function redirectToAuthCodeFlow(clientId) {
    // Générer un code de vérification aléatoire.
    const verifier = generateCodeVerifier(128);
    // Générer un code challenge à partir du code de vérification.
    const challenge = await generateCodeChallenge(verifier);
    // Stocker le code de vérification dans le local storage pour une utilisation ultérieure.
    localStorage.setItem("verifier", verifier);

    // Créer les paramètres à envoyer dans l'URL de la page d'autorisation.
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5173/redirect.html");
    params.append("scope", "user-read-private user-read-email user-top-read playlist-modify-public playlist-modify-private");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    // Rediriger l'utilisateur vers la page d'autorisation avec les paramètres appropriés.
    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// La fonction getAccessToken envoie une requête POST à Spotify pour obtenir un access_token en utilisant le code d'autorisation et le code de vérification.
async function getAccessToken(clientId, code) {
    // Récupérer le code de vérification du local storage.
    const verifier = localStorage.getItem("verifier");

    // Créer les paramètres à envoyer dans le corps de la requête POST.
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:5173/redirect.html");
    params.append("code_verifier", verifier);

    // Envoyer la requête POST à Spotify pour obtenir l'access_token.
    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    // Extraire l'access_token de la réponse.
    const { access_token } = await result.json();
    return access_token;
}



// La fonction generateCodeVerifier génère un code de vérification aléatoire de la longueur spécifiée. 
// Ce code de vérification est utilisé pour la méthode PKCE (Proof Key for Code Exchange) dans le flux d'autorisation OAuth.
function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// La fonction generateCodeChallenge génère un code challenge à partir du code de vérification. 
// Le code challenge est une version hachée et codée en base64 du code de vérification, utilisée pour la méthode PKCE.
async function generateCodeChallenge(codeVerifier) {
    // Encodage du code de vérification en utilisant un TextEncoder.
    const data = new TextEncoder().encode(codeVerifier);
    // Hashage du code de vérification encodé en utilisant SHA-256.
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    // Conversion du hash en base64, avec remplacement de certains caractères pour le rendre URL-safe.
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}


