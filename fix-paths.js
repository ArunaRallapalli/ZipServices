const fs = require('fs');
const path = require('path');

// Copy .nojekyll to disable Jekyll processing
const nojekyllSrc = path.join(__dirname, 'Public', '.nojekyll');
const nojekyllDest = path.join(__dirname, 'dist', '.nojekyll');
if (fs.existsSync(nojekyllSrc)) {
  fs.copyFileSync(nojekyllSrc, nojekyllDest);
  console.log('✓ Copied .nojekyll');
}

// Copy CNAME for custom domain
const cnameSrc = path.join(__dirname, 'Public', 'CNAME');
const cnameDest = path.join(__dirname, 'dist', 'CNAME');
if (fs.existsSync(cnameSrc)) {
  fs.copyFileSync(cnameSrc, cnameDest);
  console.log('✓ Copied CNAME');
}

console.log('✓ Paths configured for custom domain (no modifications needed)');
