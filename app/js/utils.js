/**
 * utils.js — Funções utilitárias puras (sem efeitos colaterais).
 *
 * @module utils
 */

/** Normaliza string de estado vinda do firmware para uma chave do enum. */
export function normalizarEstado(s) {
  const u = String(s || '').toUpperCase();
  for (const k of ['TRABALHANDO', 'PAUSADO', 'EMERGENCIA', 'ERRO', 'PARADO']) {
    if (u.includes(k)) return k;
  }
  return 'PARADO';
}

/** Formata milissegundos em HH:MM:SS. */
export function formatarHMS(ms) {
  const segs = Math.floor(ms / 1000);
  const h = Math.floor(segs / 3600);
  const m = Math.floor((segs % 3600) / 60);
  const s = segs % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/** Calcula número de faixas com base na largura da laje (cada faixa = 30 cm). */
export function calcularNumFaixas(larguraCm) {
  return Math.max(1, Math.ceil(larguraCm / 30));
}

/** Calcula área total em m² considerando demãos. */
export function calcularAreaTotalM2(larguraCm, comprimentoCm, demaos) {
  const areaBase = (larguraCm / 100) * (comprimentoCm / 100);
  return Math.round(areaBase * demaos);
}

/** Formata tipo de evento → classe CSS. */
export function classeTipoEvento(tipo) {
  const m = {
    info:    'evento-tipo-info',
    warn:    'evento-tipo-warn',
    erro:    'evento-tipo-erro',
    sucesso: 'evento-tipo-sucesso'
  };
  return m[tipo] || 'evento-tipo-info';
}

/** Converte data para HH:MM em pt-BR. */
export function horaLocalCurta(d) {
  return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Valida se string é IP no formato IPv4. */
export function ipv4Valido(ip) {
  if (!ip) return false;
  const parts = String(ip).split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = Number(p);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

/**
 * Hold-to-confirm genérico. Dispara callback após `ms` milissegundos
 * segurando o botão; cancela se o usuário soltar antes.
 *
 * @param {HTMLElement} el
 * @param {number} ms
 * @param {() => void} onComplete
 */
export function holdToConfirm(el, ms, onComplete) {
  let timer = null;
  const begin = (e) => {
    e.preventDefault();
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      onComplete && onComplete();
    }, ms);
  };
  const end = (e) => {
    e.preventDefault();
    if (timer) { clearTimeout(timer); timer = null; }
  };
  el.addEventListener('mousedown', begin);
  el.addEventListener('touchstart', begin, { passive: false });
  el.addEventListener('mouseup', end);
  el.addEventListener('mouseleave', end);
  el.addEventListener('touchend', end);
  el.addEventListener('touchcancel', end);
}

/**
 * Downloads a text file in browser.
 * @param {string} name nome do arquivo
 * @param {string} content conteúdo
 * @param {string} [mime="text/plain;charset=utf-8"]
 */
export function downloadTexto(name, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
