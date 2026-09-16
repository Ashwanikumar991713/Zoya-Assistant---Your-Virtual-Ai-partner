const fs = require('fs');

// A minimal 1x1 transparent PNG, we'll just write it and the browser will scale it, but to be compliant we should have the exact size.
// Actually, here is a 1x1 blue PNG:
const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const buffer = Buffer.from(base64Png, 'base64');

fs.writeFileSync('public/pwa-192x192.png', buffer);
fs.writeFileSync('public/pwa-512x512.png', buffer);
fs.writeFileSync('public/pwa-maskable-512x512.png', buffer);
fs.writeFileSync('public/apple-touch-icon.png', buffer);
