const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

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

function getEnvVars() {
  const envFile = path.join(rootDir, '.env');
  const vars = {};
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        vars[k] = v;
      }
    }
  }
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || vars.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || vars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
  };
}

const currentEnv = getEnvVars();
const envJsContent = `window.__ENV__ = {
  NEXT_PUBLIC_SUPABASE_URL: ${JSON.stringify(currentEnv.NEXT_PUBLIC_SUPABASE_URL)},
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${JSON.stringify(currentEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)}
};
`;

// Cria env.js no root se ainda não existir ou atualiza com as variáveis locais
fs.writeFileSync(path.join(rootDir, 'env.js'), envJsContent, 'utf8');

function buildTarget(outDir) {
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // Arquivos raiz
  ['index.html', 'manifest.json', 'sw.js', 'env.js'].forEach(file => {
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
}

// Constrói em dist/ e public/
buildTarget(distDir);
buildTarget(publicDir);

console.log('Build StopKm concluído com sucesso em dist/ e public/');
