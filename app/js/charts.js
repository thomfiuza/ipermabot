/**
 * charts.js — Gráficos SVG nativos (sem deps externas, zero network).
 *
 * Princípios:
 * - SVG inline (não <canvas>): melhor acessibilidade, melhor integração com CSS.
 * - Animações mínimas: usa transições CSS em vez de JS.
 * - Acessibilidade: cada ponto tem <title> (tooltip nativo do navegador).
 * - Funciona 100% offline.
 * - Zero deps.
 *
 * @module charts
 */

/**
 * Gráfico de linha simples (série única).
 *
 * @param {Object} config
 * @param {string} config.id        — ID do SVG a ser criado/reescrito
 * @param {string[]} config.labels  — rótulos do eixo X (timestamps, faixas, etc.)
 * @param {number[]} config.values  — valores do eixo Y
 * @param {string} config.cor       — cor da linha em CSS (hex, rgb, nome)
 * @param {number} config.maxY      — (opcional) máximo do eixo Y (auto se omitido)
 * @param {number} config.minY      — (opcional) mínimo do eixo Y (auto se omitido)
 * @param {string} config.unidade   — texto exibido no tooltip (ex: '%', 'cm')
 * @param {string} config.titulo    — (opcional) título exibido no SVG
 *
 * @returns {SVGSVGElement|null}
 */
export function graficoLinha(config) {
  const {
    id, labels = [], values = [], cor = '#1F4E79',
    maxY, minY: minYR, unidade = '', titulo = ''
  } = config;

  const svg = document.getElementById(id);
  if (!svg) return null;

  // Dimensões
  const W = 360, H = 180;
  const PADDING_L = 36, PADDING_R = 14, PADDING_T = titulo ? 24 : 8, PADDING_B = 28;
  const plotW = W - PADDING_L - PADDING_R;
  const plotH = H - PADDING_T - PADDING_B;

  // Limites do Y
  const minY = (minYR !== undefined) ? minYR : Math.min(...values, 0) * 0.95;
  const max = (maxY !== undefined) ? maxY : Math.max(...values, 100) * 1.05;
  const range = max - minY || 1;

  // Mapeia índice → coordenada X (clamp para length=1)
  const xStep = values.length > 1 ? plotW / (values.length - 1) : 0;
  const toX = (i) => PADDING_L + i * xStep;
  const toY = (v) => PADDING_T + plotH - ((v - minY) / range) * plotH;

  // Polylinha (pontos conectados)
  const pts = values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

  // Grid Y: 4 linhas
  const yTicks = [];
  for (let i = 0; i <= 4; i++) {
    const valorY = minY + (range * i / 4);
    const yPos = toY(valorY);
    yTicks.push({ y: yPos, valor: valorY.toFixed(0) });
  }

  // Grid X: mostra primeiro/último/quartil
  const xTicks = [];
  if (labels.length > 0) {
    xTicks.push({ x: toX(0), label: labels[0] });
    if (labels.length > 4) xTicks.push({ x: toX(Math.floor((labels.length - 1) / 2)), label: labels[Math.floor((labels.length - 1) / 2)] });
    if (labels.length > 1) xTicks.push({ x: toX(labels.length - 1), label: labels[labels.length - 1] });
  }

  // Área sob a linha (preenchimento)
  const areaYMax = toY(minY);  // base
  const areaPoints = `M${toX(0)},${areaYMax} L${pts.replace(/ /g, ' L')} L${toX(values.length - 1)},${areaYMax} Z`;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', 'auto');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', titulo || `Gráfico de ${id}`);

  let html = '';

  // Título
  if (titulo) {
    html += `<text x="14" y="16" font-size="11" font-weight="700" fill="#1F4E79" font-family="sans-serif">${escapeXML(titulo)}</text>`;
  }

  // Grid Y
  for (const t of yTicks) {
    html += `<line x1="${PADDING_L}" y1="${t.y}" x2="${W - PADDING_R}" y2="${t.y}" stroke="#E5E9F0" stroke-width="1"/>`;
    html += `<text x="${PADDING_L - 4}" y="${t.y + 3}" font-size="9" fill="#627D98" text-anchor="end" font-family="sans-serif">${t.valor}</text>`;
  }

  // Grid X (labels)
  for (const t of xTicks) {
    html += `<text x="${t.x}" y="${H - 8}" font-size="9" fill="#627D98" text-anchor="middle" font-family="sans-serif">${escapeXML(t.label)}</text>`;
  }

  // Área sob a curva (com cor opacity)
  html += `<path d="${areaPoints}" fill="${cor}" fill-opacity="0.15"/>`;

  // Linha
  if (values.length > 0) {
    html += `<polyline points="${pts}" fill="none" stroke="${cor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // Pontos com tooltip nativo
  values.forEach((v, i) => {
    const label = labels[i] || `t=${i}`;
    html += `<circle cx="${toX(i)}" cy="${toY(v)}" r="3.5" fill="${cor}" stroke="white" stroke-width="1.5"><title>${escapeXML(label)}: ${v.toFixed(1)}${escapeXML(unidade)}</title></circle>`;
  });

  // Eixo Y label
  if (unidade) {
    html += `<text x="4" y="${PADDING_T - 4}" font-size="9" fill="#627D98" font-family="sans-serif">${escapeXML(unidade)}</text>`;
  }

  // "Sem dados ainda"
  if (values.length === 0) {
    html += `<text x="${W/2}" y="${H/2}" font-size="11" fill="#94A3B8" text-anchor="middle" font-family="sans-serif" font-style="italic">aguardando dados…</text>`;
  }

  svg.innerHTML = html;
  return svg;
}

/**
 * Gráfico de pizza simples (proporção).
 * @param {string} id — ID do SVG
 * @param {number} valor  — valor realizado
 * @param {number} total  — valor máximo
 * @param {string} cor    — cor principal
 * @param {string} rotulo — texto central
 */
export function graficoRosca(id, valor, total, cor, rotulo) {
  const svg = document.getElementById(id);
  if (!svg) return null;

  const W = 160, H = 160;
  const cx = W / 2, cy = H / 2 + 6;
  const r = 60, rIn = 45;
  const pct = Math.min(1, Math.max(0, valor / Math.max(total, 1)));

  // Calcula ângulo
  const angulo = pct * 2 * Math.PI - Math.PI / 2;
  const x = cx + r * Math.cos(angulo);
  const y = cy + r * Math.sin(angulo);

  // Decide flag de arco grande (deve-se para mais de 50%)
  const largeArc = pct > 0.5 ? 1 : 0;

  // Fundo cinza (anel vazio)
  let html = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#E5E9F0" stroke-width="14"/>
  `;

  // Arco pintado (começa em -90°)
  if (pct > 0) {
    html += `
      <path d="M ${cx} ${cy - r} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}"
            fill="none" stroke="${cor}" stroke-width="14" stroke-linecap="round">
        <animate attributeName="stroke-dasharray" from="0, 1000" to="1, 0" dur="0.8s" fill="freeze"/>
      </path>
    `;
  }

  // Texto central
  html += `
    <text x="${cx}" y="${cy - 4}" font-size="22" font-weight="800"
          fill="#102A43" text-anchor="middle" font-family="sans-serif">
      ${Math.round(pct * 100)}%
    </text>
    <text x="${cx}" y="${cy + 14}" font-size="10" font-weight="600"
          fill="#486581" text-anchor="middle" font-family="sans-serif">
      ${escapeXML(rotulo)}
    </text>
    <text x="${cx}" y="${cy + 28}" font-size="9"
          fill="#94A3B8" text-anchor="middle" font-family="sans-serif">
      ${valor.toFixed(1)} de ${total.toFixed(1)}
    </text>
  `;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '160');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${rotulo}: ${Math.round(pct * 100)}%`);
  svg.innerHTML = html;
  return svg;
}

/**
 * Grid de barras (para gráficos pequenos como "10 faixas concluídas").
 * @param {string} id
 * @param {number[]} valores
 * @param {string} cor
 * @param {number} max — máximo
 */
export function graficoBarras(id, valores, cor = '#1F4E79', max) {
  const svg = document.getElementById(id);
  if (!svg) return null;
  const maxV = max !== undefined ? max : Math.max(...valores, 1);
  const barW = 16, gap = 4;
  const W = valores.length * (barW + gap) + gap;
  const H = 80;

  let html = '';
  valores.forEach((v, i) => {
    const h = Math.max(0, (v / maxV) * (H - 20));
    const x = gap + i * (barW + gap);
    const y = H - 12 - h;
    html += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="2" fill="${cor}"><title>t=${i}: ${v}</title></rect>`;
  });

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '80');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Gráfico de barras com ${valores.length} barras`);
  svg.innerHTML = html;
  return svg;
}

function escapeXML(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
