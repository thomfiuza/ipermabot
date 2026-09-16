# 🚀 Guia de Deploy & Operação — Ipermabot

Este documento cobre tudo que você precisa para colocar a versão em uso:
deployar a app, flashear o firmware, testar e manter.

---

## 📋 Pré-requisitos

| Item | Versão | Para quê |
|---|---|---|
| **Node.js** | ≥ 18 | Revisão + release script |
| **Python 3** | ≥ 3.10 | Servir PWA localmente (opcional) |
| **Docker** | ≥ 20.10 | Container opcional |
| **Arduino CLI** ou **PlatformIO** | latest | Compilar firmware |
| **ESP32 DevKit** | v1 ou v4 | Hardware |
| **Chrome / Edge / Firefox** | latest | Testar PWA |

> Sem hardware ESP32, dá pra rodar o app em modo **simulador**
> (botão "Iniciar Simulador" já existe na tela principal).

---

## 1. 🧪 Teste em 5 minutos (sem hardware)

Ideal pra demo, treinamento ou PR review.

```bash
# 1.1 Restaurar bundle (se começou daqui)
bash RESTAURAR_BACKUP.sh
cd restored/projeto-robo-impermeabilizador

# 1.2 Verificar revisão
node tools/scripts/review.mjs
# Esperado: "RESUMO: 4/4 etapas passaram"

# 1.3 Subir a PWA localmente
cd app
python3 -m http.server 8765 --bind 0.0.0.0
# ou:
npm run serve

# 1.4 Abrir no navegador
#   → http://localhost:8765/
#   → Aba "Obra" → preencher dimensões
#   → Clicar "Iniciar simulador" → ver telemetria fake
```

Acessível também no celular (mesma rede):
- Descubra seu IP local: `ipconfig` (Windows) / `ip a` (Linux) / `ifconfig` (macOS)
- Abra `http://SEU_IP:8765/` no celular

---

## 2. 🐳 Container Docker (recomendado pra deploy)

```bash
# 2.1 Build
docker build -t ipermabot/pwa:1.0.1 .

# 2.2 Run simples
docker run -d -p 8080:8080 --name ipermabot-pwa ipermabot/pwa:1.0.1

# 2.3 OU com docker compose
docker compose up -d

# 2.4 Logs
docker logs -f ipermabot-pwa

# 2.5 Acessar
#   → http://localhost:8080/

# 2.6 Atualização após mudança no código
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Variáveis de ambiente úteis

| Variável | Default | Descrição |
|---|---|---|
| `APP_PORT` | `8080` | Porta que o container expõe |
| `APP_DIR` | `/app` | Diretório dentro do container |

---

## 3. ☁️ Deploy em produção (GitHub Pages ou servidor)

### 3.1 GitHub Pages (grátis)

Já temos o workflow `.github/workflows/deploy-pwa.yml` configurado:

1. Faça push para `main`
2. GitHub Actions roda automaticamente
3. Acesse `https://SEU_USER.github.io/projeto-robo-impermeabilizador/app/`

Para custom domain: Settings › Pages › Custom domain.

### 3.2 Servidor próprio (nginx, Apache, etc)

```bash
# 3.2.1 Build pacote final
node tools/scripts/release.mjs
# Cria dist/ipermabot-v1.0.1.zip + .sha256

# 3.2.2 Copiar para o servidor
scp dist/ipermabot-v1.0.1.* servidor:/var/www/ipermabot/

# 3.2.3 Configurar nginx exemplo
cat > /etc/nginx/sites-available/ipermabot <<'NGINX'
server {
  listen 443 ssl http2;
  server_name ipermabot.exemplo.com;
  root /var/www/ipermabot/ipermabot-v1.0.1;
  index index.html;

  # PWA precisa
  add_header Service-Worker-Allowed "/" always;

  # Cache agressivo para arquivos versionados
  location ~* \.(js|css|svg|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
  # Sem cache para index
  location = /index.html {
    add_header Cache-Control "no-cache";
  }

  # SPA fallback (opcional)
  location / { try_files $uri $uri/ /index.html; }

  ssl_certificate /etc/letsencrypt/live/ipermabot.exemplo.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/ipermabot.exemplo.com/privkey.pem;
}
NGINX
sudo ln -s /etc/nginx/sites-available/ipermabot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3.3 Validação pós-deploy

- Abra DevTools (F12) → Application → Service Workers → verificar registro
- Application → Manifest → verificar que carrega
- Lighthouse → roda audit
- Console → sem erro vermelho

---

## 4. 🔌 Flash do firmware no ESP32

### 4.1 Instalar Arduino CLI (uma vez)

```bash
# Linux/macOS
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# Adicionar ESP32 board
arduino-cli core update-index
arduino-cli core install esp32:esp32

# Instalar bibliotecas
arduino-cli lib install "WebSockets" "ArduinoJson" "ESP32Servo"
```

### 4.2 Compilar

```bash
arduino-cli compile \
  --fqbn esp32:esp32:esp32 \
  --output-dir firmware/build \
  firmware/src/robo_impermeabilizador.ino
```

Gera `firmware/build/robo_impermeabilizador.ino.bin` (~1 MB).

### 4.3 Flash

```bash
# Identificar porta
arduino-cli board list

# Flash + monitor
arduino-cli upload \
  -p /dev/ttyUSB0 \
  --fqbn esp32:esp32:esp32 \
  firmware/src/robo_impermeabilizador.ino
```

> **Substitua `/dev/ttyUSB0`**: Linux; `COM3` no Windows; `/dev/cu.usbserial-*` no macOS.

### 4.4 Verificar boot

Abra o monitor serial (115200 8N1):
```
========================================
  Ipermabot — Robô Aplicador de Impermeabilizante
  Firmware v1.0.1 (0x010001) — inicializando...
========================================
...
[IMU] Inicializado em modo NDOF (9-DoF + compass)
[IMU] Limite alerta: 30.0°, tombamento: 45.0°
Sistema pronto.
```

---

## 5. 🎮 Operação em campo (passo a passo)

### 5.1 Conexão inicial (Modo AP_DIRETO)

1. **Ligue o robô** (bateria carregada, botão ON).
2. No celular:
   - Wi-Fi → conectar em `ROBO-IMP-XX:XX:XX:XX` (sem senha)
   - Abrir navegador → `http://192.168.4.1/`
3. App carrega automaticamente a UI.

### 5.2 Configurar obra

Aba **Obra**:
- Nome da obra (ex: "Laje 301 — Edifício Aurora")
- Largura e comprimento em metros
- Tipo de laje (selecione entre catálogo)
- Produto (selecione — sugere demãos automaticamente)

Para primeira vez, use o **Modo Assistente** 🧙 (botão no Início).

### 5.3 Iniciar serviço

- Aba **Início**
- Segurar botão **▶ Iniciar (3s)** — confirmação anti-acidente
- Acompanhe em **Métricas** (planta visual, gráficos)
- **🛑 Emergência (3s)** para parar

### 5.4 Exportar relatório

Aba **Eventos**:
- 💾 **Salvar obra** (galeria local)
- 📄 **Relatório PDF** (window.print → salvar como PDF)
- ⤓ **Exportar log** (.txt)

---

## 6. 🧰 Manutenção

### 6.1 Após cada uso

- Limpar rolo com produto adequado (ver ficha técnica)
- Esvaziar resíduos do galão
- Bateria entre 30–80% se for guardar
- Conferir integridade dos conectores

### 6.2 Semanal

- Atualizar firmware (se nova versão) via OTA
- Verificar roda/encoder (sem objetos enrolados)
- Limpar sensor ultrassônico de queda

### 6.3 Trimestral

- Calibração assistida (comando `C` no monitor serial)
- Substituir filtro de ar do galão (se aplicável)
- Verificar fiação após vibração acumulada

---

## 7. 🔥 Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| App não conecta ao ESP32 | Rede errada | Confirmar conexão ao `ROBO-IMP-...` |
| Telemetria travada | ESP32 reiniciou | Esperar 10s — app reconecta |
| Telemetria com IMU zerado | Cabo I2C solto | Reencaixar SDA/SCL |
| Bateria falsa alta | Sensor descalibrado | Aguardar 30min parado, recalibrar |
| Tom inconsistente | Válvula entupida | Limpar ou substituir |

---

## 8. 📊 Métricas úteis de operação

### Performance esperada

| Métrica | Esperado |
|---|---|
| Tempo de boot do ESP32 | < 8s |
| Latência comando → execução | < 200ms |
| Taxa de telemetria | 1 Hz |
| Autonomia da bateria | 90–120 min |
| Área coberta por hora | 80–120 m² (depende da laje) |

### Diagnóstico via Serial

```
# Verificar firmware e sensor IMU
> i     # info (responde com versão + status)
> t     # teste de sensores (leituras contínuas)
> c     # calibração assistida
```

### Telemetria JSON bruta

Conecte em `ws://IP_DO_ROBO/ws` e envie:

```json
{"cmd": "info", "id": 1}
```

Resposta:
```json
{"id":1,"ok":true,"data":{"modelo":"Ipermabot-V1","versao_fw":"1.0.1 (0x010001)","ip":"192.168.4.1"}}
```

---

## 9. 🔐 Segurança em produção

Ver `SECURITY.md` para política completa. Resumo rápido:

- **Wi-Fi AP**: trocar senha padrão (atualmente aberta)
- **HTTPS**: usar somente em deploy (PWA service worker exige)
- **Botão de emergência**: teste físico mensal
- **Atualizações**: assinar git tags + verificar SHA256 do release download

### Verificar SHA256 do release

```bash
sha256sum -c ipermabot-v1.0.1.zip.sha256
# Esperado: ipermabot-v1.0.1.zip: OK
```

---

## 10. 📞 Suporte

| Canal | Uso |
|---|---|
| 📧 security@ipermabot.example | Vulnerabilidades |
| 🐛 Issues GitHub | Bugs públicos |
| 💬 Discussions | Dúvidas |
| 📖 Documentação | `docs/` |
