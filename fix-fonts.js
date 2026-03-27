const fs = require('fs');
const path = require('path');

const BASE = String.raw`C:\Users\kmacn\Desktop\the Build Garden\app\src\app\dream`;

const files = [
  path.join(BASE, 'describe', 'page.tsx'),
  path.join(BASE, 'inspire', 'page.tsx'),
  path.join(BASE, 'browse', 'page.tsx'),
  path.join(BASE, 'sketch', 'page.tsx'),
  path.join(BASE, 'explore', 'page.tsx'),
  path.join(BASE, 'garden', 'page.tsx'),
  path.join(BASE, 'plans', 'page.tsx'),
  path.join(BASE, 'shared', '[slug]', 'client.tsx'),
];

const replacements = [
  ['Cinzel, Outfit', 'Archivo_Black, Archivo'],
  ['Cinzel({', 'Archivo_Black({'],
  ['Outfit({', 'Archivo({'],
  ['const cinzel = Archivo_Black({ subsets: ["latin"], weight: ["400", "700", "900"] });',
   'const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400" });'],
  ['const cinzel', 'const archivoBlack'],
  ['const outfit', 'const archivo'],
  ['cinzel.className', 'archivoBlack.className'],
  ['outfit.className', 'archivo.className'],
];

let fixed = 0;
for (const fpath of files) {
  if (!fs.existsSync(fpath)) {
    console.log('SKIP:', path.basename(path.dirname(fpath)) + '/' + path.basename(fpath));
    continue;
  }
  let content = fs.readFileSync(fpath, 'utf-8');
  const orig = content;
  for (const [old, rep] of replacements) {
    content = content.split(old).join(rep);
  }
  if (content !== orig) {
    fs.writeFileSync(fpath, content, 'utf-8');
    console.log('FIXED:', path.basename(path.dirname(fpath)) + '/' + path.basename(fpath));
    fixed++;
  } else {
    console.log('NO CHANGE:', path.basename(path.dirname(fpath)) + '/' + path.basename(fpath));
  }
}
console.log('\nDone!', fixed, 'files updated.');
