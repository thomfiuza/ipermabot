/**
 * wizard.js — Diferencial #6: Modo operador leigo (passo-a-passo guiado).
 *
 * Fluxo de 8 passos para quem nunca operou o robô:
 *   1. Boas-vindas
 *   2. Conectar ao Wi-Fi do robô (AP "ROBO-IMP-...")
 *   3. Definir dimensões da laje
 *   4. Selecionar perfil de produto (catálogo)
 *   5. Conferir número de demãos sugerido
 *   6. Segurança: verificar botão de emergência, área limpa
 *   7. Iniciar serviço (hold-to-confirm 3s)
 *   8. Acompanhar (dica: tela Métricas)
 *
 * Funciona como modal em sequência. Cada passo tem:
 *   - título + ícone
 *   - descrição didática
 *   - call-to-action
 *   - validação opcional (next só habilitado se cumpre)
 *
 * @module wizard
 */

const ESTADO_KEY = 'impbot_wizard_v1';

/** Passos do wizard. Função `podeAvancar(ctx)` opcional para gate. */
export const PASSOS = [
  {
    id: 'bem-vindo',
    icone: '👋',
    titulo: 'Bem-vindo, operador!',
    corpo: () => `
      <p>Eu sou seu assistente <strong>IMP-BOT</strong>.</p>
      <p>Vou te guiar em 8 passos simples para colocar o robô para trabalhar.</p>
      <p style="color:var(--texto-med);font-size:13px">
        Tempo estimado: <strong>3 minutos</strong>.
        Pode voltar a qualquer momento — sem perder o que já fez.
      </p>`
  },
  {
    id: 'wifi',
    icone: '📡',
    titulo: 'Conectar ao Wi-Fi do robô',
    corpo: (ctx) => `
      <p>Na tela do celular, abra <strong>Configurações › Wi-Fi</strong> e conecte
      à rede do robô, que se chama <code>ROBO-IMP-${ctx.apSufixo || 'XX:XX:XX'}</code>.</p>
      <p>Quando voltar aqui, toque <em>Continuar</em>.</p>`
  },
  {
    id: 'laje',
    icone: '📐',
    titulo: 'Dimensões da laje',
    corpo: (ctx) => `
      <p>Diga-me as dimensões em <strong>metros</strong> (ou centímetros):</p>
      <div class="wiz-grid">
        <label>Largura (m) <input id="wiz-largura" type="number" min="1" step="0.1" value="${ctx.largura || 3.0}"></label>
        <label>Comprimento (m) <input id="wiz-comprimento" type="number" min="1" step="0.1" value="${ctx.comprimento || 5.0}"></label>
      </div>
      <p class="dica">Use a trena. Largura = lado curto, comprimento = lado longo da laje.</p>`,
    podeAvancar: () => {
      const l = +document.getElementById('wiz-largura').value;
      const c = +document.getElementById('wiz-comprimento').value;
      return l >= 1 && c >= 1;
    },
    onProximo: () => {
      // Persiste no state do consumidor
      const l = +document.getElementById('wiz-largura').value;
      const c = +document.getElementById('wiz-comprimento').value;
      return { largura: l * 100, comprimento: c * 100, largura_m: l, comprimento_m: c };
    }
  },
  {
    id: 'produto',
    icone: '🛢️',
    titulo: 'Qual produto você vai aplicar?',
    corpo: (ctx) => `
      <p>Selecione o impermeabilizante da obra. Vou sugerir a quantidade de demãos.</p>
      <select id="wiz-produto" class="wiz-select">
        <option value="">— escolha —</option>
        ${(ctx.catalogo || []).map(p => `<option value="${p.id}" ${ctx.produto_id === p.id ? 'selected' : ''}>${p.nome} — ${p.marca}</option>`).join('')}
      </select>
      <div id="wiz-produto-info" class="dica"></div>`,
    onProximo: () => ({
      produto_id: document.getElementById('wiz-produto').value || null
    })
  },
  {
    id: 'demaos',
    icone: '🎨',
    titulo: 'Quantas demãos?',
    corpo: (ctx) => {
      const p = (ctx.catalogo || []).find(x => x.id === ctx.produto_id);
      const reco = p ? p.demaos_recomendado : 3;
      const recoTxt = `<strong>${reco} demãos</strong>`;
      return `<p>Para o produto selecionado, recomendo <strong>${recoTxt}</strong>.</p>
        <p>Você pode ajustar abaixo:</p>
        <div class="wiz-grid">
          <label>Demãos <input id="wiz-demaos" type="number" min="1" max="6" value="${ctx.demaos || reco}"></label>
        </div>
        <p class="dica">Mais demãos = mais proteção + mais tempo.</p>`;
    },
    podeAvancar: () => {
      const d = +document.getElementById('wiz-demaos').value;
      return d >= 1 && d <= 6;
    },
    onProximo: () => ({ demãos: +document.getElementById('wiz-demaos').value })
  },
  {
    id: 'seguranca',
    icone: '🦺',
    titulo: 'Verificação de segurança',
    corpo: () => `
      <p>Antes de iniciar, <strong>confirme os 4 itens</strong> abaixo:</p>
      <ul class="checklist">
        <li><label><input type="checkbox" id="wiz-seg-1"> <span>Robô posicionado dentro da laje</span></label></li>
        <li><label><input type="checkbox" id="wiz-seg-2"> <span>Botão de emergência testado e acessível</span></label></li>
        <li><label><input type="checkbox" id="wiz-seg-3"> <span>Área limpa (sem ferramentas soltas)</span></label></li>
        <li><label><input type="checkbox" id="wiz-seg-4"> <span>Galão de produto está cheio (≥ 80%)</span></label></li>
      </ul>
      <p class="dica">Os 4 devem estar marcados para continuar.</p>`,
    podeAvancar: () => ['1', '2', '3', '4'].every(i => document.getElementById('wiz-seg-' + i)?.checked)
  },
  {
    id: 'iniciar',
    icone: '▶️',
    titulo: 'Vamos começar!',
    corpo: () => `
      <p>Quando estiver pronto, <strong>segure o botão abaixo por 3 segundos</strong>.
      Isso evita partida acidental.</p>
      <p style="text-align:center">
        <button id="wiz-hold-start" type="button" class="hold-btn">Segure para iniciar</button>
      </p>
      <p class="dica">Se soltar antes do tempo, nada acontece — pode tentar de novo.</p>`
  },
  {
    id: 'concluido',
    icone: '🎉',
    titulo: 'Tudo certo!',
    corpo: () => `
      <p>Robô iniciando serviço. Volte a esta tela a qualquer momento — agora com
      <strong>métricas em tempo real</strong> na aba <em>Métricas</em>.</p>
      <p class="dica">Boa obra! 💪</p>`
  }
];

/**
 * Singleton Wizard UI.
 * Permite iniciar do zero e navegar entre passos.
 */
export class Wizard {
  constructor(opcoes = {}) {
    this.opcoes = opcoes;
    this.contexto = {};
    this.passos = PASSOS;
    this.atual = 0;
    this._concluido = false;
    this.onUpdate = null;
    this.onConcluir = null;
    this._estado_anterior = null;
    try {
      this._estado_anterior = localStorage.getItem(ESTADO_KEY);
    } catch (_) {}
  }

  iniciar(catalogo = []) {
    this.contexto = { catalogo };
    if (this._estado_anterior) {
      try {
        const j = JSON.parse(this._estado_anterior);
        this.atual = j.atual || 0;
        this.contexto = { ...this.contexto, ...(j.contexto || {}) };
      } catch (_) {}
    }
    this._montarModal();
    this._render();
  }

  _persistir() {
    try {
      localStorage.setItem(ESTADO_KEY, JSON.stringify({
        atual: this.atual,
        contexto: this.contexto
      }));
    } catch (_) {}
  }

  _montarModal() {
    if (document.getElementById('wizard-modal')) {
      document.getElementById('wizard-modal').remove();
    }
    const div = document.createElement('div');
    div.id = 'wizard-modal';
    div.className = 'modal';
    div.innerHTML = `
      <div class="modal-fundo"></div>
      <div class="wizard-modal-conteudo">
        <header class="wizard-topo">
          <span id="wizard-progresso"></span>
          <button id="wizard-fechar" class="btn-icone" type="button" aria-label="Fechar">✕</button>
        </header>
        <div class="wizard-progresso-bar"><div id="wizard-progresso-fill"></div></div>
        <div class="wizard-corpo" id="wizard-corpo"></div>
        <footer class="wizard-rodape">
          <button id="wizard-anterior" type="button" class="btn-sec">← Voltar</button>
          <button id="wizard-proximo" type="button" class="btn-prim">Continuar →</button>
        </footer>
      </div>`;
    document.body.appendChild(div);

    document.getElementById('wizard-fechar').addEventListener('click', () => this.fechar());
    document.getElementById('wizard-anterior').addEventListener('click', () => this._anterior());
    document.getElementById('wizard-proximo').addEventListener('click', () => this._proximo());
    document.addEventListener('keydown', this._onKey);
  }

  _onKey = (e) => {
    if (e.key === 'Escape') this.fechar();
    if (e.key === 'Enter' && this.atual < this.passos.length - 1) {
      const elem = document.activeElement;
      // Não avança se está em textarea
      if (elem?.tagName !== 'TEXTAREA') this._proximo();
    }
  }

  fechar() {
    const m = document.getElementById('wizard-modal');
    if (m) m.remove();
    document.removeEventListener('keydown', this._onKey);
  }

  _render() {
    const passo = this.passos[this.atual];
    const pct = Math.round(((this.atual + 1) / this.passos.length) * 100);

    document.getElementById('wizard-progresso').innerHTML =
      `<strong>${passo.icone} ${passo.titulo}</strong> — passo ${this.atual + 1} de ${this.passos.length}`;
    document.getElementById('wizard-progresso-fill').style.width = pct + '%';
    document.getElementById('wizard-corpo').innerHTML = passo.corpo(this.contexto);

    // Botsões
    const anterior = document.getElementById('wizard-anterior');
    anterior.disabled = this.atual === 0;
    anterior.style.visibility = this.atual === 0 ? 'hidden' : 'visible';

    const proximo = document.getElementById('wizard-proximo');
    if (this.atual === this.passos.length - 1) {
      proximo.textContent = '✓ Concluir';
      proximo.onclick = () => this.fechar();
    } else if (this.atual === this.passos.length - 2) {
      // Passo "iniciar" — desabilita até o hold
      proximo.disabled = true;
      proximo.textContent = 'Aguardando segurar botão';
      // Botão hold
      const hold = document.getElementById('wiz-hold-start');
      if (hold) {
        import('./utils.js').then(u => {
          u.holdToConfirm(hold, 3000, () => {
            proximo.disabled = false;
            proximo.textContent = 'Iniciar serviço →';
            proximo.focus();
            if (typeof window.__start_service === 'function') window.__start_service();
          });
        });
      }
    } else {
      proximo.disabled = !this._podeAvancar();
      proximo.textContent = 'Continuar →';
      // Re-após validação dinâmica
      const check = () => { proximo.disabled = !this._podeAvancar(); };
      // Inputs/checkboxes que podem mudar o estado de validação
      document.querySelectorAll('#wizard-corpo input, #wizard-corpo select').forEach(el => {
        el.addEventListener('input', check);
        el.addEventListener('change', check);
      });
    }

    this._persistir();
    if (this.onUpdate) this.onUpdate(this.atual, this.passos.length, passo.id);
  }

  _podeAvancar() {
    const passo = this.passos[this.atual];
    if (passo.podeAvancar) {
      try { return passo.podeAvancar(this.contexto); }
      catch (_) { return false; }
    }
    return true;
  }

  _anterior() {
    if (this.atual > 0) { this.atual--; this._render(); }
  }

  _proximo() {
    const passo = this.passos[this.atual];
    if (passo.onProximo) {
      try {
        const parcial = passo.onProximo(this.contexto);
        if (parcial) Object.assign(this.contexto, parcial);
      } catch (e) {
        console.warn('wizard: onProximo falhou', e);
      }
    }
    if (this.atual < this.passos.length - 1) {
      this.atual++;
      this._render();
      if (this.atual === this.passos.length - 1 && this.onConcluir) {
        this.onConcluir(this.contexto);
      }
    }
  }

  /** Concluído? */
  isCompleto() {
    return this._concluido;
  }

  /** Reseta o wizard. */
  resetar() {
    this.atual = 0;
    this.contexto = {};
    this._concluido = false;
    try { localStorage.removeItem(ESTADO_KEY); } catch (_) {}
  }
}

/**
 * Função de conveniência: cria e inicia o wizard.
 */
export function iniciarWizard(catalogo = []) {
  const w = new Wizard();
  w.iniciar(catalogo);
  return w;
}
