#!/bin/zsh

# Vai para a pasta onde este arquivo está localizado
cd "$(dirname "$0")" || exit 1

# Garante que caminhos comuns do Node no macOS (Homebrew / NVM) estejam no PATH
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
fi

# Garante que env.js exista caso ainda não tenha sido criado
if [ ! -f "env.js" ]; then
  cat << 'EOF' > env.js
window.__ENV__ = {
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ""
};
EOF
fi

if command -v node >/dev/null 2>&1; then
  node start.js
else
  python3 - << 'PYEOF'
import http.server
import socketserver
import webbrowser
import os

PORT = 3000
while True:
    try:
        class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
            def end_headers(self):
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                super().end_headers()

        socketserver.TCPServer.allow_reuse_address = True
        with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
            url = f"http://localhost:{PORT}"
            print("\n==================================================")
            print(f"🚀 StopKm rodando localmente em: {url}")
            print("🌐 Abrindo o navegador automaticamente...")
            print("🛑 Pressione Ctrl + C para encerrar o servidor.")
            print("==================================================\n")
            webbrowser.open(url)
            httpd.serve_forever()
        break
    except OSError:
        PORT += 1
PYEOF
fi
