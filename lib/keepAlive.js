const http = require('http');

// Render (comme la plupart des hébergeurs "Web Service" gratuits) exige qu'un port
// HTTP soit ouvert pour considérer le service en bonne santé — un bot Discord n'en a
// pas besoin lui-même, ce petit serveur ne sert qu'à satisfaire cette contrainte.
function startKeepAliveServer() {
  const port = process.env.PORT || 3000;
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Velia Idle bot en ligne.');
  }).listen(port, () => console.log(`Serveur de santé HTTP à l'écoute sur le port ${port}`));
}

module.exports = { startKeepAliveServer };
