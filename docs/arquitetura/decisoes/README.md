# 📋 ADRs — Architecture Decision Records

> Decisões arquiteturais importantes que **mudariam o design** se fossem
> contestadas. Cada ADR é uma história fechada.

## O que é uma ADR

Uma ADR é um documento curto (1-2 páginas) que responde a 3 perguntas:
1. **O que** foi decidido
2. **Por que** foi decidido
3. **Quando** reconsiderar

O valor histórico é tão importante quanto o valor presente: daqui a 6 meses,
alguém vai perguntar "por que usamos X?" — esta pasta responde.

## Índice

| ADR | Título | Status | Data |
|---|---|---|---|
| [ADR-001](ADR-001-localStorage-vs-IndexedDB.md) | localStorage em vez de IndexedDB para persistência | ✅ Aceita | 2026-09-16 |
| [ADR-002](ADR-002-pwa-sem-framework.md) | PWA em vanilla JS sem framework nem build step | ✅ Aceita | 2026-09-16 |
| [ADR-003](ADR-003-websocket-vs-http-polling.md) | WebSocket em vez de HTTP Polling para telemetria | ✅ Aceita | 2026-09-16 |

## Como criar uma nova ADR

1. Copie `template.md` para `ADR-NNN-titulo-curto.md`.
2. Preencha as seções obrigatórias:
   - **Contexto:** o que motivou
   - **Decisão:** o que escolhemos
   - **Consequências:** trade-offs
   - **Critérios para reavaliação:** quando mudar
3. Adicione ao índice acima.
4. Marque **Status** (`Proposta` / `Aceita` / `Substituída por ADR-NNN` / `Rejeitada`).
5. Commit com Conventional Commits: `docs(adr): ADR-002 ...`.

## Princípios das decisões

- **Documentado > Implícito.** Decisões "óbvias" viram ADR também. Em 2 anos alguém não vai lembrar.
- **Critérios de saída explícitos.** Toda ADR precisa ter "quando reconsiderar".
- **Sem volta à discussão antiga.** ADR é fechada. Se mudar, escreva nova ADR referenciando a antiga (não apague).
- **Sem marketeiro.** Não edita ADR depois de aceita. Errou? Escreve outra ADR com substituta (`Status: Substituída por ADR-XXX`).
