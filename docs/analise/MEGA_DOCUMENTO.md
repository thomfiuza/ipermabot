# 📚 MEGA DOCUMENTO — IMP-BOT

> Documento-mestre: índice absoluto do projeto. Se você só puder ler UMA
> coisa, que seja esta. Tudo o que existe no repositório está aqui
> referenciado e explicado o porquê de existir.

---

## 🎯 O que é este documento

Este é o **mapa de navegação oficial** do projeto. Você **não precisa ler
todo o repositório** — basta seguir as referências deste arquivo para
encontrar o que procura, na ordem que faz sentido.

A estrutura é **didática**: cada seção responde uma pergunta. Use o sumário
para navegar.

---

## 📑 Sumário

1. [Perguntas frequentes (FAQ)](#1-perguntas-frequentes)
2. [Como usar este repositório (em 5 minutos)](#2-como-usar-este-repositório-em-5-minutos)
3. [Arquitetura — mapa geral](#3-arquitetura-mapa-geral)
4. [Onde cada coisa está e por quê](#4-onde-cada-coisa-está-e-por-quê)
5. [Rastreabilidade por responsabilidade](#5-rastreabilidade-por-responsabilidade)
6. [Checklist de revisão contínua](#6-checklist-de-revisão-contínua)
7. [Como adicionar uma nova feature (passo a passo)](#7-como-adicionar-uma-nova-feature)
8. [Glossário de comandos Git úteis](#8-glossário-de-comandos-git-úteis)
9. [Glossário técnico](#9-glossário-técnico)
10. [Como pedir ajuda / reportar bug](#10-como-pedir-ajuda)
11. [Roadmap de evolução](#11-roadmap-de-evolução)

---

## 1. Perguntas frequentes

### "Quero começar com o robô. O que faço?"
1. Leia [Seção 5 do Dossiê de Viabilidade](docs/arquitetura/DOSSIE_VIABILIDADE.md#5-análise-econômica-e-financeira) — para entender os custos.
2. Leia [docs/arquitetura/DOSSIE_VIABILIDADE.md#4-análise-técnica](docs/arquitetura/DOSSIE_VIABILIDADE.md#4-análise-técnica) — para entender a tecnologia.
3. Abra o app em modo simulação e brinque (instruções na seção 2 abaixo).

### "Quero ver o código do app. Onde começo?"
[`app/js/main.js`](app/js/main.js) → ele importa os outros módulos. Acompanhe:
`state.js` (modelo), `protocol.js` (decodificador), `transport.js` (rede),
`ui.js` (visão), `simulator.js` (modo offline).

### "Quero entender o protocolo entre app e ESP32. Onde?"
[`docs/protocolo/PROTOCOLO_COMUNICACAO.md`](docs/protocolo/PROTOCOLO_COMUNICACAO.md) — 28 comandos, 14 eventos, tudo documentado.

### "Como sei se minha alteração quebrou o protocolo?"
Rode `node tools/scripts/review.mjs`. Se a coerência quebrar, o CI falha.

### "Posso subir o app para minha empresa rodar?"
Sim. Abra o PWA em qualquer celular ou desktop, ou faça deploy em GitHub
Pages (workflow já está pronto).

### "Como ativo o controle Wi-Fi entre o app e o robô?"
1. Abra `firmware/src/robo_impermeabilizador.ino`.
2. Mude `#define WIFI_HABILITADO 0` para `1`.
3. Configure `WIFI_SSID` e `WIFI_SENHA`.
4. Compile e envie ao ESP32.
5. No app, clique em "Tentar novamente" — ele busca a rede `IMP-BOT-XXX`.

---

## 2. Como usar este repositório em 5 minutos

### Se você for **usuário final** (quer ver o robô funcionar):

```bash
# 1. Abra um terminal
cd projeto-robo-impermeabilizador/app

# 2. Suba um servidor estático (Python, sem deps)
python3 -m http.server 8765

# 3. Abra no navegador
#    http://localhost:8765  → use "Entrar em modo simulação"
```

### Se você for **desenvolvedor** (quer mexer no código):

```bash
cd projeto-robo-impermeabilizador

# 1. Rode a revisão contínua (valida tudo)
node tools/scripts/review.mjs

# 2. Você deve ver:
#    ✅ Testes unitários JS
#    ✅ Lint JS
#    ✅ Validação do firmware
#    ✅ Coerência do protocolo
```

### Se você for **integrar o ESP32**:

```bash
# 1. Abra a Arduino IDE 2.x
# 2. Placa: ESP32 Dev Module
# 3. Abra firmware/src/robo_impermeabilizador.ino
# 4. Verifique se as bibliotecas WebSocketsServer e ArduinoJson estão instaladas
# 5. Compile e envie (Ctrl+U)
```

---

## 3. Arquitetura — mapa geral

```
┌─────────────────────────────────────────────────────────────┐
│                       IMP-BOT (monorepo)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────────┐     │
│  │     app/         │         │     firmware/        │     │
│  │  (PWA, ES6)      │◄─────►  │  (ESP32 Arduino)     │     │
│  │                  │  Wi-Fi  │                      │     │
│  │  - index.html    │ WS 81   │  - robo_impermeab.ino│     │
│  │  - js/ 8 módulos │         │  - WebSocketsServer  │     │
│  │  - css/          │         │  - ArduinoJson       │     │
│  │  - tests/        │         │  - HTTP page :80     │     │
│  │  - manifest.json │         │                      │     │
│  └──────────────────┘         └──────────────────────┘     │
│         │                            │                       │
│         │       ┌─────────────────┐  │                       │
│         └──────►│ docs/protocolo/ │◄─┘                       │
│                 │ (PROTOCOLO_)    │                          │
│                 └─────────────────┘                          │
│                          │                                   │
│                          ▼                                   │
│                ┌──────────────────┐                          │
│                │ tools/scripts/   │ ← Validação contínua   │
│                │ (lint, validate, │                          │
│                │  check-protocol, │                          │
│                │  review)         │                          │
│                └──────────────────┘                          │
│                          │                                   │
│                          ▼                                   │
│                ┌──────────────────┐                          │
│                │ .github/         │                          │
│                │  - workflows/    │                          │
│                │  - templates/    │                          │
│                └──────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Onde cada coisa está e por quê

| Pasta/Arquivo | Para quê | Quando ler |
|---|---|---|
| [`README.md`](README.md) | Índice principal do monorepo | ✅ Primeira coisa a ler |
| [`CHANGELOG.md`](CHANGELOG.md) | Histórico de versões | Quando for comparar versões |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Como contribuir / padronização | Antes de abrir PR |
| [`docs/arquitetura/DOSSIE_VIABILIDADE.md`](docs/arquitetura/DOSSIE_VIABILIDADE.md) | Visão de negócio completa | Para entender o "por quê" do projeto |
| [`docs/arquitetura/MVP_APP.md`](docs/arquitetura/MVP_APP.md) | Especificação técnica do MVP | Antes de programar uma tela nova |
| [`docs/protocolo/PROTOCOLO_COMUNICACAO.md`](docs/protocolo/PROTOCOLO_COMUNICACAO.md) | Protocolo app↔ESP32 | Antes de mexer em comunicação |
| [`app/index.html`](app/index.html) | Shell HTML do PWA | Ao mexer no layout |
| [`app/css/style.css`](app/css/style.css) | Estilos visuais | Ao mexer em visual |
| [`app/manifest.json`](app/manifest.json) | Manifesto PWA (ícones, nome) | Ao mudar identidade visual |
| [`app/sw.js`](app/sw.js) | Service Worker (offline) | Ao mudar comportamento offline |
| [`app/package.json`](app/package.json) | Scripts e metadados npm | Ao adicionar scripts |
| [`app/js/main.js`](app/js/main.js) | Orquestrador e bind de eventos | **Comece aqui** se for programar no app |
| [`app/js/state.js`](app/js/state.js) | Estado global (config + runtime) | Ao adicionar nova config |
| [`app/js/transport.js`](app/js/transport.js) | Transporte WebSocket | Ao mudar protocolo de rede |
| [`app/js/protocol.js`](app/js/protocol.js) | Decodificador de mensagens | **Aqui** quando adicionar evento novo |
| [`app/js/ui.js`](app/js/ui.js) | Manipulação do DOM (telas) | Ao mexer em visual |
| [`app/js/simulator.js`](app/js/simulator.js) | Modo simulação (sem hardware) | Ao mudar demo |
| [`app/js/log.js`](app/js/log.js) | Sistema de log + persistência | Ao mudar formato do log |
| [`app/js/utils.js`](app/js/utils.js) | Funções puras (testáveis) | Ao precisar de helper |
| [`app/tests/utils.test.js`](app/tests/utils.test.js) | Testes de utils.js | Ao tocar em utils.js |
| [`app/tests/run.mjs`](app/tests/run.mjs) | Runner de testes (sem deps) | Para rodar testes |
| [`app/wireframes/01_wireframes_telas.svg`](app/wireframes/01_wireframes_telas.svg) | Mockups das 6 telas | Referência de UI |
| [`firmware/src/robo_impermeabilizador.ino`](firmware/src/robo_impermeabilizador.ino) | Firmware completo | **Comece aqui** se for mexer no ESP32 |
| [`tools/scripts/lint-js.mjs`](tools/scripts/lint-js.mjs) | Linter JS customizado | Quando personalizar regras de estilo |
| [`tools/scripts/validate-firmware.mjs`](tools/scripts/validate-firmware.mjs) | Validação estática do .ino | Quando adicionar checagens |
| [`tools/scripts/check-protocol.mjs`](tools/scripts/check-protocol.mjs) | Coerência app↔firmware | Quando o CI falhar |
| [`tools/scripts/review.mjs`](tools/scripts/review.mjs) | Orquestrador de revisão | Antes de cada commit |
| [`.github/workflows/review.yml`](.github/workflows/review.yml) | CI em cada push/PR | Quando configurar CI |
| [`.github/workflows/deploy-pwa.yml`](.github/workflows/deploy-pwa.yml) | Deploy em GitHub Pages | Quando precisar publicar |
| [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) | Templates para abrir issues | Quando for reportar problema |
| [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) | Template de PR | Quando for abrir PR |
| [`.gitignore`](.gitignore) | Arquivos a ignorar no Git | Quando ver arquivo sendo versionado indevido |

---

## 5. Rastreabilidade por responsabilidade

Esta seção mapeia **"se você quer fazer X, mexe em Y, Z e W"**.

### Quero adicionar um **novo sensor** (ex.: IMU)

| Responsabilidade | Arquivo |
|---|---|
| Documentar o sensor | `docs/arquitetura/MVP_APP.md` |
| Adicionar pino no firmware | `firmware/src/robo_impermeabilizador.ino` (seção 1) |
| Ler o sensor | `firmware/src/...` (nova função em seção 6) |
| Enviar dado via telemetria | `enviarTelemetria()` em `firmware/src/...` |
| Tratar no app | `app/js/protocol.js` (`tratarTelemetria`) |
| Mostrar no dashboard | `app/js/ui.js` (`atualizarDashboard`) |
| Adicionar teste | `app/tests/utils.test.js` ou novo arquivo |

### Quero adicionar um **novo comando** (ex.: `definir_cores`)

| Responsabilidade | Arquivo |
|---|---|
| Documentar o comando | `docs/protocolo/PROTOCOLO_COMUNICACAO.md` |
| Tratar no firmware | `processarComandoWS()` em `firmware/src/...ino` |
| Enviar pelo app | onde quiser no `app/js/main.js` |
| **Validar coerência** | `node tools/scripts/review.mjs` |

### Quero adicionar uma **nova tela**

| Responsabilidade | Arquivo |
|---|---|
| Criar HTML | `app/index.html` (novo `<section>`) |
| Criar CSS | `app/css/style.css` (estilos `.tela-nova`) |
| Wireframe | `app/wireframes/01_wireframes_telas.svg` (atualizar) |
| Lógica de tela | `app/js/ui.js` (novo método) |
| Adicionar tab | atualizar `tab-bar` em `index.html` |

### Quero mudar a **paleta de cores**

| Responsabilidade | Arquivo |
|---|---|
| Variáveis CSS | `app/css/style.css` (`:root { --azul-corp: ... }`) |
| Sem tocar em JS | UI usa as variáveis |

### Quero mudar o **protocolo** (novo campo JSON)

| Responsabilidade | Arquivo |
|---|---|
| Atualizar protocolo | `docs/protocolo/PROTOCOLO_COMUNICACAO.md` |
| Versão do protocolo | `fazer cumprir - informações de versão no app e no firmware` |
| Envio no firmware | `firmware/src/...ino` (`enviarEvento`/`enviarTelemetria`) |
| Decodificação no app | `app/js/protocol.js` |
| Atualizar checador | `tools/scripts/check-protocol.mjs` se precisar |

---

## 6. Checklist de revisão contínua

> **Esta é a lista oficial**. Tudo o que entra no `main` deve passar TUDO.

### Antes de CADA commit local
```
[ ] node tools/scripts/review.mjs   # tudo verde
```

### Antes de CADA Pull Request
```
[ ] git status                       # só arquivos intencionais
[ ] git diff                         # releia o que você mudou
[ ] commit messages seguem Conventional Commits (feat:/fix:/docs:)
[ ] CHANGELOG.md atualizado em [Unreleased]
[ ] se mudou protocolo: PROTOCOLO_COMUNICACAO.md atualizado
[ ] se mudou função pura: teste adicionado/atualizado
```

### Antes de CADA release
```
[ ] GitHub Actions verde (review + deploy)
[ ] CHANGELOG.md: mover de [Unreleased] para [1.x.y] com data
[ ] Tag no Git: git tag -a v1.x.y -m "Mensagem"
[ ] Push da tag: git push origin v1.x.y
```

---

## 7. Como adicionar uma nova feature

### Passo 1: Definir o quê
Escreva em `docs/arquitetura/MVP_APP.md` (se for MVP) ou crie uma ADR em `docs/arquitetura/decisoes/NOME.md`.

### Passo 2: Atualizar protocolo
Se mexer em comandos/eventos, edite `docs/protocolo/PROTOCOLO_COMUNICACAO.md`.

### Passo 3: Implementar no firmware
```
firmware/src/robo_impermeabilizador.ino
  → constantes, pinos, função nova, chamada em enviarEvento/Telemetria
```

### Passo 4: Implementar no app
```
app/js/protocol.js   → decodifica o novo evento
app/js/ui.js         → atualiza visualmente
app/js/main.js       → testa/wirea novo callback
```

### Passo 5: Adicionar teste
Se for lógica pura: `app/tests/<modulo>.test.js`.

### Passo 6: Validar
```
node tools/scripts/review.mjs
```

### Passo 7: Commitar
```
git add .
git commit -m "feat(app): adiciona tela X com suporte a Y"
```

---

## 8. Glossário de comandos Git úteis

> Para quem não vive no terminal todos os dias.

| Ação | Comando |
|---|---|
| Ver o que mudou | `git status` |
| Ver histórico bonito | `git log --oneline --graph --decorate --all` |
| Comparar 2 branches | `git diff main..feature/minha` |
| Stash (guardar sem commit) | `git stash` / `git stash pop` |
| Renomear último commit | `git commit --amend -m "nova mensagem"` |
| Desfazer último commit (mantém arquivos) | `git reset --soft HEAD~1` |
| Desfazer último commit (e mudanças) | `git reset --hard HEAD~1` |
| Criar branch | `git checkout -b nome` |
| Trocar de branch | `git checkout nome` |
| Atualizar com a main | `git fetch && git rebase origin/main` |
| Tag de release | `git tag -a v1.2.0 -m "mensagem"` |
| Status do repositório | `git status -sb` |

---

## 9. Glossário técnico

> Termos para quem está chegando agora.

| Termo | O que é |
|---|---|
| **PWA** | Progressive Web App — site que parece app nativo, funciona offline, instalável. |
| **ES6 / ESM** | Versão moderna do JavaScript. Permite `import`/`export`. |
| **ESP32** | Microcontrolador da Espressif com Wi-Fi/Bluetooth. R$ 25-40. |
| **WebSocket** | Protocolo de comunicação full-duplex sobre HTTP — perfeito para telemetria. |
| **HC-SR04** | Sensor ultrassônico barato que mede distância por eco. |
| **BTS7960** | Driver de motor DC em ponte H (43 A). |
| **PWM** | Pulse Width Modulation — controla velocidade do motor. |
| **IRAM_ATTR** | Atributo no ESP32 que coloca função na RAM rápida (não flash). |
| **volatile** | Diz ao compilador que uma variável pode mudar "por fora" do thread principal. |
| **ISR** | Interrupt Service Routine — função chamada por interrupção. |
| **GitHub Actions** | CI do GitHub — roda workflows YAML a cada push/PR. |
| **PWA Manifest** | JSON que define como o site é instalado como "app". |
| **Service Worker** | Script que roda em background mesmo offline. |
| **Conventional Commits** | Convenção de mensagens (feat:, fix:, docs:, ...). |
| **CI** | Continuous Integration — roda testes automaticamente a cada commit. |
| **ESLint** | Linter para JavaScript — substituímos pelo nosso para zero deps. |
| **ArduinoJson** | Biblioteca que parseia/gera JSON no ESP32. |
| **JSON-RPC-like** | Padrão de mensagem estilo `{campo: valor}` — usamos `cmd`/`id`/`params`. |
| **Vinagre de chulé** | Não relacionado. |

---

## 10. Como pedir ajuda

### Se você **encontrou um bug**:
1. Abra uma issue em `.github/ISSUE_TEMPLATE/bug_report.md`.
2. Rode `node tools/scripts/review.mjs` localmente e cole o output.
3. Anexe print/log se for visual.

### Se você **tem uma dúvida**:
1. Procure neste documento (use Ctrl+F).
2. Procure em `docs/`.
3. Procure no código (`grep -r "palavra" .`).
4. Só então pergunte — em issue com label `question`.

### Se você **quer contribuir**:
1. Leia [CONTRIBUTING.md](CONTRIBUTING.md).
2. Abra uma issue antes de PR grande.
3. PRs pequenos e específicos são revisados mais rápido.

---

## 11. Roadmap de evolução

### V1.0 (atual) ✅
- PWA funcional com modo simulação
- Firmware com comandos seriais
- Protocolo JSON documentado
- CI com 4 etapas

### V1.1 (próximo)
- [ ] Adicionar biblioteca IMU 9-axis (giroscópio) ao firmware
- [ ] Implementar `subscrever` para escolher eventos (não só telemetria)
- [ ] Adicionar tela de métricas históricas (gráfico de produtividade)

### V2.0 (6-12 meses)
- [ ] Integração com LiDAR para mapeamento real
- [ ] App nativo (React Native / Kotlin) com câmera
- [ ] Dashboard web para o cliente acompanhar obra
- [ ] Impressão automática de relatório PDF no final de cada obra

### V3.0 (12-24 meses)
- [ ] SLAM visual + planejamento autônomo de trajetória
- [ ] Multi-robô coordenado
- [ ] API pública para integrações com ERP de obras
- [ ] Marketplace de "robô como serviço"

---

## 📌 Resumo

> **IMP-BOT v1.0** é um protótipo funcional de um robô aplicador de
> impermeabilizante, com:
>
> - **34 arquivos** no repositório
> - **5.686 linhas** de código (JS + C++ + CSS + HTML + Markdown + YAML)
> - **11 commits** com mensagens Conventional Commits
> - **4 etapas** de revisão automatizada
> - **28 comandos** no protocolo
> - **14 eventos** automáticos
> - **6 testes** unitários
>
> A próxima pessoa a entrar no projeto — seja você em 6 meses ou um novo
> dev — consegue abrir `MEGA_DOCUMENTO.md` e achar tudo em 5 minutos.

---

*"O melhor código é o código que pode ser melhorado sem medo."*

*IMP-BOT Engineering Principles*
