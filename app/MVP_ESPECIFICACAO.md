# 📱 Especificação do MVP do App — IMP-BOT

> Documento técnico-funcional para guiar o desenvolvimento do app.
> **Complementa** os wireframes SVG (mesma pasta) e o protocolo ESP32 (Anexo C).

---

## 1. Visão geral

| Item | Valor |
|---|---|
| **Nome do produto** | IMP-BOT |
| **Função** | Painel de controle remoto + telemetria + log para o Robô Aplicador |
| **Usuários primários** | Operador em obra (com luva, sob sol, 1 mão livre) |
| **Plataforma-alvo** | PWA (Progressive Web App) — funciona em Android, iOS, desktop |
| **Tamanho do time de dev (MVP)** | 1 pessoa (full-stack) ou 1 frontend + 1 backend |
| **Prazo MVP** | 6–8 semanas |
| **Orçamento MVP** | R$ 12.000 – R$ 25.000 (freelancer sênior pt-BR) |

### Por que PWA em vez de app nativo?

| Aspecto | App Nativo (Kotlin/Swift) | PWA (HTML+JS) |
|---|---|---|
| Custo MVP | R$ 40k – R$ 80k | **R$ 12k – R$ 25k** ✅ |
| Prazo MVP | 4–6 meses | **6–8 semanas** ✅ |
| Funciona offline | Sim | **Sim (com Service Worker)** ✅ |
| Instalável como app | Sim (App Store) | **Sim (Adicionar à tela)** ✅ |
| Acesso a Bluetooth/HW | Completo | Limitado (mas não usamos) ✅ |
| Push notifications | Sim | **Sim (limitado iOS)** ⚠️ |
| Multiplataforma | 2 bases de código | **1 base** ✅ |
| Manutenção | 2 stores para atualizar | **1 servidor web** ✅ |

> **Decisão:** PWA. Quando atingirmos 1.000+ usuários, avaliamos reescrever
> como nativo. Até lá, PWA custa 4x menos e serve muito bem.

---

## 2. Funcionalidades — organizado por épicos

### ÉPICO A — Conexão (fundamental)

| Funcionalidade | Prioridade | Tela | Critério de pronto |
|---|---|---|---|
| A1. Conectar via Wi-Fi (AP) automaticamente | P0 | 1 | App detecta rede "ROBO-IMP-*" e conecta |
| A2. Configurar IP do robô manualmente | P0 | 1 | Usuário digita IP, app valida |
| A3. PING: testar conexão | P0 | 1 | Indicador "Conexão OK" aparece em < 3s |
| A4. Modo simulação (sem hardware) | P1 | 1 | Toggle no rodapé; gera dados falsos coerentes |

### ÉPICO B — Operação (core do produto)

| Funcionalidade | Prioridade | Tela | Critério de pronto |
|---|---|---|---|
| B1. Exibir status atual (estado ESP32) | P0 | 2 | Atualiza a cada 1s via WebSocket |
| B2. Botão Iniciar | P0 | 2 | Envia comando; muda cor para verde pulsante |
| B3. Botão Pausar | P0 | 2 | Idem, com confirmação opcional |
| B4. Botão Parar (sempre visível) | P0 | 2 | Idem, com confirmação por segurar 2s |
| B5. Exibir m² aplicados (tempo real) | P0 | 2 | Atualiza a cada 5s |
| B6. Exibir tempo de operação | P0 | 2 | Cronômetro HH:MM |
| B7. Exibir bateria + estimativa horas | P0 | 2 | Barra colorida com % |
| B8. Exibir nível de produto | P0 | 2 | Barra colorida com % |
| B9. Exibir faixa atual / total | P1 | 2 | "Faixa 3 de 10" |
| B10. Exibir alertas ativos | P0 | 2 | Card laranja no topo quando há alerta |

### ÉPICO C — Emergência (segurança crítica)

| Funcionalidade | Prioridade | Tela | Critério de pronto |
|---|---|---|---|
| C1. Tela vermelha toma conta do app se receber `emergencia_acionada` | P0 | 3 | Mensagem aparece em < 0,5 s |
| C2. Exibir causa provável (queda, obstáculo, botão físico) | P0 | 3 | Lê `evento.tipo` e traduz para texto PT-BR |
| C3. Botão "Desbloquear e Retomar" exige segurar 3s | P0 | 3 | Botão só ativa após 3s |

### ÉPICO D — Setup da Obra (antes de iniciar)

| Funcionalidade | Prioridade | Tela | Critério de pronto |
|---|---|---|---|
| D1. Definir largura e comprimento da laje | P0 | 4 | Campos com validação numérica |
| D2. Calcular nº de faixas automaticamente | P0 | 4 | Largura ÷ 0,30, arredondado para cima |
| D3. Definir nº de demãos (1-3) | P0 | 4 | Botão + / - |
| D4. Escolher produto do catálogo | P1 | 4 | Lista pré-populada de 8 produtos comuns |
| D5. Salvar como template nomeado | P1 | 4 | Recupera na próxima obra idêntica |

### ÉPICO E — Mapa ao Vivo (para o cliente ver)

| Funcionalidade | Prioridade | Tela | Critério de pronto |
|---|---|---|---|
| E1. Renderizar grade da laje com proporção real | P1 | 5 | SVG 2D, mostra laje com áreas aplicadas |
| E2. Posição do robô atualizada em tempo real (estimada por odometria) | P1 | 5 | Círculo move a cada 1s |
| E3. Trajeto planejado (linha tracejada) | P2 | 5 | Opcional, aumenta percepção visual |
| E4. Legenda aplicável/pendente | P1 | 5 | |

### ÉPICO F — Histórico e Log (pós-obra / suporte)

| Funcionalidade | Prioridade | Tela | Critério de pronto |
|---|---|---|---|
| F1. Listar últimos 200 eventos | P0 | 6 | Tabela virtualizada |
| F2. Filtrar por tipo (info/warn/erro) | P2 | 6 | Chips de filtro |
| F3. Exportar log da obra em PDF | P1 | 6 | PDF 1 página com sumário + tabela |
| F4. Compartilhar log via WhatsApp/e-mail | P2 | 6 | Deep link para apps nativos |

### ÉPICO G — Pós-operação (relatórios ao cliente)

| Funcionalidade | Prioridade | Tela | Critério de pronto |
|---|---|---|---|
| G1. Resumo da obra (m², demãos, duração) | P1 | (modal) | Aparece quando obra = concluída |
| G2. Foto automática antes/depois (upload) | P2 | (modal) | Usuário tira foto com celular |

---

## 3. Telas — lista consolidada

| # | Nome | Tamanho estimado | Quando abre |
|---|---|---|---|
| 1 | Conexão | ~ 80 linhas JS | Splash automático |
| 2 | Dashboard | ~ 350 linhas | Após conexão OK |
| 3 | Emergência | ~ 120 linhas | Quando ESP32 reporta emergência |
| 4 | Configurar Obra | ~ 220 linhas | Menu lateral → "Nova Obra" |
| 5 | Mapa ao Vivo | ~ 200 linhas | Menu lateral → "Mapa" |
| 6 | Log/Histórico | ~ 250 linhas | Menu lateral → "Eventos" |

> Total MVP: **~1.300 linhas de JS/HTML/CSS** + Service Worker.

---

## 4. Stack técnico recomendado

| Camada | Tecnologia | Por quê |
|---|---|---|
| Frontend | React 18 + Vite | Mais rápido, mais barata para contratar |
| Estilo | TailwindCSS | Acelera prototipagem, sem CSS inline |
| Estado | Zustand (5kb) | Mais simples que Redux |
| WebSocket | `ws` (browser native) | Zero deps |
| PWA | Workbox | Padrão do Google |
| Persistência local | IndexedDB (via Dexie) | Logs e config |
| Build | Vite + PWA plugin | Gera service worker automaticamente |
| Deploy | Vercel ou Netlify | R$ 0/mês até 100k visitas |

---

## 5. Custos detalhados

| Item | Custo | Observação |
|---|---:|---|
| Dev freelancer (60 dias × R$ 220/dia) | R$ 13.200 | Pleno |
| Design UI/UX (wireframes + identidade) | R$ 3.500 | Uma vez só |
| Conta Vercel (deploy) | R$ 0 | Plano free |
| Domínio (impbot.com.br) | R$ 50/ano | |
| Apple Store/Play Store (se virar nativo) | R$ 250/ano | opcional |
| **TOTAL MVP** | **R$ 17.000** | |

### 5.1. Opções mais baratas

| Opção | Custo | Trade-off |
|---|---:|---|
| **No-code** (Glide, Appsheet) | R$ 200/mês | Limitado a formulários + planilha, sem WebSocket real |
| **PWA puro + Firebase** | R$ 5.000–8.000 (dev júnior) | Pode ter 2x mais bugs |
| **App nativo 1 plataforma** (Android Studio Java) | R$ 25.000 | Só Android; não pega cliente iPhone |
| **Comprar template de PWA + customizar** | R$ 8.000 | Poupa 3 semanas de design |

---

## 6. Roadmap de lançamento

| Marco | Quando |
|---|---|
| Especificação assinada | Esta semana |
| Contratação do dev | Esta semana |
| Wireframes UI finais (Figma) | Mês 1, semana 2 |
| Build alfa (telas 1, 2, 3) | Mês 1, semana 4 |
| Build beta (todas as 6 telas) | Mês 2, semana 2 |
| Teste em campo (com protótipo físico) | Mês 2, semana 3 |
| Teste com 3 usuários beta | Mês 2, semana 4 |
| Lançamento na Play Store / PWA | Mês 3, semana 1 |
| Iteração com feedback | Mês 3 |

---

## 7. Critérios de aceitação do MVP

> App é considerado **pronto para lançamento** quando cumpre TUDO abaixo:

- [x] Funciona em Chrome Android, Safari iOS, Chrome desktop
- [x] Conecta ao AP Wi-Fi do robô em < 10s
- [x] Mostra telemetria atualizada a cada 1s
- [x] Botão PARAR está visível em todas as telas
- [x] Emergência toma conta da tela em < 500 ms
- [x] Funciona offline (após primeira carga com conexão)
- [x] Exporta log em PDF
- [x] Tempo de carregamento inicial < 2s em 3G
- [x] Acessível em modo escuro e alto-contraste
- [x] Texto mínimo de 16 px

---

## 8. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Dev abandona o projeto | Contrato com multa + código-fonte em nosso Git desde dia 1 |
| PWA não roda em iOS antigo | Documentar versão mínima (iOS 14+) |
| Latência de WebSocket variável | Fallback com polling a cada 2s |
| Botão PARAR acionado por engano | Confirmação por segurar 2s |
| Cliente inverte comandos por idioma | Mensagens 100% em pt-BR |
| Bug trava tela de emergência | Watchdog timer de 30s reseta tela |

---

*Especificação v1.0 — Setembro/2026*
*Próximo entregável: PWA mínimo rodando (em /02_App_Web/)*
