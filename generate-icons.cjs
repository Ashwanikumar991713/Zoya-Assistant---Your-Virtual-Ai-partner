const fs = require('fs');
const sharp = require('sharp');

async function buildIcons() {
  const svgBuffer = fs.readFileSync('public/icon.svg');

  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile('public/pwa-192x192.png');

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile('public/pwa-512x512.png');

  // Maskable 512x512 (with 10% padding for safe zone)
  await sharp(svgBuffer)
    .resize(410, 410)
    .extend({
      top: 51,
      bottom: 51,
      left: 51,
      right: 51,
      background: '#0A0C10'
    })
    .png()
    .toFile('public/pwa-maskable-512x512.png');

  // Apple touch icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile('public/apple-touch-icon.png');

  console.log('Successfully generated all PWA icons!');
}

buildIcons().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
