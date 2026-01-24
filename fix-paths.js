const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Fix all paths
html = html.replace(/href="\//g, 'href="/ZipServices/');
html = html.replace(/src="\//g, 'src="/ZipServices/');

fs.writeFileSync(indexPath, html);
console.log('✓ Fixed paths in index.html');

// Copy .nojekyll
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