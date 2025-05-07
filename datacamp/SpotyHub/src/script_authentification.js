// Définir l'ID du client pour l'application Spotify
const clientId = "495b2ab2886a41ed81645991f98bcbcb"; //Client ID de Tristan

// Extraire le paramètre "code" de l'URL
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

// Vérifier d'abord si on a déjà un token valide
const existingToken = localStorage.getItem('accessToken');
const tokenExpiration = localStorage.getItem('tokenExpiration');
const isTokenValid = tokenExpiration && new Date().getTime() < parseInt(tokenExpiration);

if (isTokenValid && existingToken) {
    console.log("Token existant valide, redirection...");
    // Rediriger vers la page principale si nécessaire
    if (window.location.href.includes('redirect.html')) {
        window.location.href = "index.html";
    }
} else if (!code) {
    console.log("Pas de code, redirection vers l'authentification...");
    redirectToAuthCodeFlow(clientId);
} else {
    console.log("Code reçu, récupération du token...");
    try {
        const tokenData = await getAccessToken(clientId, code);
        // Sauvegarder le token et sa date d'expiration
        localStorage.setItem('accessToken', tokenData.access_token);
        
        // Calculer l'expiration (tokenData.expires_in est en secondes)
        const expiration = new Date().getTime() + (tokenData.expires_in * 1000);
        localStorage.setItem('tokenExpiration', expiration);
        
        // Sauvegarder le refresh token si disponible
        if (tokenData.refresh_token) {
            localStorage.setItem('refreshToken', tokenData.refresh_token);
        }
        
        console.log("Token obtenu:", tokenData.access_token);
        
        // Rediriger vers la page principale
        window.location.href = "index.html";
    } catch (error) {
        console.error("Erreur lors de l'authentification:", error);
        // En cas d'erreur, redémarrer le processus
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tokenExpiration');
        redirectToAuthCodeFlow(clientId);
    }
}

// La fonction redirectToAuthCodeFlow redirige l'utilisateur vers la page d'autorisation de Spotify.
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
    params.append("redirect_uri", "https://datacamp40.netlify.app/datacamp/spotyhub/redirect.html");
    // Ajouter le scope audio-features pour accéder aux caractéristiques audio
    params.append("scope", "user-read-private user-read-email user-top-read playlist-modify-public playlist-modify-private user-read-currently-playing");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    // Rediriger l'utilisateur vers la page d'autorisation avec les paramètres appropriés.
    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// La fonction getAccessToken envoie une requête POST à Spotify pour obtenir un access_token
async function getAccessToken(clientId, code) {
    // Récupérer le code de vérification du local storage.
    const verifier = localStorage.getItem("verifier");

    // Créer les paramètres à envoyer dans le corps de la requête POST.
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "https://datacamp40.netlify.app/datacamp/spotyhub/redirect.html");
    params.append("code_verifier", verifier);

    // Envoyer la requête POST à Spotify pour obtenir l'access_token.
    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    if (!result.ok) {
        throw new Error(`Erreur lors de la récupération du token: ${result.status} ${result.statusText}`);
    }

    // Extraire les données complètes de la réponse
    const data = await result.json();
    return data; // Retourne le token et sa durée d'expiration
}

// Fonction pour rafraîchir le token si nécessaire
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
        // Si pas de refresh token, rediriger vers la page d'authentification
        redirectToAuthCodeFlow(clientId);
        return null;
    }
    
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);
    
    try {
        const result = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params
        });
        
        if (!result.ok) {
            throw new Error(`Erreur lors du rafraîchissement du token: ${result.status}`);
        }
        
        const data = await result.json();
        
        // Mettre à jour le token et son expiration
        localStorage.setItem('accessToken', data.access_token);
        const expiration = new Date().getTime() + (data.expires_in * 1000);
        localStorage.setItem('tokenExpiration', expiration);
        
        // Mettre à jour le refresh token si un nouveau est fourni
        if (data.refresh_token) {
            localStorage.setItem('refreshToken', data.refresh_token);
        }
        
        return data.access_token;
    } catch (error) {
        console.error("Erreur lors du rafraîchissement du token:", error);
        // En cas d'échec, redémarrer le processus d'authentification
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tokenExpiration');
        localStorage.removeItem('refreshToken');
        redirectToAuthCodeFlow(clientId);
        return null;
    }
}

// La fonction generateCodeVerifier génère un code de vérification aléatoire
function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// La fonction generateCodeChallenge génère un code challenge
async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Exporter les fonctions nécessaires
window.checkAndRefreshToken = async function() {
    const tokenExpiration = localStorage.getItem('tokenExpiration');
    const currentTime = new Date().getTime();
    
    // Si le token expire dans moins de 5 minutes, le rafraîchir
    if (!tokenExpiration || currentTime > parseInt(tokenExpiration) - 300000) {
        console.log("Token expiré ou sur le point d'expirer, rafraîchissement...");
        return await refreshAccessToken();
    }
    
    return localStorage.getItem('accessToken');
};