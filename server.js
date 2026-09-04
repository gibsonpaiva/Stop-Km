const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 5173;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  // Tratamento de URL
  let safeUrl = req.url.split('?')[0];
  try {
    safeUrl = decodeURIComponent(safeUrl);
  } catch (e) {
    safeUrl = req.url.split('?')[0];
  }

  if (safeUrl === '/' || safeUrl === '') {
    safeUrl = '/index.html';
  }

  // Endpoint de configuração de ambiente (compatível com Vercel)
  if (safeUrl === '/api/config' || safeUrl === '/api/config.js') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      supabaseUrl: process.env.SUPABASE_URL || 'https://eugkvjulxnyvywxhmchv.supabase.co',
      supabaseKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_WSmgvbj4N7q_EBEb054IIA_DSYE6bRj'
    }));
    return;
  }

  const filePath = path.join(__dirname, safeUrl);

  // Segurança de diretório
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Acesso negado');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback para index.html (estilo SPA/PWA) se não for arquivo de asset
      if (!path.extname(safeUrl)) {
        const indexPath = path.join(__dirname, 'index.html');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8', 'Cache-Control': 'no-cache' });
        fs.createReadStream(indexPath).pipe(res);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('404 Arquivo não encontrado');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

// Pega os IPs de rede local
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

let qrcode = null;
try {
  qrcode = require('qrcode-terminal');
} catch (e) {
  // Opcional se pacote não estiver disponível
}

server.on('clientError', (err, socket) => {
  if (err.code === 'ECONNRESET' || !socket.writable) {
    return;
  }
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT, '0.0.0.0', () => {
  const localIps = getLocalIPs();
  const mobileUrl = localIps.length > 0 ? `http://${localIps[0]}:${PORT}/` : `http://localhost:${PORT}/`;

  console.log('\n======================================================');
  console.log('       🚚 STOPKM - SERVIDOR LOCAL ATIVO');
  console.log('======================================================\n');
  console.log(`  > Local (PC):       http://localhost:${PORT}/`);
  console.log(`  > Celular (Wi-Fi):  ${mobileUrl}\n`);
  console.log('  ⚠️  DICA IMPORTANTE PARA O CELULAR:');
  console.log('  Digite obrigatoriamente "http://" antes do IP no navegador.');
  console.log('  Se digitar apenas o IP sem "http://", o celular tentará https');
  console.log('  e apresentará o erro ERR_SSL_PROTOCOL_ERROR.\n');

  if (qrcode) {
    console.log('  📲 Aponte a câmera do celular para o QR Code abaixo:');
    qrcode.generate(mobileUrl, { small: true });
  }

  console.log('\n  Pressione CTRL + C para encerrar o servidor.');
  console.log('======================================================\n');
});
