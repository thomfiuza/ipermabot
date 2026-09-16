# 🤖 IMP-BOT — Robô Aplicador Autônomo de Impermeabilizante

> Repositório monorepo do projeto: **app de controle** + **firmware ESP32** +
> **protocolo de comunicação** + **sistema de revisão contínua**.

[![Status do Projeto](https://img.shields.io/badge/status-prot%C3%B3tipo-1F4E79?style=flat-square)](#)
[![Versão](https://img.shields.io/badge/vers%C3%A3o-1.0.0-blue?style=flat-square)](CHANGELOG.md)
[![Plataforma](https://img.shields.io/badge/ESP32-Alexa-blue?style=flat-square)](firmware/)
[![App](https://img.shields.io/badge/App-PWA%20%2B%20ES6-green?style=flat-square)](app/)

---

## 📋 O que é

Um robô que **aplica impermeabilizante em pisos horizontais** (lajes, garagens,
quadras, pátios) sem expor pessoas ao produto. Veja o [Dossiê de Viabilidade](docs/arquitetura/DOSSIE_VIABILIDADE.md)
para a visão de negócio completa.

## 🗂 Estrutura do monorepo

```
projeto-robo-impermeabilizador/
├── app/                      # PWA (aplicativo de controle)
│   ├── index.html
│   ├── css/                  # Estilos
│   ├── js/                   # Módulos ES6
│   │   ├── main.js           # Orquestrador e bind de eventos
│   │   ├── state.js          # Estado global + enum
│   │   ├── transport.js      # WebSocket
│   │   ├── protocol.js       # Decodificador
│   │   ├── ui.js             # Manipulação do DOM
│   │   ├── simulator.js      # Modo simulação
│   │   ├── log.js            # Sistema de log
│   │   └── utils.js          # Funções puras
│   ├── tests/                # Testes (vitest-style sem deps)
│   └── package.json
├── firmware/                 # ESP32 Arduino sketch
│   └── src/
│       └── robo_impermeabilizador.ino
├── docs/                     # Documentação
│   ├── protocolo/            # Protocolo de comunicação
│   ├── arquitetura/          # Dossiê, MVP, decisões
│   └── analise/              # Análises comparativas
├── tools/                    # Scripts auxiliares
│   └── scripts/              # Lint, validação, revisão
└── .github/                  # GitHub Actions + templates
    ├── workflows/
    └── ISSUE_TEMPLATE/
```

## 🚀 Quickstart

### Testar o app em modo simulação (sem hardware)
```
cd app
python3 -m http.server 8765
# Abra http://localhost:8765 no navegador
# Clique em "Entrar em modo simulação"
```

### Rodar testes + lint + validação (revisão contínua)
```
node tools/scripts/review.mjs
```

### Compilar o firmware
1. Instale a Arduino IDE.
2. Em Preferências, adicione a URL do pacote esp32.
3. Instale a placa "esp32" no Gerenciador.
4. Instale as bibliotecas: `WebSocketsServer`, `ArduinoJson`.
5. Abra `firmware/src/robo_impermeabilizador.ino` na IDE.
6. Selecione: Placa "ESP32 Dev Module" · Upload Speed 921600.
7. Para Wi-Fi: mude `#define WIFI_HABILITADO 0` para `1` e configure `WIFI_SSID`/`WIFI_SENHA`.

## 📚 Documentação essencial

| Quer entender | Leia |
|---|---|
| Visão de negócio / mercado | [docs/arquitetura/DOSSIE_VIABILIDADE.md](docs/arquitetura/DOSSIE_VIABILIDADE.md) |
| Protocolo entre app ↔ ESP32 | [docs/protocolo/PROTOCOLO_COMUNICACAO.md](docs/protocolo/PROTOCOLO_COMUNICACAO.md) |
| Como rodar o app | [docs/arquitetura/MVP_APP.md](docs/arquitetura/MVP_APP.md) |
| Contribuir / padronização | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Histórico de versões | [CHANGELOG.md](CHANGELOG.md) |
| Templates de PR/issues | [.github/](.github/) |

## 🔄 Revisão contínua (CI)

Cada `git push` ou Pull Request dispara o workflow `.github/workflows/review.yml`
que executa:

1. ✅ **Testes unitários** do app (`app/tests/`)
2. ✅ **Lint JS** customizado (`tools/scripts/lint-js.mjs`)
3. ✅ **Validação estática do firmware** (`tools/scripts/validate-firmware.mjs`)
4. ✅ **Coerência do protocolo** entre app e firmware
   (`tools/scripts/check-protocol.mjs`)

Para rodar localmente:
```
node tools/scripts/review.mjs
```

## 🌐 Deploy automático

Cada `push` na `main` faz **deploy automático do PWA** para GitHub Pages via
`.github/workflows/deploy-pwa.yml`.

## 📊 Status atual

| Item | Estado | Detalhe |
|---|---|---|
| App (PWA) | ✅ pronto | ES6 modular, modo simulação, PWA instalável |
| Firmware | ✅ pronto | Comandos seriais + WebSocket opcional |
| Protocolo | ✅ pronto | 28 comandos, 14 eventos, JSON |
| Testes | ✅ rodando | 6 testes em utils.js |
| CI | ✅ rodando | 4 etapas automatizadas |
| Docs | ✅ pronto | Dossiê + protocol + MVP |

---

## 💡 Como isto evolui

Cada vez que um problema for corrigido ou uma feature for adicionada, ela vai
atravessar essas 4 camadas:

1. **Ajuste o protocolo** se for novo evento/comando (`docs/protocolo/`)
2. **Emita o evento** no firmware (`firmware/src/`)
3. **Trate o evento** no app (`app/js/protocol.js` + UI)
4. **Adicione teste** se for lógica nova (`app/tests/`)

O CI verifica todos os 4 automaticamente.

## 🤝 Próximo passo

1. Suba este repositório para um servidor Git (GitHub/GitLab).
2. Adicione colaboradores.
3. Configure proteção de branch em `main` (exige revisão).
4. Releia [CONTRIBUTING.md](CONTRIBUTING.md) antes do primeiro commit.

---

> "A melhor engenharia não é a que faz milagre — é a que tem revisão contínua,
> documentação honesta e falhas baratas de corrigir."

— IMP-BOT Engineering Principles
