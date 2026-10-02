const fs = require('fs');
const path = require('path');

const distPath = path.resolve(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('Error: dist/index.html not found. Run "expo export --platform web" first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf-8');

const pwaHeadTags = `
    <!-- PWA & Mobile Web Capabilities -->
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Nutrición IA" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icon.png" />

    <!-- Service Worker Registration -->
    <script>
      if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js').then(function(reg) {
            console.log('PWA Service Worker registered:', reg.scope);
          }).catch(function(err) {
            console.log('SW registration error:', err.message);
          });
        });
      }
    </script>
`;

if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `${pwaHeadTags}\n  </head>`);
  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('✅ PWA tags and Service Worker successfully injected into dist/index.html');
} else {
  console.log('ℹ️ PWA manifest tag already present in dist/index.html');
}
