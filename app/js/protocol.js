/**
 * protocol.js — Decodificador do protocolo do ESP32.
 *
 * Converte respostas do firmware (JSON) em atualizações de estado local.
 * Mantém coerência com PROTOCOLO_COMUNICACAO.md — se o firmware adicionar
 * um evento novo, edite o `MAPA_EVENTOS` aqui também.
 *
 * @module protocol
 */

import { normalizarEstado } from './utils.js';
import { EST } from './state.js';

/** Mapa de eventos do firmware → forma de exibição no app. */
const MAPA_EVENTOS = Object.freeze({
  faixa_iniciada:      { tipo: 'info',    titulo: 'Faixa iniciada' },
  faixa_concluida:     { tipo: 'sucesso', titulo: 'Faixa concluída' },
  obra_concluida:      { tipo: 'sucesso', titulo: 'Obra concluída' },
  obstaculo_detectado: { tipo: 'warn',    titulo: 'Obstáculo' },
  queda_detectada:     { tipo: 'erro',    titulo: 'Queda detectada', emergencia: true },
  emergencia_acionada: { tipo: 'erro',    titulo: 'Emergência acionada', emergencia: true },
  bateria_baixa:       { tipo: 'warn',    titulo: 'Bateria baixa' },
  produto_baixo:       { tipo: 'warn',    titulo: 'Produto baixo' },
  erro_sensor:         { tipo: 'erro',    titulo: 'Erro de sensor' },
  erro_motor:          { tipo: 'erro',    titulo: 'Erro de motor' },
  iniciado:            { tipo: 'info',    titulo: 'Robô ligado' },
  wifi_conectado:      { tipo: 'info',    titulo: 'Wi-Fi conectado' }
});

/** Traduz uma resposta a comando (sem `evt`) — mensagem com `id` e `data`. */
export function tratarResposta(msg, log, ctx) {
  if (msg.id && msg.ok === false) {
    log('erro', `Erro do ESP32 (id=${msg.id})`, msg.err || 'desconhecido');
    return;
  }
  if (msg.ok && msg.data) {
    const d = msg.data;
    if (d.estado)        ctx.estado.esp_estado = normalizarEstado(d.estado);
    if (d.m2_feitos !== undefined)  ctx.estado.m2_feitos = d.m2_feitos;
    if (d.bateria_pct !== undefined)ctx.estado.bateria = d.bateria_pct;
    if (d.produto_pct !== undefined)ctx.estado.produto = d.produto_pct;
    if (d.faixa_atual !== undefined)ctx.estado.faixa = d.faixa_atual;
  }
}

/** Processa telemetria periódica. */
export function tratarTelemetria(d, estado, config, hooks) {
  if (!d) return;
  if (d.estado)        estado.esp_estado = normalizarEstado(d.estado);
  if (d.bateria_pct !== undefined) estado.bateria = d.bateria_pct;
  if (d.produto_pct !== undefined) estado.produto = d.produto_pct;
  if (d.faixa_atual !== undefined) estado.faixa = d.faixa_atual;
  if (d.m2_feitos !== undefined)   estado.m2_feitos = d.m2_feitos;

  if (d.distancia_solo !== undefined) {
    estado.dist_solo = d.distancia_solo;
    if (d.distancia_solo > config.lim_queda_cm && estado.esp_estado === EST.TRABALHANDO && hooks.onQueda) {
      hooks.onQueda(d.distancia_solo, config.lim_queda_cm);
    }
  }
  if (d.distancia_frente !== undefined) {
    estado.dist_obst = d.distancia_frente;
    if (d.distancia_frente < config.lim_obst_cm && estado.esp_estado === EST.TRABALHANDO && hooks.onObstaculo) {
      hooks.onObstaculo(d.distancia_frente, config.lim_obst_cm);
    }
  }
}

/** Processa um evento discreto do firmware. */
export function tratarEvento(d, log, hooks) {
  if (!d || !d.tipo) return;
  const m = MAPA_EVENTOS[d.tipo];
  if (m) {
    log(m.tipo, m.titulo, d.descricao || '');
    if (m.emergencia && hooks.onEmergencia) hooks.onEmergencia(d.tipo, d.descricao || '');
  }
}
