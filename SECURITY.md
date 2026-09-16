# 🔒 Política de Segurança — IMP-BOT

## Versões com atualizações

| Versão  | Suportada |
|---------|-----------|
| latest  | ✅ Sim — patches frequentes |
| 1.0.x   | ✅ Sim — atual com correções |
| < 1.0   | ❌ Não — faça upgrade |

## Como reportar uma vulnerabilidade

**Não abra issue pública.** Vulnerabilidades de segurança devem ser reportadas
por canal privado.

### Email

📧 **security@imp-bot.example**

Substitua pelo email real do time antes de publicar.

### O que incluir

- Descrição técnica da vulnerabilidade
- Passos para reproduzir
- Versão afetada
- Impacto potencial (dados, hardware, financeiro, segurança pessoal)
- Sugestão de mitigação (se tiver)

### Prazo de resposta

- Confirmação inicial: **48h úteis**
- Patch em versão de segurança: **7 dias** para crítica, 30 para outras
- Disclosure coordenado: alinhamos data de divulgação pública (90 dias default)

## O que **NÃO** reportar aqui

- Bugs que não são segurança → abra issue normal
- Pedidos de feature → use Discussions
- Questões de uso → Discussions/StackOverflow

## Áreas de risco atuais

| Componente | Risco | Mitigação |
|---|---|---|
| Wi-Fi AP aberto | Médio | Senha padrão + WPS off + MAC filter |
| WebSocket sem TLS | Médio | Em AP, usuários próximos podem interceptar |
| Comandos sem auth | Alto | TODO em v1.1 (HMAC) |
| LocalStorage do app | Baixo | Não armazena dados sensíveis |

## Boas práticas pra produção

Antes de colocar o robô em campo:

- [ ] Senha única por cliente no AP Wi-Fi do ESP32
- [ ] Firmware >= 1.0.0 (todas correções aplicadas)
- [ ] PWA hospedado em HTTPS (GitHub Pages suporta)
- [ ] Botão de emergência testado fisicamente
- [ ] Botoeira de emergência acessória (trava mecânica recomendada)
- [ ] Falha de comunicação configurada para parada (timeout)
- [ ] Manutenção preventiva a cada 100 horas de operação
- [ ] Backup da configuração (NVS) anotado
