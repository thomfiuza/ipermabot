/**
 * main.js — Composição de todos os módulos e bind de eventos.
 *
 * Arquivo de entrada do PWA IMP-BOT. Mantido enxuto para isolar o ciclo
 * de inicialização da lógica de negócio.
 *
 * @module main
 */

import { criarEstado, EST } from './state.js';
import { TransporteWebSocket } from './transport.js';
import { tratarResposta, tratarTelemetria, tratarEvento } from './protocol.js';
import { simulador } from './simulator.js';
import { log, logBook } from './log.js';
import { metricas } from './metrics.js';
import { ui } from './ui.js';
import {
  holdToConfirm,
  calcularNumFaixas,
  calcularAreaTotalM2,
  ipv4Valido,
  downloadTexto
} from './utils.js';

/* ============================================================
   INSTÂNCIA GLOBAL
   ============================================================ */
const { config, estado, salvarConfig } = criarEstado();
const ws = new TransporteWebSocket();

let cronometroInterval = null;
let metricsInterval = null;

/* ============================================================
   FUNÇÕES DE CONVENIÊNCIA
   ============================================================ */

const _cronometroIniciar = () => {
  if (cronometroInterval) return;
  estado.tempo_inicio = estado.tempo_inicio || Date.now();
  cronometroInterval = setInterval(() => ui.atualizarCronometro(estado), 1000);
  ui.atualizarCronometro(estado);

  // Métricas: amostra a cada 60s
  if (!metricsInterval) {
    metricsInterval = setInterval(() => {
      metricas.adicionarAmostra(estado);
    }, 60_000);
  }
};
const _cronometroParar = () => {
  if (cronometroInterval) { clearInterval(cronometroInterval); cronometroInterval = null; }
  if (metricsInterval) { clearInterval(metricsInterval); metricsInterval = null; }
};
const _cronometroZerar = () => {
  _cronometroParar();
  estado.tempo_inicio = null;
  ui.atualizarCronometro(estado);
};

const _atualizarTudo = () => ui.atualizarDashboard();

const _emergencia = (tipo, detalhe) => {
  estado.esp_estado = EST.EMERGENCIA;
  estado.emergencia_causa = ({
    queda_detectada:      'Queda detectada',
    emergencia_acionada:  'Emergência acionada',
    obstaculo_detectado:  'Obstáculo crítico'
  })[tipo] || tipo;
  estado.emergencia_detalhe = detalhe;
  _cronometroParar();
  simulador.reset(estado);
  ui.atualizarEmergencia();
  ui.mostrarTela('tela-emergencia');
};

const _calcularAreaTotal = () => {
  estado.m2_total = calcularAreaTotalM2(config.largura_cm, config.comprimento_cm, config.demaos);
};

/* ============================================================
   BIND DO TRANSPORTE WEB SOCKET
   ============================================================ */
ws.onTelemetria = (d) => tratarTelemetria(d, estado, config, {
  onQueda: (cm, lim) => _emergencia('queda_detectada', `Sensor solo ${cm.toFixed(1)} cm (limite ${lim} cm)`),
  onObstaculo: (cm, lim) => log('warn', 'Obstáculo à frente', `${cm.toFixed(0)} cm (limite ${lim} cm)`)
});
ws.onEvento = (d) => tratarEvento(d, log, {
  onEmergencia: (tipo, desc) => _emergencia(tipo, desc)
});
ws.onResposta = (msg) => tratarResposta(msg, log, { estado });

/* ============================================================
   BIND DE EVENTOS DA UI
   ============================================================ */
const _bindEventos = () => {
  /* TELA 1 — CONEXÃO */
  document.getElementById('btn-tentar-conexao').addEventListener('click', async () => {
    if (!ipv4Valido(config.ip_esp32)) {
      ui.toast('IP do robô inválido em configurações', 'erro');
      return;
    }
    estado.conexao = 'conectando';
    ui.atualizarConexao();
    const ok = await ws.conectar(config.ip_esp32);
    if (ok) {
      estado.modo = 'esp32';
      estado.esp_estado = EST.PARADO;
      estado.conexao = 'ok';
      ws.enviar('info');
      ws.enviar('subscribe');
      log('sucesso', 'Conectado ao robô', `IP ${config.ip_esp32}`);
      ui.mostrarTela('tela-dashboard');
    } else {
      estado.conexao = 'erro';
      ui.atualizarConexao();
      ui.toast('Robô não encontrado. Verifique Wi-Fi e IP.', 'erro');
    }
  });

  document.getElementById('btn-modo-simulacao').addEventListener('click', () => {
    estado.modo = 'simulacao';
    log('info', 'Modo simulação ativado', 'Demonstração sem hardware');
    _calcularAreaTotal();
    simulador.iniciar(estado, config, () => {
      _cronometroIniciar();
      ui.mostrarTela('tela-dashboard');
    });
  });

  /* TELA 2 — DASHBOARD */
  document.getElementById('btn-iniciar').addEventListener('click', () => {
    if (estado.esp_estado === EST.PAUSADO) {
      if (estado.modo === 'simulacao') simulador.retomar(estado);
      else ws.enviar('retomar');
      estado.esp_estado = EST.TRABALHANDO;
      _cronometroIniciar();
      _atualizarTudo();
      return;
    }
    ui.modal('Iniciar obra?', `Serão executadas ${config.num_faixas} faixas, ${config.demaos} demão(ões). Confirma?`, () => {
      _calcularAreaTotal();
      estado.esp_estado = EST.TRABALHANDO;
      estado.tempo_inicio = Date.now();
      _cronometroIniciar();
      log('sucesso', 'Obra iniciada', `${config.num_faixas} faixas planejadas`);
      if (estado.modo === 'simulacao') {
        simulador.iniciar(estado, config, _atualizarTudo);
      } else {
        ws.enviar('definir_area', {
          largura_cm: config.largura_cm,
          comprimento_cm: config.comprimento_cm,
          num_faixas: config.num_faixas
        });
        ws.enviar('iniciar', { demaos: config.demaos });
      }
      _atualizarTudo();
    });
  });

  document.getElementById('btn-pausar').addEventListener('click', () => {
    if (estado.modo === 'simulacao') simulador.pausar(estado);
    else ws.enviar('pausar');
    estado.esp_estado = EST.PAUSADO;
    _cronometroParar();
    log('warn', 'Operação pausada pelo operador');
    _atualizarTudo();
  });

  holdToConfirm(
    document.getElementById('btn-parar'),
    1500,
    () => {
      if (estado.modo === 'simulacao') simulador.parar(estado);
      else ws.enviar('parar');
      estado.esp_estado = EST.PARADO;
      _cronometroParar();
      log('info', 'Operação finalizada pelo operador');
      _atualizarTudo();
      ui.toast('Operação finalizada', 'ok');
    }
  );

  holdToConfirm(
    document.getElementById('btn-emergencia'),
    3000,
    () => {
      if (estado.modo === 'simulacao') {
        simulador.emergencia(estado, {
          onEmergencia: (t, d) => _emergencia(t, d)
        });
      } else {
        ws.enviar('emergencia');
        _emergencia('emergencia_acionada', 'Botão de emergência do app');
      }
    }
  );

  /* TELA 3 — EMERGÊNCIA */
  holdToConfirm(
    document.getElementById('btn-reset-emergencia'),
    3000,
    () => {
      simulador.reset(estado);
      estado.esp_estado = EST.PARADO;
      estado.emergencia_causa = '';
      estado.emergencia_detalhe = '';
      _cronometroZerar();
      log('info', 'Emergência liberada', 'Operador desbloqueou a parada');
      ui.mostrarTela('tela-dashboard');
      _atualizarTudo();
      ui.toast('Emergência liberada. Pronto para nova operação.', 'ok');
    }
  );

  /* TABS */
  document.querySelectorAll('.tab-bar .tab').forEach(t => {
    t.addEventListener('click', () => {
      const tab = t.dataset.tab;
      if (tab === 'principal')      ui.mostrarTela('tela-dashboard');
      else if (tab === 'config')    ui.mostrarTela('tela-config');
      else if (tab === 'metricas') {
        ui.mostrarTela('tela-metricas');
        metricas.renderizarTudo(estado, config);
      }
      else if (tab === 'log')       ui.mostrarTela('tela-log');
      document.querySelectorAll('.tab-bar .tab').forEach(x => x.classList.remove('ativo'));
      t.classList.add('ativo');
    });
  });

  /* TELA 5.5 — MÉTRICAS */
  const btnVoltarMetricas = document.getElementById('btn-voltar-metricas');
  if (btnVoltarMetricas) {
    btnVoltarMetricas.addEventListener('click', () => ui.mostrarTela('tela-dashboard'));
  }
  const btnResetMetricas = document.getElementById('btn-reset-metricas');
  if (btnResetMetricas) {
    btnResetMetricas.addEventListener('click', () => {
      if (confirm('Resetar todas as métricas desta obra?')) {
        metricas.resetar();
        metricas.renderizarTudo(estado, config);
        log('info', 'Métricas resetadas');
        ui.toast('Métricas resetadas', 'ok');
      }
    });
  }

  /* TELA 4 — CONFIG */
  document.getElementById('btn-voltar-config').addEventListener('click', () => ui.mostrarTela('tela-dashboard'));
  document.getElementById('cfg-largura').addEventListener('input', (e) => {
    config.largura_cm = Math.max(100, +e.target.value || 100);
    ui.atualizarFaixasCalc();
  });
  document.getElementById('cfg-comprimento').addEventListener('input', (e) => {
    config.comprimento_cm = Math.max(100, +e.target.value || 100);
  });
  document.getElementById('cfg-de-menos').addEventListener('click', () => {
    config.demaos = Math.max(1, config.demaos - 1);
    document.getElementById('cfg-de-valor').textContent = config.demaos;
  });
  document.getElementById('cfg-de-mais').addEventListener('click', () => {
    config.demaos = Math.min(3, config.demaos + 1);
    document.getElementById('cfg-de-valor').textContent = config.demaos;
  });
  document.getElementById('cfg-queda').addEventListener('input', (e) => { config.lim_queda_cm = +e.target.value || 25; });
  document.getElementById('cfg-obst').addEventListener('input',  (e) => { config.lim_obst_cm  = +e.target.value || 30; });

  document.getElementById('btn-salvar-obra').addEventListener('click', () => {
    config.nome = document.getElementById('cfg-nome').value || 'Obra sem nome';
    config.produto = document.getElementById('cfg-produto').value;
    _calcularAreaTotal();
    config.num_faixas = calcularNumFaixas(config.largura_cm);
    salvarConfig();
    log('sucesso', 'Configuração salva',
      `${config.nome} — ${config.num_faixas} faixas — ${config.demaos} demãos — área total ${estado.m2_total} m²`);
    if (ws.pronto) {
      ws.enviar('definir_area', {
        largura_cm: config.largura_cm,
        comprimento_cm: config.comprimento_cm,
        num_faixas: config.num_faixas
      });
    }
    ui.toast('Configuração salva', 'ok');
    ui.mostrarTela('tela-dashboard');
    document.querySelectorAll('.tab-bar .tab').forEach(x => x.classList.remove('ativo'));
    document.querySelector('.tab[data-tab="principal"]').classList.add('ativo');
    _atualizarTudo();
  });

  /* TELA 5 — LOG */
  document.getElementById('btn-voltar-log').addEventListener('click', () => ui.mostrarTela('tela-dashboard'));
  document.getElementById('btn-exportar').addEventListener('click', () => {
    const nomeSafe = config.nome.replace(/[^a-z0-9-_]/gi, '_');
    downloadTexto(
      `impbot_${nomeSafe}_${new Date().toISOString().slice(0, 10)}.txt`,
      logBook.exportarTxt(config.nome)
    );
    ui.toast('Log exportado', 'ok');
  });

  /* SERVICE WORKER (PWA) */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err =>
        console.warn('[sw] Falha no registro:', err)
      );
    });
  }
};

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
const _init = () => {
  ui.setContexto({ config, estado });
  _bindEventos();
  _calcularAreaTotal();
  ui.atualizarConexao();
  ui.atualizarDashboard();
  logBook.onChange = () => ui.atualizarLog();
  log('info', 'App aberto', 'IMP-BOT v1.0 carregado');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _init);
} else {
  _init();
}

// Expor para debug no DevTools (apenas em dev)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  window.__impbot_debug = { config, estado, ws, simulador, log, logBook, ui };
}
