document.addEventListener('DOMContentLoaded', function() {
  // Remplacez par l'URL de votre fichier CSV dans votre dépôt GitHub
  const url = 'https://raw.githubusercontent.com/PaulK841/datacamp/main/datacamp/SpotyHub/src/dataset.csv';

  Papa.parse(url, {
      download: true,
      header: true, // Utilisez false si vous n'avez pas de ligne d'en-tête
      complete: function(results) {
          console.log('Premiers éléments du dataset:', results.data.slice(0, 5)); // Affiche les 5 premiers éléments
      },
      error: function(error) {
          console.error('Erreur de chargement du CSV:', error);
      }
  });
});
