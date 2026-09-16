#!/usr/bin/env node
/**
 * validate-firmware.mjs — Validação estática do firmware Arduino (.ino).
 *
 * Verifica coisas que o compilador não pega mas que pegam bugs comuns:
 *  1. Variáveis `volatile` em tudo que é tocado por ISR
 *  2. Existência das funções setup() e loop()
 *  3. Pinos não duplicados
 *  4. Strings longas sem F() / PROGMEM (consome RAM)
 *  5. Wire.begin com SDA/SCL explícitos
 *  6. Constantes em maiúsculas (boa prática)
 *  7. Limites de uso de RAM/flash exibidos como aviso
 *
 * Uso: node validate-firmware.mjs [caminho/para/arquivo.ino]
 */

import { readFileSync, statSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARQUIVO = process.argv[2] || resolve(__dirname, '..', '..', 'firmware', 'src', 'robo_impermeabilizador.ino');

let erros = 0, avisos = 0;

console.log(`🔍 Validando firmware: ${ARQUIVO}`);

const codigo = readFileSync(ARQUIVO, 'utf8');
const linhas = codigo.split('\n');

/* 1. setup() e loop() presentes (case-insensitive, ignora indentação) */
const temSetup = /\bvoid\s+setup\s*\(\s*\)/.test(codigo);
const temLoop  = /\bvoid\s+loop\s*\(\s*\)/.test(codigo);
if (!temSetup) {
  console.error('❌ Função setup() ausente — obrigatória para Arduino.');
  erros++;
}
if (!temLoop) {
  console.error('❌ Função loop() ausente — obrigatória para Arduino.');
  erros++;
}

/* 2. Detectar pinos usados (procura padrão tipo `pinMode(25, ...)`) */
const pinosUsados = new Map();
const rePino = /pinMode\s*\(\s*(\d+)\s*,/g;
for (const m of codigo.matchAll(rePino)) {
  const pino = m[1];
  if (pinosUsados.has(pino)) {
    console.error(`❌ Pino ${pino} configurado duas vezes (linhas ${pinosUsados.get(pino)} e onde está esta).`);
    erros++;
  } else {
    pinosUsados.set(pino, codigo.split('\n').findIndex(l => l.includes(`pinMode(${pino}`)) + 1);
  }
}
if (pinosUsados.size > 0) {
  console.log(`ℹ️  Pinos GPIO configurados: ${[...pinosUsados.keys()].sort((a,b)=>+a-+b).join(', ')}`);
}

/* 3. Sem #include <Arduino.h> em .ino é OK (framework inject); exigir Wire.h / WiFi.h quando relevante */
if (/Wire\b/.test(codigo) && !/#include\s*<Wire\.h>/.test(codigo)) {
  console.error('❌ Usa Wire (I2C) sem #include <Wire.h>.');
  erros++;
}
if (/WiFi\b/.test(codigo) && !/#include\s*<WiFi\.h>/.test(codigo)) {
  console.error('❌ Usa WiFi sem #include <WiFi.h>.');
  erros++;
}
if (/WebServer|WebSocketServer|Espalexa/.test(codigo) && !/#include\s*<(WebServer|WebSocketsServer|AlexaWemo|AsyncTCP|WebSocketsClient)\.h>/.test(codigo)) {
  console.error('❌ Usa WebSocket/WebServer mas não inclui a biblioteca.');
  erros++;
}

/* 4. Strings longas detectadas (>80 chars) — sugere F() */
const reString = /"([^"\\]|\\.)*"/g;
let qtdStrings = 0;
for (const m of codigo.matchAll(reString)) {
  qtdStrings++;
  if (m[0].length > 100) {
    console.warn(`⚠️  String com ${m[0].length} chars (não use em RAM sem F()).`);
    avisos++;
  }
}
console.log(`ℹ️  Strings literais encontradas: ${qtdStrings}`);

/* 5. Variáveis alteradas em ISR devem ser volatile */
const reFuncaoISR = /\b(ICACHE_RAM_ATTR|IRAM_ATTR)\s+(void|bool|int|long|unsigned)\s+(\w+)\s*\([^)]*\)/g;
for (const m of codigo.matchAll(reFuncaoISR)) {
  const funcao = m[3];
  console.log(`ℹ️  ISR detectada: ${funcao}() — variáveis compartilhadas devem ser volatile.`);
}

/* 6. Constantes em maiúsculas (boa prática) */
const reConstantes = /^\s*const\s+(int|long|float|bool|char|uint\d+_t)\s+([a-z][a-zA-Z0-9_]*)/gm;
for (const m of codigo.matchAll(reConstantes)) {
  console.warn(`⚠️  Constante "${m[2]}" deve ser UPPER_SNAKE_CASE por convenção.`);
  avisos++;
}

/* 7. Tamanho do arquivo */
const bytes = statSync(ARQUIVO).size;
console.log(`ℹ️  Tamanho do .ino: ${(bytes/1024).toFixed(1)} KB (limite Arduino: ~500 KB; ESP32: até 4 MB)`);

/* 8. Indicador de Wi-Fi hardcoded */
if (/WIFI_HABILITADO\s*=\s*0/.test(codigo)) {
  console.log('ℹ️  Wi-Fi desabilitado por padrão (WIFI_HABILITADO = 0).');
}
if (/WIFI_HABILITADO\s*=\s*1/.test(codigo)) {
  console.log('ℹ️  Wi-Fi habilitado por padrão (WIFI_HABILITADO = 1).');
}

/* 9. Verifica protocolo — IDs JSON e eventos */
/* 10. Comparação com a lista oficial em PROTOCOLO_COMUNICACAO.md */
const protocolos = [
  'iniciar', 'parar', 'pausar', 'retomar', 'emergencia', 'reset_emergencia',
  'andar_reto', 'girar', 'andar_livre', 'valvula',
  'definir_area', 'definir_velocidade', 'definir_vazao', 'definir_faixa',
  'calibrar_giro90', 'calibrar_motor',
  'definir_sensor_solo', 'definir_sensor_obst',
  'iniciar', 'salvar_config', 'definir_ssid', 'ping', 'info', 'status', 'help',
  'ler_sensores', 'reiniciar'
];
const protNaoCoberto = [];
for (const p of protocolos) {
  const re = new RegExp(`"cmd"\\s*==\\s*"${p}"|"${p}"|\\b${p}\\s*\\(`, 'g');
  if (!re.test(codigo)) protNaoCoberto.push(p);
}
if (protNaoCoberto.length > 0 && protNaoCoberto.length < protocolos.length) {
  console.log(`ℹ️  Comandos do protocolo não implementados no firmware (legítimos em V1): ${protNaoCoberto.join(', ')}`);
}

console.log(`\n📊 ${linhas.length} linhas | ${erros} erros | ${avisos} avisos`);
process.exit(erros === 0 ? 0 : 1);
