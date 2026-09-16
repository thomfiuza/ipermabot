/**
 * produtos.js — Diferencial #8: Catálogo de produtos + cálculo de demãos sugerido.
 *
 * Dados de ficha técnica das principais marcas brasileiras de impermeabilizante.
 * Lista cotejada com Sika, Denver, Vedacit, Otto Baumgart, Viapol, Baumgart.
 *
 * Cada produto declara:
 *  - rendimento_m2_por_L: cobertura prática por litro (1 demão)
 *  - demaos_recomendado: típico para laje exposta
 *  - tempo_secagem_horas: intervalo entre demãos
 *  - densidade_kg_L: usada em estimativas de peso
 *
 * Para sugestão de demãos por laje, considera:
 *  - tipo da laje (exposta, enterrada, sob telhado, piscina)
 *  - área total
 *  - produto selecionado
 *
 * @module produtos
 */

export const CATALOGO = [
  // ===== SIKA =====
  {
    id: 'sikatop-100',
    marca: 'Sika',
    nome: 'SikaTop® 100',
    tipo: 'cimenticio',
    densidade_kg_L: 1.0,
    rendimento_m2_por_L: 1.0,             // 1kg/m² por demão (kit A+B)
    demaos_recomendado: 3,
    intervalo_entre_demaos_horas: 6,
    usos: ['laje_exposta', 'umidade_ascendente'],
    cor: 'Branco / Cinza',
    prazo_validade_meses: 9,
    nota: 'Mais usado em lajes com cura úmida.'
  },
  {
    id: 'sika-mono-622',
    marca: 'Sika',
    nome: 'Sika® MonoTop 622',
    tipo: 'cimenticio',
    densidade_kg_L: 1.9,
    rendimento_m2_por_L: 1.9,
    demaos_recomendado: 3,
    intervalo_entre_demaos_horas: 4,
    usos: ['laje_exposta', 'enterrado'],
    cor: 'Cinza',
    prazo_validade_meses: 9,
    nota: 'Aditivado com polímero, ótima aderência.'
  },
  // ===== VEDACIT =====
  {
    id: 'vedacit-neutrol-aquoso',
    marca: 'Vedacit',
    nome: 'Neutrol à base d\'água',
    tipo: 'asfalto_emulsionado',
    densidade_kg_L: 1.0,
    rendimento_m2_por_L: 1.0,
    demaos_recomendado: 3,
    intervalo_entre_demaos_horas: 4,
    usos: ['laje_exposta', 'telhado', 'umidade_ascendente'],
    cor: 'Marrom',
    prazo_validade_meses: 24,
    nota: 'Asfáltico. Pode ser pintado depois.'
  },
  {
    id: 'vedacit-manta-liquida',
    marca: 'Vedacit',
    nome: 'Manta Líquida Premium',
    tipo: 'poliuretano',
    densidade_kg_L: 1.05,
    rendimento_m2_por_L: 2.8,
    demaos_recomendado: 2,
    intervalo_entre_demaos_horas: 12,
    usos: ['laje_exposta'],
    cor: 'Branco / Cinza',
    prazo_validade_meses: 18,
    nota: 'Forma membrana flexível, cura longa.'
  },
  // ===== DENVER =====
  {
    id: 'denver-top-flex',
    marca: 'Denver',
    nome: 'Denver Top Flex',
    tipo: 'poliuretano',
    densidade_kg_L: 1.20,
    rendimento_m2_por_L: 2.5,
    demaos_recomendado: 2,
    intervalo_entre_demaos_horas: 12,
    usos: ['laje_exposta', 'telhado'],
    cor: 'Cinza',
    prazo_validade_meses: 12,
    nota: 'Acompanha dilatação de fissuras.'
  },
  {
    id: 'denver-denvertec-100',
    marca: 'Denver',
    nome: 'Denvertec 100',
    tipo: 'cimenticio',
    densidade_kg_L: 1.8,
    rendimento_m2_por_L: 1.8,
    demaos_recomendado: 3,
    intervalo_entre_demaos_horas: 4,
    usos: ['laje_exposta', 'enterrado'],
    cor: 'Cinza',
    prazo_validade_meses: 12,
    nota: 'Bicomp. Pronto para uso.'
  },
  // ===== OTTO BAUMGART =====
  {
    id: 'otto-hidroplus',
    marca: 'Otto Baumgart',
    nome: 'Hidroplus Acrílico',
    tipo: 'acrilico',
    densidade_kg_L: 1.20,
    rendimento_m2_por_L: 2.0,
    demaos_recomendado: 3,
    intervalo_entre_demaos_horas: 3,
    usos: ['laje_exposta', 'fachada'],
    cor: 'Branco / colorido',
    prazo_validade_meses: 24,
    nota: 'Resistente a UV. Bom para fachadas.'
  },
  // ===== GENERICO FALLBACK =====
  {
    id: 'generico-poliuretano-2k',
    marca: 'Mercado',
    nome: 'Poliuretano 2K bicomponente',
    tipo: 'poliuretano',
    densidade_kg_L: 1.05,
    rendimento_m2_por_L: 3.5,
    demaos_recomendado: 2,
    intervalo_entre_demaos_horas: 6,
    usos: ['laje_exposta', 'piscina', 'enterrado'],
    cor: 'Cinza',
    prazo_validade_meses: 12,
    nota: 'Maior cobertura, maior vida útil (até 35 anos).'
  }
];

export const TIPOS_LAJE = [
  { id: 'laje_exposta',        nome: 'Laje exposta (sem cobertura)' },
  { id: 'telhado',             nome: 'Sob telhado / cobertura' },
  { id: 'enterrado',           nome: 'Parede enterrada / subsolo' },
  { id: 'umidade_ascendente',  nome: 'Umidade ascendente (muro/parede)' },
  { id: 'piscina',             nome: 'Piscina / reservatório' },
  { id: 'fachada',             nome: 'Fachada' }
];

/**
 * Filtra produtos compatíveis com o tipo de laje selecionado.
 */
export function produtosCompativeis(tipoLaje) {
  return CATALOGO.filter(p => p.usos.includes(tipoLaje));
}

/**
 * Calcula a sugestão de demãos com base em regras de mercado.
 * A regra: produtos mais densos e com mais sólidos exigem mais demãos.
 * Lajes expostas geralmente pedem 1 demão extra por cura/UV.
 *
 * @param {string} produtoId  do catálogo
 * @param {string} tipoLaje   id do tipo
 * @param {number} area_m2    área em m²
 * @returns {Object} {demãos, intervalo_horas, litros_total, kg_total, motivo}
 */
export function calcularDemaos(produtoId, tipoLaje, area_m2) {
  const p = CATALOGO.find(x => x.id === produtoId);
  if (!p) return { demaos: 3, motivo: 'Produto desconhecido, padrão de mercado' };

  let demaos = p.demaos_recomendado;
  const motivos = [`ficha técnica do ${p.marca} ${p.nome}`];

  // Ajuste por tipo de laje
  if (tipoLaje === 'laje_exposta' && p.tipo !== 'poliuretano') {
    demaos += 1;
    motivos.push('laje exposta exige demão extra de proteção UV');
  }
  if (tipoLaje === 'umidade_ascendente' && p.tipo === 'cimenticio') {
    demaos += 1;
    motivos.push('umidade ascendente precisa camada mais grossa');
  }
  if (tipoLaje === 'piscina' && p.tipo !== 'poliuretano') {
    demaos = Math.max(demaos, 4);
    motivos.push('reservatório de água requer no mínimo 4 demãos');
  }

  // Cálculo de consumo
  const litros_por_demao = area_m2 / p.rendimento_m2_por_L;
  const litros_total = litros_por_demao * demaos;
  const kg_total = litros_total * p.densidade_kg_L;

  // Arredonda para cima o número de demãos
  demaos = Math.max(1, Math.min(6, Math.round(demaos)));

  return {
    demaos,
    intervalo_horas: p.intervalo_entre_demaos_horas,
    litros_total: Math.ceil(litros_total),
    kg_total: Math.ceil(kg_total),
    cobertura_m2_por_L: p.rendimento_m2_por_L,
    tipo: p.tipo,
    cor: p.cor,
    marca: p.marca,
    nome: p.nome,
    prazo_validade_meses: p.prazo_validade_meses,
    motivo: motivos.join('; ') + '.'
  };
}

/**
 * Diferencial #5 — Detecção de produto esgotado por delta m² vs. consumo esperado.
 *
 * Dado o histórico (snapshots com m² e %produto), verifica se o consumo
 * REAL está muito ACIMA do ESPERADO. Se sim, três causas prováveis:
 *  1. Produto fora de validade → troca necessária
 *  2. Substrato muito absorvente → demãos extra
 *  3. Bico da válvula desregulado → gotejo extra (físico)
 *
 * @param {Array<{ts,m2,bateria,produto,tempo_s,faixa}>} snapshots
 * @param {Object} produto (catálogo)
 * @returns {Object} {nivel: 'ok'|'warn'|'critico', motivo, economia, desvio}
 */
export function detectarEsgotamento(snapshots, produto) {
  if (!produto || snapshots.length < 3) {
    return { nivel: 'ok', motivo: 'Histórico insuficiente' };
  }
  // Calcula rendimento real médio (m²/%produto consumido)
  let m2_total = 0;
  let produto_consumido_pct = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const a = snapshots[i - 1];
    const b = snapshots[i];
    if (a.produto > b.produto && b.m2 > a.m2) {
      m2_total += (b.m2 - a.m2);
      produto_consumido_pct += (a.produto - b.produto);
    }
  }
  if (produto_consumido_pct <= 0) {
    return { nivel: 'ok', motivo: 'Sem consumo registrado ainda' };
  }
  const rendimento_real = m2_total / produto_consumido_pct;   // m² por 1%
  const rendimento_esperado = produto.rendimento_m2_por_L;     // m² por 1L
  // Para comparar, normalizamos: convertemos o esperado em m²/% assumindo
  // galão de 18L (~o mais comum) com produto 100% cheio → 100% = 18L
  // uma redução de 1% no galão = 0.18L → rendimento esperado_por_pct = esperado × 0.18
  const galao_L = 18;
  const esperado_m2_por_pct = rendimento_esperado * galao_L * 0.01;

  // Desvio POSITIVO = produto rendeu MENOS que o esperado (esgotamento precoce).
  // Desvio NEGATIVO = produto rendeu MAIS (não há problema).
  const desvio = ((esperado_m2_por_pct - rendimento_real) / esperado_m2_por_pct) * 100;

  let nivel = 'ok';
  let motivo = null;
  if (desvio > 50) {
    nivel = 'critico';
    motivo = `Consumo ${desvio.toFixed(0)}% acima do esperado. Provável causa: produto vencido, bico entupido ou substrato muito absorvente.`;
  } else if (desvio > 20) {
    nivel = 'warn';
    motivo = `Consumo ${desvio.toFixed(0)}% acima do esperado. Verifique se o produto está dentro da validade.`;
  }
  // Rendendo mais que o esperado: não é problema, é bônus. Nivel ok.

  return {
    nivel,
    motivo,
    rendimento_real_m2_por_pct: rendimento_real,
    rendimento_esperado_m2_por_pct: esperado_m2_por_pct,
    desvio_pct: desvio
  };
}

/** Helper */
export function produtoById(id) {
  return CATALOGO.find(p => p.id === id);
}
