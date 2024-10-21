import { fetchAudioFeatures } from './script_statistique.js';  // Import de la fonction asynchrone

document.addEventListener('DOMContentLoaded', async function() {
  const url = 'https://raw.githubusercontent.com/PaulK841/datacamp/main/datacamp/SpotyHub/src/dataset.csv';

  Papa.parse(url, {
    download: true,
    header: true, // Utilisez false si vous n'avez pas de ligne d'en-tête
    complete: async function(results) {
      console.log('Premiers éléments du dataset:', results.data.slice(0, 5)); // Affiche les 5 premiers éléments

      // Appel de la fonction asynchrone pour récupérer les chansons
      try {
        const fetchedSongs = await fetchAudioFeatures();  // Attend la récupération des chansons
        console.log('Chansons récupérées:', fetchedSongs);

        // Appel de la fonction de recommandation
        const recommendations = recommendSongs(results.data, fetchedSongs);
        console.log('Recommandations:', recommendations);
        
        // Ici, tu peux ajouter du code pour afficher les recommandations sur ta page
      } catch (error) {
        console.error('Erreur lors de la récupération des chansons:', error);
      }
    },
    error: function(error) {
      console.error('Erreur de chargement du CSV:', error);
    }
  });
});

// Fonction de recommandation de chansons
function recommendSongs(dataset, fetchedSongs) {
  // Fonction pour calculer la similarité entre deux chansons
  function calculateSimilarity(song1, song2) {
    let similarity = 0;
    const attributes = ['danceability', 'energy', 'valence']; // Exemple d'attributs
    attributes.forEach(attr => {
      similarity += Math.abs(song1[attr] - song2[attr]);
    });
    return similarity;
  }

  // Calcul des recommandations
  const recommendations = dataset.map(song => {
    let totalSimilarity = 0;
    fetchedSongs.forEach(fetchedSong => {
      totalSimilarity += calculateSimilarity(song, fetchedSong);
    });
    return { song, similarity: totalSimilarity };
  });

  // Tri des recommandations par similarité croissante
  recommendations.sort((a, b) => a.similarity - b.similarity);

  // Retourne les 10 meilleures recommandations
  return recommendations.slice(0, 10).map(rec => rec.song);
}
