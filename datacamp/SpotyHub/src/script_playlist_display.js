// Select the button
const createPlaylistButton = document.getElementById("create-playlist-button");
// Retrieve the access token from local storage
const accessToken = localStorage.getItem('accessToken');
// Call async function to get the user's top 10 tracks
// const tracks = await fetchTrack(accessToken);
// Add a click event listener to the button
// Update the UI with the top 10 tracks
// populateUI(tracks);






// Fonction qui permet de recup le json d'une playlist 
async function fetchPlaylist() {
    const Token = localStorage.getItem('accessToken');
    const id_playlist = document.getElementById("playlist-input").value;
    changePlaylist(id_playlist);
    const result = await fetch(`https://api.spotify.com/v1/playlists/${id_playlist}`, {
        method: "GET", 
        headers: { 
            Authorization: `Bearer ${Token}` 
        }
    });
    const track = await fetch(`https://api.spotify.com/v1/playlists/${id_playlist}/tracks?limit=50`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${Token}`
        }
    });
 
    const jsonTrack = await track.json();
    const jsonResult = await result.json();
    console.log(jsonResult);
    //window.open(jsonResult);
     await populatePlaylist(jsonResult);
     console.log("gg");
     console.log(jsonTrack);
     await displayPlaylist(jsonTrack);

}



async function populatePlaylist(profile) {
    document.getElementById("displayPlaylist").innerText = profile.name;
    if(profile.collaborative === false){
        
        document.getElementById("collaborative").innerText = "No";
    }else{
        document.getElementById("collaborative").innerText = "Yes";
    }
    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("cover").appendChild(profileImage);
        document.getElementById("imgUrl").innerText = profile.images[0].url;
    }
    document.getElementById("descriptions").innerText = profile.description;
    document.getElementById("followers").innerText = profile.followers.total;
    document.getElementById("uri").innerText = profile.uri;
    document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
    document.getElementById("owner").innerText = profile.owner.display_name;

}

async function changePlaylist(playlist1){
    var iframe = document.getElementById("playlist");
    iframe.src = `https://open.spotify.com/embed/playlist/${playlist1}?utm_source=generator`;
}

async function displayPlaylist(profile){
    const trackListContainer = document.getElementById("track");
    for(let i = 0; i<50;i++){

        if ( profile.items[i]){
            console.log("i"+i);
            const trackElement = document.createElement("td");
            const numTrack = document.createElement("td");
            const element1 = document.createTextNode("\n"+(i+1) + " "); //le titre
            const trackName = profile.items[i].track.name;
            trackElement.innerText = trackName; //mise en texte 
            numTrack.innerText = element1.textContent;

            const flexContainer = document.createElement("tr");
            //flexContainer.style.display = "flex";
            flexContainer.appendChild(numTrack);
            flexContainer.appendChild(trackElement);

            trackListContainer.appendChild(flexContainer);
        }else{
            console.log("bye");
        }

    }
}





 