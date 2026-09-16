/**
 * Testes do módulo de gráficos SVG (charts.js).
 *
 * Estratégia: mockamos o DOM mínimo (apenas getElementById retornando um
 * SVG com setAttribute e innerHTML). Para testes integrais reais, usar
 * jsdom opcionalmente.
 *
 * Para rodar: `node tests/run.mjs` ou `node tests/charts.test.js`
 */

import { graficoLinha, graficoRosca, graficoBarras } from '../js/charts.js';

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
const _missing = (str, sub) => {
  if (str.includes(sub)) throw new Error(`NÃO deveria conter "${sub}"`);
};

console.log('\n🧪 test: charts.js (com mock DOM)');

/* ============================================================================
   Mock mínimo de SVG DOM
   ============================================================================ */

class MockSVG {
  constructor() {
    this.innerHTML = '';
    this.attributes = {};
    this.setAttribute_calls = [];
  }
  setAttribute(name, value) {
    this.attributes[name] = value;
    this.setAttribute_calls.push({ name, value });
  }
  getAttribute(name) {
    return this.attributes[name];
  }
}

const mockDoc = {
  elements: {},
  getElementById(id) {
    if (id === 'nao-existe') return null;
    if (!this.elements[id]) this.elements[id] = new MockSVG();
    return this.elements[id];
  },
  reset() { this.elements = {}; }
};

global.document = mockDoc;

/* ============================================================================
   TESTES
   ============================================================================ */

_('graficoLinha escapa XML no título', () => {
  mockDoc.reset();
  graficoLinha({
    id: 'test',
    values: [10, 20, 30],
    labels: ['10:00', '10:01', '10:02'],
    titulo: '<b>Foo & Bar</b>',
    unidade: '%'
  });
  _has(mockDoc.elements.test.innerHTML, '&lt;b&gt;Foo &amp; Bar&lt;/b&gt;');
  _missing(mockDoc.elements.test.innerHTML, '<b>Foo');
});

_('graficoLinha retorna SVG com polyline para dados', () => {
  mockDoc.reset();
  const result = graficoLinha({
    id: 'graf',
    values: [10, 20, 15, 25],
    labels: ['a', 'b', 'c', 'd']
  });
  _eq(result !== null, true);
  _has(mockDoc.elements.graf.innerHTML, '<polyline');
  _has(mockDoc.elements.graf.innerHTML, 'fill="none"');
});

_('graficoLinha retorna null se SVG não existe no DOM', () => {
  mockDoc.reset();
  const r = graficoLinha({ id: 'nao-existe', values: [1, 2], labels: ['a', 'b'] });
  _eq(r, null);
});

_('graficoLinha com array vazio mostra placeholder', () => {
  mockDoc.reset();
  graficoLinha({ id: 'vazio', values: [], labels: [], titulo: '' });
  _has(mockDoc.elements.vazio.innerHTML, 'aguardando dados');
});

_('graficoLinha aplica atributos de acessibilidade', () => {
  mockDoc.reset();
  graficoLinha({
    id: 'a11y',
    values: [10],
    labels: ['x'],
    titulo: 'Bateria'
  });
  const calls = mockDoc.elements.a11y.setAttribute_calls;
  const roleCall = calls.find(c => c.name === 'role');
  const ariaCall = calls.find(c => c.name === 'aria-label');
  _eq(roleCall?.value, 'img');
  _eq(ariaCall?.value, 'Bateria');
});

_('graficoLinha renderiza pontos com tooltip', () => {
  mockDoc.reset();
  graficoLinha({
    id: 'pts',
    values: [50, 60],
    labels: ['10:00', '10:01']
  });
  _has(mockDoc.elements.pts.innerHTML, '<title>');
  _has(mockDoc.elements.pts.innerHTML, '10:00: 50');
  _has(mockDoc.elements.pts.innerHTML, '<circle');
});

_('graficoRosca gera círculo e path', () => {
  mockDoc.reset();
  const result = graficoRosca('rosca', 75, 100, '#2E7D32', 'concluído');
  _eq(result !== null, true);
  _has(mockDoc.elements.rosca.innerHTML, '<circle');
  _has(mockDoc.elements.rosca.innerHTML, '<path');
  _has(mockDoc.elements.rosca.innerHTML, '75%');
  _has(mockDoc.elements.rosca.innerHTML, 'concluído');
});

_('graficoRosca com 0% não desenha path', () => {
  mockDoc.reset();
  graficoRosca('zero', 0, 100, '#1F4E79', 'vazio');
  _eq(mockDoc.elements.zero.innerHTML.includes('<path'), false);
  _has(mockDoc.elements.zero.innerHTML, '0%');
});

_('graficoRosca com 100% desenha anel completo', () => {
  mockDoc.reset();
  graficoRosca('full', 100, 100, '#2E7D32', 'total');
  _has(mockDoc.elements.full.innerHTML, '<path');
  _has(mockDoc.elements.full.innerHTML, '100%');
});

_('graficoRosca clamp valores acima de 100%', () => {
  mockDoc.reset();
  graficoRosca('over', 150, 100, '#1F4E79', 'overload');
  _has(mockDoc.elements.over.innerHTML, '<path');
  _has(mockDoc.elements.over.innerHTML, '100%');  // deve clamp em 100%
});

_('graficoBarras gera retângulos para cada barra', () => {
  mockDoc.reset();
  const result = graficoBarras('bars', [2, 5, 3, 7, 4], '#1565C0', 10);
  _eq(result !== null, true);
  const rects = (mockDoc.elements.bars.innerHTML.match(/<rect /g) || []).length;
  _eq(rects, 5);
  _has(mockDoc.elements.bars.innerHTML, 'fill="#1565C0"');
});

_('graficoBarras com valores zerados desenha sem altura negativa', () => {
  mockDoc.reset();
  graficoBarras('zero', [0, 0, 0], '#000');
  const rects = (mockDoc.elements.zero.innerHTML.match(/<rect /g) || []).length;
  _eq(rects, 3);
});

_('Graficamente renderiza corretamente com caracteres pt-BR', () => {
  mockDoc.reset();
  graficoLinha({
    id: 'pt',
    values: [10, 20],
    labels: ['ção', 'não'],
    titulo: 'Métricas Importante'
  });
  _has(mockDoc.elements.pt.innerHTML, 'Métricas Importante');
  _has(mockDoc.elements.pt.innerHTML, 'ção');
  _has(mockDoc.elements.pt.innerHTML, 'não');
});

console.log(`\nResultado: ${pass} ✅ | ${fail} ❌`);
process.exit(fail === 0 ? 0 : 1);
