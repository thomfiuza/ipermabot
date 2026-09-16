/**
 * log.js — Sistema de log de eventos com persistência em IndexedDB.
 *
 * Para simplicidade do MVP usa array em memória + localStorage (metadados).
 * O log é o histórico oficial da obra que será exportado como PDF/TXT.
 *
 * @module log
 */

const CHAVE_LOG = 'impbot_log_v1';
const MAX_EVENTOS = 200;

/** Singleton de log (apenas um por sessão de app). */
class LogBook {
  constructor() {
    this.eventos = [];
    this._recuperar();
  }

  _recuperar() {
    try {
      const salvo = localStorage.getItem(CHAVE_LOG);
      if (salvo) this.eventos = JSON.parse(salvo).slice(0, MAX_EVENTOS);
    } catch (_) {}
  }

  _persistir() {
    try {
      localStorage.setItem(CHAVE_LOG, JSON.stringify(this.eventos));
    } catch (_) {}
  }

  /** Adiciona um evento. Eventos mais recentes ficam no início. */
  add(tipo, titulo, desc = '', data = new Date()) {
    this.eventos.unshift({ tipo, titulo, desc, data: data.toISOString() });
    if (this.eventos.length > MAX_EVENTOS) this.eventos.length = MAX_EVENTOS;
    this._persistir();
    if (this.onChange) this.onChange();
  }

  /** Limpa todos os eventos (use no início de nova obra). */
  limpar() {
    this.eventos = [];
    this._persistir();
    if (this.onChange) this.onChange();
  }

  /** Retorna cópia rasa. */
  todos() {
    return [...this.eventos];
  }

  /** Gera texto formatado para export. */
  exportarTxt(nomeObra) {
    const linhas = this.eventos.map(e => {
      const hora = new Date(e.data).toLocaleString('pt-BR');
      return `[${hora}] ${e.tipo.toUpperCase().padEnd(8)} — ${e.titulo}${e.desc ? ' — ' + e.desc : ''}`;
    }).join('\n');
    const cab = `IMP-BOT — Relatório de Obra\nObra: ${nomeObra}\nGerado em: ${new Date().toLocaleString('pt-BR')}\nEventos: ${this.eventos.length}\n\n`;
    return cab + linhas;
  }
}

export const logBook = new LogBook();

/** Wrapper de conveniência. */
export const log = (tipo, titulo, desc) => {
  logBook.add(tipo, titulo, desc);
};
