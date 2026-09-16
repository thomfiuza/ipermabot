# 🚀 Guia de Push Inicial — Ipermabot v1.0.1

> Passo-a-passo testado e validado. Leva ~10 minutos.

## ✅ Pré-requisitos (validado)

```
✓ 32 commits prontos para envio
✓ Tag v1.0.1 pronta
✓ Working tree limpo
✓ 4/4 revisão contínua verde (testes + lint + firmware + protocolo)
✓ 174/174 testes verdes (126 JS + 48 IMU firmware)
✓ Bundle Git válido (3,3 MB)
✓ SHA256 do .zip verificado
```

## 1️⃣ Criar o repositório no GitHub (no navegador)

**Configurações recomendadas:**

| Campo | Valor |
|---|---|
| Repository name | `ipermabot` (ou `ipermabot-v1` se preferir) |
| Description | `Robô aplicador autônomo de impermeabilizante — firmware ESP32 + PWA de controle` |
| Visibilidade | `Private` (recomendado até v1.1) ou `Public` |
| Initialize | **NÃO** marcar nada (vamos subir o histórico existente) |
| .gitignore | Nenhum (já temos o nosso) |
| License | MIT (já incluso em LICENSE) |

⚠️ **NÃO** inicialize com README, .gitignore ou license — o push abaixo trará tudo.

## 2️⃣ Configurar o remote (na sua máquina, em casa)

```bash
cd /caminho/do/projeto-robo-impermeabilizador

# Substitua SEU-USUARIO pelo seu username do GitHub:
git remote add origin https://github.com/SEU-USUARIO/ipermabot.git

# Confirme:
git remote -v
# Deve mostrar:
# origin  https://github.com/SEU-USUARIO/ipermabot.git (fetch)
# origin  https://github.com/SEU-USUARIO/ipermabot.git (push)
```

## 3️⃣ Push do branch main + tag v1.0.1

```bash
# Push do branch principal com todo o histórico (32 commits)
git push -u origin main

# Push da tag v1.0.1
git push origin v1.0.1

# Se quiser tags futuras:
git push origin --tags
```

## 4️⃣ Verificar que tudo subiu

```bash
# No GitHub, acesse:
# https://github.com/SEU-USUARIO/ipermabot

# Deve mostrar:
# ✓ 32 commits
# ✓ Tag v1.0.1
# ✓ Branch main
# ✓ Arquivos: app/, firmware/, docs/, tools/, .github/, etc.
```

## 5️⃣ Criar a Release v1.0.1 (opcional, mas recomendado)

**Via interface web do GitHub:**

1. Acesse `https://github.com/SEU-USUARIO/ipermabot/releases`
2. Clique em **"Draft a new release"**
3. Preencha:
   - **Tag version**: `v1.0.1` (selecione a tag existente)
   - **Release title**: `Ipermabot v1.0.1 — Rebrand + Bilíngue + Bugfixes`
   - **Description**: copie o conteúdo de `CHANGELOG.md` (seção `[1.0.1]`)
4. **Anexe os binários** (opcional):
   - `dist/ipermabot-v1.0.1.zip` (55 KB — PWA)
   - `dist/ipermabot-v1.0.1.zip.sha256` (checksum)
   - `dist/ipermabot-v1.0.1.bundle` (3,3 MB — bundle Git)
5. Marque **"This is a pre-release"** se for v1.0.1 beta (não é o caso)
6. Clique em **"Publish release"**

## 6️⃣ Configurar GitHub Pages (deploy do PWA)

**Apenas se quiser o PWA online:**

1. Vá em `Settings → Pages`
2. Source: `GitHub Actions`
3. O workflow `.github/workflows/deploy-pwa.yml` fará deploy automaticamente
4. URL será: `https://SEU-USUARIO.github.io/ipermabot/`

## 7️⃣ (Opcional) Proteger a branch main

**Settings → Branches → Add rule:**

- Branch name pattern: `main`
- ☑ Require a pull request before merging
- ☑ Require approvals: 1
- ☑ Dismiss stale pull request approvals when new commits are pushed
- ☑ Require status checks to pass before merging:
  - Selecione `Lint JS` + `Testes unitários JS` + `Validação do firmware` + `Coerência do protocolo`

## 🎯 Comandos resumidos (cola)

```bash
cd /home/user/projeto-robo-impermeabilizador

git remote add origin https://github.com/SEU-USUARIO/ipermabot.git
git push -u origin main
git push origin v1.0.1
```

## ❓ Problemas comuns

### "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/SEU-USUARIO/ipermabot.git
```

### "failed to push some refs" (repo remoto não-vazio)
Você provavelmente inicializou o repo com README. Solução:
```bash
git pull origin main --allow-unrelated-histories --rebase
git push origin main
```

### Quero trocar de HTTPS para SSH
```bash
git remote set-url origin git@github.com:SEU-USUARIO/ipermabot.git
```

### Autenticação falha
GitHub removeu autenticação por senha. Use:
- **Personal Access Token (PAT)** em `Settings → Developer settings → PAT`
- OU **SSH key** (mais recomendado para dev constante)

---

**Quando chegar em casa, é só seguir o passo-a-passo acima. 🚀**

Tudo já está validado e pronto — você não precisa rodar nada antes do push.
