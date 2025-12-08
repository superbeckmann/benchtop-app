// updateVersion.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
const counterFile = path.join(__dirname, '.versionCounter');

// Read current counter (or start at 0)
let counter = 0;
if (fs.existsSync(counterFile)) {
  counter = parseInt(fs.readFileSync(counterFile, 'utf8'), 10) || 0;
}
counter++;

// Save updated counter
fs.writeFileSync(counterFile, counter.toString(), 'utf8');

// Build version string: YYYYMMDD-counter
const today = new Date();
const dateStr = today.toISOString().slice(0,10).replace(/-/g, '');
const version = `${dateStr}-${counter}`;

// Update all ?v=... in index.html
let html = fs.readFileSync(filePath, 'utf8');
html = html.replace(/(\.(js|css))(?:\?v=[\w-]+)?/g, `$1?v=${version}`);
fs.writeFileSync(filePath, html, 'utf8');

console.log(`✅ Updated cache-busting version to ${version} in index.html`);
