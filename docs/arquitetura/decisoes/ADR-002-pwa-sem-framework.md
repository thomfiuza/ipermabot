# ADR-002 — PWA em vanilla JS (sem React/Vue) e sem build step

> **Status:** ✅ Aceita
> **Data:** 2026-09-16
> **Decisor:** Ipermabot Dev

## Contexto

Escolher a stack frontend para o painel do robô. Hoje (2026) React, Vue,
Svelte e Lit são as opções dominantes; vanilla JS + Web Components é a
mais leve.

Restrições:
- Equipe pequena (1 dev).
- App não é SPA complexo (5 telas, < 30 KB de JS).
- Precisa rodar em hardware limitado (celular Android 5 anos atrás).
- Código precisa sobreviver a 6+ meses sem manutenção contínua.

## Decisão

**Vanilla JS (ES6 modules) + CSS puro + Service Worker manual.** Sem
npm/Vite/bundler na frente.

## Consequências

### Positivas
- ✅ **Zero deps externas.** `node tests/run.mjs` valida tudo.
- ✅ **Boot em < 50 ms** mesmo em 3G. Cada módulo carrega sob demanda.
- ✅ **Sem lock-in de framework.** Quem chegar em 6 meses, não precisa aprender React.
- ✅ **Testabilidade sem mock.** Funções puras testam diretamente (vide `utils.test.js`).
- ✅ **PWA instalável** com `manifest.json` + `sw.js` puro.

### Negativas / Riscos
- ❌ Reinvente algum trabalho (ex.: o "router" das 5 telas é manual).
- ❌ Demora mais para escrever UI rica (sem JSX).
- ❌ Sem SSR/SEO (mas PWA não precisa).

## Critérios para reavaliação (migrar para framework)

Migrar **somente** se:
1. UI ultrapassar 10 telas com lógica complexa de estado (ex.: árvore de componentes compartilhados).
2. Múltiplos devs paralelos (então precisam de convenções).
3. Necessidade de SSR (não é o caso de PWA de controle de robô).
4. Equipe de design quiser usar ferramentas baseadas em framework.

## Alternativas consideradas

- **React:** descartado — overhead grande para 5 telas.
- **Vue 3:** descartado — complexidade similar à React.
- **Svelte:** descartado — bom, mas ainda adiciona build step.
- **Lit (Web Components):** considerado — boa escolha se mais componentes. Não optamos pois 5 telas com 5 módulos é low-cost para vanilla.
- **HTMX:** descartado — não ajuda no caso (precisamos de 5 telas com state complexo).

## Stack detalhado escolhido

- **HTML** semântico (header/main/section/footer)
- **CSS** com custom properties + dark mode via `prefers-color-scheme`
- **JS** ES6 modules (import/export)
- **Acessibilidade** ARIA labels, roles, keyboard navigation
- **Storage** localStorage (vide ADR-001)
- **Network** WebSocket API nativa (sem Axios/Fetch polyfills)
- **PWA** manifest.json + service worker (vide sw.js)

## Referências

- [The Vanilla JavaScript Stack](https://everybodydev.com/p/vanilla-javascript-stack/)
- [The Cost of JavaScript Frameworks](https://timkadlec.com/remembers-the-cost-of-javascript-frameworks/)
- [PWA Builder (Microsoft)](https://www.pwabuilder.com/)

## Histórico

- 2026-09-16: ADR criada.
