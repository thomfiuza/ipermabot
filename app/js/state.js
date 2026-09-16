/**
 * state.js — Estado global e tipos de domínio
 * Ponto único de verdade para configuração da obra e estado do robô.
 *
 * @module state
 */

/** Estados possíveis do robô (alinhado com firmware/src/robo_impermeabilizador.ino) */
export const EST = Object.freeze({
  PARADO:      'PARADO',
  TRABALHANDO: 'TRABALHANDO',
  PAUSADO:     'PAUSADO',
  EMERGENCIA:  'EMERGENCIA',
  ERRO:        'ERRO'
});

/** Tipos de evento (espelha o enum EVENTO_TIPO do firmware) */
export const TIPO_EVENTO = Object.freeze({
  INFO:    'info',
  WARN:    'warn',
  ERRO:    'erro',
  SUCESSO: 'sucesso'
});

/** Configuração da obra (persistida em localStorage) */
export const configInicial = () => Object.freeze({
  nome: 'Obra Teste',
  largura_cm: 300,
  comprimento_cm: 800,
  num_faixas: 10,
  demaos: 1,
  produto: 'Vedapren Laje — 18L — 3,0 m²/L',
  lim_queda_cm: 25,
  lim_obst_cm: 30,
  ip_esp32: '192.168.4.1',
  wifi_ssid: 'Ipermabot-001'
});

/** Estado em tempo real (mutável, gerenciado por State) */
export const estadoInicial = () => ({
  modo: 'simulacao',
  conexao: 'conectando',
  esp_estado: EST.PARADO,
  faixa: 0,
  m2_feitos: 0,
  m2_total: 0,
  tempo_inicio: null,
  cronometro_interval: null,
  bateria: 100,
  produto: 100,
  dist_solo: 14,
  dist_obst: 200,
  emergencia_causa: '',
  emergencia_detalhe: '',
  log: [],
  hold_emergencia: null,
  contador_emergencia: 3
});

/** Singleton de estado + config — passar referências por função */
export const criarEstado = () => {
  const config = { ...configInicial() };
  const estado = estadoInicial();

  // Carregar config persistido (se houver)
  try {
    const salvo = localStorage.getItem('impbot_config_v1');
    if (salvo) Object.assign(config, JSON.parse(salvo));
  } catch (_) { /* ignore */ }

  const salvarConfig = () => {
    try {
      localStorage.setItem('impbot_config_v1', JSON.stringify(config));
    } catch (_) { /* ignore */ }
  };

  return { config, estado, salvarConfig };
};
