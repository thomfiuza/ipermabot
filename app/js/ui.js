/**
 * ui.js — Manipulação do DOM (telas, modais, toasts).
 *
 * @module ui
 */

import { EST, TIPO_EVENTO } from './state.js';
import { classeTipoEvento, formatarHMS, horaLocalCurta } from './utils.js';
import { logBook } from './log.js';

/** Conjunto de telas válidas. */
const TELAS_VALIDAS = new Set([
  'tela-conexao', 'tela-dashboard', 'tela-emergencia',
  'tela-config', 'tela-log'
]);

/** Singleton UI — recebe contexto (config/estado/log) por injeção. */
class UI {
  setContexto(contexto) { this.ctx = contexto; }

  mostrarTela(id) {
    if (!TELAS_VALIDAS.has(id)) return;
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.querySelectorAll('.tela').forEach(t => t.setAttribute('aria-hidden', 'true'));
    const nova = document.getElementById(id);
    if (nova) {
      nova.classList.add('ativa');
      nova.setAttribute('aria-hidden', 'false');
    }
    if (id === 'tela-log')       this.atualizarLog();
    if (id === 'tela-config')    this.atualizarConfig();
    if (id === 'tela-conexao')   this.atualizarConexao();
    if (id === 'tela-emergencia')this.atualizarEmergencia();
  }

  atualizarConexao() {
    const txt = document.getElementById('txt-status-conexao');
    if (!txt) return;
    const e = this.ctx.estado;
    if (e.conexao === 'conectando')  txt.textContent = `Procurando Wi-Fi "${this.ctx.config.wifi_ssid}"…`;
    else if (e.conexao === 'erro')   txt.textContent = 'Robô não encontrado. Tente novamente ou use o modo simulação.';
  }

  atualizarDashboard() {
    const e = this.ctx.estado, c = this.ctx.config;

    // Status card
    const card = document.getElementById('card-status');
    if (!card) return;
    card.classList.remove('estado-parado', 'estado-trabalhando', 'estado-pausado', 'estado-emergencia');
    const mapEstado = {
      [EST.PARADO]:      ['estado-parado',      'Pronto para iniciar', 'sem operação'],
      [EST.TRABALHANDO]: ['estado-trabalhando', 'Em operação',         'aplicando'],
      [EST.PAUSADO]:     ['estado-pausado',     'Pausado',             'retomar quando seguro'],
      [EST.EMERGENCIA]:  ['estado-emergencia',  'EMERGÊNCIA',          'atenção necessária'],
      [EST.ERRO]:        ['estado-emergencia',  'Erro',                'verificar']
    };
    const [cls, titulo, sub] = mapEstado[e.esp_estado] || mapEstado[EST.PARADO];
    card.classList.add(cls);
    document.getElementById('h-estado').textContent = titulo;
    const pct = e.m2_total > 0 ? Math.round((e.m2_feitos / e.m2_total) * 100) : 0;
    document.getElementById('p-faixa-info').textContent =
      `Faixa ${e.faixa} de ${c.num_faixas} · ${pct}% concluído (${sub})`;

    // m²
    document.getElementById('m-m2').textContent = e.m2_feitos.toFixed(1);
    document.getElementById('m-m2-esp').textContent = `de ${e.m2_total} m²`;

    // bateria/produto
    const bb = document.getElementById('b-bateria');
    bb.style.width = e.bateria + '%';
    bb.className = 'b-fundo ' + (e.bateria > 30 ? 'bom' : e.bateria > 10 ? 'ok' : 'velho');
    document.getElementById('m-bateria').textContent = Math.round(e.bateria) + '%';

    const bp = document.getElementById('b-produto');
    bp.style.width = e.produto + '%';
    bp.className = 'b-fundo ' + (e.produto > 30 ? 'bom' : e.produto > 10 ? 'ok' : 'velho');
    document.getElementById('m-produto').textContent = Math.round(e.produto) + '%';

    // alertas
    const a = document.getElementById('alertas');
    let html = '';
    if (e.bateria <= 20) html += `<h4>⚠️ Bateria baixa (${Math.round(e.bateria)}%)</h4>Estimativa < 1 hora`;
    if (e.produto <= 30) html += `<h4>⚠️ Produto baixo (${Math.round(e.produto)}%)</h4>Reabastecer em breve`;
    if (html) { a.innerHTML = html; a.hidden = false; } else { a.hidden = true; }

    // botões
    const ini = document.getElementById('btn-iniciar');
    const pau = document.getElementById('btn-pausar');
    if (e.esp_estado === EST.PAUSADO) {
      ini.querySelector('.icone-grande').textContent = '↻';
      ini.querySelector('.rotulo-acao').textContent = 'Retomar';
      ini.disabled = false;
    } else {
      ini.querySelector('.icone-grande').textContent = '▶';
      ini.querySelector('.rotulo-acao').textContent = 'Iniciar';
      ini.disabled = (e.esp_estado === EST.TRABALHANDO || e.esp_estado === EST.EMERGENCIA);
    }
    pau.disabled = (e.esp_estado !== EST.TRABALHANDO);
  }

  atualizarCronometro() {
    const el = document.getElementById('m-tempo');
    if (!el) return;
    const e = this.ctx.estado;
    if (!e.tempo_inicio) { el.textContent = '00:00:00'; return; }
    el.textContent = formatarHMS(Date.now() - e.tempo_inicio);
  }

  atualizarLog() {
    const lista = document.getElementById('lista-eventos');
    if (!lista) return;
    const evs = logBook.todos();
    if (evs.length === 0) {
      lista.innerHTML = '<p style="color:#627D98;padding:32px;text-align:center">Nenhum evento registrado ainda.</p>';
      return;
    }
    lista.innerHTML = evs.map(e =>
      `<div class="evento ${classeTipoEvento(e.tipo)}"><h5>${horaLocalCurta(e.data)} — ${e.titulo}</h5><small>${e.desc || ''}</small></div>`
    ).join('');
  }

  atualizarConfig() {
    const c = this.ctx.config;
    document.getElementById('cfg-nome').value = c.nome;
    document.getElementById('cfg-largura').value = c.largura_cm;
    document.getElementById('cfg-comprimento').value = c.comprimento_cm;
    document.getElementById('cfg-de-valor').textContent = c.demaos;
    document.getElementById('cfg-queda').value = c.lim_queda_cm;
    document.getElementById('cfg-obst').value = c.lim_obst_cm;
    this.atualizarFaixasCalc();
  }

  atualizarFaixasCalc() {
    const n = Math.max(1, Math.ceil(this.ctx.config.largura_cm / 30));
    this.ctx.config.num_faixas = n;
    document.getElementById('cfg-faixas').textContent = `${n} faixas de 30 cm`;
  }

  atualizarEmergencia() {
    document.getElementById('causa-emergencia').textContent = this.ctx.estado.emergencia_causa || '—';
    document.getElementById('detalhe-emergencia').textContent = this.ctx.estado.emergencia_detalhe || '—';
  }

  toast(msg, tipo = 'info', duracao = 3000) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast tipo-' + tipo;
    t.hidden = false;
    clearTimeout(this._t);
    this._t = setTimeout(() => { t.hidden = true; }, duracao);
  }

  modal(titulo, texto, onOk) {
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-texto').textContent = texto;
    document.getElementById('modal').hidden = false;
    document.getElementById('modal-ok').onclick = () => {
      document.getElementById('modal').hidden = true;
      onOk && onOk();
    };
    document.getElementById('modal-cancelar').onclick = () => {
      document.getElementById('modal').hidden = true;
    };
  }

  /** Modal com confirmação por segurar botão por 3s. */
  modalSegurar(titulo, texto, onConfirmado) {
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-texto').textContent = texto;
    const ok = document.getElementById('modal-ok');
    const cancelar = document.getElementById('modal-cancelar');
    ok.textContent = 'Segure para confirmar…';
    document.getElementById('modal').hidden = false;

    let timer = null;
    const done = () => {
      document.getElementById('modal').hidden = true;
      ok.textContent = 'Confirmar';
      onConfirmado && onConfirmado();
    };
    const begin = () => {
      ok.textContent = 'Confirmado ✓';
      timer = setTimeout(done, 1500);
    };
    const end = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      ok.textContent = 'Segure para confirmar…';
    };
    ok.onmousedown = begin;
    ok.ontouchstart = begin;
    ok.onmouseup = end;
    ok.ontouchend = end;
    ok.onmouseleave = end;
    cancelar.onclick = () => {
      clearTimeout(timer);
      ok.textContent = 'Confirmar';
      document.getElementById('modal').hidden = true;
    };
  }
}

export const ui = new UI();
