/**
 * transport.js — Transporte WebSocket para o ESP32.
 * Implementa o protocolo JSON documentado em docs/protocolo/PROTOCOLO_COMUNICACAO.md.
 *
 * @module transport
 */

/**
 * Transporte WebSocket.
 *
 * Exemplo:
 *   const ws = new TransporteWebSocket();
 *   const ok = await ws.conectar('192.168.4.1');
 *   if (ok) ws.enviar('iniciar', { demaos: 1 });
 *   ws.onTelemetria = (d) => console.log(d);
 */
export class TransporteWebSocket {
  constructor() {
    this.ws = null;
    this._msgId = 1;
    this._handlers = { telemetria: null, evento: null, resposta: null };
  }

  /** URL completa do WebSocket (rota /ws no ESP32). */
  static url(ip) {
    return `ws://${ip}/ws`;
  }

  /**
   * Conecta ao ESP32 no IP informado.
   * @param {string} ip — IP do robô (geralmente 192.168.4.1 em modo AP)
   * @param {number} [timeoutMs=6000] — timeout da tentativa
   * @returns {Promise<boolean>}
   */
  conectar(ip, timeoutMs = 6000) {
    return new Promise((resolve) => {
      try {
        const url = TransporteWebSocket.url(ip);
        this.ws = new WebSocket(url);

        const t = setTimeout(() => {
          try { this.ws && this.ws.close(); } catch (_) {}
          resolve(false);
        }, timeoutMs);

        this.ws.onopen = () => { clearTimeout(t); resolve(true); };
        this.ws.onerror = () => { clearTimeout(t); resolve(false); };
        this.ws.onclose = () => {};
        this.ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            this._rotear(msg);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[transport] mensagem não-JSON ignorada:', e);
          }
        };
      } catch (_) {
        resolve(false);
      }
    });
  }

  /** Encerra a conexão limpa. */
  desconectar() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
  }

  /**
   * Envia um comando ao ESP32.
   * @returns {boolean} true se foi possível enviar
   */
  enviar(cmd, params = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = JSON.stringify({ cmd, id: this._msgId++, params });
      this.ws.send(msg);
      return true;
    }
    return false;
  }

  /** Estado da conexão (true = aberta). */
  get pronto() {
    return !!(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  /** Manipulador de telemetria: set onTelemetria = (data) => {} */
  set onTelemetria(fn) { this._handlers.telemetria = fn; }
  /** Manipulador de evento: set onEvento = (data) => {} */
  set onEvento(fn)     { this._handlers.evento = fn; }
  /** Manipulador de resposta a comando: set onResposta = (msg) => {} */
  set onResposta(fn)   { this._handlers.resposta = fn; }

  _rotear(msg) {
    if (msg.evt === 'telemetria' && this._handlers.telemetria) this._handlers.telemetria(msg.data);
    else if (msg.evt === 'evento' && this._handlers.evento)     this._handlers.evento(msg.data);
    else if (this._handlers.resposta) this._handlers.resposta(msg);
  }
}
