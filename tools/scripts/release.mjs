/**
 * release.mjs — Pipeline de release local (sem CI).
 *
 * Uso:
 *   node tools/scripts/release.mjs                 # patch +0.0.1
 *   node tools/scripts/release.mjs --minor
 *   node tools/scripts/release.mjs --major
 *   node tools/scripts/release.mjs --ver=1.2.3
 *
 * O que faz:
 *   1. Lê versão atual de app/package.json.
 *   2. Incrementa (patch/minor/major) ou usa a flag --ver.
 *   3. Valida (tests + lint + protocol via review.mjs).
 *   4. Atualiza package.json, firmware/src/*.ino (#define FW_VERSAO),
 *      CHANGELOG.md e cria tag git.
 *   5. Empacota app/ como .zip + sha256 + bundle Git em dist/.
 *
 * Quando terminar, basta `git push origin main --follow-tags`.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(__dirname, '../..');
const APP = join(RAIZ, 'app');
const FW = join(RAIZ, 'firmware');
const DIST = join(RAIZ, 'dist');

const argv = process.argv.slice(2);
let versao = null;
let bumpType = 'patch';
for (const arg of argv) {
  if (arg.startsWith('--ver=')) versao = arg.slice(6);
  else if (arg === '--minor') bumpType = 'minor';
  else if (arg === '--major') bumpType = 'major';
  else if (arg === '--patch') bumpType = 'patch';
}

const pkgPath = join(APP, 'package.json');
if (!existsSync(pkgPath)) {
  console.error('❌ app/package.json não encontrado.');
  process.exit(1);
}
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

if (!versao) {
  const [maj, min, pat] = pkg.version.split('.').map(Number);
  if (bumpType === 'major') versao = `${maj + 1}.0.0`;
  else if (bumpType === 'minor') versao = `${maj}.${min + 1}.0`;
  else versao = `${maj}.${min}.${pat + 1}`;
}

console.log(`\n🚀 Release ${versao} (de ${pkg.version})\n`);

console.log('🧪 Validando (tests + lint + protocol)...');
try {
  execSync('node tools/scripts/review.mjs', { cwd: RAIZ, stdio: 'inherit' });
} catch (_) {
  console.error('\n❌ Falha na revisão. Aborte o release.');
  process.exit(1);
}

pkg.version = versao;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`✅ app/package.json → ${versao}`);

const inoPath = join(FW, 'src', 'robo_impermeabilizador.ino');
let inoCodigo = readFileSync(inoPath, 'utf-8');
const [maior, menor, patch] = versao.split('.').map(Number);
const verFwHex = `0x${String(maior).padStart(2,'0')}${String(menor).padStart(2,'0')}${String(patch).padStart(2,'0')}`;
const VERSAO_FW = `${versao} (${verFwHex})`;

if (/#define\s+FW_VERSAO\s/.test(inoCodigo)) {
  inoCodigo = inoCodigo.replace(/(#define\s+FW_VERSAO\s+)"[^"]*"/, `$1"${VERSAO_FW}"`);
}
if (/#define\s+FW_VERSAO_HEX\s/.test(inoCodigo)) {
  inoCodigo = inoCodigo.replace(/(#define\s+FW_VERSAO_HEX\s+).+/, `$1${verFwHex}`);
}
writeFileSync(inoPath, inoCodigo);
console.log(`✅ firmware/.ino → ${VERSAO_FW}`);

const changelogPath = join(RAIZ, 'CHANGELOG.md');
let cl = readFileSync(changelogPath, 'utf-8');
const hoje = new Date().toISOString().slice(0, 10);
if (cl.includes(`## [Unreleased] — `) && !cl.includes(`## [${versao}]`)) {
  cl = cl.replace('## [Unreleased] — ', `## [Unreleased] (em desenvolvimento)\n\n## [${versao}] — ${hoje}\n\nVeja o diff de commits para mudanças pontuais.\n\n## [Unreleased] pré-1 — `);
}
writeFileSync(changelogPath, cl);
console.log(`✅ CHANGELOG.md`);

if (!existsSync(DIST)) mkdirSync(DIST);
const zipName = `impbot-v${versao}.zip`;
const zipPath = join(DIST, zipName);

console.log(`\n📦 Empacotando app/ → ${zipName}...`);
execSync(`zip -r '${zipPath}' app -x '**/.git/*' '**/*.bundle' '**/node_modules/*'`, {
  cwd: RAIZ, stdio: 'inherit'
});

const zipBuf = readFileSync(zipPath);
const sha256 = createHash('sha256').update(zipBuf).digest('hex');
const sumPath = join(DIST, `${zipName}.sha256`);
writeFileSync(sumPath, `${sha256}  ${zipName}\n`);
console.log(`✅ ${zipName}.sha256: ${sha256.substring(0, 16)}...`);

const bundlePath = join(RAIZ, 'projeto-robo-impermeabilizador.bundle');
const bundleDist = join(DIST, `impbot-v${versao}.bundle`);
try {
  execSync(`git bundle create '${bundlePath}' --all`, { cwd: RAIZ, stdio: 'pipe' });
  copyFileSync(bundlePath, bundleDist);
  console.log(`✅ Bundle portátil → dist/${basename(bundleDist)}`);
} catch (e) {
  console.warn('⚠️  Falha ao gerar bundle:', e.message);
}

const msg = `release: v${versao}`;
console.log(`\n📝 git commit -m "${msg}"`);
execSync(`git add -A && git commit -m "${msg}"`, { cwd: RAIZ, stdio: 'inherit' });
execSync(`git tag -a v${versao} -m "Release v${versao}"`, { cwd: RAIZ, stdio: 'inherit' });

console.log(`\n🎉 Release v${versao} pronto em dist/${zipName}`);
console.log(`\nPróximo passo:`);
console.log(`  git push origin main --follow-tags`);
console.log(`\nOpcional — via API sem gh CLI:`);
console.log(`  git push https://USER:\${GITHUB_TOKEN}@github.com/USER/repo.git v${versao}`);
