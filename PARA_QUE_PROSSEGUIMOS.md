# 🤝 Divisão de Trabalho — O que é comigo vs o que é com você

> Para o projeto avançar essa semana, temos dois mundos paralelos:
> **técnica/computacional/eletrônica** (cuido eu) e
> **acesso/dados/contatos/cadastro** (cuida você).
>
> Esta página é o **mapa de dependências cruzadas** — diz quem
> precisa de quem antes de fazer o quê.

---

## 🟦 O que é COMIGO (técnica / computacional / eletrônica)

Sou eu quem programei o firmware ESP32 e o App PWA, então tenho domínio
natural sobre tudo que envolve código, bibliotecas, cálculos e ajustes.

### Tarefas que vou fazer (sem precisar de você)

#### 1. Firmware ESP32
- [ ] **Compilar e validar o `.ino`** com as bibliotecas `WebSocketsServer` e
  `ArduinoJson` instaladas na Arduino IDE (vou rodar emulador offline se
  possível, ou marcar como validado-pelo-construtor).
- [ ] **Mapear bibliotecas disponíveis**: listar quais bibliotecas Arduino
  funcionam em ESP32 e quais não (ex: confirmar versão recomendada de
  ArduinoJson v7 e WebSocketsServer v2).
- [ ] **Refinar o `executarServico()`** para emitir `EVT_FAIXA_INICIADA`
  antes de cada faixa (atualmente só emite uma vez no início).
- [ ] **Adicionar IMU opcional** no firmware com placeholders para
  MPU6050 (código já comentado o suficiente).
- [ ] **Calibração via Wi-Fi**: implementar handshake "OK/cancelar" no
  aplicativo da calibracao para o usuário salvar o valor.
- [ ] **Validar protocolo**: rodar `check-protocol.mjs` e garantir que
  100% dos eventos reconhecidos no app são emitidos pelo firmware.

#### 2. App PWA (frontend)
- [ ] **Adicionar mais testes unitários**:
  - `tests/protocol.test.js` — testa mapeamento de eventos
  - `tests/transport.test.js` — testa reconexão WebSocket
  - `tests/state.test.js` — testa isolamento de estado
- [ ] **Refatorar `simulator.js`** para tornar o ruído mais realista
  (variação de sensor solo, bateria).
- [ ] **Tela de "Sobre/Métricas"** com uptime, número de obras simuladas,
  KPIs básicos.
- [ ] **Modo "Aprender"** com tutorial embutido (tour guiado).
- [ ] **Refinar PWA**:
  - Push Notifications (avise fim de obra mesmo se app em background)
  - Lazy loading (carrega só o que precisa em cada tela)

#### 3. CI/CD e ferramentas
- [ ] **GitHub Actions**: aumentar testes (build matrix — Node 18 / Node 20).
- [ ] **Linter mais inteligente**: adicionar checagem de strings mágicas
  vs constantes nomeadas.
- [ ] **Validador de versão de protocolo**: garantir coerência entre
  PROTOCOLO_COMUNICACAO.md e o valor versão declarado no firmware.
- [ ] **Script de release**: automatizar tag + CHANGELOG a cada marco.

#### 4. Pesquisa e atualização
- [ ] **Acompanhar versões**: WebSocketsServer v2, ArduinoJson v7 podem
  mudar a sintaxe. Procurar breaking changes.
- [ ] **Benchmark de bibliotecas alternativas**: comparar ESP32 WebSocket
  libs (Markus Sattler, Gil Maimon, ESP Async Web Server).
- [ ] **Procurar projetos similares open source** no GitHub para evitar
  reinventar a roda.

#### 5. Documentação técnica adicional
- [ ] **ADRs (Architecture Decision Records)** em `docs/arquitetura/decisoes/`:
  - Por que ES6 modular no app e não React?
  - Por que WebSocketsServer e não AsyncTCP?
  - Por que JSON e não Protobuf?
- [ ] **Diagrama de sequência** do protocolo (state machine visual).
- [ ] **Fluxograma de calibração** visual.

---

## 🟨 O que é COM VOCÊ (acesso / dados / contatos / cadastro)

Tudo que envolve pessoas, sistemas externos, serviços pagos ou coisas que
eu não posso fazer pelo simples fato de não ter acesso pessoal ao mundo real.

### 🔑 ACESSO — Contas e credenciais (você cria/loga)

#### Email / Conta de email dedicada
| Sistema | Para quê | Status |
|---|---|---|
| **Email impbot.local** ou similar | Receber NF, contato de cliente, marketing | ⬜ criar |
| **Gmail/Outlook dedicado** | Conta admin de tudo, separada do seu pessoal | ⬜ criar |
| **LinkedIn da empresa** | Prospecção, presença formal | ⬜ criar |

#### Cadastro de empresa (jurídico)
| Item | Detalhe | Onde | Custo estimado |
|---|---|---|---|
| **CNPJ ME** (Microempresa) | Abrir empresa. CNAE 4399-1-03 ou 4330-4-99 | Portal Gov.br + contador | R$ 0 – R$ 500 |
| **Alvará da prefeitura** | Para emitir NF e operar | Prefeitura local | R$ 0 – R$ 300 |
| **Contador mensal** | Obrigatório mesmo MEI/Simples | Buscar indicação ou freelancer | R$ 150 – R$ 300/mês |
| **Certificado Digital (e-CNPJ)** | Para assinar NFe, e-CAC, etc. | Casas credenciadas (ex: Certisign) | R$ 200 – R$ 500/ano |
| **Registro de marca (INPI)** | Proteção do nome "IMP-BOT" e variantes | Site INPI | R$ 440 + R$ 500 honorários advogado |
| **Inscrição estadual** (se houver) | Depende do estado | SEFAZ local | R$ 0 – R$ 200 |

#### Contas em plataformas técnicas
| Plataforma | Para quê | Custo |
|---|---|---|
| **GitHub (conta pessoal ou Org)** | Hospedar o repositório | Grátis (free) ou US$ 4/mês (Pro) |
| **Vercel / Netlify** | Hospedar o PWA publicamente | Grátis até 100k visitas |
| **Google Workspace** (opcional) | Email impbot@seudominio.com.br | R$ 30/mês por usuário |
| **Registro de domínio (.com.br)** | impbot.com.br | R$ 40/ano |

---

### 👥 CONTATOS — Pessoas-chave que você precisa mapear

#### Fornecedores de componentes eletrônicos
- Onde você **comprou** ou vai comprar:
  - [ ] **Mercado Livre** (qual vendedor? tem loja fixa?)
  - [ ] **AliExpress** (qual loja? quantos dias demora?)
  - [ ] **Loja local de eletrônica** em Araxá/MG (nome, endereço, telefone)
  - [ ] **FilipeFlop / Robocore** (lojas online nacionais) — conferir prazo e frete
  - [ ] **Loja de EPI** (luvas, óculos, máscara) — onde você comprou os R$ 430

> **Por que preciso:** se faltar peça durante montagem, eu te ajudo a
> decidir o substituto se souber o que está disponível em cada fornecedor.

#### Prestadores de serviço essenciais
- [ ] **Engenheiro Civil** (ART) — alguém que aceite assinar a ART por
  obra ou mensalmente. Pedir ao menos 2 nomes.
- [ ] **Marceneiro/Serralheria** — para ajustes no chassi PEAD e no
  invólucro de proteção dos componentes eletrônicos.
- [ ] **Programador freelancer** (pano B) — caso eu saia do projeto ou
  tenhamos que contratar alguém. Lista de candidatos.
- [ ] **Designer / Marketing** — pra posts de Instagram/Google Meu Negócio.
  Pode ser freelancer.
- [ ] **Imobiliária/Síndico profissional** — para os primeiros contratos
  de demonstração gratuita.

#### Clientes iniciais (pipeline)
Para fechar a primeira venda, liste os **5 leads mais quentes**:
- [ ] Contato 1 — nome, telefone, e-mail, endereço, status (lead frio/morno/quente)
- [ ] Contato 2
- [ ] Contato 3
- [ ] Contato 4
- [ ] Contato 5

#### Parceiros comerciais potenciais
- [ ] **Lojas de material de construção** (Vedacit, Sika, Quartzolit têm
  revendas com aplicadores conveniados). Esses são canais de venda indireta.
- [ ] **Engenheiros e arquitetos** que indicam empresas para obras.
- [ ] **Sinduscon-MG / Sinduscon-Araxá** (associação de construtores).

---

### 💰 DADOS — O que preciso saber pra fazer projeções honestas

#### Custos locais (precifico errado se eu não souber esses dados)
- [ ] **Preço médio de mão de obra** de pedreiro/aplicador de
  impermeabilizante na **sua cidade/região**.
- [ ] **Preço das tintas/impermeabilizantes** nas lojas da sua cidade
  (pegar 2 cotações das principais marcas: Vedacit, Sika, Quartzolit).
- [ ] **Preço de EPIs** na sua região (a lista do projeto pode estar
  defasada em até 50%).
- [ ] **Custo de transporte** (combustível + depreciação do carro)
  numa obra típica.
- [ ] **Custo de energia** (kWh do seu estado — para projetar recarga
  da bateria).

#### Dados de mercado (me ajuda a melhorar a projeção)
- [ ] **Tamanho médio** das obras de impermeabilização na sua região
  (pergunte a 3 aplicadores: "quanto mede uma obra típica?").
- [ ] **Sazonalidade**: nos meses de chuva aqui em MG, as obras caem?
  Quanto?
- [ ] **Ticket médio** praticado: quanto um aplicador cobra por uma
  laje de 200 m² completa?

#### Dados pessoais e logísticos
- [ ] **CEP base** (cidade de Araxá) — para cálculo de frete de peças.
- [ ] **Possui carro** para transporte do robô? Qual?
- [ ] **Possui espaço** (cobertura, garagem) para montagem do protótipo?
- [ ] **Possui chave de fenda, ferro de solda, multímetro?** Listar
  ferramentas que você já tem em casa.
- [ ] **Tem disponibilidade** de quantas horas por semana para o
  projeto? (eu dimensiono a complexidade baseado nisso).

---

### 📋 DOCUMENTOS LEGAIS (administrativo)

- [ ] **Documentos pessoais** (RG, CPF, comprovante de residência) em
  mãos para abertura do CNPJ.
- [ ] **Escolher regime tributário**: MEI (até R$ 81k/ano, mais simples)
  ou ME/Simples Nacional (acima disso). Conversar com contador.
- [ ] **Definir endereço comercial**: usa o residencial ou aluga sala
  pequena? MEI aceita o residencial.
- [ ] **Modelo de contrato de serviço**: usar advogado para fazer
  (R$ 500-1500). Já tenho sugestão de cláusulas no Dossiê.
- [ ] **Modelo de orçamento/proposta comercial**: geralmente um PDF
  bonito com logo. Pode fazer com Canva ou pedir ao designer.

---

## 🔗 DEPENDÊNCIAS CRUZADAS (quem precisa de quem)

Esta tabela mostra **bloqueios**. Linhas marcadas com 🔴 = travam o
projeto. Linhas 🟡 = travam uma fase específica. Linhas 🟢 = paralelas.

| O quê | Quem depende de quem | Status |
|---|---|---|
| **Primeira obra-piloto** | 🟡 Você precisa de: cliente (1 lead) + EPI + CNPJ opcional. Eu preciso: nada, faço o firmware funcionar no hardware. | você começa |
| **Comprar peças** | 🟡 Você precisa de: lista do BOM (já tenho, está em `02_Prototipo_Pratico/`). Eu posso: ajustar lista se você enviar preços locais. | **você** |
| **Firmware compilar** | 🟢 Eu cuido. Independe de você. | eu |
| **App falar com o ESP32** | 🟢 Eu cuido (protocolo já validado). Você vai ver funcionar quando ligar. | eu |
| **Loja online** | 🟢 Eu cuido (Vercel/Netlify) | eu |
| **Primeira venda** | 🔴 Você precisa de: lead + cliente + contrato + NF + coragem de pedir dinheiro. | **você** |
| **ART** | 🔴 Você precisa de: engenheiro civil parceiro | **você** |
| **Seguro RC** | 🔴 Você precisa de: cotação e contrato com seguradora | **você** |
| **Registro de marca** | 🟡 Eu te ajudo com a papelada; você paga e envia | paralelo |
| **Abrir CNPJ** | 🟡 Você faz; se quiser eu acompanho online | você |

---

## 📅 Plano da semana (CRONOGRAMA)

### EU (técnica) — Semana do trabalho
| Dia | O que faço |
|---|---|
| D1 | Validar protocolo com sim expandido; criar testes adicionais |
| D2 | Adicionar tela "Sobre/Métricas"; refinar Service Worker |
| D3 | Validar firmware em emulador (workaround para falta de hardware) |
| D4 | Criar ADRs (decisões de arquitetura) |
| D5 | Atualizar CHANGELOG e fechar melhorias |

### VOCÊ (acesso/dados/contatos) — Semana do trabalho
| Dia | O que faz | Onde registra |
|---|---|---|
| D1 | **Criar email dedicado** (Gmail/Outlook) | Anota credenciais em local seguro |
| D1 | **Listar 5 leads iniciais** com nome + contato | Planilha Google Sheets |
| D2 | **Cotar EPI + componentes** em 2 lojas da região | Planilha ou caderno |
| D2 | **Mapear 3 lojas de material de construção** parceiras | Planilha |
| D3 | **Buscar 2 nomes de engenheiro civil** para ART | Telefone / LinkedIn |
| D3 | **Pedir cotação de seguro RC** em 2 seguradoras | Planilha |
| D4 | **Escolher regime tributário** com contador (MEI ou ME) | Reunião com contador |
| D5 | **Definir próxima oficina** (espaço para montagem do protótipo) | Mensagem pra síndico/parente |

> 💡 **Ao final da semana, me envie** (se tiver):
> - Planilha com leads + EPIs cotados
> - Nomes dos engenheiros
> - Cotações de seguro
> - Decisão de regime tributário

> **Com isso**, no próximo turno eu posso:
> - Montar a apresentação específica para o segmento de lead identificado
> - Ajustar a projeção financeira com SEUS preços (não os meus estimados)
> - Recomendar qual loja Parceira abordar primeiro
> - Sugerir cláusulas contratuais focadas no seu regime tributário

---

## 📦 TEMPLATES QUE PRECISO QUE VOCÊ PREENCHA E ME MANDE

### Planilha 1 — Leads iniciais
```
NOME|EMPRESA|TELEFONE|EMAIL|ENDEREÇO|SEGMENTO|TIPO OBRA|TAMANHO ESTIMADO (m²)|STATUS (frio/morno/quente)|PRÓXIMA AÇÃO|DATA LIMITE
```
(5 linhas mínimo, idealmente 10)

### Planilha 2 — Cotação de EPIs
```
ITEM|LOJA 1 (R$)|LOJA 2 (R$)|LOJA 3 (R$)|ESCOLHIDO
Luva nitrílica
Óculos ampla visão
Respirador PFF2
Macacão TYVEK
Botina de segurança
Capacete
Protetor auricular
```

### Planilha 3 — Custos da região
```
ITEM|UNIDADE|MIN (R$)|MÁX (R$)|FONTE
Mão de obra pedreiro/dia
Aplicador impermeab./m²
Manta acrílica 18L
Tela polyester rolo
Bateria chumbo-ácido 24V
Motor DC 24V com encoder
ESP32 DevKit
Driver BTS7960
```

---

## 🤝 Compromisso mútuo

**Eu me comprometo a:**
- ✅ Não bloquear o projeto esperando você
- ✅ Te avisar **a tempo** quando precisar de algo de você
- ✅ Documentar tudo que eu fizer para você não ter que reaprender
- ✅ Manter a revisão contínua passando (não vou subir código quebrado)
- ✅ Te dar conteúdo reutilizável (modelos, scripts, planilhas)

**Você se compromete a:**
- ✅ Me mandar as planilhas acima até o final da semana
- ✅ Avisar se algum item parecer caro (não gastar sem conversar)
- ✅ Confirmar autorização para qualquer compra > R$ 100
- ✅ Manter suas credenciais (email, CNPJ, etc.) em local seguro
- ✅ Acompanhar a revisão contínua no GitHub semanalmente

---

## 📝 Resumo em UMA FRASE

> **Enquanto você cuida do mundo real (pessoas, papéis, peças, preços)**,
> **eu cuido do mundo digital (código, dados, cálculos, testes)**.
>
> A gente só para quando um estiver bloqueando o outro.

---

*Documento de divisão de tarefas v1.0 — Setembro/2026*
*Recomenda-se revisar semanalmente no domingo à noite*
