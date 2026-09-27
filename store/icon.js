const sharp = require('sharp');

// Chores icon: sage-to-forest field, a bright white house with a bold green
// check inside it, and a sunny sparkle off the roof. Reads at 60px; nothing
// like the clipboard (Attendance), medal (Merit), flame (Hearth) or gift (Given).
const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4FB387"/>
      <stop offset="1" stop-color="#1F5E43"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.3" r="0.65">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <rect width="1024" height="1024" fill="url(#glow)"/>
  <!-- house -->
  <path d="M 512 196 L 846 470 Q 862 484 862 506 L 862 814 Q 862 858 818 858 L 206 858 Q 162 858 162 814 L 162 506 Q 162 484 178 470 Z"
        fill="#FFFFFF" stroke="#FFFFFF" stroke-width="40" stroke-linejoin="round"/>
  <!-- check -->
  <path d="M 336 610 L 462 736 L 700 498" fill="none" stroke="#2E7D5B" stroke-width="84" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- sparkle -->
  <path d="M 812 128 C 826 204 846 224 922 238 C 846 252 826 272 812 348 C 798 272 778 252 702 238 C 778 224 798 204 812 128 Z" fill="#F4C23D"/>
  <path d="M 214 250 C 221 288 231 298 269 305 C 231 312 221 322 214 360 C 207 322 197 312 159 305 C 197 298 207 288 214 250 Z" fill="#F4C23D" opacity="0.9"/>
</svg>`;

(async () => {
  const buf = Buffer.from(svg);
  await sharp(buf).resize(1024, 1024).flatten({ background: '#1F5E43' }).removeAlpha().png().toFile('../assets/icon.png');
  await sharp(buf).resize(1024, 1024).png().toFile('../assets/android-icon-foreground.png');
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#1F5E43' } })
    .png().toFile('../assets/android-icon-background.png');
  await sharp(buf).resize(1024, 1024).grayscale().png().toFile('../assets/android-icon-monochrome.png');
  await sharp(buf).resize(48, 48).png().toFile('../assets/favicon.png');
  await sharp(buf).resize(512, 512).png().toFile('../assets/splash-icon.png');
  await sharp(buf).resize(180, 180).png().toFile('./icon-preview-180.png');
  console.log('icons written');
})();
