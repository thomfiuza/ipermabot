#!/usr/bin/env bash
# RESTAURAR_BACKUP.sh — Restaura o repositório a partir do bundle Git.
#
# Uso:
#   bash RESTAURAR_BACKUP.sh
#
# Cria um diretório `projeto-robo-impermeabilizador/` com todo o histórico
# Git (20 commits), todos os arquivos e a configuração `master` como branch
# principal. Você pode então:
#   - Adicionar um remote (`git remote add origin git@github.com:USER/...`)
#   - Fazer push (`git push -u origin master`)
#   - Abrir em qualquer cliente Git (`code .`, GitKraken, SourceTree…)

set -euo pipefail

# Localização do bundle (este script + bundle no mesmo diretório)
DIRETORIO="$(cd "$(dirname "$0")" && pwd)"
BUNDLE="$DIRETORIO/projeto-robo-impermeabilizador.bundle"
DESTINO="$DIRETORIO/restored"
NOME_REPO="projeto-robo-impermeabilizador"

# Verificações
if [[ ! -f "$BUNDLE" ]]; then
  echo "❌ Bundle não encontrado: $BUNDLE"
  echo "   Coloque o arquivo projeto-robo-impermeabilizador.bundle ao lado deste script."
  exit 1
fi

# Cria diretório temporário e clona
echo "🔄 Restaurando bundle $BUNDLE em $DESTINO/$NOME_REPO ..."
mkdir -p "$DESTINO"
cd "$DESTINO"
rm -rf "$NOME_REPO"
git clone "$BUNDLE" "$NOME_REPO"
cd "$NOME_REPO"

# Estatísticas
TOTAL_COMMITS=$(git rev-list --count HEAD)
ULTIMO_COMMIT=$(git log -1 --pretty=format:"%h %s")
echo ""
echo "✅ Restauração completa!"
echo ""
echo "   📂 Localização: $DESTINO/$NOME_REPO"
echo "   📜 Commits:     $TOTAL_COMMITS"
echo "   🕒 Último:      $ULTIMO_COMMIT"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "   1) Configurar seus dados de git (uma vez só):"
echo "      git config user.name  \"Seu Nome\""
echo "      git config user.email \"seu@email.com\""
echo ""
echo "   2) (Opcional) Criar repositório no GitHub:"
echo "      - Acesse https://github.com/new"
echo "      - Nome: projeto-robo-impermeabilizador"
echo "      - NÃO inicialize com README (já temos um)"
echo ""
echo "   3) Adicionar remote e empurrar:"
echo "      git remote add origin https://github.com/SEU_USER/projeto-robo-impermeabilizador.git"
echo "      git push -u origin master"
echo ""
echo "   4) Para acesso via SSH (recomendado para CI):"
echo "      git remote add origin git@github.com:SEU_USER/projeto-robo-impermeabilizador.git"
echo "      git push -u origin master"
echo ""
echo "🎉 Tudo pronto!"
