const fs = require('fs');
const sharp = require('sharp');

// Design a custom meeting room booking icon:
// Colors: Pure White background (#FFFFFF), Cemindo Corporate Red (#B52025), Slate / Charcoal Gray (#1E293B, #334155, #64748B, #94A3B8, #E2E8F0)
// Theme: Executive Boardroom / Meeting Room + Booking Schedule Accent

async function generateAllIcons() {
  const logoPath = '/app/logo-cemindo.png';
  let rhinoLogoPngBuffer = null;
  if (fs.existsSync(logoPath)) {
    // Resize rhino logo to fit inside the presentation screen on the wall
    rhinoLogoPngBuffer = await sharp(logoPath)
      .resize({ width: 72, height: 50, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
  }

  const rhinoBase64 = rhinoLogoPngBuffer ? rhinoLogoPngBuffer.toString('base64') : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <!-- 1. Pure White Background -->
  <rect width="512" height="512" fill="#FFFFFF"/>

  <!-- Centered Icon Composition (58% scale for elegant padding / "kecil saja ditengah") -->
  <g transform="translate(108, 108) scale(0.58)">
    <defs>
      <linearGradient id="cardBg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="100%" stop-color="#F8FAFC"/>
      </linearGradient>
      <linearGradient id="cemindoRed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#D9252B"/>
        <stop offset="100%" stop-color="#B52025"/>
      </linearGradient>
      <linearGradient id="tableGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#334155"/>
        <stop offset="100%" stop-color="#1E293B"/>
      </linearGradient>
      <filter id="cardShadow" x="-12%" y="-8%" width="128%" height="124%">
        <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0F172A" flood-opacity="0.14"/>
      </filter>
      <filter id="badgeShadow" x="-20%" y="-20%" width="145%" height="145%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#B52025" flood-opacity="0.32"/>
      </filter>
    </defs>

    <!-- Base Booking Card with Industrial Border & Soft Shadow -->
    <rect x="40" y="40" width="432" height="432" rx="52" fill="url(#cardBg)" stroke="#E2E8F0" stroke-width="8" filter="url(#cardShadow)"/>

    <!-- Top Calendar Header Banner in Cemindo Red -->
    <path d="M 40 92 Q 40 40 92 40 L 420 40 Q 472 40 472 92 L 472 144 L 40 144 Z" fill="url(#cemindoRed)"/>

    <!-- Calendar Rings (Top Mounting Hooks) -->
    <rect x="132" y="22" width="22" height="40" rx="11" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="4"/>
    <rect x="358" y="22" width="22" height="40" rx="11" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="4"/>

    <!-- Header Badge / Room Reservation Pill -->
    <rect x="196" y="82" width="120" height="28" rx="14" fill="rgba(255,255,255,0.25)"/>
    <circle cx="218" cy="96" r="6" fill="#FFFFFF"/>
    <rect x="234" y="93" width="62" height="6" rx="3" fill="#FFFFFF"/>

    <!-- Meeting Room Screen / Presentation Wall Display -->
    <rect x="176" y="168" width="160" height="92" rx="12" fill="#0F172A" stroke="#475569" stroke-width="3.5"/>
    <rect x="184" y="176" width="144" height="76" rx="8" fill="#1E293B"/>

    ${
      rhinoBase64
        ? `<image href="data:image/png;base64,${rhinoBase64}" x="220" y="186" width="72" height="50"/>`
        : `
        <rect x="200" y="196" width="40" height="6" rx="3" fill="#94A3B8"/>
        <rect x="200" y="208" width="26" height="5" rx="2.5" fill="#64748B"/>
        <rect x="272" y="214" width="10" height="22" rx="3" fill="#B52025"/>
        <rect x="288" y="202" width="10" height="34" rx="3" fill="#94A3B8"/>
        <rect x="304" y="192" width="10" height="44" rx="3" fill="#B52025"/>
      `
    }

    <!-- Wall Mount Pole & Foot -->
    <rect x="251" y="260" width="10" height="12" fill="#64748B"/>
    <rect x="236" y="272" width="40" height="5" rx="2.5" fill="#475569"/>

    <!-- Boardroom Meeting Chairs - Top Row (Behind Table) -->
    <rect x="146" y="280" width="38" height="22" rx="9" fill="#64748B"/>
    <rect x="237" y="280" width="38" height="22" rx="9" fill="#64748B"/>
    <rect x="328" y="280" width="38" height="22" rx="9" fill="#64748B"/>

    <!-- Boardroom Meeting Chairs - Left & Right Heads -->
    <rect x="88" y="330" width="22" height="38" rx="9" fill="#64748B"/>
    <rect x="402" y="330" width="22" height="38" rx="9" fill="#64748B"/>

    <!-- Central Executive Conference Table (Pill Shaped Boardroom Table) -->
    <rect x="118" y="308" width="276" height="82" rx="41" fill="url(#tableGrad)" stroke="#64748B" stroke-width="4.5"/>

    <!-- Conference Table Center Technology Strip & Microphones -->
    <rect x="178" y="340" width="156" height="18" rx="9" fill="#0F172A"/>
    <circle cx="212" cy="349" r="4" fill="#B52025"/>
    <circle cx="256" cy="349" r="4" fill="#94A3B8"/>
    <circle cx="300" cy="349" r="4" fill="#10B981"/>

    <!-- Boardroom Meeting Chairs - Bottom Row (In Front of Table) -->
    <rect x="146" y="396" width="38" height="22" rx="9" fill="#475569"/>
    <rect x="237" y="396" width="38" height="22" rx="9" fill="#475569"/>
    <rect x="328" y="396" width="38" height="22" rx="9" fill="#475569"/>

    <!-- Floating Booking Schedule Clock Badge (Bottom-Right) -->
    <g transform="translate(364, 364)" filter="url(#badgeShadow)">
      <circle cx="48" cy="48" r="46" fill="url(#cemindoRed)" stroke="#FFFFFF" stroke-width="6"/>
      <!-- Clock Face -->
      <circle cx="48" cy="48" r="28" fill="none" stroke="#FFFFFF" stroke-width="5"/>
      <!-- Clock Hands Pointing to Meeting Time -->
      <path d="M 48 30 L 48 48 L 62 48" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>
</svg>`;

  const svgBuffer = Buffer.from(svg);

  // Generate all required formats and sizes
  const targets = [
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon.png', size: 32 },
  ];

  for (const t of targets) {
    await sharp(svgBuffer)
      .resize(t.size, t.size)
      .png()
      .toFile('/app/' + t.name);
    console.log('Generated: ' + t.name);
  }

  // Save the SVG itself as favicon.svg and favicon.ico
  fs.writeFileSync('/app/favicon.svg', svg);
  fs.copyFileSync('/app/favicon.svg', '/app/favicon.ico');
  console.log('Saved: favicon.svg & favicon.ico');
}

generateAllIcons().catch(console.error);
