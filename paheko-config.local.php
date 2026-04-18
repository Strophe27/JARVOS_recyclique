<?php
namespace Paheko;

// Overrides locaux pour la stack Docker de dev.
// Force l'URL HTTP locale pour eviter une derive implicite vers HTTPS.
const WWW_URL = 'http://localhost:8080/';
const WWW_URI = '/';
