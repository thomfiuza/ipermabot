/**
 * Runner de testes simples (sem dependências externas).
 * Executa todos os arquivos *.test.js em paralelo sequencial.
 *
 * Uso: node --experimental-vm-modules tests/run.mjs
 */

import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dirRaiz = join(__dirname, '..', '..');
const dirTestes = __dirname;

console.log('🧪 IMP-BOT — rodando suite de testes (app/\n)');

const arquivos = readdirSync(dirTestes).filter(f => f.endsWith('.test.js'));
let falhas = 0;

for (const arq of arquivos) {
  const caminho = join(dirTestes, arq);
  try {
    const saida = execSync(`node "${caminho}"`, {
      cwd: dirname(caminho),     // roda no próprio diretório tests/
      stdio: 'pipe',
      env: { ...process.env, NODE_OPTIONS: '--no-warnings' }
    });
    process.stdout.write(saida);
  } catch (e) {
    falhas++;
    console.error(`❌ ${arq} falhou:\n${e.stdout?.toString() || ''}\n${e.stderr?.toString() || ''}`);
  }
}

if (falhas === 0) console.log('\n🎉 Todos os testes passaram.');
else { console.error(`\n⛔ ${falhas} arquivo(s) com falha.`); process.exit(1); }
