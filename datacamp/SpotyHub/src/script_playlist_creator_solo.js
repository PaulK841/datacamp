// Select the button
const createPlaylistButton = document.getElementById("create-playlist-button");
//stock input value
const playlistName = document.getElementById("name-input");
//stock input value for the number of tracks
const numberOfTracks = document.getElementById("number-input");
// Retrieve the access token from local storage
const accessToken = localStorage.getItem('accessToken');
// Call async function to get the user's top 10 tracks
const tracks = await fetchTrack(accessToken);
const profile = await fetchProfile(accessToken);
// Les données de profil 
// Add a click event listener to the button
// Update the UI with the top 10 tracks
populateIU(tracks);
populateUI(profile);



//Functions

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




createPlaylistButton.addEventListener("click", async function() {
    
    const NAME = playlistName.value;
    const NUMBER = numberOfTracks.value;
    const tracks2 = await fetchTrackNumber(accessToken, NUMBER);
    // Call async function to get the user's ID 
    const userId = await fetchUserId(accessToken);
    // Call async function to create a new playlist and get its ID
    const playlistId = await createPlaylist(userId, accessToken, NAME);
    // Call async function to add the top 10 tracks to the new playlist
    await addTracksToPlaylist(playlistId, tracks2.items, accessToken);
    const successMessage = document.getElementById("success-message");
    successMessage.style.display = "block";
    //Change the src of the iframe with the id of the new playlist and display it.
    var iframe = document.getElementById("playlistCreate");
    iframe.src =`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator`;
    let div = document.getElementById("divPlay");
    div.style.display = "block";
    console.log(NAME);

});

    
// Fonction pour récupérer les 10 meilleurs titres de l'utilisateur
async function fetchTrack(token) {
    // Envoie une requête GET à l'API Spotify pour récupérer les 10 meilleurs titres de l'utilisateur
    const result = await fetch("https://api.spotify.com/v1/me/top/tracks?limit=50&offset=0", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    // Renvoie les données de la réponse sous forme d'objet JSON
    return await result.json();
}

async function fetchTrackNumber(token, number) {
    // Envoie une requête GET à l'API Spotify pour récupérer les 10 meilleurs titres de l'utilisateur
    const result = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=${number}&offset=0`, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    // Renvoie les données de la réponse sous forme d'objet JSON
    return await result.json();
}



// Fonction pour récupérer l'ID de l'utilisateur
async function fetchUserId(token) {
    // Envoie une requête GET à l'API Spotify pour récupérer le profil de l'utilisateur
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
    });
    // Convertit la réponse en JSON
    const data = await result.json();
    // Renvoie l'ID de l'utilisateur
    return data.id;
}


// Fonction pour mettre à jour l'interface utilisateur avec les 10 meilleurs titres
function populateIU(tracks) {
    // Récupère l'élément HTML avec l'ID 'track-list'
    const trackList = document.getElementById("track-list");

    // Vérifie si la liste des meilleurs titres contient des éléments
    if (tracks.items.length > 0) {
        // Parcourt chaque titre dans la liste des meilleurs titres
        tracks.items.forEach((track, index) => {
            // Crée un nouvel élément de liste
            let listItem = document.createElement("li");
            // Définit le texte de l'élément de liste comme le nom du titre
            listItem.innerText = `${index+1}. ${track.name}`;
            // Ajoute l'élément de liste à l'élément 'track-list'
            trackList.appendChild(listItem);
        });
    } else {
        // Si la liste des meilleurs titres est vide, affiche un message d'erreur
        document.getElementById("name").innerText = "No top tracks found";
    }
}

// Fonction pour créer une nouvelle playlist pour l'utilisateur
async function createPlaylist(userId, token, NAME) {
    // Envoie une requête POST à l'API Spotify pour créer une nouvelle playlist
    const result = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
        method: "POST",
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: NAME,
            description: "Playlist created by SpotiyHub",
            public: true
        })
    });
        // Convertit la réponse en JSON
    const data = await result.json();
    // Renvoie l'ID de la nouvelle playlist
    return data.id;
}



// Fonction pour ajouter des titres à une playlist
async function addTracksToPlaylist(playlistId, tracks, token) {
    // Crée un tableau contenant les URI de chaque titre
    const trackUris = tracks.map(track => track.uri);
    // Envoie une requête POST à l'API Spotify pour ajouter les titres à la playlist
    await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: "POST",
        headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            uris: trackUris
        })
    });
}
