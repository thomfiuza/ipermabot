/**
 * Testes do decodificador de protocolo em protocol.js.
 *
 * Cobertura:
 *  - tratarResposta: parsing de respostas id/data do ESP32
 *  - tratarTelemetria: parsing de dados de telemetria 1Hz
 *  - tratarEvento: mapeamento de eventos do firmware para log + emergência
 *
 * Para rodar: `node tests/run.mjs` ou `node tests/protocol.test.js`
 */

import { tratarResposta, tratarTelemetria, tratarEvento } from '../js/protocol.js';
import { EST } from '../js/state.js';

let pass = 0, fail = 0;
const _ = (label, fn) => {
  try { fn(); console.log(`  ✅ ${label}`); pass++; }
  catch (e) { console.error(`  ❌ ${label}\n     ${e.message}`); fail++; }
};
const _eq = (actual, expected, msg = '') => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) throw new Error(`${msg}\n     esperado: ${JSON.stringify(expected)}\n     obtido:   ${JSON.stringify(actual)}`);
};
const _simularLog = () => {
  const logs = [];
  return {
    logs,
    fn: (tipo, titulo, desc) => logs.push({ tipo, titulo, desc })
  };
};
const _hooksEstado = () => ({
  emergencia: false,
  queda: false,
  obstaculo: false,
  onEmergencia: () => { this && (this.emergencia = true); }
});

console.log('\n🧪 test: protocol.js');

/* ============================================================================
   TESTES DE tratarResposta
   ============================================================================ */
console.log('\n  📦 tratarResposta');

_('trata erro do firmware (id presente, ok=false)', () => {
  const L = _simularLog();
  const estado = { esp_estado: EST.PARADO };
  tratarResposta({ id: 7, ok: false, err: 'E010' }, L.fn, { estado });
  _eq(L.logs.length, 1);
  _eq(L.logs[0].tipo, 'erro');
  if (!L.logs[0].titulo.includes('7')) throw new Error('não cita id da falha');
});

_('processa resposta ok com data básico', () => {
  const L = _simularLog();
  const estado = {
    esp_estado: EST.PARADO,
    m2_feitos: 0, bateria: 100, produto: 100, faixa: 0
  };
  tratarResposta({
    id: 1, ok: true,
    data: { estado: 'TRABALHANDO', m2_feitos: 12.5, bateria_pct: 87, produto_pct: 92, faixa_atual: 2 }
  }, L.fn, { estado });
  _eq(estado.esp_estado, 'TRABALHANDO');
  _eq(estado.m2_feitos, 12.5);
  _eq(estado.bateria, 87);
  _eq(estado.produto, 92);
  _eq(estado.faixa, 2);
});

_('ignora silenciosamente mensagens sem id/data', () => {
  const L = _simularLog();
  const estado = { esp_estado: EST.PARADO };
  // Não pode lançar
  tratarResposta({ hello: 'world' }, L.fn, { estado });
  tratarResposta({}, L.fn, { estado });
  _eq(L.logs.length, 0);
});

/* ============================================================================
   TESTES DE tratarTelemetria
   ============================================================================ */
console.log('\n  📦 tratarTelemetria');

_('atualiza estado com telemetria completa', () => {
  const L = _simularLog();
  const estado = {
    esp_estado: EST.PARADO, bateria: 100, produto: 100,
    faixa: 0, m2_feitos: 0, dist_solo: 12, dist_obst: 200
  };
  const config = { lim_queda_cm: 25, lim_obst_cm: 30 };
  const hooks = { onQueda: null, onObstaculo: null };
  tratarTelemetria({
    estado: 'TRABALHANDO',
    bateria_pct: 85,
    produto_pct: 90,
    faixa_atual: 3,
    m2_feitos: 6.5,
    distancia_frente: 150.0,
    distancia_solo: 13.0
  }, estado, config, hooks);
  _eq(estado.esp_estado, 'TRABALHANDO');
  _eq(estado.bateria, 85);
  _eq(estado.produto, 90);
  _eq(estado.faixa, 3);
  _eq(estado.m2_feitos, 6.5);
  _eq(estado.dist_obst, 150.0);
  _eq(estado.dist_solo, 13.0);
});

_('dispara emergência de queda quando solo > limite durante trabalho', () => {
  let quedaDisparada = false;
  const estado = {
    esp_estado: EST.TRABALHANDO, bateria: 80, produto: 80, faixa: 0, m2_feitos: 0,
    dist_solo: 12, dist_obst: 200
  };
  const config = { lim_queda_cm: 25, lim_obst_cm: 30 };
  const hooks = {
    onQueda: (cm, lim) => {
      quedaDisparada = true;
      _eq(cm, 35);
      _eq(lim, 25);
    }
  };
  tratarTelemetria({ distancia_solo: 35.0 }, estado, config, hooks);
  if (!quedaDisparada) throw new Error('queda não foi detectada');
});

_('NÃO dispara emergência se robô estiver parado', () => {
  let quedaDisparada = false;
  const estado = {
    esp_estado: EST.PARADO, bateria: 80, produto: 80, faixa: 0, m2_feitos: 0,
    dist_solo: 12, dist_obst: 200
  };
  const config = { lim_queda_cm: 25, lim_obst_cm: 30 };
  const hooks = { onQueda: () => { quedaDisparada = true; } };
  tratarTelemetria({ distancia_solo: 40.0 }, estado, config, hooks);
  if (quedaDisparada) throw new Error('queda deveria estar parada');
});

_('ignora telemetria nula', () => {
  const estado = { esp_estado: EST.PARADO, bateria: 80, produto: 80 };
  const config = { lim_queda_cm: 25, lim_obst_cm: 30 };
  const hooks = { onQueda: () => { throw new Error('NÃO DEVE'); } };
  // Não pode lançar
  tratarTelemetria(null, estado, config, hooks);
  tratarTelemetria(undefined, estado, config, hooks);
});

_('detecta obstáculo durante trabalho', () => {
  let obstaculoDisparado = false;
  let obstaculoCm = null;
  const estado = {
    esp_estado: EST.TRABALHANDO, bateria: 80, produto: 80, faixa: 0, m2_feitos: 0,
    dist_solo: 12, dist_obst: 200
  };
  const config = { lim_queda_cm: 25, lim_obst_cm: 30 };
  const hooks = { onObstaculo: (cm) => { obstaculoDisparado = true; obstaculoCm = cm; } };
  tratarTelemetria({ distancia_frente: 25.0 }, estado, config, hooks);
  if (!obstaculoDisparado) throw new Error('obstáculo não foi detectado');
  if (obstaculoCm !== 25) throw new Error(`cm errado: ${obstaculoCm}`);
});

/* ============================================================================
   TESTES DE tratarEvento
   ============================================================================ */
console.log('\n  📦 tratarEvento');

_('mapeia faixa_iniciada para log informativo', () => {
  const L = _simularLog();
  const hooks = { onEmergencia: () => {} };
  tratarEvento({ tipo: 'faixa_iniciada', descricao: 'faixa 3' }, L.fn, hooks);
  _eq(L.logs.length, 1);
  _eq(L.logs[0].tipo, 'info');
  _eq(L.logs[0].titulo, 'Faixa iniciada');
  if (!L.logs[0].desc.includes('faixa 3')) throw new Error('descrição ausente');
});

_('mapeia faixa_concluida para sucesso', () => {
  const L = _simularLog();
  const hooks = { onEmergencia: () => {} };
  tratarEvento({ tipo: 'faixa_concluida' }, L.fn, hooks);
  _eq(L.logs[0].tipo, 'sucesso');
});

_('mapeia queda_detectada para erro + dispara emergência', () => {
  let emergencia = null;
  const L = _simularLog();
  const hooks = {
    onEmergencia: (tipo, desc) => { emergencia = { tipo, desc }; }
  };
  tratarEvento({ tipo: 'queda_detectada', descricao: 'sensor solo 38 cm' }, L.fn, hooks);
  _eq(L.logs[0].tipo, 'erro');
  if (!emergencia) throw new Error('emergência não foi disparada');
  _eq(emergencia.tipo, 'queda_detectada');
  if (!emergencia.desc.includes('38 cm')) throw new Error('descrição não propagada');
});

_('mapeia emergencia_acionada para erro + dispara emergência', () => {
  let emergencia = null;
  const L = _simularLog();
  const hooks = { onEmergencia: (t) => { emergencia = t; } };
  tratarEvento({ tipo: 'emergencia_acionada' }, L.fn, hooks);
  if (!emergencia) throw new Error('emergência não foi disparada');
});

_('mapeia bateria_baixa para warning', () => {
  const L = _simularLog();
  tratarEvento({ tipo: 'bateria_baixa', descricao: '<20%' }, L.fn, {});
  _eq(L.logs[0].tipo, 'warn');
});

_('mapeia produto_baixo para warning', () => {
  const L = _simularLog();
  tratarEvento({ tipo: 'produto_baixo', descricao: '<30%' }, L.fn, {});
  _eq(L.logs[0].tipo, 'warn');
});

_('mapeia obstaculo_detectado para warning', () => {
  const L = _simularLog();
  tratarEvento({ tipo: 'obstaculo_detectado' }, L.fn, {});
  _eq(L.logs[0].tipo, 'warn');
});

_('NÃO registra evento desconhecido', () => {
  const L = _simularLog();
  const hooks = { onEmergencia: () => {} };
  tratarEvento({ tipo: 'evento_totalmente_novo' }, L.fn, hooks);
  _eq(L.logs.length, 0);
});

_('NÃO registra evento sem tipo', () => {
  const L = _simularLog();
  const hooks = { onEmergencia: () => {} };
  tratarEvento({ descricao: 'sem tipo' }, L.fn, hooks);
  _eq(L.logs.length, 0);
});

_('ignora evento nulo', () => {
  const L = _simularLog();
  const hooks = { onEmergencia: () => {} };
  // Não pode lançar
  tratarEvento(null, L.fn, hooks);
  tratarEvento(undefined, L.fn, hooks);
});

/* ============================================================================
   EVENTOS IMU (BNO055)
   ============================================================================ */

_('tombamento_detectado aciona hook de emergência e severity erro', () => {
  const L = _simularLog();
  let emergType = null;
  const hooks = { onEmergencia: (t) => { emergType = t; } };
  tratarEvento({ tipo: 'tombamento_detectado', descricao: 'tilt 48°' }, L.fn, hooks);
  _eq(L.logs.length, 1);
  _eq(L.logs[0].tipo, 'erro');
  _eq(emergType, 'tombamento_detectado');
});

_('inclinacao_alerta severity warn, NÃO chama emergencia', () => {
  const L = _simularLog();
  let emergCalled = false;
  const hooks = { onEmergencia: () => { emergCalled = true; } };
  tratarEvento({ tipo: 'inclinacao_alerta', descricao: 'tilt 32°' }, L.fn, hooks);
  _eq(L.logs.length, 1);
  _eq(L.logs[0].tipo, 'warn');
  _eq(emergCalled, false);
});

_('imu_falha severity warn, sensor ausente', () => {
  const L = _simularLog();
  tratarEvento({ tipo: 'imu_falha', descricao: 'CHIP_ID != 0xA0' }, L.fn, {});
  _eq(L.logs.length, 1);
  _eq(L.logs[0].tipo, 'warn');
});

/* ============================================================================
   TELEMETRIA IMU
   ============================================================================ */

_('telemetria preenche estado.imu_ok e tilt', () => {
  const L = _simularLog();
  const estado = {
    esp_estado: EST.TRABALHANDO, bateria: 100, produto: 100,
    faixa: 0, m2_feitos: 0, dist_solo: 12, dist_obst: 200, imu_ok: true, roll: 0, pitch: 0, tilt: 0
  };
  const config = { lim_queda_cm: 25, lim_obst_cm: 30 };
  const hooks = { onQueda: null, onObstaculo: null };
  tratarTelemetria({ imu_ok: false, roll_graus: 1.5, pitch_graus: -2.3, tilt_graus: 2.7 }, estado, config, hooks);
  _eq(estado.imu_ok, false);
  _eq(estado.roll, 1.5);
  _eq(estado.pitch, -2.3);
  _eq(estado.tilt, 2.7);
});

/* ============================================================================
   COBERTURA EXTRA: payload de telemetria parcial
   ============================================================================ */
console.log('\n  📦 Cobertura parcial (campos opcionais)');

_('telemetria só com bateria_pct ignora o resto', () => {
  const estado = {
    esp_estado: EST.TRABALHANDO, bateria: 100, produto: 100,
    faixa: 5, m2_feitos: 50, dist_solo: 12, dist_obst: 200
  };
  const config = { lim_queda_cm: 25, lim_obst_cm: 30 };
  const hooks = { onQueda: () => {}, onObstaculo: () => {} };
  tratarTelemetria({ bateria_pct: 50 }, estado, config, hooks);
  _eq(estado.bateria, 50);
  _eq(estado.faixa, 5);  // inalterado
});

_('telemetria só com estado atualiza só estado', () => {
  const estado = {
    esp_estado: EST.PARADO, bateria: 100, produto: 100,
    faixa: 0, m2_feitos: 0, dist_solo: 12, dist_obst: 200
  };
  const config = { lim_queda_cm: 25, lim_obst_cm: 30 };
  const hooks = { onQueda: () => {}, onObstaculo: () => {} };
  tratarTelemetria({ estado: 'PAUSADO' }, estado, config, hooks);
  _eq(estado.esp_estado, 'PAUSADO');
  _eq(estado.bateria, 100);
});

/* ============================================================================
   Resultado
   ============================================================================ */
console.log(`\nResultado: ${pass} ✅ | ${fail} ❌`);
process.exit(fail === 0 ? 0 : 1);
