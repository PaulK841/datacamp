function displayRecommendations(recommendations) {
    const recommendationsContainer = document.getElementById('topRecommendations');
    recommendationsContainer.innerHTML = ''; // Clear any existing content

    recommendations.forEach(song => {
        const songElement = document.createElement('div');
        songElement.textContent = `${song.name} by ${song.artists.map(artist => artist.name).join(', ')}`;
        recommendationsContainer.appendChild(songElement);
    });
}
