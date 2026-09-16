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
}

export const metricas = new Metricas();
