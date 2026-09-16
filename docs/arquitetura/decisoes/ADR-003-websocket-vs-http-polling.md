# ADR-003 — WebSocket em vez de HTTP Polling para telemetria do robô

> **Status:** ✅ Aceita
> **Data:** 2026-09-16
> **Decisor:** Ipermabot Dev

## Contexto

O PWA precisa receber telemetria (estado, faixa, m², bateria, sensor solo)
do robô pelo menos 1× por segundo, idealmente sem desperdiçar bateria.

Restrições:
- ESP32 em bateria, conectividade Wi-Fi.
- Robô opera remotamente (operador a 5-30 m de distância).
- O PWA precisa abrir/fechar conexão rapidamente (operador troca de tela).

## Decisão

**WebSocket nativo (porta 81)** + biblioteca ArduinoWebSockets (Markus Sattler)
no firmware.

## Consequências

### Positivas
- ✅ **Latência < 100 ms** para comandos críticos (emergência).
- ✅ **Uma conexão persistente** — sem overhead HTTP.
- ✅ **Push automático** — firmware só envia quando quer; sem polling.
- ✅ **Full-duplex** — mesmo canal para comandos do app para o robô.
- ✅ **Bateria economiza ~50×** vs polling de 1s (que abriria nova conexão HTTP toda hora).

### Negativas / Riscos
- ❌ Auto-reconnect no app precisa ser implementado (vide `transport.js`).
- ❌ WebSocket exige servidor HTTP intermediário para fazer handshake (já temos via `WebServer.h`).
- ❌ Bibliotecas ESP32 de WebSocket podem ter bugs (Markus Sattler é a mais estável, com mais de 1k stars).
- ❌ Em ambientes proxy muito restritivos (corporativos) WebSocket pode falhar — fallback seria SSE.

## Critérios para reavaliação

1. **Latência > 200 ms consistente** — indica congestionamento, considerar SSE.
2. **Adicionar telemetria > 10 Hz** (vídeo, IMU 100Hz) — considerar MQTT.
3. **Necessidade de broadcast para múltiplos clientes** (ex.: dashboard na obra com 5 celulares abertos) — considerar MQTT.
4. **Ambientes com proxy fechado** — adicionar fallback SSE ou polling.

## Alternativas consideradas

- **HTTP Polling a 1 Hz:** descartado — gasta ~50× mais bateria e adiciona latência.
- **Server-Sent Events (SSE):** descartado — half-duplex (não resolve comando robô).
- **MQTT:** considerado — bom mas adiciona dependência (broker). Para 1 cliente/robô é overkill.
- **Long Polling:** descartado — mesma ineficiência do polling.
- **gRPC-Web:** descartado — exige protobuf, fora do escopo.

## Implementação concreta

| Lado | Tecnologia | URL |
|---|---|---|
| ESP32 (firmware) | `WebSocketsServer` (Markus Sattler) | `ws://<ip>:81` |
| App PWA (cliente) | WebSocket nativo do navegador | `ws://<ip>:81/ws` |

Veja implementação:
- `firmware/src/robo_impermeabilizador.ino` linhas 478-690 (seção 10.5)
- `app/js/transport.js` (classe `TransporteWebSocket`)

## Protocolo

Veja `docs/protocolo/PROTOCOLO_COMUNICACAO.md`. Mensagens são JSON:

```json
// app → robô
{"cmd": "iniciar", "id": 1, "params": {"demaos": 1}}

// robô → app
{"evt": "telemetria", "data": {"bateria_pct": 78, ...}}
```

## Referências

- [WebSocket API (MDN)](https://developer.mozilla.org/pt-BR/docs/Web/API/WebSocket)
- [Markus Sattler — ArduinoWebSockets](https://github.com/Links2004/arduino-WebSockets)
- [HTTP Polling vs WebSocket benchmark](https://ably.com/blog/websockets-vs-http-streaming)

## Histórico

- 2026-09-16: ADR criada.
