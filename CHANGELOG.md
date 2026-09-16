# Changelog — Ipermabot

Todas as mudanças notáveis do projeto.

## [Unreleased] (em desenvolvimento)

## [1.0.1] — 2026-09-16

### Mudança de marca: IMP-BOT → Ipermabot
- **Pesquisa de anterioridade** confirmou que o nome **Ipermabot** não
  está registrado no INPI nem usado por concorrentes. Disponível para
  registro de marca no Brasil (classe 7 + classe 37).
- Renomeação em **33 arquivos**: CHANGELOG, README, app/, firmware/,
  docs/, tools/.
- Domínio `imp-bot.exemplo.com` → `ipermabot.exemplo.com`.
- E-mail `security@imp-bot.example` → `security@ipermabot.example`.
- `package.json` name: `impbot-app` → `ipermabot-app`.
- `manifest.json` (PWA) atualizado.

### Documentação bilíngue PT/EN
- Estrutura `docs/producao/{pt/,en/}` paralela (selecionada via
  `ask_user`).
- `docs/producao/index.html` raiz = seletor visual PT/EN.
- 4 PNGs (assets/) compartilhados entre PT/EN.
- 530 linhas markdown em cada idioma (paridade mantida).
- Toolbar PT/EN fixa no canto superior direito de cada HTML.
- 283 substituições PT→EN aplicadas via `tools/scripts/translate.py`.

### Correções de bugs identificadas em revisão profunda
1. **CRÍTICO**: `firmware` declarava `void configurarWiFi()` duas
   vezes (linhas 1014 e 1016) → **não compilava**. Removida a
   duplicação.
2. **CRÍTICO**: `versao_fw` hardcoded como `"1.0.0"` em
   `firmware/src/robo_impermeabilizador.ino:926` e `DEPLOY.md:311`.
   Substituído por macro `FW_VERSAO` ("1.0.1 (0x010001)").
3. **Inconsistência CSS**: variáveis `--azul-*` (PT) em
   `docs/producao/` vs `--blue-*` (EN) em `app/css/style.css`.
   Padronizado para inglês em toda a base.
4. CSS `.lang-bar` duplicado no `en/index.html` (resíduo do tradutor).
5. PT residual no `en/index.html` (Válvula, Modo, Suporte, Chassi).
   Traduzidas todas as ocorrências residuais.
6. `pt/index.html` não tinha toolbar de idiomas (desbalanceado com EN).
   Adicionada com seletor PT/EN + link "voltar ao seletor".
7. README badge mostrava versão 1.0.0 (desatualizado).
   Atualizado para 1.0.1.

### Validação final
- ✅ **29/29 testes** unitários verdes
- ✅ **Lint**: 0 erros / 30 avisos (todos em comentários)
- ✅ **Validação firmware**: 0 erros
- ✅ **Coerência protocolo**: 100% (17/17 eventos)

## [Unreleased] pré-1 — 2026-09-16

### Adicionado
- **Arquitetura monorepo** com `app/`, `firmware/`, `docs/`, `tools/`, `.github/`.
- **App** modularizado em ES6 (`state.js`, `transport.js`, `protocol.js`, `simulator.js`, `ui.js`, `utils.js`, `main.js`, `log.js`).
- **Firmware** com WebSocket server (porta 81) + emissor de eventos JSON alinhado com `app/js/protocol.js`.
- **Protocolo** documentado em `docs/protocolo/PROTOCOLO_COMUNICACAO.md` (28 comandos, 14 eventos automáticos).
- **Sistema de revisão contínua**:
  - `tools/scripts/lint-js.mjs` — linter customizado (sem deps).
  - `tools/scripts/validate-firmware.mjs` — validação estática do `.ino`.
  - `tools/scripts/check-protocol.mjs` — coerência app↔firmware.
  - `tools/scripts/review.mjs` — orquestrador (chamado pelo CI).
- **Testes** em `app/tests/utils.test.js` (vitest-style sem dependências).
- **GitHub Actions**:
  - `.github/workflows/review.yml` — CI em cada push/PR.
  - `.github/workflows/deploy-pwa.yml` — deploy automático em GitHub Pages.
- **Templates** para issues e PR (`ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`).

### Modificado
- `firmware/src/robo_impermeabilizador.ino` — refatorado para emitir eventos (faixa_concluida, obra_concluida, queda, emergencia, etc.).
- `app/` reorganizado para o estilo ES6 modular (anteriormente era um `app.js` monolítico).

## [1.0.0] — 2026-09-15

### Adicionado
- Documentação inicial (Dossiê, Relatório, BOM, etc.).
- Firmware v1.0 com comandos seriais de teste.
- App PWA completo (versão monolítica).
