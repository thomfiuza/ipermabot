# Contribuindo com o Ipermabot

Obrigado por querer ajudar. Este projeto segue **GitFlow simplificado** e CI obrigatório.

## Workflow

1. **Crie uma branch** para sua feature/correção:
   ```
   git checkout -b feature/minha-feature
   # ou
   git checkout -b fix/descricao-do-bug
   ```

2. **Faça suas alterações**. Mantenha cada commit pequeno e focado.

3. **Rode a revisão local**:
   ```
   cd projeto-robo-impermeabilizador
   node tools/scripts/review.mjs
   ```
   Isso roda:
   - Testes unitários do app
   - Lint JS
   - Validação do firmware
   - Coerência do protocolo entre app e firmware
   - Só prossiga se tudo passar.

4. **Adicione/atualize testes** se alterar lógica:
   - Para JS: novo arquivo `app/tests/<modulo>.test.js` ou estender existente.
   - Para firmware: valide sintaxe via `arduino-cli compile`.

5. **Atualize o CHANGELOG.md** sob `[Unreleased]`.

6. **Atualize o protocolo** se necessário (`docs/protocolo/PROTOCOLO_COMUNICACAO.md`).

7. **Commit com mensagem descritiva**:
   ```
   git commit -m "feat(app): adiciona tela de métricas ao vivo"
   ```

8. **Abra Pull Request** com:
   - Título claro (`feat:`, `fix:`, `docs:`, `refactor:` etc.)
   - Descrição do que muda e por quê
   - Prints/logs se relevante

## Convenção de mensagens

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: ...` — nova funcionalidade
- `fix: ...` — correção
- `docs: ...` — só documentação
- `refactor: ...` — reescrita sem mudar comportamento
- `test: ...` — só testes
- `chore: ...` — manutenção (deps, configs)

## Padrões de código

### JavaScript (App)
- ES6+ (módulos, classes, `const`/`let`, arrow functions).
- Sem dependências externas — só APIs do navegador.
- Funções puras em `utils.js` quando possível.
- JSDoc em toda função/classe exportada.
- Use `===` em vez de `==`.

### C++ (Firmware)
- Style Arduino padrão (camelCase para funções, UPPER_CASE para constantes).
- Configurável via `WIFI_HABILITADO` (0 ou 1).
- Strings longas use `F("...")` para economizar RAM.
- Emojis não, comentários sóbrios.

## Onde pedir ajuda

- Abra uma **Issue** com label `question`.
- Para coisas urgentes (bug de segurança): `security@ipermabot.local` (crie se necessário).

## Código de Conduta

Somos profissionais. Sem assédio, sem spam, sem discurso de ódio.
