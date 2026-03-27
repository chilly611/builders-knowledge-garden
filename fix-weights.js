const fs = require('fs');
const path = require('path');

const BASE = String.raw`C:\Users\kmacn\Desktop\the Build Garden\app\src`;

// Recursively find all .tsx files
function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.next') results = results.concat(walk(full));
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(BASE);
let fixed = 0;

for (const fpath of files) {
  let content = fs.readFileSync(fpath, 'utf-8');
  // Fix any Archivo_Black weight that isn't just "400"
  const badPattern = /Archivo_Black\(\{[^}]*weight:\s*\[.*?\]/g;
  if (badPattern.test(content)) {
    content = content.replace(
      /Archivo_Black\(\{\s*subsets:\s*\[.*?\],\s*weight:\s*\[.*?\]\s*\}/g,
      'Archivo_Black({ subsets: ["latin"], weight: "400" })'
    );
    fs.writeFileSync(fpath, content, 'utf-8');
    console.log('FIXED weight:', path.relative(BASE, fpath));
    fixed++;
  }
}
console.log('\nFixed', fixed, 'files with bad Archivo_Black weights.');
