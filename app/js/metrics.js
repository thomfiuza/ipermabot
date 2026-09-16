/**
 * metrics.js — Coleta, persistência e visualização de métricas da obra.
 *
 * Tracking:
 * - Histórico de bateria, produto, velocidade por minuto, m² acumulado
 * - Snapshots a cada 1 minuto (leve: ~50 bytes por snapshot)
 * - Persistência em localStorage para suportar recarregamento
 *
 * @module metrics
 */

import { graficoLinha, graficoRosca, graficoBarras } from './charts.js';

/** Limites */
const MAX_SNAPSHOTS = 720;   // 12 horas @ 1 amostra/min
const SAMPLES_KEY = 'impbot_metrics_v1';

/**
 * Singleton de métricas.
 * - Push de snapshots
 * - Cálculo de derivadas (velocidade por minuto)
 * - Renderização dos gráficos
 */
class Metricas {
  constructor() {
    /** @type {Array<{ts:number,m2:number,bateria:number,produto:number,tempo_s:number,faixa:number}>} */
    this.snapshots = [];
    this._carregar();

    // amostra inicial
    if (this.snapshots.length === 0) {
      this.snapshots.push(this._novoSnapshot(0, 100, 100, 0, 0));
    }
  }

  _carregar() {
    try {
      const salvo = localStorage.getItem(SAMPLES_KEY);
      if (salvo) this.snapshots = JSON.parse(salvo).slice(-MAX_SNAPSHOTS);
    } catch (_) {}
  }

  _persistir() {
    try {
      localStorage.setItem(SAMPLES_KEY, JSON.stringify(this.snapshots));
    } catch (_) {}
  }

  _novoSnapshot(m2, bateria, produto, tempo_s, faixa) {
    return { ts: Date.now(), m2, bateria, produto, tempo_s, faixa };
  }

  /** Adiciona uma amostra. Usa o estado atual do robô. */
  adicionarAmostra(estado) {
    const tempo_s = estado.tempo_inicio ? Math.floor((Date.now() - estado.tempo_inicio) / 1000) : 0;
    const snap = this._novoSnapshot(estado.m2_feitos, estado.bateria, estado.produto, tempo_s, estado.faixa);
    this.snapshots.push(snap);
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-MAX_SNAPSHOTS);
    }
    this._persistir();
  }

  /** Limpa histórico (nova obra). */
  resetar() {
    this.snapshots = [];
    this.snapshots.push(this._novoSnapshot(0, 100, 100, 0, 0));
    this._persistir();
  }

  /** Calcula velocidade (m²/min) entre as últimas N amostras. */
  velocidadeRecente(N = 5) {
    if (this.snapshots.length < 2) return 0;
    const ultimas = this.snapshots.slice(-N - 1);
    const delta = ultimas[ultimas.length - 1].m2 - ultimas[0].m2;
    const dtMin = (ultimas[ultimas.length - 1].tempo_s - ultimas[0].tempo_s) / 60;
    if (dtMin <= 0) return 0;
    return delta / dtMin;
  }

  /** Tempo total de operação em segundos. */
  tempoTotalSegundos() {
    if (this.snapshots.length < 2) return 0;
    return this.snapshots[this.snapshots.length - 1].tempo_s;
  }

  /** Última amostra. */
  ultima() {
    return this.snapshots[this.snapshots.length - 1];
  }

  /** Renderiza todos os gráficos da tela de métricas. */
  renderizarTudo(estado, config) {
    this._atualizarKPIs(estado, config);
    this._renderizarProgresso(estado, config);
    this._renderizarBateria();
    this._renderizarProduto();
    this._renderizarVelocidadeFaixas(estado, config);
    this._renderizarPlanta(estado, config);
    this._ultimaAlertaNivel = this._ultimaAlertaNivel || null;
    const alerta = this.alertaProdutoRestante(estado, config);
    if (alerta.nivel !== 'ok' && alerta.nivel !== this._ultimaAlertaNivel) {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('impbot:alerta-produto', { detail: alerta }));
      }
    }
    this._ultimaAlertaNivel = alerta.nivel;
  }

  _atualizarKPIs(estado, config) {
    const m2 = document.getElementById('kpi-m2');
    const m2Sub = document.getElementById('kpi-m2-sub');
    if (m2) m2.textContent = estado.m2_feitos.toFixed(1);
    if (m2Sub) m2Sub.textContent = `de ${estado.m2_total} m²`;

    const vel = document.getElementById('kpi-velocidade');
    const velSub = document.getElementById('kpi-velocidade-sub');
    if (vel) vel.textContent = this.velocidadeRecente().toFixed(2);
    if (velSub && estado.esp_estado === 'TRABALHANDO') velSub.textContent = 'em operação…';
    else if (velSub) velSub.textContent = 'aguardando';

    const tempo = document.getElementById('kpi-tempo');
    const tempoSub = document.getElementById('kpi-tempo-sub');
    if (tempo) {
      const s = this.tempoTotalSegundos();
      const hh = Math.floor(s / 3600);
      const mm = Math.floor((s % 3600) / 60);
      tempo.textContent = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
    }
    if (tempoSub) {
      tempoSub.textContent = estado.esp_estado === 'TRABALHANDO' ? 'operação ativa' : 'parado';
    }

    // Eficiência: assume que método manual = 1.0 m²/min (referência do mercado)
    // Robô típico: 1.5 m²/min → 50% melhor
    const eficienciaEl = document.getElementById('kpi-eficiencia');
    if (eficienciaEl && eficienciaEl.style) {
      const vel = this.velocidadeRecente();
      const baseline = 1.0;  // m²/min referência manual
      const eficiencia = vel > 0 ? Math.round(((vel - baseline) / baseline) * 100) : 0;
      eficienciaEl.textContent = eficiencia > 0 ? `+${eficiencia}` : `${eficiencia}`;
      eficienciaEl.style.color = eficiencia > 0 ? '#2E7D32' : eficiencia < 0 ? '#C62828' : '';
    }

    // Faixas feitas
    const faixasFeitas = document.getElementById('kpi-faixas-feitas');
    const faixasTotal = document.getElementById('kpi-faixas-total');
    const faixasPct = document.getElementById('kpi-faixas-pct');
    if (faixasFeitas) faixasFeitas.textContent = estado.faixa;
    if (faixasTotal) faixasTotal.textContent = `de ${config.num_faixas}`;
    if (faixasPct) {
      const pct = Math.round((estado.faixa / Math.max(1, config.num_faixas)) * 100);
      faixasPct.textContent = `${pct}% da laje`;
    }
  }

  _renderizarProgresso(estado, config) {
    graficoRosca(
      'grafico-progresso',
      estado.m2_feitos,
      Math.max(estado.m2_total, 1),
      '#1F4E79',
      'concluído'
    );
  }

  _renderizarBateria() {
    const samples = this.snapshots;
    const labels = samples.map(s => new Date(s.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    const values = samples.map(s => s.bateria);
    graficoLinha({
      id: 'grafico-bateria',
      labels,
      values,
      unidade: '%',
      titulo: 'Bateria',
      cor: '#43A047',
      minY: 0,
      maxY: 100
    });
  }

  _renderizarProduto() {
    const samples = this.snapshots;
    const labels = samples.map(s => new Date(s.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    const values = samples.map(s => s.produto);
    graficoLinha({
      id: 'grafico-produto',
      labels,
      values,
      unidade: '%',
      titulo: 'Produto (galão)',
      cor: '#F9A825',
      minY: 0,
      maxY: 100
    });
  }

  _renderizarVelocidadeFaixas(estado, config) {
    // Calcula m² entre faixas. Se não tem faixas suficientes, mostra só os primeiros.
    const intervals = [];
    let prevM2 = 0;
    for (const s of this.snapshots) {
      if (s.faixa > 0) {
        const delta = s.m2 - prevM2;
        intervals.push(delta);
        prevM2 = s.m2;
      }
      if (intervals.length >= 10) break;
    }

    graficoBarras(
      'grafico-velocidade',
      intervals.length > 0 ? intervals : [0],
      '#1565C0',
      Math.max(...intervals, 1)
    );
  }

  /**
   * Diferencial #2: alerta "produto vai faltar em X m²".
   * Compara consumo médio atual com saldo restante.
   * Retorna objeto {nivel: 'ok'|'warn'|'critico', m2_restantes, msg}.
   */
  alertaProdutoRestante(estado, config) {
    const produtoAtualPct = estado.produto || 0;
    const m2Feitos = estado.m2_feitos || 0;
    const m2Total = estado.m2_total || config.m2 || 1;
    const m2Restantes = Math.max(0, m2Total - m2Feitos);
    if (m2Restantes <= 0) return { nivel: 'ok', m2_restantes: 0, msg: null };

    let consumoMedio = 0;
    for (let i = 1; i < this.snapshots.length; i++) {
      const a = this.snapshots[i - 1];
      const b = this.snapshots[i];
      const dm = b.m2 - a.m2;
      const dp = a.produto - b.produto;
      if (dp > 0 && dm > 0) {
        consumoMedio = dm / dp;
        break;
      }
    }
    if (consumoMedio <= 0) {
      consumoMedio = (m2Feitos / Math.max(1, 100 - produtoAtualPct));
    }

    const produtoRestantePct = produtoAtualPct;
    const m2EstimadosPeloSaldo = produtoRestantePct * consumoMedio;

    let nivel = 'ok';
    let msg = null;
    if (m2EstimadosPeloSaldo < m2Restantes * 0.5) {
      nivel = 'critico';
      msg = `Produto atual não basta: falta para ${m2Restantes.toFixed(1)} m², mas o galão cobre ~${m2EstimadosPeloSaldo.toFixed(1)} m². Recarregue.`;
    } else if (m2EstimadosPeloSaldo < m2Restantes) {
      nivel = 'warn';
      msg = `Atenção: restam ~${m2EstimadosPeloSaldo.toFixed(1)} m² de produto para ${m2Restantes.toFixed(1)} m² de obra. Considere recarregar.`;
    }
    return { nivel, m2_restantes: m2Restantes, m2_estimados: m2EstimadosPeloSaldo, msg };
  }

  /**
   * Diferencial #1: Planta visual da obra em tempo real.
   * Desenha a laje de cima com cada faixa colorida conforme status.
   * - concluída  → verde (#2E7D32)
   * - em execução → amarelo (#F9A825)
   * - restante   → cinza (#CFD8DC)
   * - "robo"     → ponto amarelo dentro da faixa atual
   *
   * Pure: testável isoladamente via desenharPlantaSVG().
   */
  _renderizarPlanta(estado, config) {
    const svg = desenharPlantaSVG(estado, config);
    const el = document.getElementById('grafico-planta');
    if (!el) return;
    el.innerHTML = svg;
  }
}

/**
 * Função pura exportada para teste sem DOM.
 * Retorna string SVG representando a planta colorida da laje.
 *
 * @param {Object} estado  {faixa, faixa_atual, m2_feitos, m2_total, esp_estado}
 * @param {Object} config  {largura_cm, comprimento_cm, num_faixas}
 * @returns {string} SVG
 */
export function desenharPlantaSVG(estado, config) {
  const W = 100, H = 100;
  const num = Math.max(1, config.num_faixas || 1);
  const feito = Math.max(0, Math.min(estado.faixa || 0, num));
  const atual = estado.esp_estado === 'TRABALHANDO' && feito < num ? feito : -1;

  // Laje externa (margem 4px)
  const x0 = 4, y0 = 4, x1 = W - 4, y1 = H - 4;
  // Largura de cada faixa horizontal (laje quadrada no viewbox)
  const fw = (x1 - x0) / num;

  let faixas = '';
  for (let i = 0; i < num; i++) {
    const x = x0 + i * fw;
    let cor;
    let label;
    if (i < feito)        { cor = '#2E7D32'; label = `faixa ${i+1} concluída`; }
    else if (i === atual) { cor = '#F9A825'; label = `faixa ${i+1} em execução`; }
    else                  { cor = '#CFD8DC'; label = `faixa ${i+1} restante`; }

    faixas += `<rect x="${x.toFixed(2)}" y="${y0}" width="${(fw - 1).toFixed(2)}" height="${(y1 - y0).toFixed(2)}" `
            + `fill="${cor}" rx="1.5" role="img" aria-label="${label}">`
            + `<title>${label}</title></rect>`;
  }

  // Robô (ponto dentro da faixa atual)
  let robo = '';
  if (atual >= 0 && estado.m2_feitos) {
    const cx = x0 + atual * fw + fw / 2;
    const cy = y0 + (y1 - y0) * 0.5;
    robo = `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="2.5" fill="#1565C0" `
         + `stroke="#fff" stroke-width="0.6">`
         + `<title>Robô em faixa ${atual + 1}</title></circle>`;
  }

  return `<rect x="${x0}" y="${y0}" width="${(x1-x0).toFixed(2)}" height="${(y1-y0).toFixed(2)}" `
       + `fill="none" stroke="#1F4E79" stroke-width="0.6" rx="1.5"/>`
       + faixas + robo;
}

export const metricas = new Metricas();
