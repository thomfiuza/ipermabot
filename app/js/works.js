/**
 * works.js — Diferenciais de gestão multi-obra (implementados na FASE 3.4).
 *
 * Inclui:
 *  - Diferencial #9: Histórico multi-obra (galeria salva em localStorage)
 *  - Diferencial #4: Geofencing (limite virtual da laje + alerta)
 *  - Diferencial #7: Relatório PDF da obra (gera HTML imprimível)
 */

const OBRAS_KEY = 'impbot_obras_v1';
const GEOFENCE_KEY = 'impbot_geofence_v1';

/* ============================================================
   #9 — HISTÓRICO MULTI-OBRA
   ============================================================ */

/**
 * Salva um snapshot da obra atual.
 * @param {string} nome - Nome da obra (ex: "Laje 301 - Edifício Aurora")
 * @param {Object} estado - Estado atual
 * @param {Object} config - Configuração atual
 * @returns {Object} obra salva
 */
export function salvarObra(nome, estado, config, eventos = []) {
  const obras = listarObras();
  // id com sufixo aleatório + counter para garantir unicidade em chamadas
  // sucessivas dentro do mesmo milissegundo (testes automatizados).
  salvarObra._counter = (salvarObra._counter || 0) + 1;
  const base = Date.now().toString(36);
  const id = base + '-' + Math.random().toString(36).slice(2, 6) + '-' + salvarObra._counter;
  const obra = {
    id,
    nome: nome || `Obra ${obras.length + 1}`,
    data: new Date().toISOString(),
    estado: { ...estado },
    config: { ...config },
    eventos: eventos.slice(-100),     // últimos 100 eventos
    duracaoSegundos: estado.tempo_inicio
      ? Math.floor((Date.now() - estado.tempo_inicio) / 1000)
      : 0
  };
  obras.push(obra);
  try {
    localStorage.setItem(OBRAS_KEY, JSON.stringify(obras.slice(-50)));   // máx 50 obras
  } catch (_) {}
  return obra;
}

/**
 * Lista todas as obras salvas (mais recente primeiro).
 */
export function listarObras() {
  try {
    const salvo = localStorage.getItem(OBRAS_KEY);
    return salvo ? JSON.parse(salvo) : [];
  } catch (_) {
    return [];
  }
}

/**
 * Apaga uma obra por ID.
 */
export function deletarObra(id) {
  const obras = listarObras().filter(o => o.id !== id);
  try { localStorage.setItem(OBRAS_KEY, JSON.stringify(obras)); } catch (_) {}
}

/**
 * Resumo de uma obra para listagem rápida.
 */
export function resumoObra(obra) {
  return {
    id: obra.id,
    nome: obra.nome,
    data: obra.data,
    m2_feitos: obra.estado.m2_feitos,
    m2_total: obra.estado.m2_total || obra.config.m2_total || 0,
    duracao: obra.duracaoSegundos,
    pct: obra.estado.m2_total > 0
      ? Math.round((obra.estado.m2_feitos / obra.estado.m2_total) * 100)
      : 0
  };
}

/* ============================================================
   #4 — GEOFENCING (limite virtual da laje)
   ============================================================ */

/**
 * Define um perímetro virtual de operação (em cm).
 * @param {Object} geo  {x0, y0, x1, y1} em cm (origem e canto oposto)
 * @param {Object} config  {largura_cm, comprimento_cm}
 * @returns {Object} geofence salvo (clamped aos limites da obra)
 */
export function definirGeofence(geo, config) {
  const W = config.largura_cm || 100;
  const H = config.comprimento_cm || 100;
  const g = {
    x0: Math.max(0, Math.min(geo.x0 || 0, W)),
    y0: Math.max(0, Math.min(geo.y0 || 0, H)),
    x1: Math.max(0, Math.min(geo.x1 || W, W)),
    y1: Math.max(0, Math.min(geo.y1 || H, H))
  };
  if (g.x1 <= g.x0) g.x1 = g.x0 + 1;
  if (g.y1 <= g.y0) g.y1 = g.y0 + 1;
  try { localStorage.setItem(GEOFENCE_KEY, JSON.stringify(g)); } catch (_) {}
  return g;
}

export function obterGeofence() {
  try {
    const s = localStorage.getItem(GEOFENCE_KEY);
    return s ? JSON.parse(s) : null;
  } catch (_) { return null; }
}

export function limparGeofence() {
  try { localStorage.removeItem(GEOFENCE_KEY); } catch (_) {}
}

/**
 * Verifica se a posição atual do robô está dentro do perímetro.
 * @param {Object} pos  {x, y} em cm (relativo a config)
 * @param {Object} geo  perímetro (obterGeofence())
 * @returns {boolean} true se dentro
 */
export function dentroDoPerimetro(pos, geo) {
  if (!geo || !pos || pos.x === undefined || pos.y === undefined) return true;
  return pos.x >= geo.x0 && pos.x <= geo.x1 &&
         pos.y >= geo.y0 && pos.y <= geo.y1;
}

/* ============================================================
   #7 — RELATÓRIO PDF DA OBRA
   ============================================================ */

/**
 * Gera um documento HTML imprimível (Print → Save as PDF).
 * @returns {string} HTML completo (com estilos para impressão)
 */
export function gerarRelatorioHTML(obra, snapshots = []) {
  const r = resumoObra(obra);
  const evCount = (obra.eventos || []).length;
  const ur = (obra.estado.dist_obst || 0).toFixed(0);
  const produto = (obra.estado.produto || 0).toFixed(0);

  // Eventos críticos (últimos)
  const eventos = (obra.eventos || []).slice(-30).reverse().map(e =>
    `<li><strong>${e.tipo || 'evento'}</strong> ${e.titulo ? '(' + e.titulo + ')' : ''} — <code>${e.mensagem || ''}</code></li>`
  ).join('') || '<li><em>Sem eventos registrados</em></li>';

  // Tabulinha de métricas resumidas
  const tempos = snapshots.length > 1
    ? snapshots.map(s => {
        const d = new Date(s.ts);
        return `<tr><td>${d.toLocaleString('pt-BR')}</td>` +
               `<td>${s.m2.toFixed(1)} m²</td>` +
               `<td>${s.bateria.toFixed(0)}%</td>` +
               `<td>${s.produto.toFixed(0)}%</td>` +
               `<td>${s.faixa}</td></tr>`;
      }).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#888"><em>Amostras insuficientes para histórico</em></td></tr>';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Relatório de Obra — ${escapeHTML(r.nome)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
         max-width: 920px; margin: 24px auto; padding: 0 16px; color: #1F2937; line-height: 1.5; }
  h1 { color: #1F4E79; border-bottom: 3px solid #1F4E79; padding-bottom: 8px; }
  h2 { color: #1F4E79; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { padding: 6px 10px; border: 1px solid #E5E7EB; text-align: left; font-size: 13px; }
  th { background: #F3F4F6; font-weight: 600; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .kpi { background: #F8FAFC; border: 1px solid #E5E7EB; border-radius: 6px; padding: 12px; text-align: center; }
  .kpi .v { font-size: 22px; font-weight: 800; color: #1F4E79; }
  .kpi .l { font-size: 11px; color: #6B7280; text-transform: uppercase; }
  .meta { background: #F8FAFC; border-left: 4px solid #1F4E79; padding: 10px 14px; font-size: 13px; }
  ul.events { font-size: 13px; max-height: 320px; overflow-y: auto; }
  .assin { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 56px; }
  .assin .box { border-top: 1px solid #1F2937; padding-top: 6px; font-size: 12px; }
  @media print { body { max-width: none; } .no-print { display:none; } }
  .no-print { margin: 8px 0 16px; }
  .no-print button { padding: 8px 16px; background: #1F4E79; color: white; border: none;
                     border-radius: 4px; cursor: pointer; font-size: 14px; margin-right: 8px; }
</style>
</head>
<body>

<div class="no-print">
  <button onclick="window.print()">🖨 Imprimir / Salvar como PDF</button>
  <button onclick="window.close()" style="background:#6B7280">Fechar</button>
</div>

<h1>Relatório de Obra</h1>

<div class="meta">
  <strong>Obra:</strong> ${escapeHTML(r.nome)}<br>
  <strong>Data:</strong> ${new Date(r.data).toLocaleString('pt-BR')}<br>
  <strong>Duração:</strong> ${formatarHMS(r.duracao)}<br>
  <strong>Avanço:</strong> ${r.pct}% (${r.m2_feitos.toFixed(1)} / ${(obra.estado.m2_total || obra.config.m2_total || 0).toFixed(1)} m²)
</div>

<div class="kpis">
  <div class="kpi"><div class="v">${r.m2_feitos.toFixed(1)}</div><div class="l">m² feitos</div></div>
  <div class="kpi"><div class="v">${obra.estado.bateria || 0}%</div><div class="l">bateria</div></div>
  <div class="kpi"><div class="v">${produto}%</div><div class="l">produto</div></div>
  <div class="kpi"><div class="v">${evCount}</div><div class="l">eventos</div></div>
</div>

<h2>Configuração</h2>
<table>
  <tr><th>Largura da laje</th><td>${obra.config.largura_cm} cm</td></tr>
  <tr><th>Comprimento</th><td>${obra.config.comprimento_cm} cm</td></tr>
  <tr><th>Nº de faixas</th><td>${obra.config.num_faixas}</td></tr>
  <tr><th>Demãos</th><td>${obra.config.demaos || 1}</td></tr>
  <tr><th>Limite obstáculo</th><td>${obra.config.lim_obst_cm} cm</td></tr>
  <tr><th>Limite queda</th><td>${obra.config.lim_queda_cm} cm</td></tr>
</table>

<h2>Histórico de Amostras (${snapshots.length})</h2>
<table>
  <thead><tr><th>Quando</th><th>m²</th><th>Bateria</th><th>Produto</th><th>Faixa</th></tr></thead>
  <tbody>${tempos}</tbody>
</table>

<h2>Eventos (${evCount}, mostrando últimos 30)</h2>
<ul class="events">${eventos}</ul>

<div class="assin">
  <div class="box">Executor / Operador<br><small>nome + assinatura</small></div>
  <div class="box">Cliente / Gestor<br><small>nome + assinatura</small></div>
</div>

<p style="font-size:11px;color:#6B7280;margin-top:32px;text-align:center">
  Relatório gerado automaticamente pelo IMP-BOT PWA · ${new Date().toLocaleString('pt-BR')}
</p>

</body>
</html>`;
}

/** Helpers locais */
function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatarHMS(segundos) {
  const s = Math.max(0, Math.floor(segundos || 0));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}
