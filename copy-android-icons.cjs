const fs = require('fs');
const path = require('path');

const srcIcon = path.join(__dirname, 'src', 'assets', 'images', 'KhayyatProLogo (3).png');
const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const mipmaps = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

const targetNames = [
  'ic_launcher.png',
  'ic_launcher_round.png',
  'ic_launcher_foreground.png'
];

if (!fs.existsSync(srcIcon)) {
  console.error(`Source icon not found at: ${srcIcon}`);
  process.exit(0);
}

if (!fs.existsSync(resDir)) {
  console.log('Android resource directory not found. Skipping icon copying.');
  process.exit(0);
}

// 1. Copy the custom PNG to all resolution mipmap folders
mipmaps.forEach(mipmap => {
  const targetFolder = path.join(resDir, mipmap);
  if (fs.existsSync(targetFolder)) {
    targetNames.forEach(name => {
      const destPath = path.join(targetFolder, name);
      try {
        fs.copyFileSync(srcIcon, destPath);
        console.log(`[Icon Setup] Copied custom icon to: ${destPath}`);
      } catch (err) {
        console.error(`[Icon Setup] Failed to copy to ${destPath}:`, err.message);
      }
    });
  }
});

// 2. CONFIGURE proper Android modern Adaptive Icons inside mipmap-anydpi-v26 folder
// This makes modern devices mask and shape our custom logo beautifully inside circles or squares!
const anyDpiDir = path.join(resDir, 'mipmap-anydpi-v26');
if (!fs.existsSync(anyDpiDir)) {
  try {
    fs.mkdirSync(anyDpiDir, { recursive: true });
    console.log('[Icon Setup] Created mipmap-anydpi-v26 directory');
  } catch (err) {
    console.error('[Icon Setup] Failed to create mipmap-anydpi-v26 directory:', err.message);
  }
}

const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;

const xmlFiles = [
  path.join(anyDpiDir, 'ic_launcher.xml'),
  path.join(anyDpiDir, 'ic_launcher_round.xml')
];

xmlFiles.forEach(xmlPath => {
  try {
    fs.writeFileSync(xmlPath, adaptiveIconXml, 'utf8');
    console.log(`[Icon Setup] Configured adaptive xml icon at: ${xmlPath}`);
  } catch (err) {
    console.error(`[Icon Setup] Failed to write adaptive xml icon at ${xmlPath}:`, err.message);
  }
});

console.log('[Icon Setup] Android APK Launcher Icons configured successfully!');
