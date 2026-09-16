# 🔌 Protocolo de Comunicação ESP32 ↔ App / CLI Serial

> Especificação técnica completa dos comandos que o ESP32 aceita e responde.
> **Esta é a "ponte" entre o firmware e qualquer aplicativo (web, mobile, CLI).**

---

## 1. Visão geral

| Aspecto | Valor |
|---|---|
| **Microcontrolador** | ESP32 DevKit (qualquer variação com Wi-Fi) |
| **Wi-Fi** | 2,4 GHz, modo Access Point (AP) e Station (STA) |
| **Protocolo de transporte** | UDP (baixa latência) ou HTTP/WebSocket (debug) |
| **Protocolo de aplicação** | JSON simples (1 linha = 1 comando) |
| **Serial (para testes)** | 115.200 bps, 8N1 |
| **Versão do protocolo** | 1.0 — congelada nesta entrega |

> ⚠️ **Não use Bluetooth** para esse projeto: latência variável
> e pareamento atrapalham operação em campo.

---

## 2. Modos de operação

| Modo | Como ativar | Quando usar |
|---|---|---|
| **AP_DIRETO** | ESP32 vira ponto de acesso Wi-Fi "ROBO-IMP-XX:XX:XX:XX" | **Padrão**. App conecta diretamente, sem internet. |
| **STA_REDE** | ESP32 conecta na sua rede (`WIFI_HABILITADO=1`) | Quando precisa ver status à distância (telefone em outro local) |
| **SERIAL** | Cabo USB | Quando o Wi-Fi falhar ou para debug |

---

## 3. Comandos — Tabela Mestra (28 comandos)

> **Formato JSON:**
> `{"cmd":"<comando>","id":<número único>,"params":{...}}`
> Resposta:
> `{"id":<número>,"ok":true|false,"data":{...},"err":"se houver erro"}`

### 3.1. Comandos de Sistema (informativos)

| # | Comando | Parâmetros | Resposta | Exemplo |
|---|---|---|---|---|
| 1 | `ping` | — | `{pong, uptime_s}` | `{"cmd":"ping","id":1}` |
| 2 | `info` | — | `{modelo, versao_fw, mac, ip, wifi_rssi}` | `{"cmd":"info","id":2}` |
| 3 | `status` | — | `{estado, bateria_pct, produto_pct, faixa_atual, m2_feitos, tempo_decorrido_s}` | `{"cmd":"status","id":3}` |
| 4 | `help` | — | Lista todos os comandos | `{"cmd":"help","id":4}` |

### 3.2. Comandos de Configuração da Obra

| # | Comando | Parâmetros | Resposta | Exemplo |
|---|---|---|---|---|
| 5 | `definir_area` | `{largura_cm, comprimento_cm, num_faixas}` | `{ok, num_faixas_calculado}` | `{"cmd":"definir_area","id":5,"params":{"largura_cm":300,"comprimento_cm":800,"num_faixas":10}}` |
| 6 | `definir_velocidade` | `{pwm:0-255}` | `{ok, pwm_atual}` | `{"cmd":"definir_velocidade","id":6,"params":{"pwm":150}}` |
| 7 | `definir_vazao` | `{tempo_aberta_ms, intervalo_ms}` | `{ok, vazao_calc_lpm}` | `{"cmd":"definir_vazao","id":7,"params":{"tempo_aberta_ms":800,"intervalo_ms":1200}}` |
| 8 | `definir_faixa` | `{indice}` (0-based) | `{ok, faixa}` | `{"cmd":"definir_faixa","id":8,"params":{"indice":0}}` |
| 9 | `calibrar_giro90` | `{pulsos}` | `{ok, novo_valor}` | `{"cmd":"calibrar_giro90","id":9,"params":{"pulsos":215}}` |
| 10 | `calibrar_motor` | `{motor:"E"|"D", fator}` | `{ok}` | `{"cmd":"calibrar_motor","id":10,"params":{"motor":"E","fator":1.05}}` |
| 11 | `definir_sensor_solo` | `{limite_cm}` | `{ok}` | `{"cmd":"definir_sensor_solo","id":11,"params":{"limite_cm":25}}` |
| 12 | `definir_sensor_obst` | `{limite_cm}` | `{ok}` | `{"cmd":"definir_sensor_obst","id":12,"params":{"limite_cm":30}}` |

### 3.3. Comandos de Operação (movimento)

| # | Comando | Parâmetros | Resposta | Exemplo |
|---|---|---|---|---|
| 13 | `iniciar` | `{demãos:1-3}` | `{ok, estado:"TRABALHANDO"}` | `{"cmd":"iniciar","id":13,"params":{"demaos":1}}` |
| 14 | `parar` | — | `{ok, estado:"PARADO"}` | `{"cmd":"parar","id":14}` |
| 15 | `pausar` | — | `{ok, estado:"PAUSADO"}` | `{"cmd":"pausar","id":15}` |
| 16 | `retomar` | — | `{ok, estado:"TRABALHANDO"}` | `{"cmd":"retomar","id":16}` |
| 17 | `emergencia` | — | `{ok, estado:"EMERGENCIA, motores_off, valvula_off}` | `{"cmd":"emergencia","id":17}` |
| 18 | `reset_emergencia` | — | `{ok, estado:"PARADO"}` | `{"cmd":"reset_emergencia","id":18}` |
| 19 | `andar_reto` | `{pulses}` (0 = sem limite) | `{ok}` | `{"cmd":"andar_reto","id":19,"params":{"pulses":200}}` |
| 20 | `girar` | `{graus}` | `{ok}` | `{"cmd":"girar","id":20,"params":{"graus":90}}` |
| 21 | `andar_livre` | `{motor:"E"|"D"|"A", pwm}` | `{ok}` (teste em oficina) | `{"cmd":"andar_livre","id":21,"params":{"motor":"A","pwm":100}}` |
| 22 | `valvula` | `{acao:"abrir"|"fechar"}` | `{ok, valvula_aberta}` | `{"cmd":"valvula","id":22,"params":{"acao":"abrir"}}` |

### 3.4. Comandos de Telemetria (periódicos)

| # | Comando (App → ESP32) | Resposta enviada automaticamente | |
|---|---|---|---|
| 23 | `subscribe` | (resposta única) | App pede para receber telemetria |
| | `telemetria` (ESP32 → App, a cada 1 s) | `{estado, faixa, distancia_frente, distancia_solo, m2_feitos, bateria_pct, valvula_aberta, eventos_recentes}` |
| 24 | `evento` (ESP32 → App, sempre que ocorre) | `{tipo, descricao, timestamp, severidade:"info"|"warn"|"erro"}` | Notificação de evento |
| | **Tipos:** obstaculo_detectado, queda_detectada, emergencia_acionada, faixa_concluida, obra_concluida, bateria_baixa, produto_baixo |

### 3.5. Comandos de Manutenção

| # | Comando | Parâmetros | Resposta | Exemplo |
|---|---|---|---|---|
| 25 | `ler_sensores` | — | `{dist_frente, dist_esq, dist_dir, dist_solo, enc_esq, enc_dir, bateria_v}` | `{"cmd":"ler_sensores","id":25}` |
| 26 | `reiniciar` | `{confirmacao:"sim"}` | `{ok, reiniciando}` | `{"cmd":"reiniciar","id":26,"params":{"confirmacao":"sim"}}` |
| 27 | `salvar_config` | — | `{ok, salvo_na_nvs}` | `{"cmd":"salvar_config","id":27}` |
| 28 | `definir_ssid` | `{ssid, senha}` | `{ok, ip_recebido}` | `{"cmd":"definir_ssid","id":28,"params":{"ssid":"MinhaRede","senha":"segredo"}}` |

---

## 4. Eventos automáticos que o ESP32 envia (sem o App pedir)

| Evento | Severidade | Quando |
|---|---|---|
| `iniciado` | info | ESP32 liga |
| `wifi_conectado` | info | Conecta na rede ou ativa AP |
| `wifi_desconectado` | warn | Perde conexão |
| `obra_iniciada` | info | Comando `iniciar` aceito |
| `faixa_iniciada` | info | Robô começa nova faixa |
| `faixa_concluida` | info | Robô termina faixa |
| `obra_concluida` | info | Última faixa finalizada |
| `obstaculo_detectado` | warn | Distância < limite |
| `queda_detectada` | erro | Sensor solo > limite |
| `emergencia_acionada` | erro | Botão físico ou comando |
| `bateria_baixa` | warn | < 20% |
| `bateria_critica` | erro | < 5% — robô para automaticamente |
| `produto_baixo` | warn | < 30% do galão |
| `produto_vazio` | erro | Galão vazio |
| `erro_sensor` | erro | Leitura inválida por X segundos |
| `erro_motor` | erro | Encoder não conta por X segundos (travado) |
| `tombamento_detectado` | erro | **IMU**: inclinação > 45° mantida por 300ms — parada automática |
| `inclinacao_alerta` | warn | **IMU**: inclinação > 30° — alerta antes do tombamento |
| `imu_falha` | warn | BNO055 não respondeu no I2C (sensor ausente/queimado) |

### 4.1. Detecção de Tombamento via IMU (BNO055)

O robô carrega um sensor **Bosch BNO055** (9-DoF + sensor fusion onboard)
ligado no I2C (SDA=21, SCL=22, addr=0x28). A cada 100 ms o firmware lê
Euler absoluto (roll, pitch, heading) e dispara:

1. **`inclinacao_alerta`** quando `sqrt(roll² + pitch²) ≥ 30°`
   - Severidade: `warn`. Apenas notifica, não para.
2. **`tombamento_detectado`** quando `sqrt(roll² + pitch²) ≥ 45°` **por mais
   de 300 ms**.
   - Severidade: `erro`. **Para motores, fecha válvula, seta estado = QUEDA**.
   - Histerese de 5° para retornar à operação normal.
3. **`imu_falha`** se o chip não responder no `Wire.endTransmission()` ou
   se o `CHIP_ID != 0xA0`.
   - Severidade: `warn`. Robô segue operando sem essa proteção.

**Campos adicionais na telemetria (1 Hz):**

| Campo | Tipo | Descrição |
|---|---|---|
| `imu_ok` | bool | IMU inicializado e respondendo |
| `roll_graus` | float | Rotação em torno do eixo X (frente-trás) |
| `pitch_graus` | float | Rotação em torno do eixo Y (esquerda-direita) |
| `tilt_graus` | float | Magnitude do tilt = √(roll² + pitch²) |
| `heading_graus` | float | Bússola (0..360, ignorado nessa versão) |

> Em caso de `imu_ok=false`, todos os campos de Euler ficam em 0. **A app deve
> exibir um aviso persistente ao usuário** ("⚠️ Sensor de tombamento inativo")
> até o próximo reset, para que o operador saiba que a proteção por inclinação
> não está ativa.

---

## 5. Códigos de Erro (campo `err.code` na resposta)

| Código | Significado | Ação sugerida |
|---|---|---|
| `E001` | Comando desconhecido | Verificar `cmd` |
| `E002` | JSON malformado | Verificar sintaxe |
| `E003` | Parâmetro obrigatório faltando | Ver `tabela de params` |
| `E010` | Bateria crítica | Recarregar |
| `E011` | Sensor não responde | Checar fiação |
| `E012` | Motor travado | Checar roda |
| `E020` | Galão vazio | Reabastecer |
| `E030` | EEPROM/NVS cheio | Resetar config |
| `E040` | Estado inválido para o comando (ex.: `iniciar` quando já está trabalhando) | Ver estado atual |
| `E099` | Erro genérico | Ver `err.message` |

---

## 6. WebSocket + Telemetria (para o App)

Para streaming contínuo, recomenda-se **WebSocket** em vez de polling HTTP:

```
ws://<ip_do_esp32>/ws

→ app envia: {"cmd":"subscribe","id":100}
← esp32 responde: {"id":100,"ok":true}
← esp32 envia a cada 1 s: {"evt":"telemetria","data":{...}}
← esp32 envia quando ocorre: {"evt":"evento","data":{"tipo":"obstaculo_detectado",...}}
```

> 🚀 **Performance:** telemetria por WebSocket consome ~50 vezes menos
> energia que polling HTTP. Recomendado para operação com bateria.

---

## 7. Limites e Defaults (defaults que o ESP32 traz de fábrica)

```
LARGURA_FAIXA_MM     = 270     // 30 cm rolo − 3 cm overlap
PULSOS_GIRO_90       = 210
VELOCIDADE_PWM       = 120
DIAMETRO_RODA_MM     = 150.0
PULSOS_POR_VOLTA     = 360
DIST_MIN_OBSTACULO_CM = 30.0
DIST_SOLO_NORMAL_CM  = 12.0
LIMIAR_QUEDA_CM      = 25.0
TEMPO_VALVULA_ABERTA_MS = 800
INTERVALO_VALVULA_MS    = 1200
COMPRIMENTO_FAIXA_CM = 400
NUMERO_DE_FAIXAS     = 10
FATOR_COMPENSACAO_MOTOR = 1.000

# IMU (BNO055 sobre I2C — pinos 21/22 a 400 kHz)
IMU_ENDERECO               = 0x28           # I2C slave address (ADR=GND)
IMU_INCLINACAO_ALERTA_GRAUS = 30.0           # warn
IMU_TOMBAMENTO_GRAUS        = 45.0           # erro → PARAR
IMU_INTERVALO_MS            = 100            # 10 Hz
IMU_TOMBAMENTO_CONFIRMA_MS  = 300            # janela p/ confirmar
```

> Todos esses defaults podem ser sobrescritos via `definir_*`. Os valores
> persistentes (alterados pelo usuário) ficam salvos em **NVS** (memória
> flash do ESP32), preservados entre resets.

---

## 8. Diagrama de fluxo de uma sessão típica

```
APP                                  ESP32
 |                                     |
 |  ──── {"cmd":"ping","id":1}  ───>   |   ← teste inicial
 |  <─── {"id":1,"ok":true,...} ────   |
 |                                     |
 |  ── {"cmd":"definir_area",...} ──>  |   ← configura obra
 |  <── {"id":5,"ok":true,...} ──────── |
 |                                     |
 |  ──── {"cmd":"iniciar","..."} ───>  |   ← "Go!"
 |  <── {"id":13,"ok":true} ───────    |
 |                                     |
 |  <── {"evt":"telemetria",...} ────  |   ← 1 Hz enquanto opera
 |  <── {"evt":"telemetria",...} ────  |
 |  <── {"evt":"evento:faixa_iniciada"} |
 |  <── {"evt":"telemetria",...} ────  |
 |  ...                                |   ← operação normal
 |  <── {"evt":"evento:bateria_baixa"} |
 |                                     |
 |  ───── {"cmd":"parar","id":99} ──>  |   ← pausa solicitada
 |  <─ {"id":99,"ok":true,...} ────    |
 |                                     |
 |  ── {"cmd":"emergencia","id":100}──>|   ← emergência (se precisar)
 |  <─ {"id":100,"ok":true,...} ────   |
```

---

## 9. Como o App **deve** se comportar

> Estas são as regras que o App precisa implementar para uma boa UX:

1. **Sempre use `id` incremental** nas suas mensagens para o ESP32 rastrear
2. **Sempre abra WebSocket** antes de começar a enviar comandos de operação
3. **Se não receber telemetria por 3 segundos**, mostre "⚠️ Sem sinal" no App
4. **Se receber `emergencia_acionada`**, libere o botão Parar na cor vermelha grande
5. **Nunca envie o próximo comando antes de receber a resposta do anterior** (timeout 2s)
6. **Mostre sempre o estado atual** (`status`) na tela principal
7. **Não bloqueie o app em emergências** — o usuário precisa poder pausar/retomar
8. **Salve localmente os últimos 50 eventos** em caso de perda de conexão

---

## 10. Versionamento e evolução

| Versão do protocolo | O que muda |
|---|---|
| **1.0 (atual)** | Comandos e eventos conforme este documento |
| 1.1 (Q2 2027) | Adiciona comandos de telemetria expandida (temperatura, GPS) |
| 2.0 (Q4 2027) | Refatora para **CBOR** em vez de JSON (menor consumo de energia em telemetria) |
| 3.0 (2028) | Adiciona comandos para V2 com LiDAR (mapa, waypoints) |

> Mudanças compatíveis (1.0 → 1.1) **não devem quebrar apps antigos**;
> mudanças incompatíveis (2.0+) incrementam o número da versão e o app
> precisa pedir `info` para negociar.

---

## 11. Snippet de referência — Cliente WebSocket

```javascript
// Cliente WebSocket — exemplo didático para o app
const ws = new WebSocket(`ws://${ESP_IP}/ws`);
let msgId = 1;

function send(cmd, params = {}) {
  const msg = JSON.stringify({ cmd, id: msgId++, params });
  ws.send(msg);
}

ws.onopen = () => {
  send('info');                     // pede identificação
  send('definir_area', { largura_cm: 300, comprimento_cm: 800, num_faixas: 10 });
  send('subscribe');                // começa a receber telemetria
};

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.evt === 'telemetria') atualizarPainel(msg.data);
  if (msg.evt === 'evento')      adicionarAlerta(msg.data);
};

function acaoIniciar()   { send('iniciar', { demaos: 1 }); }
function acaoParar()     { send('parar'); }
function acaoEmergencia() { send('emergencia'); }
```

---

## 12. Resumo executivo para o sócio

> Esta especificação garante:
>
> 1. **O firmware está pronto para conversar com qualquer app** (web,
>    mobile, CLI) — não prende você a nenhuma tecnologia.
> 2. **O protocolo é JSON simples** — qualquer programador entende em
>    30 minutos.
> 3. **A escalabilidade está prevista** (WebSocket, telemetria a 1Hz,
>    versionamento).
> 4. **A segurança está prevista** (emergência física + comando, eventos
>    de bateria, validação de estado).
>
> Isso é **profissional**. Não é "rascunho de fim de semana".

---

*Documento mantido em /05_Dossie_Viabilidade/03_Comandos_ESP32/PROTOCOLO_COMUNICACAO.md*
*v1.0 — Setembro/2026*
