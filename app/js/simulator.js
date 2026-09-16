/**
 * simulator.js — Simulador de operação do robô (modo offline).
 *
 * Simula telemetria coerente: tempo por faixa, consumo de bateria,
 * consumo de produto, obstáculos raros. Usado quando não há hardware.
 *
 * @module simulator
 */

import { EST } from './state.js';
import { log } from './log.js';

/** Singleton para o simulador. */
class Simulador {
  constructor() {
    this._timer = null;
    this._velocidade = 1.2;       // min por faixa (demo)
    this._m2_por_faixa = 24;
  }

  /** Inicia simulação da operação atual. */
  iniciar(estado, config, aoAtualizar) {
    if (this._timer) return;
    estado.esp_estado = EST.TRABALHANDO;
    estado.faixa = 1;
    estado.m2_feitos = 0;
    estado.tempo_inicio = Date.now();
    log('info', 'Simulação iniciada', 'Demonstração sem hardware físico');
    this._timer = setInterval(() => this._tick(estado, config, aoAtualizar), 500);
    aoAtualizar();
  }

  pausar(estado) {
    estado.esp_estado = EST.PAUSADO;
    log('warn', 'Simulação pausada');
  }

  retomar(estado) {
    estado.esp_estado = EST.TRABALHANDO;
    log('info', 'Simulação retomada');
  }

  parar(estado) {
    clearInterval(this._timer);
    this._timer = null;
    estado.esp_estado = EST.PARADO;
    log('info', 'Simulação parada');
  }

  emergencia(estado, hooks) {
    clearInterval(this._timer);
    this._timer = null;
    estado.esp_estado = EST.EMERGENCIA;
    log('erro', 'Emergência acionada');
    if (hooks && hooks.onEmergencia) hooks.onEmergencia('emergencia_acionada', 'Parada total acionada pelo operador');
  }

  reset(estado) {
    clearInterval(this._timer);
    this._timer = null;
    estado.esp_estado = EST.PARADO;
  }

  _tick(estado, config, aoAtualizar) {
    if (estado.esp_estado !== EST.TRABALHANDO) return;

    estado.m2_feitos = Math.min(estado.m2_feitos + 0.18, estado.m2_total);
    estado.bateria = Math.max(0, estado.bateria - 0.04);
    estado.produto = Math.max(0, estado.produto - 0.06);
    estado.dist_solo = 12 + (Math.random() - 0.5);
    estado.dist_obst = 200 + (Math.random() - 0.5) * 30;

    const faixaAtual = Math.floor(estado.m2_feitos / this._m2_por_faixa) + 1;
    if (faixaAtual > estado.faixa && faixaAtual <= config.num_faixas) {
      log('sucesso', `Faixa ${faixaAtual - 1} concluída`, `${this._m2_por_faixa} m² em modo simulação`);
      estado.faixa = faixaAtual;
      if (faixaAtual > config.num_faixas) {
        this.parar(estado);
        log('sucesso', 'Obra concluída', 'Todas as faixas foram simuladas');
        aoAtualizar();
        return;
      }
    }
    if (estado.bateria <= 20 && estado.bateria > 19.5) log('warn', 'Bateria em 20%');
    if (Math.random() < 0.005) {
      log('warn', 'Obstáculo detectado', 'Simulando pausa automática');
      estado.esp_estado = EST.PAUSADO;
    }
    aoAtualizar();
  }
}

export const simulador = new Simulador();
