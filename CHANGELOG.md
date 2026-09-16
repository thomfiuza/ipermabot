# Changelog — IMP-BOT

Todas as mudanças notáveis do projeto.

## [Unreleased] — 2026-09-16

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
