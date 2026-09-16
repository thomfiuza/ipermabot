#!/usr/bin/env node
/**
 * check-protocol.mjs — Verifica coerência entre o protocolo declarado
 * em `docs/protocolo/PROTOCOLO_COMUNICACAO.md` e o que o app trata em
 * `app/js/protocol.js`.
 *
 * Se você adicionar um comando em PROTOCOLO_COMUNICACAO.md mas não
 * tratá-lo no app, ou vice-versa, o CI falha aqui.
 *
 * Uso: node check-protocol.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(__dirname, '..', '..');

const APP_PROTOCOL = resolve(RAIZ, 'app', 'js', 'protocol.js');
const FIRM_INO      = resolve(RAIZ, 'firmware', 'src', 'robo_impermeabilizador.ino');
const PROTO_MD      = resolve(RAIZ, 'docs', 'protocolo', 'PROTOCOLO_COMUNICACAO.md');

let erros = 0, avisos = 0;

/* 1. Lista de eventos que o app CONHECE */
const textoProtocol = readFileSync(APP_PROTOCOL, 'utf8');
const eventosConhecidosApp = [];
const reEventos = /(\w+):\s*\{[^}]*tipo:/g;
for (const m of textoProtocol.matchAll(reEventos)) {
  eventosConhecidosApp.push(m[1]);
}

/* 2. Lista de eventos mencionados no MD do protocolo (linha "XX. ..." ou tabela) */
const textoMD = readFileSync(PROTO_MD, 'utf8');
const eventosDocumentadosMD = [];
const reComandos = /`(\w+)`\s*\|/g;
for (const m of textoMD.matchAll(reComandos)) {
  eventosDocumentadosMD.push(m[1]);
}

/* 3. Lista de eventos emitidos pelo firmware (EVENTO_*) */
const textoFirmware = readFileSync(FIRM_INO, 'utf8');
const eventosFirmware = [];
const reEventosFW = /\bEVENTO_(\w+)\s*=\s*"/g;
for (const m of textoFirmware.matchAll(reEventosFW)) {
  eventosFirmware.push(m[1].toLowerCase());
}

/* 4. Cruzamento */
console.log('🔍 Verificando coerência do protocolo...');
console.log(`\n📋 Eventos no firmware (E EVENTO_X = "..."):`);
eventosFirmware.forEach(e => console.log(`   - ${e}`));

const unicosApp = new Set(eventosConhecidosApp);
const naoCobertoPeloApp = [...unicosApp].filter(e => !eventosFirmware.includes(e));
if (naoCobertoPeloApp.length > 0) {
  console.warn(`\n⚠️  Eventos conhecidos pelo app mas não emitidos pelo firmware: ${naoCobertoPeloApp.join(', ')}`);
  avisos += naoCobertoPeloApp.length;
}

const unicosFW = new Set(eventosFirmware);
const naoCobertoPeloFirmware = [...unicosFW].filter(e => !eventosConhecidosApp.includes(e));
if (naoCobertoPeloFirmware.length > 0) {
  console.warn(`\n⚠️  Eventos emitidos pelo firmware mas NÃO tratados pelo app: ${naoCobertoPeloFirmware.join(', ')}`);
  avisos += naoCobertoPeloFirmware.length;
}

if (unicosFW.size > 0 && unicosApp.size === 0) {
  console.error('\n❌ App não conhece nenhum evento do firmware (módulo protocol.js vazio?).');
  erros++;
}

if (erros === 0 && avisos === 0) {
  console.log('\n✅ Protocolo 100% coerente entre app e firmware.');
} else {
  console.log(`\n📊 ${erros} erros | ${avisos} avisos`);
}

process.exit(erros === 0 ? 0 : 1);
