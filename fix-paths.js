const fs = require('fs');
const path = require('path');

// Copy .nojekyll
const nojekyllSrc = path.join(__dirname, 'Public', '.nojekyll');
const nojekyllDest = path.join(__dirname, 'dist', '.nojekyll');
if (fs.existsSync(nojekyllSrc)) {
  fs.copyFileSync(nojekyllSrc, nojekyllDest);
  console.log('✓ Copied .nojekyll');
}

// Copy CNAME
const cnameSrc = path.join(__dirname, 'Public', 'CNAME');
const cnameDest = path.join(__dirname, 'dist', 'CNAME');
if (fs.existsSync(cnameSrc)) {
  fs.copyFileSync(cnameSrc, cnameDest);
  console.log('✓ Copied CNAME');
}

// Copy 404.html for SPA routing
const html404Src = path.join(__dirname, 'Public', '404.html');
const html404Dest = path.join(__dirname, 'dist', '404.html');
if (fs.existsSync(html404Src)) {
  fs.copyFileSync(html404Src, html404Dest);
  console.log('✓ Copied 404.html');
}

console.log('✓ Paths configured for custom domain (no modifications needed)');