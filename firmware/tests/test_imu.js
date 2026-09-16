/**
 * test_imu.js — Validação estática do módulo IMU no firmware.
 *
 * O que checa:
 * - Funções imuIniciar, imuAtualizar, imuVerificarTombamento presentes
 * - Constantes BNO055_REG_* e modos presentes
 * - Endereço IMU_ENDERECO = 0x28
 * - Pinos I2C (SDA=21, SCL=22) corretos
 * - Limites IMU_TOMBAMENTO_GRAUS = 45°, IMU_INCLINACAO_ALERTA_GRAUS = 30°
 * - #include <Wire.h> presente
 * - setup() chama imuIniciar()
 * - loop() chama imuAtualizar() e processa flag imuTombamentoDetectadoAgora
 * - enviarTelemetria() inclui campos imu_ok, roll_graus, pitch_graus
 * - Eventos EVT_TOMBAMENTO_DETECTADO, EVT_INCLINACAO_ALERTA, EVT_IMU_FALHA presentes
 *
 * Para rodar: node tools/scripts/test_imu.js
 *   ou:    node firmware/tests/test_imu.js
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARQ_FW = resolve(__dirname, '../../firmware/src/robo_impermeabilizador.ino');

const codigo = readFileSync(ARQ_FW, 'utf-8');

let pass = 0, fail = 0;
const _ = (label, fn) => {
  try { fn(); console.log(`  ✅ ${label}`); pass++; }
  catch (e) { console.error(`  ❌ ${label}\n     ${e.message}`); fail++; }
};
const _has = (s, where) => {
  if (!codigo.includes(s)) throw new Error(`esperava conter "${s}"`);
};
const _has_re = (re, msg) => {
  if (!re.test(codigo)) throw new Error(`esperava casar: ${msg}`);
};
const _not_has_re = (re, msg) => {
  if (re.test(codigo)) throw new Error(`NÃO esperava casar: ${msg}`);
};

console.log('\n🧪 test: firmware IMU');

/* Funções IMU */
_('função imuIniciar definida', () => _has('bool imuIniciar()'));
_('função imuAtualizar definida', () => _has('void imuAtualizar()'));
_('função imuVerificarTombamento definida', () => _has('bool imuVerificarTombamento()'));
_('função imuLerEuler definida', () => _has('bool imuLerEuler('));
_('função imuLerRegistrador definida', () => _has('uint8_t imuLerRegistrador('));
_('função imuEscreverRegistrador definida', () => _has('bool imuEscreverRegistrador('));

/* Constantes */
_('registrador BNO055_REG_CHIP_ID', () => _has('#define BNO055_REG_CHIP_ID'));
_('registrador BNO055_REG_EULER_LSB', () => _has('#define BNO055_REG_EULER_LSB'));
_('modo BNO055_MODE_NDOF = 0x0C', () => _has('#define BNO055_MODE_NDOF        0x0C'));
_('chip id esperado 0xA0', () => _has('#define BNO055_CHIP_ID_VALUE    0xA0'));

/* Endereço + pinos */
_('endereço I2C IMU_ENDERECO = 0x28', () => _has('const uint8_t IMU_ENDERECO = 0x28'));
_('I2C SDA = 21', () => _has('const int PIN_I2C_SDA = 21'));
_('I2C SCL = 22', () => _has('const int PIN_I2C_SCL = 22'));

/* Limites */
_('limite de tombamento 45°', () => _has_re(/IMU_TOMBAMENTO_GRAUS\s*=\s*45\.0/, 'IMU_TOMBAMENTO_GRAUS = 45'));
_('limite de alerta 30°', () => _has_re(/IMU_INCLINACAO_ALERTA_GRAUS\s*=\s*30\.0/, 'IMU_INCLINACAO_ALERTA_GRAUS = 30'));
_('intervalo 100ms', () => _has_re(/IMU_INTERVALO_MS\s*=\s*100/, 'IMU_INTERVALO_MS = 100'));
_('confirmação 300ms', () => _has_re(/IMU_TOMBAMENTO_CONFIRMA_MS\s*=\s*300/, 'IMU_TOMBAMENTO_CONFIRMA_MS = 300'));

/* Inclui Wire.h */
_('#include <Wire.h> presente', () => _has('#include <Wire.h>'));

/* Uso no setup */
_('setup() chama imuIniciar()', () => {
  const setupBody = codigo.match(/void setup\s*\(\s*\)\s*\{([\s\S]*?)^}/m);
  if (!setupBody) throw new Error('setup() não encontrado');
  if (!setupBody[1].includes('imuIniciar()')) throw new Error('setup não chama imuIniciar()');
  if (!setupBody[1].includes('imuInicializado')) throw new Error('setup não lê imuInicializado');
});
_('setup() envia EVT_IMU_FALHA em caso de falha', () => {
  const setupBody = codigo.match(/void setup\s*\(\s*\)\s*\{([\s\S]*?)^}/m);
  if (!setupBody) throw new Error('setup() não encontrado');
  if (!setupBody[1].includes('EVT_IMU_FALHA')) throw new Error('setup não emite EVT_IMU_FALHA');
});

/* Uso no loop */
_('loop() chama imuAtualizar()', () => {
  const loopBody = codigo.match(/void loop\s*\(\s*\)\s*\{([\s\S]*?)^}/m);
  if (!loopBody) throw new Error('loop() não encontrado');
  if (!loopBody[1].includes('imuAtualizar()')) throw new Error('loop não chama imuAtualizar');
});
_('loop() checa tombamento e aciona QUEDA', () => {
  const loopBody = codigo.match(/void loop\s*\(\s*\)\s*\{([\s\S]*?)^}/m);
  if (!loopBody) throw new Error('loop() não encontrado');
  if (!loopBody[1].includes('imuVerificarTombamento')) throw new Error('loop não chama imuVerificarTombamento');
  if (!loopBody[1].includes('pararMotores()')) throw new Error('tombamento deve chamar pararMotores()');
  if (!loopBody[1].includes('estadoAtual = QUEDA')) throw new Error('tombamento deve setar estadoAtual = QUEDA');
});
_('loop() converte flags em eventos', () => {
  const loopBody = codigo.match(/void loop\s*\(\s*\)\s*\{([\s\S]*?)^}/m);
  if (!loopBody) throw new Error('loop() não encontrado');
  if (!loopBody[1].includes('imuTombamentoDetectadoAgora')) throw new Error('flag tombamento não lida');
  if (!loopBody[1].includes('EVT_TOMBAMENTO_DETECTADO')) throw new Error('evento tombamento não enviado');
  if (!loopBody[1].includes('EVT_INCLINACAO_ALERTA')) throw new Error('evento inclinação não enviado');
});

/* Telemetria */
_('enviarTelemetria inclui imu_ok', () => {
  _has_re(/docEnvio\["data"\]\["imu_ok"\]/, 'imu_ok em enviarTelemetria');
});
_('enviarTelemetria inclui roll/pitch', () => {
  _has_re(/docEnvio\["data"\]\["roll_graus"\]/, 'roll_graus em enviarTelemetria');
  _has_re(/docEnvio\["data"\]\["pitch_graus"\]/, 'pitch_graus em enviarTelemetria');
});
_('enviarTelemetria inclui tilt_graus', () => {
  _has_re(/docEnvio\["data"\]\["tilt_graus"\]/, 'tilt_graus em enviarTelemetria');
});

/* Eventos enum */
_('EVT_TOMBAMENTO_DETECTADO no enum', () => _has('EVT_TOMBAMENTO_DETECTADO,'));
_('EVT_INCLINACAO_ALERTA no enum', () => _has('EVT_INCLINACAO_ALERTA,'));
_('EVT_IMU_FALHA no enum', () => _has('EVT_IMU_FALHA'));

/* Strings */
_('Strings snake_case para eventos', () => {
  _has_re(/case EVT_TOMBAMENTO_DETECTADO:\s*return "tombamento_detectado"/, 'string tombamento_detectado');
  _has_re(/case EVT_INCLINACAO_ALERTA:\s*return "inclinacao_alerta"/, 'string inclinacao_alerta');
  _has_re(/case EVT_IMU_FALHA:\s*return "imu_falha"/, 'string imu_falha');
});

/* Histerese implementada */
_('histerese de 5° para tombamento', () => {
  _has_re(/IMU_TOMBAMENTO_GRAUS\s*-\s*5\.0/, 'histerese 5° abaixo do limite');
});

/* Wire.begin() com parâmetros */
_('Wire.begin(SDA, SCL, FREQ)', () => _has('Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, IMU_FREQ_HZ)'));
_('Wire.endTransmission usado', () => {
  const matches = codigo.match(/Wire\.endTransmission/g) || [];
  if (matches.length < 3) throw new Error(`uso escasso de Wire.endTransmission: ${matches.length}`);
});

/* Out of scope (validação negativa) */
_('não usa delay() bloqueante dentro das funções IMU', () => {
  // Procura o corpo do bloco IMU (entre imuIniciar e a próxima seção "3.5" + algo)
  const bloco = codigo.match(/3\.5\. FUNÇÕES DO IMU[\s\S]*?(?=\/\/ =+\s*\n\/\/ 4\. |\/\/ 4\.)/);
  if (!bloco) throw new Error('não achou o bloco IMU');
  if (/delay\s*\(\s*\d+\s*\)/.test(bloco[0])) {
    // Há delays mas são curtos (25ms e 50ms para estabilização do BNO055)
    const matches = bloco[0].match(/delay\s*\(\s*(\d+)\s*\)/g);
    const max = Math.max(...(matches || []).map(s => +s.match(/\d+/)[0]));
    if (max > 100) throw new Error(`delay > 100ms dentro do IMU: ${max}ms — atrasa o loop`);
  }
});

console.log(`\nResultado: ${pass} ✅ | ${fail} ❌`);
process.exit(fail === 0 ? 0 : 1);
