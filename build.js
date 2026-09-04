const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const outDir = path.join(rootDir, 'dist');

if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Arquivos raiz
['index.html', 'manifest.json', 'sw.js'].forEach(file => {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(outDir, file));
  }
});

// Pastas de assets, css e js
['css', 'js', 'assets'].forEach(dir => {
  const src = path.join(rootDir, dir);
  if (fs.existsSync(src)) {
    copyRecursive(src, path.join(outDir, dir));
  }
});

console.log('Build StopKm concluído com sucesso em dist/');
