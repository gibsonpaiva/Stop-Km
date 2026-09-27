const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 1. Garante que o env.js e o build estejam atualizados
try {
  require('./build.js');
} catch (err) {
  console.warn('Aviso ao executar build inicial:', err.message);
}

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function openBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === 'darwin'
      ? `open "${url}"`
      : platform === 'win32'
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      console.log(`Acesse manualmente no navegador: ${url}`);
    }
  });
}

const server = http.createServer((req, res) => {
  const safeUrl = decodeURIComponent(req.url.split('?')[0]);
  const relativePath = safeUrl === '/' ? 'index.html' : safeUrl.replace(/^\/+/, '');
  const filePath = path.join(ROOT_DIR, relativePath);

  // Evita acesso fora do diretório raiz do projeto
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Acesso negado');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo não encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

function startServer(port) {
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log('\n==================================================');
    console.log(`🚀 StopKm rodando localmente em: ${url}`);
    console.log('🌐 Abrindo o navegador automaticamente...');
    console.log('🛑 Pressione Ctrl + C para encerrar o servidor.');
    console.log('==================================================\n');
    openBrowser(url);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Porta ${port} em uso, tentando porta ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Erro no servidor:', err);
    }
  });
}

startServer(Number(PORT));
