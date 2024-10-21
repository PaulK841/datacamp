import { fetchAudioFeatures } from './script_recommendation.js';

async function getAudioFeatures(token, trackIds) {
    try {
        const audioFeatures = await fetchAudioFeatures(token, trackIds);
        console.log(audioFeatures);
        // Faites ce que vous voulez avec les audioFeatures ici
    } catch (error) {
        console.error(error);
    }
}