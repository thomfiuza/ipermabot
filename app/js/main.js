/**
 * main.js — Composição de todos os módulos e bind de eventos.
 *
 * Arquivo de entrada do PWA Ipermabot. Mantido enxuto para isolar o ciclo
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
import { salvarObra, listarObras, deletarObra, gerarRelatorioHTML, resumoObra } from './works.js';
import { iniciarWizard } from './wizard.js';
import { CATALOGO, TIPOS_LAJE, produtosCompativeis, calcularDemaos } from './produtos.js';
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

  /* TELA 1 — MODO ASSISTENTE (Diferencial #6 — wizard passo-a-passo) */
  document.getElementById('btn-assistente').addEventListener('click', () => {
    const w = iniciarWizard(CATALOGO);
    w.onConcluir = (contexto) => {
      // Aplica o que o wizard coletou
      if (contexto.largura_m) {
        config.largura_cm = contexto.largura;
        config.comprimento_cm = contexto.comprimento;
        document.getElementById('cfg-largura').value = contexto.largura;
        document.getElementById('cfg-comprimento').value = contexto.comprimento;
      }
      if (contexto.produto_id) {
        config.produto_id = contexto.produto_id;
        selProduto.value = contexto.produto_id;
        if (selTipoLaje.value === 'laje_exposta') selTipoLaje.value = contexto.tipo_laje || 'laje_exposta';
        config.tipo_laje = selTipoLaje.value;
        config.demaos = contexto['demaos'];
        document.getElementById('cfg-de-valor').value = contexto['demaos'];
        _atualizarSugestaoDemaos();
      }
      log('info', 'Assistente concluído', `${contexto.largura_m || 0}m × ${contexto.comprimento_m || 0}m, ${contexto['demaos'] || 0} demaos`);
    };
  });

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

  /* TELA 4 — CONFIG: produto e tipo de laje (Diferencial #8) */
  const selProduto = document.getElementById('cfg-produto');
  const selTipoLaje = document.getElementById('cfg-tipo-laje');
  const outInfo = document.getElementById('cfg-produto-info');
  const outDemaos = document.getElementById('cfg-demaos-sugeridas');

  // Popula tipos de laje
  if (selTipoLaje) {
    selTipoLaje.innerHTML = TIPOS_LAJE.map(t =>
      `<option value="${t.id}" ${config.tipo_laje === t.id ? 'selected' : ''}>${t.nome}</option>`
    ).join('');
    selTipoLaje.value = config.tipo_laje || 'laje_exposta';
    selTipoLaje.addEventListener('change', () => {
      config.tipo_laje = selTipoLaje.value;
      atualizarListaProdutos();
      _atualizarSugestaoDemaos();
    });
  }

  const atualizarListaProdutos = () => {
    const compativeis = produtosCompativeis(selTipoLaje?.value || 'laje_exposta');
    selProduto.innerHTML = '<option value="">— escolha um produto —</option>'
      + CATALOGO.map(p => {
        const recom = compativeis.find(x => x.id === p.id) ? '★ ' : '  ';
        return `<option value="${p.id}" ${config.produto_id === p.id ? 'selected' : ''}>${recom}${p.marca} — ${p.nome} (${p.demaos_recomendado} demãos)</option>`;
      }).join('');
    // Mantém a seleção atual
    if (config.produto_id) selProduto.value = config.produto_id;
  };
  atualizarListaProdutos();
  if (selProduto) {
    selProduto.addEventListener('change', () => {
      config.produto_id = selProduto.value;
      config.produto = selProduto.value;
      _atualizarSugestaoDemaos();
    });
  }

  const _atualizarSugestaoDemaos = () => {
    if (!outInfo || !outDemaos) return;
    const pid = selProduto?.value;
    const tipo = selTipoLaje?.value || 'laje_exposta';
    const m2 = (config.largura_cm / 100) * (config.comprimento_cm / 100);
    if (!pid) {
      outInfo.textContent = '';
      outDemaos.textContent = '';
      return;
    }
    const p = CATALOGO.find(x => x.id === pid);
    if (p) {
      outInfo.innerHTML = `<strong>${p.marca}</strong> — ${p.nome}<br>` +
        `Cobertura: <strong>${p.rendimento_m2_por_L}</strong> m²/L · ` +
        `Intervalo entre demãos: <strong>${p.intervalo_entre_demaos_horas}h</strong><br>` +
        `Validade: <strong>${p.prazo_validade_meses} meses</strong> · ` +
        `Densidade: <strong>${p.densidade_kg_L} kg/L</strong>`;
    }
    const calc = calcularDemaos(pid, tipo, m2);
    const txt = `💡 Sugerido: <strong>${calc.demaos} demaos</strong> — ` +
                `${calc.litros_total} L (~${calc.kg_total} kg). ${calc.motivo}`;
    outDemaos.innerHTML = txt;
    config.demaos = calc.demaos;
  };
  _atualizarSugestaoDemaos();

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
      `ipermabot_${nomeSafe}_${new Date().toISOString().slice(0, 10)}.txt`,
      logBook.exportarTxt(config.nome)
    );
    ui.toast('Log exportado', 'ok');
  });

  /* TELA 5 — LOG: botão "Relatório PDF" (Diferencial #7) */
  document.getElementById('btn-relatorio-pdf').addEventListener('click', () => {
    const eventosArr = logBook.todos();
    const obra = salvarObra(config.nome, estado, config, eventosArr);
    const html = gerarRelatorioHTML(obra, metricas.snapshots);
    const w = window.open('', 'relatorio', 'width=900,height=1100');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      log('info', 'Relatório PDF gerado', obra.nome);
      ui.toast('Relatório aberto em nova janela', 'ok');
    } else {
      ui.toast('Popup bloqueado — permita popups para gerar PDF', 'erro');
    }
  });

  /* TELA 5 — LOG: botão "Salvar obra" (Diferencial #9 - galeria multi-obra) */
  document.getElementById('btn-salvar-obra').addEventListener('click', () => {
    const eventosArr = logBook.todos();
    const obra = salvarObra(config.nome, estado, config, eventosArr);
    log('sucesso', 'Obra salva na galeria', `${obra.nome} (${(obra.estado.m2_feitos || 0).toFixed(1)} m²)`);
    ui.toast('Obra salva', 'ok');
    // Atualiza galeria se ela estiver aberta
    if (typeof window.atualizarGaleria === 'function') window.atualizarGaleria();
  });

  /* TELA 6 — GALERIA (Diferencial #9) */
  const btnVoltarGaleria = document.getElementById('btn-voltar-galeria');
  if (btnVoltarGaleria) {
    btnVoltarGaleria.addEventListener('click', () => ui.mostrarTela('tela-dashboard'));
  }
  // Expor para outros handlers poderem chamar
  window.atualizarGaleria = () => {
    const cont = document.getElementById('lista-galeria');
    if (!cont) return;
    const obras = listarObras().reverse();
    if (obras.length === 0) {
      cont.innerHTML = '<p style="text-align:center;color:var(--texto-med);padding:24px">'
        + 'Nenhuma obra salva ainda.<br><small>Use "Salvar obra" na aba Eventos para começar.</small></p>';
      return;
    }
    cont.innerHTML = obras.map(o => {
      const r = resumoObra(o);
      const dur = (function(s){
        const hh=Math.floor(s/3600),mm=Math.floor((s%3600)/60),ss=s%60;
        return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
      })(r.duracao);
      return `
        <article class="obra-card">
          <h3>${escapeHTML(r.nome)}</h3>
          <p class="obra-meta">${new Date(r.data).toLocaleString('pt-BR')} · ${dur}</p>
          <div class="obra-progresso" style="background:#E5E7EB;border-radius:4px;height:8px;overflow:hidden">
            <div style="background:#2E7D32;height:100%;width:${r.pct}%"></div>
          </div>
          <p class="obra-stats"><strong>${r.m2_feitos.toFixed(1)} m²</strong> de ${(o.estado.m2_total || o.config.m2_total || 0).toFixed(1)} m² (${r.pct}%)</p>
          <div class="obra-btns">
            <button class="btn-sec" data-acao="pdf" data-id="${o.id}">📄 PDF</button>
            <button class="btn-sec" data-acao="excluir" data-id="${o.id}">🗑 Excluir</button>
          </div>
        </article>`;
    }).join('');
    cont.querySelectorAll('button[data-acao]').forEach(b => {
      b.addEventListener('click', () => {
        const acao = b.dataset.acao;
        const id = b.dataset.id;
        const obra = listarObras().find(x => x.id === id);
        if (!obra) return;
        if (acao === 'pdf') {
          const html = gerarRelatorioHTML(obra, []);
          const w = window.open('', '_blank', 'width=900,height=1100');
          if (w) { w.document.open(); w.document.write(html); w.document.close(); }
        } else if (acao === 'excluir') {
          if (confirm(`Excluir obra "${obra.nome}"?`)) {
            deletarObra(id);
            window.atualizarGaleria();
            ui.toast('Obra excluída', 'ok');
          }
        }
      });
    });
  };
  // Atualiza ao abrir a tela
  const btnAbrirGaleria = document.getElementById('btn-abrir-galeria');
  if (btnAbrirGaleria) {
    btnAbrirGaleria.addEventListener('click', () => {
      ui.mostrarTela('tela-galeria');
      window.atualizarGaleria();
    });
  }

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
  // Listener do Diferencial #2 — alerta de produto vs obra restante
  window.addEventListener('ipermabot:alerta-produto', (ev) => {
    const a = ev.detail;
    if (a && a.msg) {
      const tipo = a.nivel === 'critico' ? 'erro' : 'warn';
      log(tipo, 'PRODUTO vs OBRA', a.msg);
      ui.toast(a.msg, tipo === 'erro' ? 'erro' : 'warn');
    }
  });
  log('info', 'App aberto', 'Ipermabot v1.0 carregado');
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _init);
} else {
  _init();
}

// Expor para debug no DevTools (apenas em dev)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  window.__ipermabot_debug = { config, estado, ws, simulador, log, logBook, ui, metricas };
}

// Helper de escape (usado na galeria)
function escapeHTML(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
