FROM python:3.12-alpine AS runtime

LABEL org.opencontainers.image.title="ipermabot-pwa" \
      org.opencontainers.image.description="PWA de controle do robô aplicador de impermeabilizante Ipermabot" \
      org.opencontainers.image.source="https://github.com/USER/projeto-robo-impermeabilizador" \
      org.opencontainers.image.licenses="UNLICENSED"

ENV APP_PORT=8080 \
    APP_DIR=/app

WORKDIR ${APP_DIR}

COPY app/ ${APP_DIR}/app/

RUN mkdir -p /opt/ipermabot && cat > /opt/ipermabot/serve.py <<'PYEOF'
#!/usr/bin/env python3
"""Wrapper do http.server para servir a PWA com CORS + MIME corretos."""
import http.server
import socketserver
import os, sys

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js":   "application/javascript; charset=utf-8",
        ".mjs":  "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg":  "image/svg+xml",
        ".css":  "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".webmanifest": "application/manifest+json"
    }
    def end_headers(self):
        self.send_header("Service-Worker-Allowed", "/")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()
    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

if __name__ == "__main__":
    port = int(os.environ.get("APP_PORT", 8080))
    os.chdir(os.path.join(os.environ.get("APP_DIR", "/app"), "app"))
    with socketserver.TCPServer(("0.0.0.0", port), Handler) as httpd:
        httpd.serve_forever()
PYEOF
RUN chmod +x /opt/ipermabot/serve.py

EXPOSE ${APP_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${APP_PORT}/ || exit 1

WORKDIR /opt/ipermabot
CMD ["sh", "-c", "APP_DIR=${APP_DIR} APP_PORT=${APP_PORT} python3 serve.py"]
