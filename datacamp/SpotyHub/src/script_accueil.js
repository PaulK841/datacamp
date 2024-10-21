const accessToken = localStorage.getItem('accessToken');
// L'API Spotify est appelée pour obtenir le profil de l'utilisateur et ses artistes les plus écoutés.
const profile = await fetchProfile(accessToken);
// Les données de profil et les artistes les plus écoutés sont ensuite affichés sur la page Web.
populateUI(profile);
refreshTopArtists();



// La fonction fetchProfile envoie une requête GET à Spotify pour obtenir le profil de l'utilisateur.
async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    // Renvoyer le profil de l'utilisateur sous forme de JSON.
    return await result.json();
}


// La fonction populateUI met à jour l'interface utilisateur avec les informations du profil de l'utilisateur.
function populateUI(profile) {
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


// Fetch the top 10 artists and tracks


async function refreshTopArtists() {
    const topArtists = await fetchTop(accessToken, 'artists', "short_term");
    populateUI_artist(topArtists, 'topArtists');
}

async function fetchTop(token, type, time_range = 'short_term') {
    const result = await fetch(`https://api.spotify.com/v1/me/top/${type}?time_range=${time_range}&limit=1&offset=0`, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    const res = await result.json();
    return res;

}

// Populate the UI with the top items (artists or tracks)
function populateUI_artist(top, id) {
    const list = document.getElementById(id);
    list.innerHTML = ''; // Clear the list before populating it

    // Check if the top object has any items
    if (top.items.length > 0) {
        // Get the name of the first item
        const itemName = top.items[0].name;
        list.innerText = itemName;
        const art_id = top.items[0].id;
        var iframe = document.getElementById("artist");
        iframe.src = `https://open.spotify.com/embed/artist/${art_id}?utm_source=generator`;
    
    } else {
        // If no items were found, display a message
        list.innerText = `No top ${id} found`;
    }
}