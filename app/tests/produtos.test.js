/**
 * Testes do módulo produtos (Diferenciais #5 + #8).
 *
 * Para rodar: `node tests/run.mjs` ou `node tests/produtos.test.js`
 */

import {
  CATALOGO,
  TIPOS_LAJE,
  produtosCompativeis,
  calcularDemaos,
  produtoById,
  detectarEsgotamento
} from '../js/produtos.js';

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
  if (!String(str).includes(sub)) throw new Error(`esperado conter "${sub}"`);
};

console.log('\n🧪 test: produtos.js (Diferenciais #5 e #8)');

/* ============================================================================
   CATÁLOGO
   ============================================================================ */

_('CATALOGO tem ao menos 5 produtos', () => {
  _eq(CATALOGO.length >= 5, true);
});

_('Sika SikaTop 100 está no catálogo', () => {
  const p = produtoById('sikatop-100');
  if (!p) throw new Error('sikatop-100 não achado');
  _eq(p.marca, 'Sika');
  _has(p.nome, 'SikaTop');
});

_('cada produto tem campos obrigatórios', () => {
  CATALOGO.forEach(p => {
    for (const k of ['id', 'marca', 'nome', 'tipo', 'rendimento_m2_por_L', 'demaos_recomendado', 'intervalo_entre_demaos_horas']) {
      if (p[k] === undefined) throw new Error(`${p.id || '?'} sem campo "${k}"`);
    }
  });
});

_('ids únicos no catálogo', () => {
  const set = new Set();
  for (const p of CATALOGO) {
    if (set.has(p.id)) throw new Error(`ID duplicado: ${p.id}`);
    set.add(p.id);
  }
});

_('todos os produtos têm ao menos um uso', () => {
  for (const p of CATALOGO) {
    if (!p.usos || p.usos.length === 0) throw new Error(`${p.id} sem usos`);
  }
});

/* ============================================================================
   TIPOS DE LAJE
   ============================================================================ */

_('TIPOS_LAJE tem 6 tipos', () => {
  _eq(TIPOS_LAJE.length, 6);
});

_('produtosCompativeis(laje_exposta) tem ao menos 3', () => {
  const ps = produtosCompativeis('laje_exposta');
  _eq(ps.length >= 3, true);
});

_('produtosCompativeis(piscina) só inclui poliuretano', () => {
  const ps = produtosCompativeis('piscina');
  for (const p of ps) {
    if (p.tipo !== 'poliuretano') throw new Error(`${p.id} não é poliuretano mas apto a piscina`);
  }
});

_('produtosCompativeis(inválido) retorna vazio', () => {
  const ps = produtosCompativeis('inexistente');
  _eq(ps.length, 0);
});

/* ============================================================================
   CALCULAR DEMAOS (#8)
   ============================================================================ */

_('calcularDemaos: poliuretano + laje_exposta = sugerido', () => {
  const r = calcularDemaos('denver-top-flex', 'laje_exposta', 50);
  // poliuretano não exige demão extra
  _eq(r.demaos, 2, 'demãos da ficha técnica');
  _has(r.motivo, 'Denver Top Flex');
});

_('calcularDemaos: cimenticio + laje_exposta = +1 demão', () => {
  const r = calcularDemaos('sikatop-100', 'laje_exposta', 30);
  _eq(r.demaos, 4, '3 base + 1 UV');
});

_('calcularDemaos: cimenticio + piscina = 4 demãos mínimo', () => {
  const r = calcularDemaos('sikatop-100', 'piscina', 20);
  _eq(r.demaos, 4);
});

_('calcularDemaos: calcula litros e kg totais', () => {
  const r = calcularDemaos('sikatop-100', 'laje_exposta', 100);
  // 100 m² / 1 m²/L * 4 demãos = 400 L * 1 kg/L = 400 kg
  _eq(r.litros_total, 400);
  _eq(r.kg_total, 400);
});

_('calcularDemaos: produto desconhecido usa padrão 3', () => {
  const r = calcularDemaos('nao-existe', 'laje_exposta', 30);
  _eq(r.demaos, 3);
  _has(r.motivo, 'desconhecido');
});

_('calcularDemaos: máximo 6 demãos (cap defensivo)', () => {
  const r = calcularDemaos('sikatop-100', 'piscina', 50);
  _eq(r.demaos <= 6, true);
});

_('calcularDemaos: mínimo 1 demão', () => {
  const r = calcularDemaos('generico-poliuretano-2k', 'telhado', 1);
  _eq(r.demaos >= 1, true);
});

/* ============================================================================
   DETECTAR ESGOTAMENTO (#5)
   ============================================================================ */

_('detectarEsgotamento: snapshots vazios = ok', () => {
  const r = detectarEsgotamento([], { rendimento_m2_por_L: 1, densidade_kg_L: 1 });
  _eq(r.nivel, 'ok');
});

_('detectarEsgotamento: poucas amostras = ok', () => {
  const snaps = [
    { ts: 1, m2: 0, produto: 100 },
    { ts: 2, m2: 1, produto: 99 }
  ];
  const r = detectarEsgotamento(snaps, { rendimento_m2_por_L: 1, densidade_kg_L: 1 });
  _eq(r.nivel, 'ok');
});

_('detectarEsgotamento: consumo dentro do esperado = ok', () => {
  // Galão 18L, 1 m²/L → esperado 0.18 m²/% (consumindo 1% faz 0.18 m²)
  const snaps = [
    { ts: 1, m2: 0,    produto: 100 },
    { ts: 2, m2: 1.8,  produto: 90  },
    { ts: 3, m2: 3.6,  produto: 80  },
    { ts: 4, m2: 5.4,  produto: 70  }
  ];
  const r = detectarEsgotamento(snaps, { rendimento_m2_por_L: 1, densidade_kg_L: 1 });
  _eq(r.nivel, 'ok', `esperado ok, recebeu ${r.nivel}`);
});

_('detectarEsgotamento: rendimento 30% abaixo = warn', () => {
  // Rendimento ~0.13 m²/% (esperado 0,18 m²/% — desvio ~30% acima do consumo esperado)
  const snaps = [
    { ts: 1, m2: 0,    produto: 100 },
    { ts: 2, m2: 1.3,  produto: 90  },
    { ts: 3, m2: 2.6,  produto: 80  }
  ];
  const r = detectarEsgotamento(snaps, { rendimento_m2_por_L: 1, densidade_kg_L: 1 });
  if (r.nivel !== 'warn') {
    throw new Error('esperado warn, recebeu ' + r.nivel + ' (desvio ' + r.desvio_pct + ')');
  }
});
_('detectarEsgotamento: rendimento 70% abaixo = critico', () => {
  // Em vez de consumir 1.8m²/% (esperado), consome 0.6m²/% — 70% abaixo
  const snaps = [
    { ts: 1, m2: 0,    produto: 100 },
    { ts: 2, m2: 0.6,  produto: 90  },
    { ts: 3, m2: 1.2,  produto: 80  }
  ];
  const r = detectarEsgotamento(snaps, { rendimento_m2_por_L: 1, densidade_kg_L: 1 });
  _eq(r.nivel, 'critico');
  _has(r.motivo, 'vencido');
});

_('detectarEsgotamento: produto null = ok sem crash', () => {
  const snaps = [
    { ts: 1, m2: 0, produto: 100 },
    { ts: 2, m2: 1, produto: 90 },
    { ts: 3, m2: 2, produto: 80 }
  ];
  const r = detectarEsgotamento(snaps, null);
  _eq(r.nivel, 'ok');
});

_('detectarEsgotamento: produto undefined (sem produto selecionado)', () => {
  const snaps = [
    { ts: 1, m2: 0, produto: 100 },
    { ts: 2, m2: 1, produto: 90 },
    { ts: 3, m2: 2, produto: 80 }
  ];
  const r = detectarEsgotamento(snaps, undefined);
  _eq(r.nivel, 'ok');
});

_('detectarEsgotamento: histórico com produto não diminuindo', () => {
  // Caso patológico onde o sensor travou em 100
  const snaps = [
    { ts: 1, m2: 0,   produto: 100 },
    { ts: 2, m2: 5,   produto: 100 },
    { ts: 3, m2: 10,  produto: 100 },
    { ts: 4, m2: 15,  produto: 100 }
  ];
  const r = detectarEsgotamento(snaps, { rendimento_m2_por_L: 1, densidade_kg_L: 1 });
  _eq(r.nivel, 'ok');   // sem consumo medido → sem diagnóstico
});

/* ============================================================================
   produtoById
   ============================================================================ */

_('produtoById retorna produto', () => {
  const p = produtoById('sikatop-100');
  _eq(p.id, 'sikatop-100');
});

_('produtoById(id inválido) retorna undefined', () => {
  const p = produtoById('nao-existe');
  _eq(p, undefined);
});

console.log(`\nResultado: ${pass} ✅ | ${fail} ❌`);
process.exit(fail === 0 ? 0 : 1);
