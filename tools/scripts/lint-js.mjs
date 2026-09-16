#!/usr/bin/env node
/**
 * lint-js.mjs — Linter JS customizado (sem dependências externas).
 *
 * Verifica regras críticas de qualidade que o ESLint pegaria:
 * 1. Sem `var` (use `let` ou `const`)
 * 2. Sem `==` solto (use `===`)
 * 3. Sem `console.log` em código de produção (apenas `console.warn`/`console.error`)
 * 4. Funções exportadas têm JSDoc
 * 5. Tamanho máximo de arquivo (evitar arquivos monolíticos)
 * 6. Sem TODO/FIXME sem tag "#dev"
 *
 * Uso: node lint-js.mjs [dir]
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ALVOS = process.argv.slice(2).length ? process.argv.slice(2) :
  [join(__dirname, '..', '..', 'app', 'js')];

const EXTENSOES = new Set(['.js', '.mjs']);
const TAMANHO_MAX_BYTES = 100 * 1024;   // 100 KB
const IGNORAR_DIR = new Set(['node_modules', 'tests', '.git', 'dist']);

let erros = 0;
let avisos = 0;
let arquivos = 0;

function hex(linha, col, ctxLen = 30) {
  const n = Math.max(0, col - ctxLen);
  return `${linha.substring(n, col + ctxLen)}`;
}

const REGRAS = [
  {
    id: 'NO-VAR',
    msg: 'Use `let` ou `const` em vez de `var`.',
    re: /\bvar\s+[a-zA-Z_$]/g,
    severidade: 'erro'
  },
  {
    id: 'NO-LOOSE-EQ',
    msg: 'Use === ou !== em vez de == ou !=.',
    re: /(?<![=!<>])==(?!=)/g,
    severidade: 'erro'
  },
  {
    id: 'NO-CONSOLE-LOG',
    msg: 'Evite console.log em produção (use console.warn/error).',
    re: /(?<![\w.])console\.log\(/g,
    severidade: 'aviso'
  },
  {
    id: 'TODO-SEM-TAG',
    msg: 'TODO/FIXME deve ser marcado com #dev. Ex: // TODO #dev: refatorar',
    re: /\b(TODO|FIXME|XXX|HACK)\b(?!\s*#dev)/g,
    severidade: 'aviso'
  }
];

function lintArquivo(caminho) {
  arquivos++;
  const conteudo = readFileSync(caminho, 'utf8');
  const linhas = conteudo.split('\n');

  // Regra 5: tamanho
  if (conteudo.length > TAMANHO_MAX_BYTES) {
    console.warn(`⚠️  ${caminho}: arquivo muito grande (${(conteudo.length/1024).toFixed(1)} KB) — considere modularizar.`);
    avisos++;
  }

  linhas.forEach((linha, i) => {
    // Pula comentários de bloco/destino
    if (linha.trim().startsWith('//') || linha.trim().startsWith('*')) return;

    REGRAS.forEach(regra => {
      const matches = linha.matchAll(regra.re);
      for (const m of matches) {
        if (regra.severidade === 'erro') {
          console.error(`❌ ${caminho}:${i+1} [${regra.id}] ${regra.msg}`);
          console.error(`     ${hex(linha, m.index)}`);
          erros++;
        } else {
          console.warn(`⚠️  ${caminho}:${i+1} [${regra.id}] ${regra.msg}`);
          console.warn(`     ${hex(linha, m.index)}`);
          avisos++;
        }
      }
    });
  });

  // Regra 4: funções exportadas com JSDoc
  const linhasExportadas = [];
  linhas.forEach((linha, i) => {
    if (/^export\s+(async\s+)?(function|const|class)\s/.test(linha.trim())) {
      linhasExportadas.push({ linha: i+1, conteudo: linha.trim() });
      // Verifica se as 5 linhas anteriores têm JSDoc
      const anteriores = conteudo.split('\n').slice(Math.max(0, i - 5), i).join('\n');
      if (!/\* @/.test(anteriores)) {
        console.warn(`⚠️  ${caminho}:${linhasExportadas[linhasExportadas.length-1].linha} função/classe exportada sem JSDoc acima. Adicione /** ... */.`);
        avisos++;
      }
    }
  });
}

function caminhar(dir) {
  for (const entry of readdirSync(dir)) {
    if (IGNORAR_DIR.has(entry)) continue;
    const caminho = join(dir, entry);
    const stat = statSync(caminho);
    if (stat.isDirectory()) caminhar(caminho);
    else if (EXTENSOES.has(extname(caminho))) lintArquivo(caminho);
  }
}

console.log(`🔍 Lintando: ${ALVOS.join(', ')}`);
ALVOS.forEach(caminhar);

console.log(`\n📊 ${arquivos} arquivos analisados | ${erros} erros | ${avisos} avisos`);
process.exit(erros === 0 ? 0 : 1);
