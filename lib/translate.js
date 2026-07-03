const translate = require('google-translate-api-x');
const { logError } = require('./logger');

// Traduit un texte vers l'anglais. Renvoie null en cas d'échec (le message ne sera
// simplement pas relayé plutôt que de planter le bot).
async function translateToEnglish(text) {
  if (!text || !text.trim()) return null;
  try {
    const res = await translate(text, { to: 'en' });
    return res.text;
  } catch (e) {
    logError('translateToEnglish:', e.message);
    return null;
  }
}

module.exports = { translateToEnglish };
