const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const logoPath = '/app/logo-cemindo.png';
  if (!fs.existsSync(logoPath)) {
    console.error('Logo file not found:', logoPath);
    return;
  }

  const sizes = [
    { name: 'pwa-192x192.png', size: 192, inner: 116 },
    { name: 'pwa-512x512.png', size: 512, inner: 310 },
    { name: 'apple-touch-icon.png', size: 180, inner: 110 },
    { name: 'favicon-32x32.png', size: 32, inner: 22 },
    { name: 'favicon-16x16.png', size: 16, inner: 12 },
  ];

  for (const s of sizes) {
    const resizedLogo = await sharp(logoPath)
      .resize({
        width: s.inner,
        height: s.inner,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    await sharp({
      create: {
        width: s.size,
        height: s.size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .png()
    .toFile('/app/' + s.name);
  }

  const pwa512Buf = fs.readFileSync('/app/pwa-512x512.png');
  const b64 = pwa512Buf.toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="64" fill="#ffffff"/>
  <image href="data:image/png;base64,${b64}" width="512" height="512"/>
</svg>`;
  fs.writeFileSync('/app/favicon.svg', svg);
  console.log('Successfully generated all icons with pure white background and centered logo!');
}

main().catch(console.error);

