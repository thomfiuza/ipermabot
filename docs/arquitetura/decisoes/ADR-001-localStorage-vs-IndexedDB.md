# ADR-001 — localStorage em vez de IndexedDB para persistência do log

> **Status:** ✅ Aceita (com reavaliação futura se requisito mudar)  
> **Data:** Setembro/2026  
> **Decisor:** Ipermabot Dev

## Contexto

O PWA precisa persistir **a configuração da obra** (nome, dimensões, demãos, limites de sensor) e o **log de eventos** da obra atual (até 200 entradas), entre recarregamentos da página.

Tínhamos duas candidatas principais para armazenamento local:

| Característica | localStorage | IndexedDB |
|---|---:|---:|
| Limite por origem | 5 MB | Espelho (50% do disco disponível) |
| API síncrona | ✅ Sim | ❌ Assíncrona (Promise) |
| Capacidade | Dezenas de milhares de strings | Milhões de objetos estruturados |
| Suporte em PWA | ✅ Todos navegadores | ✅ Todos navegadores modernos |
| Complexidade | 1 linha por chave | Schema + cursores + transações |
| Tempo de dev | Minutos | Horas |
| Queries | Nenhuma (chave única) | Índices e ranges |

## Decisão

**Adotamos `localStorage`** para o MVP. Configuração da obra + log de eventos (máximo 200) cabem em KB.

Justificativa em ordem de importância:

1. **Volume:** Log máximo de 200 eventos × ~150 bytes = 30 KB por obra.  
   Configuração da obra: ~500 bytes. Total: **~31 KB**. localStorage suporta 5 MB — **160× folga**.
2. **Simplicidade:** API síncrona (zero Promise/async). Disponibiliza persistência em 8 linhas de código.
3. **Performance:** Escrita/leitura < 1 ms para volumes pequenos. IndexedDB exigiria abrir transação assíncrona.
4. **Adequação ao requisito:** não fazemos queries (range search, ordenação por índice). Carregamos a lista inteira em memória.
5. **Manutenibilidade:** menos dependências de runtime = menos bugs cross-browser.

## Consequências

### Positivas
- ✅ Zero deps externas. Boot do app fica mais rápido.
- ✅ Código `log.js` e `state.js` mais simples (sem Promise/callback).
- ✅ Funciona offline sem etapa assíncrona.

### Negativas / Riscos
- ❌ **Limite de 5 MB** (raro mas estourar em cenários extremos). Mitigação: cap de 200 eventos, rotação por obra.
- ❌ **Sem queries estruturadas.** Para o MVP, listamos todos. Em escala, precisaríamos migrar.
- ❌ **Síncrono pode travar a thread** em volumes grandes (não é o caso com 30 KB).
- ❌ **Não compartilha estado entre abas** (não é requisito).

## Critérios para reavaliação (migrar para IndexedDB)

Migrar **somente** se **qualquer** destas condições virar realidade:

1. **Volume de log > 5 MB** por obra, ou múltiplas obras abertas simultaneamente.
2. **Queries estruturadas** (ex.: "todos os warnings entre 14h00-15h00 da obra X").
3. **Anexos no log** (ex.: fotos, blobs).
4. **Sync entre abas** como requisito (operador com 2 PWA abertas monitorando o mesmo robô).
5. **Histórico de múltiplas obras** > 5 GB no dispositivo.

### Quando migrar (não "se")

Quando uma dessas virar realidade, **a migração é viável**: localStorage e IndexedDB convivem. Poderia manter config em localStorage (3 chaves) e mover apenas o log de eventos para IndexedDB. Migrar 5 minutos sem refatorar tudo.

## Alternativas rejeitadas

- **SessionStorage**: descartado — não persiste entre abas/recargas totais.
- **Cookie**: descartado — vai em toda requisição HTTP (mesmo em PWA offline é overhead).
- **Cache do Service Worker**: descartado — sem API direta do JS, exigiria protocolos complexos.

## Referências

- [MDN: Web Storage API](https://developer.mozilla.org/pt-BR/docs/Web/API/Web_Storage_API)
- [MDN: IndexedDB API](https://developer.mozilla.org/pt-BR/docs/Web/API/IndexedDB_API)
- [Web.dev: Storage quotas](https://web.dev/articles/storage-quotas)

## Histórico

- 2026-09-16: ADR criada (esta versão).
