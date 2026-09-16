#!/usr/bin/env node
/**
 * review.mjs — Orquestrador da revisão contínua.
 *
 * Roda, em sequência:
 *   1. Testes unitários JS (app/tests/run.mjs)
 *   2. Linter JS customizado (lint-js.mjs)
 *   3. Validação estática do firmware (validate-firmware.mjs)
 *   4. Checagem de coerência do protocolo (check-protocol.mjs)
 *
 * Saída: tabela de "passou/falhou" e exit code 0 se tudo passou.
 *
 * Uso: node review.mjs
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, '..', '..');

const etapas = [
  { nome: 'Testes unitários JS',        cmd: 'node', args: ['tests/run.mjs'], cwd: join(RAIZ, 'app') },
  { nome: 'Lint JS',                    cmd: 'node', args: [join(__dirname, 'lint-js.mjs')], cwd: RAIZ },
  { nome: 'Validação do firmware',      cmd: 'node', args: [join(__dirname, 'validate-firmware.mjs')], cwd: RAIZ },
  { nome: 'Coerência do protocolo',     cmd: 'node', args: [join(__dirname, 'check-protocol.mjs')], cwd: RAIZ }
];

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  IMP-BOT — REVISÃO CONTÍNUA DE CÓDIGO                 ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

const resultados = [];
for (const e of etapas) {
  process.stdout.write(`▶ ${e.nome.padEnd(28)} ... `);
  try {
    const out = execSync(`${e.cmd} ${e.args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ')}`, {
      cwd: e.cwd,
      stdio: 'pipe'
    });
    console.log('✅ OK');
    resultados.push({ nome: e.nome, ok: true });
    process.stdout.write(out.toString().split('\n').map(l => '   ' + l).join('\n') + '\n');
  } catch (err) {
    console.log('❌ FALHOU');
    resultados.push({ nome: e.nome, ok: false, saida: (err.stdout?.toString() || '') + (err.stderr?.toString() || '') });
    process.stdout.write((err.stdout?.toString() || '').split('\n').map(l => '   ' + l).join('\n') + '\n');
  }
}

console.log('\n═══════════════════════════════════════════════════════════');
const ok = resultados.filter(r => r.ok).length;
const total = resultados.length;
console.log(`RESUMO: ${ok}/${total} etapas passaram`);
if (ok === total) {
  console.log('🎉 Tudo certo. Pode fazer commit.');
  process.exit(0);
} else {
  console.log('⛔ Corrija as falhas antes de fazer commit.');
  process.exit(1);
}
