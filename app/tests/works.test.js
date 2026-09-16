/**
 * Testes do módulo de obras (works.js) — Diferenciais #9, #4 e #7.
 *
 * Para rodar: `node tests/run.mjs` ou `node tests/works.test.js`
 */

import {
  salvarObra, listarObras, deletarObra, resumoObra,
  definirGeofence, obterGeofence, limparGeofence, dentroDoPerimetro,
  gerarRelatorioHTML
} from '../js/works.js';
import { desenharPlantaSVG } from '../js/metrics.js';

let pass = 0, fail = 0;
const _ = (label, fn) => {
  try { fn(); console.log(`  ✅ ${label}`); pass++; }
  catch (e) { console.error(`  ❌ ${label}\n     ${e.message}`); fail++; }
};
const _eq = (actual, expected, msg = '') => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) throw new Error(`${msg}\n     esperado: ${JSON.stringify(expected)}\n     obtido:   ${JSON.stringify(actual)}`);
};
const _has = (str, sub) => {
  if (!str.includes(sub)) throw new Error(`esperado conter "${sub}"\n     obtido: "${String(str).substring(0, 200)}…"`);
};

console.log('\n🧪 test: works.js (Diferenciais #9, #4, #7) + metrics.planta (#1)');

/* Mock localStorage */
class MockStorage {
  constructor() { this.store = {}; }
  getItem(k) { return this.store[k] || null; }
  setItem(k, v) { this.store[k] = v; }
  removeItem(k) { delete this.store[k]; }
  clear() { this.store = {}; }
}
global.localStorage = new MockStorage();
global.window = global.window || { addEventListener: () => {} };

/* ============================================================
   #9 — Histórico multi-obra
   ============================================================ */

_('salvarObra adiciona à lista', () => {
  localStorage.clear();
  const obra = salvarObra('Laje A', { m2_feitos: 30 }, { largura_cm: 300 }, []);
  _eq(obra.nome, 'Laje A');
  _eq(listarObras().length, 1);
});

_('salvarObra gera id único', () => {
  localStorage.clear();
  const o1 = salvarObra('A', { m2_feitos: 1 }, {}, []);
  // Pequeno delay para garantir timestamp diferente
  const o2 = salvarObra('B', { m2_feitos: 2 }, {}, []);
  _eq(o1.id !== o2.id, true, 'ids devem ser diferentes');
  _eq(listarObras().length, 2);
});

_('salvarObra gera nome default se vazio', () => {
  localStorage.clear();
  const o = salvarObra('', {}, {}, []);
  _eq(/Obra \d+/.test(o.nome), true);
});

_('deletarObra remove por id', () => {
  localStorage.clear();
  const o = salvarObra('Teste', {}, {}, []);
  _eq(listarObras().length, 1);
  deletarObra(o.id);
  _eq(listarObras().length, 0);
});

_('deletarObra com id inexistente não explode', () => {
  localStorage.clear();
  salvarObra('X', {}, {}, []);
  deletarObra('nao-existe');
  _eq(listarObras().length, 1);
});

_('múltiplas obras limitadas a 50', () => {
  localStorage.clear();
  for (let i = 0; i < 55; i++) salvarObra('O' + i, {}, {}, []);
  _eq(listarObras().length, 50);
});

_('resumoObra calcula pct corretamente', () => {
  localStorage.clear();
  const obra = {
    id: 'abc',
    nome: 'Cobrinha',
    data: new Date().toISOString(),
    estado: { m2_feitos: 75, m2_total: 150 },
    config: {},
    eventos: [],
    duracaoSegundos: 3600
  };
  const r = resumoObra(obra);
  _eq(r.pct, 50);
  _eq(r.m2_feitos, 75);
});

_('resumoObra retorna 0% se m2_total = 0', () => {
  const obra = {
    id: 'x', nome: 'x', data: new Date().toISOString(),
    estado: { m2_feitos: 5, m2_total: 0 }, config: {}, eventos: [], duracaoSegundos: 0
  };
  _eq(resumoObra(obra).pct, 0);
});

/* ============================================================
   #4 — Geofencing
   ============================================================ */

_('definirGeofence clamp dentro dos limites da obra', () => {
  localStorage.clear();
  const g = definirGeofence({ x0: -50, y0: -10, x1: 9999, y1: 9999 }, { largura_cm: 300, comprimento_cm: 200 });
  _eq(g.x0, 0);
  _eq(g.x1, 300);
  _eq(g.y0, 0);
  _eq(g.y1, 200);
});

_('definirGeofence expande retângulo degenerado', () => {
  localStorage.clear();
  const g = definirGeofence({ x0: 100, y0: 100, x1: 100, y1: 100 }, { largura_cm: 500, comprimento_cm: 500 });
  _eq(g.x1 > g.x0, true);
  _eq(g.y1 > g.y0, true);
});

_('obterGeofence retorna null se não definido', () => {
  localStorage.clear();
  _eq(obterGeofence(), null);
});

_('obterGeofence retorna o último definido', () => {
  localStorage.clear();
  definirGeofence({ x0: 10, y0: 20, x1: 100, y1: 80 }, { largura_cm: 200, comprimento_cm: 200 });
  const g = obterGeofence();
  _eq(g.x0, 10);
  _eq(g.y0, 20);
});

_('limparGeofence remove', () => {
  localStorage.clear();
  definirGeofence({ x0: 0, y0: 0, x1: 100, y1: 100 }, { largura_cm: 100, comprimento_cm: 100 });
  limparGeofence();
  _eq(obterGeofence(), null);
});

_('dentroDoPerimetro: ponto central dentro', () => {
  const geo = { x0: 0, y0: 0, x1: 100, y1: 100 };
  _eq(dentroDoPerimetro({ x: 50, y: 50 }, geo), true);
});

_('dentroDoPerimetro: ponto fora', () => {
  const geo = { x0: 0, y0: 0, x1: 100, y1: 100 };
  _eq(dentroDoPerimetro({ x: 150, y: 50 }, geo), false);
  _eq(dentroDoPerimetro({ x: -10, y: 50 }, geo), false);
  _eq(dentroDoPerimetro({ x: 50, y: 150 }, geo), false);
});

_('dentroDoPerimetro: bordas inclusivas', () => {
  const geo = { x0: 0, y0: 0, x1: 100, y1: 100 };
  _eq(dentroDoPerimetro({ x: 0, y: 0 }, geo), true);
  _eq(dentroDoPerimetro({ x: 100, y: 100 }, geo), true);
});

_('dentroDoPerimetro: sem geo = sempre true', () => {
  _eq(dentroDoPerimetro({ x: 9999, y: 9999 }, null), true);
});

/* ============================================================
   #7 — Relatório PDF
   ============================================================ */

_('gerarRelatorioHTML retorna HTML com DOCTYPE', () => {
  const obra = {
    id: 't1',
    nome: 'Teste',
    data: new Date().toISOString(),
    estado: { m2_feitos: 30, m2_total: 150, bateria: 90, produto: 75 },
    config: { largura_cm: 300, comprimento_cm: 500, num_faixas: 5, lim_obst_cm: 30, lim_queda_cm: 25, demanos: 2 },
    eventos: [],
    duracaoSegundos: 7200
  };
  const html = gerarRelatorioHTML(obra, []);
  _has(html, '<!doctype html>');
  _has(html, 'Relatório de Obra');
  _has(html, 'Teste');
  _has(html, '30.0');
  _has(html, '150.0');
});

_('gerarRelatorioHTML lista eventos', () => {
  const obra = {
    id: 't2', nome: 'X', data: new Date().toISOString(),
    estado: { m2_feitos: 0, m2_total: 100, bateria: 100, produto: 100 },
    config: {}, eventos: [
      { tipo: 'info', titulo: 'Iniciada', desc: 'começou', data: new Date().toISOString() }
    ], duracaoSegundos: 60
  };
  const html = gerarRelatorioHTML(obra, []);
  _has(html, 'Eventos');
  _has(html, 'Iniciada');
});

_('gerarRelatorioHTML inclui histórico de amostras', () => {
  const obra = {
    id: 't3', nome: 'Y', data: new Date().toISOString(),
    estado: { m2_feitos: 5, m2_total: 100, bateria: 80, produto: 90 },
    config: { largura_cm: 100, comprimento_cm: 100, num_faixas: 5, lim_obst_cm: 30, lim_queda_cm: 25, demanos: 1 },
    eventos: [], duracaoSegundos: 0
  };
  const snapshots = [
    { ts: Date.now() - 60_000, m2: 1, bateria: 95, produto: 95, tempo_s: 60, faixa: 0 },
    { ts: Date.now(), m2: 3, bateria: 92, produto: 90, tempo_s: 120, faixa: 1 }
  ];
  const html = gerarRelatorioHTML(obra, snapshots);
  _has(html, '<table>');
  _has(html, '1.0 m²');   // m2 da primeira amostra
});

_('gerarRelatorioHTML escapa HTML em nome da obra (anti-XSS)', () => {
  const obra = {
    id: 'xss', nome: '<script>alert(1)</script>', data: new Date().toISOString(),
    estado: { m2_feitos: 0, m2_total: 0, bateria: 0, produto: 0 },
    config: {}, eventos: [], duracaoSegundos: 0
  };
  const html = gerarRelatorioHTML(obra, []);
  _has(html, '&lt;script&gt;');                       // escapado
  if (/<script>alert\(1\)<\/script>/.test(html)) {
    throw new Error('XSS: HTML não escapado no nome da obra!');
  }
});

_('gerarRelatorioHTML tem botão "Imprimir"', () => {
  const obra = {
    id: 'z', nome: 'Z', data: new Date().toISOString(),
    estado: { m2_feitos: 0, m2_total: 0 }, config: {}, eventos: [], duracaoSegundos: 0
  };
  const html = gerarRelatorioHTML(obra, []);
  _has(html, 'window.print()');
});

/* ============================================================
   #1 — Planta visual
   ============================================================ */

_('desenharPlantaSVG gera retângulos para cada faixa', () => {
  const svg = desenharPlantaSVG(
    { faixa: 2, m2_feitos: 30, esp_estado: 'TRABALHANDO' },
    { largura_cm: 300, comprimento_cm: 500, num_faixas: 5 }
  );
  const rects = (svg.match(/<rect /g) || []).length;
  // 5 faixas + 1 borda = 6
  _eq(rects, 6);
});

_('desenharPlantaSVG mostra círculo do robô se trabalhando', () => {
  const svg = desenharPlantaSVG(
    { faixa: 1, m2_feitos: 5, esp_estado: 'TRABALHANDO' },
    { num_faixas: 3 }
  );
  _has(svg, '<circle');
});

_('desenharPlantaSVG SEM robô se parado', () => {
  const svg = desenharPlantaSVG(
    { faixa: 1, m2_feitos: 5, esp_estado: 'PARADO' },
    { num_faixas: 3 }
  );
  if (svg.includes('<circle')) throw new Error('não deveria ter circle');
});

_('desenharPlantaSVG: faixas concluídas em verde', () => {
  const svg = desenharPlantaSVG(
    { faixa: 3, m2_feitos: 30, esp_estado: 'PARADO' },
    { num_faixas: 5 }
  );
  // 3 faixas concluídas devem estar com fill verde
  const verdes = (svg.match(/fill="#2E7D32"/g) || []).length;
  _eq(verdes, 3);
});

_('desenharPlantaSVG: faixa atual em amarelo', () => {
  const svg = desenharPlantaSVG(
    { faixa: 2, m2_feitos: 10, esp_estado: 'TRABALHANDO' },
    { num_faixas: 5 }
  );
  _has(svg, 'fill="#F9A825"');
});

_('desenharPlantaSVG: 1 faixa no mínimo mesmo se num=0', () => {
  const svg = desenharPlantaSVG(
    { faixa: 0, m2_feitos: 0, esp_estado: 'PARADO' },
    { num_faixas: 0 }
  );
  _has(svg, '<rect');
});

_('desenharPlantaSVG não quebra com obras vazias', () => {
  const svg = desenharPlantaSVG({}, {});
  _has(svg, '<rect');
});

console.log(`\nResultado: ${pass} ✅ | ${fail} ❌`);
process.exit(fail === 0 ? 0 : 1);
