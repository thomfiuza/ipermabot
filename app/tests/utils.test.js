/**
 * Testes das funções puras em utils.js.
 * Para rodar: `node --experimental-vm-modules tests/run.mjs`
 */

import {
  normalizarEstado,
  formatarHMS,
  calcularNumFaixas,
  calcularAreaTotalM2,
  classeTipoEvento,
  horaLocalCurta,
  ipv4Valido
} from '../js/utils.js';

let pass = 0, fail = 0;
const _ = (label, fn) => {
  try { fn(); console.log(`  ✅ ${label}`); pass++; }
  catch (e) { console.error(`  ❌ ${label}\n     ${e.message}`); fail++; }
};
const _eq = (actual, expected, msg = '') => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) throw new Error(`${msg}\n     esperado: ${JSON.stringify(expected)}\n     obtido:   ${JSON.stringify(actual)}`);
};

console.log('\n🧪 test: utils.js');

_('normalizarEstado capitaliza variantes de TRABALHANDO', () => {
  _eq(normalizarEstado('trabalhando'), 'TRABALHANDO');
  _eq(normalizarEstado('EM TRABALHANDO'), 'TRABALHANDO');
  _eq(normalizarEstado(''), 'PARADO');
});

_('formatarHMS formata ms em HH:MM:SS', () => {
  _eq(formatarHMS(0), '00:00:00');
  _eq(formatarHMS(61 * 1000), '00:01:01');
  _eq(formatarHMS(3661 * 1000), '01:01:01');
});

_('calcularNumFaixas divide em faixas de 30cm', () => {
  _eq(calcularNumFaixas(280), 10);
  _eq(calcularNumFaixas(300), 10);
  _eq(calcularNumFaixas(310), 11);
  _eq(calcularNumFaixas(0), 1);
});

_('calcularAreaTotalM2 considera demãos', () => {
  _eq(calcularAreaTotalM2(300, 800, 1), 24);
  _eq(calcularAreaTotalM2(300, 800, 2), 48);
  _eq(calcularAreaTotalM2(500, 500, 1), 25);
});

_('classeTipoEvento mapeia corretamente', () => {
  _eq(classeTipoEvento('info'),    'evento-tipo-info');
  _eq(classeTipoEvento('warn'),    'evento-tipo-warn');
  _eq(classeTipoEvento('erro'),    'evento-tipo-erro');
  _eq(classeTipoEvento('sucesso'), 'evento-tipo-sucesso');
  _eq(classeTipoEvento('desconhecido'), 'evento-tipo-info');
});

_('ipv4Valido aceita apenas IPv4 correto', () => {
  _eq(ipv4Valido('192.168.4.1'), true);
  _eq(ipv4Valido('10.0.0.255'), true);
  _eq(ipv4Valido('256.0.0.1'),  false);
  _eq(ipv4Valido('192.168.4'),   false);
  _eq(ipv4Valido(''),            false);
  _eq(ipv4Valido(null),          false);
});

console.log(`\nResultado: ${pass} ✅ | ${fail} ❌`);
process.exit(fail === 0 ? 0 : 1);
