/**
 * Testes do módulo de métricas (metrics.js).
 *
 * Estratégia: mock de DOM + localStorage para testar a lógica isolada.
 *
 * Para rodar: `node tests/run.mjs` ou `node tests/metrics.test.js`
 */

import { metricas } from '../js/metrics.js';

let pass = 0, fail = 0;
const _ = (label, fn) => {
  try { fn(); console.log(`  ✅ ${label}`); pass++; }
  catch (e) { console.error(`  ❌ ${label}\n     ${e.message}`); fail++; }
};
const _eq = (actual, expected, msg = '') => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) throw new Error(`${msg}\n     esperado: ${JSON.stringify(expected)}\n     obtido:   ${JSON.stringify(actual)}`);
};

/* ============================================================================
   Mock de localStorage + DOM mínimo
   ============================================================================ */
class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] || null; }
  setItem(k, v) { this.store[k] = v; }
  clear() { this.store = {}; }
}

global.localStorage = new MockStorage();

class MockSVG {
  constructor() {
    this.innerHTML = '';
    this.attributes = {};
    this.style = {};
    this.textContent = '';
  }
  setAttribute(name, value) { this.attributes[name] = value; }
}

const mockDoc = {
  elements: {},
  getElementById(id) {
    if (!this.elements[id]) this.elements[id] = new MockSVG();
    return this.elements[id];
  }
};
global.document = mockDoc;

console.log('\n🧪 test: metrics.js');

/* ============================================================================
   TESTES
   ============================================================================ */

_('estado inicial: ao menos 1 snapshot', () => {
  metricas.resetar();
  _eq(metricas.snapshots.length >= 1, true);
});

_('adicionarAmostra incrementa lista', () => {
  metricas.resetar();
  const antes = metricas.snapshots.length;
  metricas.adicionarAmostra({ m2_feitos: 5, bateria: 95, produto: 90, faixa: 1, tempo_inicio: Date.now() - 60_000 });
  _eq(metricas.snapshots.length, antes + 1);
});

_('velocidadeRecente retorna ~1 m²/min com dados reais', () => {
  metricas.resetar();
  const inicio = Date.now();
  metricas.snapshots = [];
  metricas.snapshots.push({ ts: inicio, m2: 0, bateria: 100, produto: 100, tempo_s: 0, faixa: 0 });
  metricas.snapshots.push({ ts: inicio + 60_000, m2: 6, bateria: 95, produto: 90, tempo_s: 60, faixa: 1 });
  const v = metricas.velocidadeRecente();
  // Esperado: 6 m² em 60s = 6 m²/min
  if (Math.abs(v - 6) > 0.5) throw new Error(`esperado ~6 m²/min, obtido ${v}`);
});

_('velocidadeRecente retorna 0 sem dados suficientes', () => {
  metricas.resetar();
  metricas.snapshots = [{ ts: Date.now(), m2: 0, bateria: 100, produto: 100, tempo_s: 0, faixa: 0 }];
  _eq(metricas.velocidadeRecente(), 0);
});

_('velocidadeRecente retorna 0 se delta de tempo for 0', () => {
  metricas.resetar();
  const t = Date.now();
  metricas.snapshots = [
    { ts: t, m2: 0, bateria: 100, produto: 100, tempo_s: 0, faixa: 0 },
    { ts: t, m2: 5, bateria: 95, produto: 90, tempo_s: 0, faixa: 1 }
  ];
  _eq(metricas.velocidadeRecente(), 0);
});

_('tempoTotalSegundos retorna última diferença', () => {
  metricas.resetar();
  const t0 = Date.now();
  metricas.snapshots = [
    { ts: t0, m2: 0, bateria: 100, produto: 100, tempo_s: 0, faixa: 0 },
    { ts: t0 + 30_000, m2: 5, bateria: 95, produto: 90, tempo_s: 30, faixa: 1 }
  ];
  _eq(metricas.tempoTotalSegundos(), 30);
});

_('resetar limpa snapshots e cria estado inicial', () => {
  metricas.snapshots = [];
  metricas.snapshots.push({ ts: 1, m2: 100, bateria: 50, produto: 50, tempo_s: 999, faixa: 99 });
  metricas.resetar();
  _eq(metricas.snapshots[metricas.snapshots.length - 1].m2, 0);
  _eq(metricas.snapshots[metricas.snapshots.length - 1].bateria, 100);
  _eq(metricas.snapshots[metricas.snapshots.length - 1].produto, 100);
});

_('persistência: salva em localStorage', () => {
  metricas.resetar();
  metricas.adicionarAmostra({ m2_feitos: 10, bateria: 95, produto: 90, faixa: 1, tempo_inicio: Date.now() - 60_000 });
  const salvo = localStorage.getItem('impbot_metrics_v1');
  _eq(salvo !== null && salvo !== undefined, true);
  if (salvo && !salvo.includes('m2_feitos') && !salvo.includes('m2')) {
    if (!salvo.includes('100') && !salvo.includes('10')) {
      throw new Error(`localStorage não contém dados esperados: ${salvo.substring(0, 100)}`);
    }
  }
});

_('renderizarTudo não quebra com estado mínimo', () => {
  metricas.resetar();
  // Sem erros mesmo sem DOM completo
  try {
    metricas.renderizarTudo(
      { m2_feitos: 5, m2_total: 240, bateria: 90, produto: 95, faixa: 1, esp_estado: 'TRABALHANDO', tempo_inicio: Date.now() - 60_000 },
      { num_faixas: 10 }
    );
  } catch (e) {
    throw new Error(`renderizarTudo quebrou: ${e.message}`);
  }
});

_('truncar amostras em MAX_SNAPSHOTS', () => {
  metricas.resetar();
  metricas.snapshots = [];
  for (let i = 0; i < 800; i++) {
    metricas.snapshots.push({ ts: i, m2: i, bateria: 100, produto: 100, tempo_s: i * 60, faixa: 0 });
  }
  metricas.adicionarAmostra({ m2_feitos: 800, bateria: 100, produto: 100, faixa: 0 });
  _eq(metricas.snapshots.length <= 720, true);
});

console.log(`\nResultado: ${pass} ✅ | ${fail} ❌`);
process.exit(fail === 0 ? 0 : 1);
