/* ============================================================================
 *  ROBÔ APLICADOR DE IMPERMEABILIZANTE — FIRMWARE v1.0
 *  Placa: ESP32 DevKit V1 (38 pinos)
 *  ============================================================================
 *
 *  Este programa é o "cérebro" do robô. Ele:
 *    1. Lê os sensores de distância (ultrassom)
 *    2. Conta as voltas das rodas (encoders) para saber onde está
 *    3. Anda em zigue-zague cobrindo toda a laje
 *    4. Abre e fecha a válvula que libera o impermeabilizante
 *    5. Para imediatamente se detectar obstáculo, queda ou Emergência
 *
 *  COMO CARREGAR NA PLACA:
 *    1. Instale a Arduino IDE (arduino.cc)
 *    2. Em Arquivo > Preferências, em "URLs adicionais", cole:
 *       https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
 *    3. Em Ferramentas > Placa > Gerenciador de Placas, busque "esp32" e instale
 *    4. Selecione Placa: "ESP32 Dev Module"; Upload Speed: 921600
 *    5. Conecte o ESP32 no USB e clique na seta (upload)
 *
 *  IMPORTANTE SOBRE A VERSÃO DO PACOTE ESP32:
 *    Este firmware usa ledcSetup/ledcAttachPin (pacote ESP32 versão 2.x).
 *    Se você instalou a versão 3.x, o compilador vai avisar que está obsoleto,
 *    mas ainda funciona. Se der erro, mude para a versão 2.0.14 no
 *    Gerenciador de Placas.
 *
 *  MONITOR SERIAL: abra em 115200 baud. É por ele que você vê o que o robô
 *  está "pensando" e calibra os parâmetros.
 * ============================================================================
 */

#include <Arduino.h>

// ============================================================================
// 1. MAPA DE PINOS — onde cada fio está ligado no ESP32
// ============================================================================
// (Se você ligou diferente do Esquema_Eletrico.md, altere os números aqui)

// --- Motores (drivers BTS7960) ---
const int PIN_MOTOR_E_RPWM = 25;   // Motor ESQUERDO - gira para um lado
const int PIN_MOTOR_E_LPWM = 26;   // Motor ESQUERDO - gira para o outro
const int PIN_MOTOR_D_RPWM = 27;   // Motor DIREITO  - gira para um lado
const int PIN_MOTOR_D_LPWM = 14;   // Motor DIREITO  - gira para o outro

// --- Encoders (contam quantas voltas a roda deu) ---
const int PIN_ENCODER_E = 34;      // Sinal A do encoder esquerdo
const int PIN_ENCODER_D = 35;      // Sinal A do encoder direito

// --- Sensores ultrassônicos HC-SR04 ---
const int PIN_US_FRENTE_TRIG  = 18;
const int PIN_US_FRENTE_ECHO  = 19;
const int PIN_US_DIR_TRIG     = 21;
const int PIN_US_DIR_ECHO     = 22;
const int PIN_US_ESQ_TRIG     = 23;
const int PIN_US_ESQ_ECHO     = 36;
const int PIN_US_SOLO_TRIG    = 33;   // apontado para BAIXO (detecta queda)
const int PIN_US_SOLO_ECHO    = 39;

// --- Válvula solenoide (liga/desliga o produto) ---
const int PIN_VALVULA = 4;         // vai no pino IN do relé

// --- Sinalização ---
const int PIN_LED_VERDE   = 16;    // robô OK / trabalhando
const int PIN_LED_VERMELHO = 17;   // erro / obstáculo / emergência
const int PIN_BUZZER      = 5;

// --- Botões ---
const int PIN_BOTAO_START = 13;    // inicia/para o serviço
const int PIN_BOTAO_ESTOP = 32;    // PARADA DE EMERGÊNCIA

// ============================================================================
// 2. PARÂMETROS DE CALIBRAÇÃO — VOCÊ VAI AJUSTAR ESTES NÚMEROS
// ============================================================================
// Siga o arquivo Calibracao_e_Testes.md para descobrir os valores do SEU robô.

// --- Compensação de motor ---
// Se o robô desvia para a ESQUERDA  → aumente (ex: 1.00 → 1.02)
// Se o robô desvia para a DIREITA   → diminua (ex: 1.00 → 0.98)
float FATOR_COMPENSACAO_MOTOR = 1.00;

// --- Velocidade ---
// 0 = parado, 255 = velocidade máxima. Use 120 nos primeiros testes.
int VELOCIDADE_PWM = 120;

// --- Medidas físicas (em milímetros) ---
const float DIAMETRO_RODA_MM     = 150.0;  // meça a sua roda
const int   PULSOS_POR_VOLTA     = 360;    // quantos pulsos o encoder dá por volta
const int   LARGURA_FAIXA_MM     = 270;    // rolo 30 cm menos 3 cm de sobreposição

// --- Giro ---
// Quantos pulsos de encoder são necessários para girar 90°.
// CALIBRE: mande girar 90°, meça o ângulo real e aplique:
//   novoValor = valorAtual * (90 / anguloMedido)
long PULSOS_GIRO_90 = 210;

// --- Segurança ---
const float DIST_MIN_OBSTACULO_CM = 30.0;  // para/desvia a esta distância
const float DIST_SOLO_NORMAL_CM   = 12.0;  // leitura do sensor de solo no piso plano
const float LIMIAR_QUEDA_CM       = 25.0;  // acima disso = buraco/beirada → parar

// --- Aplicação do produto ---
// A válvula abre por X milissegundos a cada Y milissegundos.
// Menos tempo aberto = menos produto = camada mais fina.
int TEMPO_VALVULA_ABERTA_MS = 800;
int INTERVALO_VALVULA_MS    = 1200;

// --- Área de trabalho (configure antes de cada serviço) ---
// Distância de cada faixa reta, em centímetros.
long COMPRIMENTO_FAIXA_CM = 400;   // exemplo: laje de 4 metros
int  NUMERO_DE_FAIXAS     = 10;    // exemplo: 10 faixas de 30 cm = 3 m de largura

// --- Wi-Fi (controle pelo celular) — DESLIGADO por padrão ---
// Mude o 0 para 1, coloque o nome e a senha da sua rede, e o robô cria uma
// página simples acessível pelo navegador do celular.
// ATENÇÃO: precisa ser 0 ou 1 (não use true/false, o compilador exige número).
#define WIFI_HABILITADO 0

const char* WIFI_SSID  = "SEU_WIFI";
const char* WIFI_SENHA = "SUA_SENHA";

// ============================================================================
// 3. VARIÁVEIS INTERNAS — você não precisa mexer daqui para baixo
// ============================================================================

// Contadores de pulsos dos encoders (volatile porque mudam dentro de
// interrupções — rotinas que rodam "por fora" do programa principal)
volatile long pulsosEncoderE = 0;
volatile long pulsosEncoderD = 0;

// Canais PWM do ESP32 (ele tem 16 canais; usamos 4)
const int CANAL_PWM_E_R = 0;
const int CANAL_PWM_E_L = 1;
const int CANAL_PWM_D_R = 2;
const int CANAL_PWM_D_L = 3;
const int FREQ_PWM = 5000;      // 5 kHz — frequência do sinal PWM
const int RESOLUCAO_PWM = 8;    // 8 bits → valores de 0 a 255

// Estados possíveis do robô
enum Estado {
  PARADO,       // aguardando comando
  TRABALHANDO,  // aplicando o produto
  MANOBRANDO,   // virando no fim da faixa
  OBSTACULO,    // algo na frente
  QUEDA,        // detectou desnível/beirada
  EMERGENCIA,   // botão de emergência acionado
  FINALIZADO    // terminou a área
};

Estado estadoAtual = PARADO;

// Controle da válvula sem travar o programa (sem usar delay)
unsigned long ultimaAberturaValvula = 0;
bool valvulaAberta = false;

// Controle do pisca do LED
unsigned long ultimoPisca = 0;
bool ledAceso = false;

// ============================================================================
// 4. FUNÇÕES DOS ENCODERS (contagem de voltas)
// ============================================================================
// Estas duas funções rodam automaticamente toda vez que o sensor do encoder
// muda de estado. Por isso são curtas e rápidas.

void IRAM_ATTR contarPulsoE() {
  pulsosEncoderE++;
}

void IRAM_ATTR contarPulsoD() {
  pulsosEncoderD++;
}

// ============================================================================
// 5. FUNÇÕES DOS MOTORES
// ============================================================================

// Faz um motor girar.
//   motor: 'E' (esquerdo) ou 'D' (direito)
//   velocidade: de -255 (ré máxima) a +255 (frente máxima)
void moverMotor(char motor, int velocidade) {
  // Limita a velocidade à faixa válida
  velocidade = constrain(velocidade, -255, 255);

  if (motor == 'E') {
    // Aplica o fator de compensação: se um motor é mais fraco, corrigimos aqui
    velocidade = (int)(velocidade * (1.0 / FATOR_COMPENSACAO_MOTOR));
    velocidade = constrain(velocidade, -255, 255);

    if (velocidade > 0) {
      ledcWrite(CANAL_PWM_E_R, velocidade);
      ledcWrite(CANAL_PWM_E_L, 0);
    } else if (velocidade < 0) {
      ledcWrite(CANAL_PWM_E_R, 0);
      ledcWrite(CANAL_PWM_E_L, -velocidade);
    } else {
      ledcWrite(CANAL_PWM_E_R, 0);
      ledcWrite(CANAL_PWM_E_L, 0);
    }
  }
  else if (motor == 'D') {
    // O motor direito gira ao contrário do esquerdo porque está montado
    // espelhado no chassi. Se o seu robô andar para trás, inverta este sinal.
    velocidade = (int)(velocidade * FATOR_COMPENSACAO_MOTOR);
    velocidade = constrain(velocidade, -255, 255);

    if (velocidade > 0) {
      ledcWrite(CANAL_PWM_D_R, velocidade);
      ledcWrite(CANAL_PWM_D_L, 0);
    } else if (velocidade < 0) {
      ledcWrite(CANAL_PWM_D_R, 0);
      ledcWrite(CANAL_PWM_D_L, -velocidade);
    } else {
      ledcWrite(CANAL_PWM_D_R, 0);
      ledcWrite(CANAL_PWM_D_L, 0);
    }
  }
}

// Para os dois motores imediatamente
void pararMotores() {
  ledcWrite(CANAL_PWM_E_R, 0);
  ledcWrite(CANAL_PWM_E_L, 0);
  ledcWrite(CANAL_PWM_D_R, 0);
  ledcWrite(CANAL_PWM_D_L, 0);
}

// ============================================================================
// 6. FUNÇÕES DOS SENSORES ULTRASSÔNICOS
// ============================================================================

// Lê a distância de um sensor HC-SR04 em centímetros.
// Retorna -1 se não receber resposta (sensor desconectado ou fora de alcance).
float lerDistancia(int pinoTrig, int pinoEcho) {
  // Garante que o trigger comece em nível baixo
  digitalWrite(pinoTrig, LOW);
  delayMicroseconds(2);

  // Envia um pulso de 10 microssegundos — é o "grito" do sensor
  digitalWrite(pinoTrig, HIGH);
  delayMicroseconds(10);
  digitalWrite(pinoTrig, LOW);

  // Mede quanto tempo o eco demorou para voltar.
  // 30 ms é o tempo máximo (≈ 5 metros)
  long duracao = pulseIn(pinoEcho, HIGH, 30000);

  if (duracao == 0) {
    return -1;  // nada voltou — sensor com problema
  }

  // A velocidade do som é ~340 m/s = 0,034 cm por microssegundo.
  // Dividimos por 2 porque o som foi e voltou.
  float distancia = duracao * 0.034 / 2.0;

  return distancia;
}

// ============================================================================
// 7. FUNÇÕES DE MOVIMENTO BASEADAS EM ENCODER
// ============================================================================

// Converte uma distância em centímetros para a quantidade de pulsos do encoder
long cmParaPulsos(float cm) {
  float circunferencia = 3.14159 * DIAMETRO_RODA_MM / 10.0;  // em cm
  float voltas = cm / circunferencia;
  return (long)(voltas * PULSOS_POR_VOLTA);
}

// Anda uma distância em linha reta, verificando segurança durante o trajeto.
// Retorna true se completou, false se foi interrompido por segurança.
bool andarDistancia(float cm, int velocidade) {
  long pulsosAlvo = cmParaPulsos(cm);

  pulsosEncoderE = 0;
  pulsosEncoderD = 0;

  // Usa a média dos dois encoders para saber a distância percorrida
  while (((pulsosEncoderE + pulsosEncoderD) / 2) < pulsosAlvo) {

    // --- VERIFICAÇÕES DE SEGURANÇA A CADA INSTANTE ---
    if (emergenciaAcionada()) {
      pararMotores();
      estadoAtual = EMERGENCIA;
      return false;
    }

    if (detectouQueda()) {
      pararMotores();
      estadoAtual = QUEDA;
      return false;
    }

    if (obstaculoFrente()) {
      pararMotores();
      estadoAtual = OBSTACULO;
      return false;
    }

    // Mantém os dois motores com a mesma velocidade
    moverMotor('E', velocidade);
    moverMotor('D', velocidade);

    // Pequena pausa para não sobrecarregar o processador
    delay(5);
  }

  pararMotores();
  return true;
}

// Gira o robô sobre o próprio eixo.
//   angulo: positivo = gira para um lado, negativo = para o outro
void girarGraus(long angulo, int velocidade) {
  long pulsosAlvo = (long)(PULSOS_GIRO_90 * abs(angulo) / 90.0);

  pulsosEncoderE = 0;
  pulsosEncoderD = 0;

  while ((abs(pulsosEncoderE) + abs(pulsosEncoderD)) / 2 < pulsosAlvo) {
    if (emergenciaAcionada()) {
      pararMotores();
      estadoAtual = EMERGENCIA;
      return;
    }

    // Uma roda gira para frente, a outra para trás = giro no próprio eixo
    if (angulo > 0) {
      moverMotor('E',  velocidade);
      moverMotor('D', -velocidade);
    } else {
      moverMotor('E', -velocidade);
      moverMotor('D',  velocidade);
    }
    delay(5);
  }

  pararMotores();
}

// ============================================================================
// 8. FUNÇÕES DE SEGURANÇA
// ============================================================================

// Verifica se o botão de emergência está pressionado.
// O botão é ligado ao GND e o pino usa resistor de pull-up interno,
// então LOW = pressionado.
bool emergenciaAcionada() {
  return (digitalRead(PIN_BOTAO_ESTOP) == LOW);
}

// Verifica se há obstáculo à frente (na direção do movimento).
bool obstaculoFrente() {
  float d = lerDistancia(PIN_US_FRENTE_TRIG, PIN_US_FRENTE_ECHO);
  if (d < 0) return false;              // sensor sem leitura: ignora
  return (d < DIST_MIN_OBSTACULO_CM);
}

// Verifica se há desnível/beirada à frente (risco de queda).
bool detectouQueda() {
  float d = lerDistancia(PIN_US_SOLO_TRIG, PIN_US_SOLO_ECHO);
  if (d < 0) return false;
  return (d > LIMIAR_QUEDA_CM);
}

// ============================================================================
// 9. CONTROLE DA VÁLVULA (liberação do produto)
// ============================================================================

// Abre a válvula solenoide — o produto começa a gotejar
void abrirValvula() {
  digitalWrite(PIN_VALVULA, HIGH);
  valvulaAberta = true;
}

// Fecha a válvula — o produto para de sair
void fecharValvula() {
  digitalWrite(PIN_VALVULA, LOW);
  valvulaAberta = false;
}

// Controla a válvula de forma inteligente: abre por um tempo, fecha por outro,
// repetidamente. Isso evita encharcar o rolo e formar poças.
// Esta função é chamada a cada volta do loop(), sem usar delay().
void gerenciarValvula(bool servicoAtivo) {
  unsigned long agora = millis();

  if (!servicoAtivo) {
    // Robô parado ou manobrando: válvula SEMPRE fechada.
    // Isso é regra de segurança — nunca gotejar parado.
    if (valvulaAberta) fecharValvula();
    return;
  }

  if (valvulaAberta) {
    // Já está aberta: verifica se já passou o tempo de ficar aberta
    if (agora - ultimaAberturaValvula >= TEMPO_VALVULA_ABERTA_MS) {
      fecharValvula();
    }
  } else {
    // Está fechada: verifica se já passou o intervalo para abrir de novo
    if (agora - ultimaAberturaValvula >= INTERVALO_VALVULA_MS) {
      abrirValvula();
      ultimaAberturaValvula = agora;
    }
  }
}

// ============================================================================
// 10. SINALIZAÇÃO (LEDs e buzzer)
// ============================================================================

void sinalizar(Estado estado) {
  unsigned long agora = millis();

  switch (estado) {
    case PARADO:
      // Verde piscando devagar = "estou esperando"
      digitalWrite(PIN_LED_VERMELHO, LOW);
      if (agora - ultimoPisca > 1000) {
        ledAceso = !ledAceso;
        digitalWrite(PIN_LED_VERDE, ledAceso ? HIGH : LOW);
        ultimoPisca = agora;
      }
      break;

    case TRABALHANDO:
      // Verde aceso fixo = "tudo bem, trabalhando"
      digitalWrite(PIN_LED_VERDE, HIGH);
      digitalWrite(PIN_LED_VERMELHO, LOW);
      break;

    case MANOBRANDO:
      // Verde piscando rápido = "virando, sem aplicar"
      digitalWrite(PIN_LED_VERMELHO, LOW);
      if (agora - ultimoPisca > 200) {
        ledAceso = !ledAceso;
        digitalWrite(PIN_LED_VERDE, ledAceso ? HIGH : LOW);
        ultimoPisca = agora;
      }
      break;

    case OBSTACULO:
      // Vermelho piscando = "algo na frente"
      digitalWrite(PIN_LED_VERDE, LOW);
      digitalWrite(PIN_BUZZER, HIGH);
      if (agora - ultimoPisca > 400) {
        ledAceso = !ledAceso;
        digitalWrite(PIN_LED_VERMELHO, ledAceso ? HIGH : LOW);
        ultimoPisca = agora;
      }
      break;

    case QUEDA:
    case EMERGENCIA:
      // Vermelho fixo + buzzer contínuo = "PERIGO, PAREI"
      digitalWrite(PIN_LED_VERDE, LOW);
      digitalWrite(PIN_LED_VERMELHO, HIGH);
      digitalWrite(PIN_BUZZER, HIGH);
      break;

    case FINALIZADO:
      // Verde e vermelho alternando = "terminei o serviço"
      digitalWrite(PIN_BUZZER, LOW);
      if (agora - ultimoPisca > 500) {
        ledAceso = !ledAceso;
        digitalWrite(PIN_LED_VERDE, ledAceso ? HIGH : LOW);
        digitalWrite(PIN_LED_VERMELHO, ledAceso ? LOW : HIGH);
        ultimoPisca = agora;
      }
      break;
  }
}

// ============================================================================
// 10.5 WEB SERVER + WEBSOCKET — protocolo de comunicação com o app
// ============================================================================
//// Estrutura: variáveis/protótipos/protocolo JSON ficam FORA do #if
// para que o código de operação (executarServico) possa chamar enviarEvento()
// mesmo com Wi-Fi desligado (a função então torna-se no-op).
//
// Os includes de bibliotecas ESP32 permanecem protegidos por #if para que
// o firmware COMPILAR quando o usuário não tiver as bibliotecas instaladas.

// Incluir bibliotecas apenas se Wi-Fi estiver habilitado
#if WIFI_HABILITADO
  #include <WiFi.h>
  #include <WebServer.h>
  #include <WebSocketsServer.h>
  #include <ArduinoJson.h>

  WebServer servidorHTTP(80);
  WebSocketsServer webSocket = WebSocketsServer(81);
  StaticJsonDocument<512> docEnvio;
  bool clienteConectado = false;
  unsigned long ultimoHeartbeat = 0;
#endif

// Variáveis de telemetria compartilhadas (sempre disponíveis)
volatile int faixaAtualGlobal = 0;
volatile float m2FeitosGlobal = 0.0;

// Protótipos de funções usadas à frente
static const char* eventoTipoStr(EventoTipo t);
static const char* estadoNomeStr(Estado e);
float lerBateriaPct();
float lerProdutoPct();
void enviarEvento(EventoTipo tipo, const char* descricao = "");
void enviarTelemetria();
void processarComandoWS(uint8_t num, const char* payload, size_t len);

// Tipos de evento — espelham EXATAMENTE o que o app espera.
// Manter coerente com app/js/protocol.js (MAPA_EVENTOS).
enum EventoTipo {
  EVT_INICIADO = 1,
  EVT_WIFI_CONECTADO,
  EVT_FAIXA_INICIADA,
  EVT_FAIXA_CONCLUIDA,
  EVT_OBRA_CONCLUIDA,
  EVT_OBSTACULO_DETECTADO,
  EVT_QUEDA_DETECTADA,
  EVT_EMERGENCIA_ACIONADA,
  EVT_BATERIA_BAIXA,
  EVT_PRODUTO_BAIXO,
  EVT_ERRO_SENSOR,
  EVT_ERRO_MOTOR,
  EVT_WIFI_DESCONECTADO
};

// Converte EventoTipo → string que o app conhece (snake_case).
static const char* eventoTipoStr(EventoTipo t) {
  switch (t) {
    case EVT_INICIADO:             return "iniciado";
    case EVT_WIFI_CONECTADO:       return "wifi_conectado";
    case EVT_FAIXA_INICIADA:       return "faixa_iniciada";
    case EVT_FAIXA_CONCLUIDA:      return "faixa_concluida";
    case EVT_OBRA_CONCLUIDA:       return "obra_concluida";
    case EVT_OBSTACULO_DETECTADO:  return "obstaculo_detectado";
    case EVT_QUEDA_DETECTADA:      return "queda_detectada";
    case EVT_EMERGENCIA_ACIONADA:  return "emergencia_acionada";
    case EVT_BATERIA_BAIXA:        return "bateria_baixa";
    case EVT_PRODUTO_BAIXO:        return "produto_baixo";
    case EVT_ERRO_SENSOR:          return "erro_sensor";
    case EVT_ERRO_MOTOR:           return "erro_motor";
    case EVT_WIFI_DESCONECTADO:    return "wifi_desconectado";
  }
  return "desconhecido";
}

// Envia um evento JSON via WebSocket. Se ninguém estiver conectado, descarta.
void enviarEvento(EventoTipo tipo, const char* descricao = "") {
#if WIFI_HABILITADO
  if (!clienteConectado) return;
  docEnvio.clear();
  docEnvio["evt"] = "evento";
  docEnvio["data"]["tipo"] = eventoTipoStr(tipo);
  docEnvio["data"]["descricao"] = descricao;
  docEnvio["data"]["timestamp"] = millis();
  docEnvio["data"]["severidade"] =
    (tipo == EVT_ERRO_SENSOR || tipo == EVT_ERRO_MOTOR || tipo == EVT_QUEDA_DETECTADA || tipo == EVT_EMERGENCIA_ACIONADA) ? "erro" :
    (tipo == EVT_BATERIA_BAIXA || tipo == EVT_PRODUTO_BAIXO || tipo == EVT_OBSTACULO_DETECTADO) ? "warn" :
    (tipo == EVT_FAIXA_CONCLUIDA || tipo == EVT_OBRA_CONCLUIDA) ? "sucesso" : "info";
  String saida;
  serializeJson(docEnvio, saida);
  webSocket.broadcastTXT(saida);
#else
  // Sem Wi-Fi: no-op silencioso.
  (void)tipo;
  (void)descricao;
#endif
}

// Envia telemetria periódica pelo WebSocket. Chamada ~1x por segundo no loop.
void enviarTelemetria() {
#if WIFI_HABILITADO
  if (!clienteConectado) return;
  docEnvio.clear();
  docEnvio["evt"] = "telemetria";

  float dFrente = lerDistancia(PIN_US_FRENTE_TRIG, PIN_US_FRENTE_ECHO);
  float dSolo   = lerDistancia(PIN_US_SOLO_TRIG,   PIN_US_SOLO_ECHO);
  docEnvio["data"]["estado"]           = (int)estadoAtual;
  docEnvio["data"]["faixa_atual"]      = faixaAtualGlobal;
  docEnvio["data"]["m2_feitos"]        = m2FeitosGlobal;
  docEnvio["data"]["bateria_pct"]      = lerBateriaPct();
  docEnvio["data"]["produto_pct"]      = lerProdutoPct();
  docEnvio["data"]["distancia_frente"] = (dFrente < 0) ? 999.0 : dFrente;
  docEnvio["data"]["distancia_solo"]   = (dSolo   < 0) ? 999.0 : dSolo;
  String saida;
  serializeJson(docEnvio, saida);
  webSocket.broadcastTXT(saida);
#endif
}

// Processa um comando JSON recebido pelo WebSocket.
// O app envia: {"cmd": "iniciar", "id": 123, "params": {"demaos": 1}}
void processarComandoWS(uint8_t num, const char* payload, size_t len) {
#if WIFI_HABILITADO
  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, payload, len)) return;
  const char* cmd = doc["cmd"] | "";
  int idReq = doc["id"] | 0;

  String resposta = "{\"id\":" + String(idReq) + ",\"ok\":true,\"data\":{";
  String c = String(cmd);
  c.toLowerCase();

  if (c == "ping") {
    resposta += "\"pong\":1,\"uptime_s\":"; resposta += String(millis() / 1000);
  } else if (c == "info") {
    resposta += "\"modelo\":\"IMP-BOT-V1\",\"versao_fw\":\"1.0.0\",\"ip\":\""; resposta += WiFi.localIP().toString();
    resposta += "\",\"wifi_rssi\":"; resposta += String(WiFi.RSSI());
  } else if (c == "status") {
    resposta += "\"estado\":\""; resposta += estadoNomeStr(estadoAtual);
    resposta += "\",\"faixa_atual\":"; resposta += String(faixaAtualGlobal);
    resposta += ",\"m2_feitos\":";    resposta += String(m2FeitosGlobal);
    resposta += ",\"bateria_pct\":"; resposta += String(lerBateriaPct());
    resposta += ",\"produto_pct\":"; resposta += String(lerProdutoPct());
  } else if (c == "definir_area") {
    COMPRIMENTO_FAIXA_CM = doc["params"]["comprimento_cm"] | COMPRIMENTO_FAIXA_CM;
    NUMERO_DE_FAIXAS     = doc["params"]["num_faixas"]    | NUMERO_DE_FAIXAS;
    resposta += "\"num_faixas_calculado\":"; resposta += String(NUMERO_DE_FAIXAS);
  } else if (c == "definir_velocidade") {
    VELOCIDADE_PWM = doc["params"]["pwm"] | VELOCIDADE_PWM;
    VELOCIDADE_PWM = constrain(VELOCIDADE_PWM, 0, 255);
    resposta += "\"pwm_atual\":"; resposta += String(VELOCIDADE_PWM);
  } else if (c == "definir_vazao") {
    TEMPO_VALVULA_ABERTA_MS = doc["params"]["tempo_aberta_ms"] | TEMPO_VALVULA_ABERTA_MS;
    INTERVALO_VALVULA_MS    = doc["params"]["intervalo_ms"]    | INTERVALO_VALVULA_MS;
    resposta += "\"vazao_ok\":1";
  } else if (c == "calibrar_giro90") {
    PULSOS_GIRO_90 = doc["params"]["pulsos"] | PULSOS_GIRO_90;
    resposta += "\"novo_valor\":"; resposta += String(PULSOS_GIRO_90);
  } else if (c == "calibrar_motor") {
    const char* qual = doc["params"]["motor"] | "E";
    float fator = doc["params"]["fator"] | 1.0;
    if (qual[0] == 'E' || qual[0] == 'e') FATOR_COMPENSACAO_MOTOR = fator;
    resposta += "\"ok\":1";
  } else if (c == "definir_sensor_solo") {
    LIMIAR_QUEDA_CM = doc["params"]["limite_cm"] | LIMIAR_QUEDA_CM;
    resposta += "\"ok\":1";
  } else if (c == "definir_sensor_obst") {
    DIST_MIN_OBSTACULO_CM = doc["params"]["limite_cm"] | DIST_MIN_OBSTACULO_CM;
    resposta += "\"ok\":1";
  } else if (c == "iniciar") {
    estadoAtual = TRABALHANDO;
    enviarEvento(EVT_FAIXA_INICIADA, "servico aceito");
    resposta += "\"estado\":\"TRABALHANDO\",\"demaos\":";
    resposta += String(doc["params"]["demaos"] | 1);
  } else if (c == "parar") {
    pararMotores(); fecharValvula(); estadoAtual = PARADO;
    resposta += "\"estado\":\"PARADO\"";
  } else if (c == "pausar") {
    pararMotores(); fecharValvula(); estadoAtual = PARADO;
    resposta += "\"estado\":\"PAUSADO\"";
  } else if (c == "retomar") {
    estadoAtual = TRABALHANDO;
    resposta += "\"estado\":\"TRABALHANDO\"";
  } else if (c == "emergencia") {
    pararMotores(); fecharValvula(); estadoAtual = EMERGENCIA;
    enviarEvento(EVT_EMERGENCIA_ACIONADA, "comando do app");
    resposta += "\"estado\":\"EMERGENCIA\"";
  } else if (c == "valvula") {
    const char* acao = doc["params"]["acao"] | "fechar";
    if (acao[0] == 'a' || acao[0] == 'A') abrirValvula(); else fecharValvula();
    resposta += "\"valvula_aberta\":"; resposta += valvulaAberta ? "true" : "false";
  } else if (c == "subscribe") {
    clienteConectado = true;
    resposta += "\"ok\":1,\"telemetria\":true";
  } else {
    resposta = "{\"id\":" + String(idReq) + ",\"ok\":false,\"err\":\"E001\"}";
  }
  resposta += "}}";
  webSocket.sendTXT(num, resposta);
#else
  (void)num; (void)payload; (void)len;
#endif
}

// Converte Estado → string com nome legível.
static const char* estadoNomeStr(Estado e) {
  switch (e) {
    case PARADO:       return "PARADO";
    case TRABALHANDO:  return "TRABALHANDO";
    case MANOBRANDO:   return "MANOBRANDO";
    case OBSTACULO:    return "OBSTACULO";
    case QUEDA:        return "QUEDA";
    case EMERGENCIA:   return "EMERGENCIA";
    case FINALIZADO:   return "FINALIZADO";
  }
  return "PARADO";
}

// Variáveis globais auxiliares para telemetria (placeholders até você medir).
// Em produção, meça a tensão da bateria via divisor e ex.: mapear 24V→100%.
float lerBateriaPct() { return 78.0; }
float lerProdutoPct() { return 65.0; }

void configurarWiFi() {

void configurarWiFi() {
#if WIFI_HABILITADO
  Serial.print("Conectando ao Wi-Fi ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_SENHA);

  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 20) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("Wi-Fi conectado!");
    Serial.print("Acesse no navegador: http://");
    Serial.println(WiFi.localIP());

    servidorHTTP.on("/", []() {
      String html = "<html><head><meta charset='utf-8'>"
                    "<meta name='viewport' content='width=device-width,initial-scale=1'>"
                    "<title>IMP-BOT</title>"
                    "<style>body{font-family:sans-serif;text-align:center;padding:20px;background:#1F4E79;color:#fff}"
                    "h1{font-size:1.5em}a{display:block;margin:10px;padding:15px;font-size:18px;text-decoration:none;border-radius:8px;color:#fff}"
                    ".i{background:#2E7D32}.p{background:#C62828}</style>"
                    "</head><body>"
                    "<h1>IMP-BOT</h1>"
                    "<p>Use o PWA (app) para controle total.</p>"
                    "<p><small>Estado: " + String((int)estadoAtual) + "</small></p>"
                    "<a class='i' href='/iniciar'>INICIAR</a>"
                    "<a class='p' href='/parar'>PARAR</a>"
                    "</body></html>";
      servidorHTTP.send(200, "text/html; charset=utf-8", html);
    });
    servidorHTTP.on("/iniciar", []() {
      estadoAtual = TRABALHANDO;
      enviarEvento(EVT_FAIXA_INICIADA, "via HTTP");
      servidorHTTP.send(200, "text/plain; charset=utf-8", "Iniciado");
    });
    servidorHTTP.on("/parar", []() {
      pararMotores();
      fecharValvula();
      estadoAtual = PARADO;
      servidorHTTP.send(200, "text/plain; charset=utf-8", "Parado");
    });

    servidorHTTP.begin();
    webSocket.begin();
    webSocket.onEvent([](uint8_t num, WStype_t type, uint8_t* payload, size_t len) {
      if (type == WStype_CONNECTED) {
        clienteConectado = true;
        Serial.printf("WS #%u conectado\n", num);
        enviarEvento(EVT_WIFI_CONECTADO);
      } else if (type == WStype_DISCONNECTED) {
        clienteConectado = false;
        Serial.printf("WS #%u desconectado\n", num);
        enviarEvento(EVT_WIFI_DESCONECTADO);
      } else if (type == WStype_TEXT) {
        processarComandoWS(num, (const char*)payload, len);
      }
    });
    enviarEvento(EVT_WIFI_CONECTADO);
  } else {
    Serial.println();
    Serial.println("Falha no Wi-Fi. Continuando offline.");
  }
#endif
}

void atenderClienteWeb() {
#if WIFI_HABILITADO
  servidorHTTP.handleClient();
  webSocket.loop();
  // Telemetria a 1 Hz
  static unsigned long tAnt = 0;
  if (millis() - tAnt > 1000) {
    tAnt = millis();
    enviarTelemetria();
  }
#endif
}

// um rolo, vira de novo e volta. Repete até cobrir tudo.
//
//   ┌───────────────────────┐
//   │ →→→→→→→→→→→→→→→→→→→↓ │
//   │ ↓←←←←←←←←←←←←←←←←←← │
//   │ →→→→→→→→→→→→→→→→→→→↓ │
//   │ ↓←←←←←←←←←←←←←←←←←← │
//   └───────────────────────┘

void executarServico() {
  Serial.println("=== INICIANDO SERVIÇO ===");
  estadoAtual = TRABALHANDO;
  enviarEvento(EVT_FAIXA_INICIADA, "servico iniciado");

  for (int faixa = 0; faixa < NUMERO_DE_FAIXAS; faixa++) {
    faixaAtualGlobal = faixa + 1;

    // Antes de cada faixa, reconfere segurança
    if (emergenciaAcionada()) { estadoAtual = EMERGENCIA; enviarEvento(EVT_EMERGENCIA_ACIONADA, "botao fisico"); return; }
    if (detectouQueda())       { estadoAtual = QUEDA;     enviarEvento(EVT_QUEDA_DETECTADA); return; }

    // Distância estimada deste segmento (largura × 1 + comprimento)
    m2FeitosGlobal += (COMPRIMENTO_FAIXA_CM / 100.0) * (LARGURA_FAIXA_MM / 100.0);

    Serial.print("Faixa ");
    Serial.print(faixa + 1);
    Serial.print(" de ");
    Serial.println(NUMERO_DE_FAIXAS);

    // --- 1. Percorre a faixa aplicando produto ---
    bool completou = andarDistancia(COMPRIMENTO_FAIXA_CM, VELOCIDADE_PWM);

    if (!completou) {
      Serial.println("!! Serviço interrompido por segurança");
      fecharValvula();
      enviarEvento(EVT_OBSTACULO_DETECTADO, "parada durante faixa");
      return;
    }

    enviarEvento(EVT_FAIXA_CONCLUIDA, ("faixa " + String(faixa + 1)).c_str());

    // --- 2. Fecha a válvula antes de manobrar ---
    fecharValvula();
    estadoAtual = MANOBRANDO;

    // --- 3. Se é a última faixa, terminou ---
    if (faixa == NUMERO_DE_FAIXAS - 1) {
      Serial.println("=== SERVIÇO FINALIZADO ===");
      estadoAtual = FINALIZADO;
      enviarEvento(EVT_OBRA_CONCLUIDA, "todas as faixas concluidas");
      return;
    }

    // --- 4. Gira 90 graus ---
    if (faixa % 2 == 0) girarGraus(90, VELOCIDADE_PWM);
    else                girarGraus(-90, VELOCIDADE_PWM);

    if (emergenciaAcionada()) { estadoAtual = EMERGENCIA; enviarEvento(EVT_EMERGENCIA_ACIONADA); return; }

    // --- 5. Avança a largura de uma faixa ---
    andarDistancia(LARGURA_FAIXA_MM / 10.0, VELOCIDADE_PWM);

    // --- 6. Gira 90 graus de volta ---
    if (faixa % 2 == 0) girarGraus(90, VELOCIDADE_PWM);
    else                girarGraus(-90, VELOCIDADE_PWM);

    estadoAtual = TRABALHANDO;
    delay(200);
  }

  estadoAtual = FINALIZADO;
  enviarEvento(EVT_OBRA_CONCLUIDA);
  Serial.println("=== SERVIÇO FINALIZADO ===");
}

// ============================================================================
// 12. CONFIGURAÇÃO INICIAL (roda uma vez quando liga)
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("========================================");
  Serial.println("  ROBO APLICADOR DE IMPERMEABILIZANTE");
  Serial.println("  Firmware v1.0 — inicializando...");
  Serial.println("========================================");

  // --- Configura os canais PWM do ESP32 ---
  ledcSetup(CANAL_PWM_E_R, FREQ_PWM, RESOLUCAO_PWM);
  ledcSetup(CANAL_PWM_E_L, FREQ_PWM, RESOLUCAO_PWM);
  ledcSetup(CANAL_PWM_D_R, FREQ_PWM, RESOLUCAO_PWM);
  ledcSetup(CANAL_PWM_D_L, FREQ_PWM, RESOLUCAO_PWM);

  ledcAttachPin(PIN_MOTOR_E_RPWM, CANAL_PWM_E_R);
  ledcAttachPin(PIN_MOTOR_E_LPWM, CANAL_PWM_E_L);
  ledcAttachPin(PIN_MOTOR_D_RPWM, CANAL_PWM_D_R);
  ledcAttachPin(PIN_MOTOR_D_LPWM, CANAL_PWM_D_L);

  // --- Configura os pinos dos sensores ultrassônicos ---
  pinMode(PIN_US_FRENTE_TRIG, OUTPUT);
  pinMode(PIN_US_FRENTE_ECHO, INPUT);
  pinMode(PIN_US_DIR_TRIG,    OUTPUT);
  pinMode(PIN_US_DIR_ECHO,    INPUT);
  pinMode(PIN_US_ESQ_TRIG,    OUTPUT);
  pinMode(PIN_US_ESQ_ECHO,    INPUT);
  pinMode(PIN_US_SOLO_TRIG,   OUTPUT);
  pinMode(PIN_US_SOLO_ECHO,   INPUT);

  // --- Configura válvula, LEDs e buzzer ---
  pinMode(PIN_VALVULA, OUTPUT);
  digitalWrite(PIN_VALVULA, LOW);       // começa FECHADA (segurança)

  pinMode(PIN_LED_VERDE, OUTPUT);
  pinMode(PIN_LED_VERMELHO, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  // --- Configura os botões ---
  // INPUT_PULLUP = o ESP32 liga um resistor interno de "pull-up".
  // Assim, o pino fica em HIGH quando solto e vai para LOW quando o botão
  // liga o pino ao GND.
  pinMode(PIN_BOTAO_START, INPUT_PULLUP);
  pinMode(PIN_BOTAO_ESTOP, INPUT_PULLUP);

  // --- Configura os encoders com interrupção ---
  // RISING = conta quando o sinal vai de 0 para 1
  // IMPORTANTE: os pinos 34 e 35 são "input only" — não têm pull-up interno.
  // Se o seu encoder precisar, coloque um resistor de 10k entre o sinal e 3,3V.
  pinMode(PIN_ENCODER_E, INPUT);
  pinMode(PIN_ENCODER_D, INPUT);
  attachInterrupt(digitalPinToInterrupt(PIN_ENCODER_E), contarPulsoE, RISING);
  attachInterrupt(digitalPinToInterrupt(PIN_ENCODER_D), contarPulsoD, RISING);

  // --- Wi-Fi opcional ---
  if (WIFI_HABILITADO) {
    configurarWiFi();
  }

  Serial.println("Sistema pronto.");
  Serial.println("Comandos pela serial:");
  Serial.println("  S = iniciar servico");
  Serial.println("  P = parar");
  Serial.println("  T = teste de sensores (leituras continuas)");
  Serial.println("  M = teste de motores (5 segundos)");
  Serial.println("  V = teste da valvula (3 segundos)");
  Serial.println("  C = calibracao assistida de giro");
  Serial.println();
}

// ============================================================================
// 13. LOOP PRINCIPAL (roda para sempre, milhares de vezes por segundo)
// ============================================================================

void loop() {

  // --- Prioridade absoluta: botão de emergência ---
  if (emergenciaAcionada()) {
    pararMotores();
    fecharValvula();
    estadoAtual = EMERGENCIA;
  }

  // --- Lê comandos que você digita no Monitor Serial ---
  if (Serial.available() > 0) {
    char comando = Serial.read();
    processarComando(comando);
  }

  // --- Lê o botão físico de START ---
  // (lógica simples: se pressionado e estava parado, inicia)
  if (digitalRead(PIN_BOTAO_START) == LOW && estadoAtual == PARADO) {
    delay(200);  // "debounce": espera o botão parar de quicar
    if (digitalRead(PIN_BOTAO_START) == LOW) {
      estadoAtual = TRABALHANDO;
      executarServico();
    }
  }

  // --- Gerencia a válvula conforme o estado ---
  gerenciarValvula(estadoAtual == TRABALHANDO);

  // --- Atualiza LEDs e buzzer ---
  sinalizar(estadoAtual);

  // --- Servidor web (se Wi-Fi estiver habilitado) ---
  if (WIFI_HABILITADO) {
    atenderClienteWeb();
  }

  // Pequena pausa para estabilidade
  delay(10);
}

// ============================================================================
// 14. PROCESSAMENTO DE COMANDOS SERIAIS (para você testar e calibrar)
// ============================================================================

void processarComando(char cmd) {
  switch (cmd) {

    case 'S':   // Iniciar serviço
    case 's':
      Serial.println(">> Comando: INICIAR");
      estadoAtual = TRABALHANDO;
      executarServico();
      break;

    case 'P':   // Parar
    case 'p':
      Serial.println(">> Comando: PARAR");
      pararMotores();
      fecharValvula();
      estadoAtual = PARADO;
      break;

    case 'T':   // Teste dos sensores
    case 't':
      Serial.println(">> Teste de sensores (Ctrl+C no monitor para sair)");
      Serial.println("Pressione P para parar.");
      while (Serial.available() == 0) {
        Serial.print("Frente: ");
        Serial.print(lerDistancia(PIN_US_FRENTE_TRIG, PIN_US_FRENTE_ECHO));
        Serial.print(" cm | Dir: ");
        Serial.print(lerDistancia(PIN_US_DIR_TRIG, PIN_US_DIR_ECHO));
        Serial.print(" cm | Esq: ");
        Serial.print(lerDistancia(PIN_US_ESQ_TRIG, PIN_US_ESQ_ECHO));
        Serial.print(" cm | Solo: ");
        Serial.print(lerDistancia(PIN_US_SOLO_TRIG, PIN_US_SOLO_ECHO));
        Serial.println(" cm");
        delay(500);
        if (emergenciaAcionada()) break;
      }
      break;

    case 'M':   // Teste dos motores
    case 'm':
      Serial.println(">> Teste de motores: frente 2s, parar 1s, tras 2s");
      moverMotor('E', VELOCIDADE_PWM);
      moverMotor('D', VELOCIDADE_PWM);
      delay(2000);
      pararMotores();
      delay(1000);
      moverMotor('E', -VELOCIDADE_PWM);
      moverMotor('D', -VELOCIDADE_PWM);
      delay(2000);
      pararMotores();
      Serial.print("Pulsos encoder E: ");
      Serial.print(pulsosEncoderE);
      Serial.print(" | D: ");
      Serial.println(pulsosEncoderD);
      Serial.println(">> Se os valores forem muito diferentes, calibre");
      Serial.println(">> FATOR_COMPENSACAO_MOTOR");
      break;

    case 'V':   // Teste da válvula
    case 'v':
      Serial.println(">> Teste da valvula: abre 3s, fecha");
      abrirValvula();
      delay(3000);
      fecharValvula();
      Serial.println(">> Valvula fechada. Verifique se parou de pingar.");
      break;

    case 'C':   // Calibração assistida do giro de 90°
    case 'c':
      Serial.println(">> CALIBRACAO DE GIRO");
      Serial.println(">> O robo vai girar. Meça o angulo real com um esquadro.");
      delay(2000);
      pulsosEncoderE = 0;
      pulsosEncoderD = 0;
      girarGraus(90, VELOCIDADE_PWM);
      Serial.print(">> Pulsos usados: E=");
      Serial.print(pulsosEncoderE);
      Serial.print(" D=");
      Serial.println(pulsosEncoderD);
      Serial.print(">> PULSOS_GIRO_90 atual: ");
      Serial.println(PULSOS_GIRO_90);
      Serial.println(">> Fórmula: novo = atual * (90 / anguloMedido)");
      break;

    case 'H':   // Ajuda
    case 'h':
      Serial.println("Comandos: S=iniciar P=parar T=sensores M=motores V=valvula C=calibrar H=ajuda");
      break;

    default:
      // Ignora caracteres desconhecidos (como quebras de linha)
      break;
  }
}

// ============================================================================
// FIM DO FIRMWARE
// ============================================================================
// Lembrete: a segurança NUNCA deve depender só do software.
// Mantenha sempre a chave geral e o botão de emergência físicos funcionando.
// ============================================================================
