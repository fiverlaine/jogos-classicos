#!/bin/bash

# Definir o diretório base do projeto
BASE_DIR="$(pwd)"
echo "Procurando referências ao jogo da memória em: $BASE_DIR"
echo "=========================================================="

# Padrões para procurar (case insensitive)
PATTERNS=(
  "memory-game"
  "memorygame"
  "jogo da memória"
  "memory card"
  "memorycard"
  "memory-supabase"
  "onlinememorygame"
  "online-memory-game"
  "memoryplayer"
  "memory-player"
)

# Extensões de arquivos para procurar
EXTENSIONS=(
  "ts"
  "tsx"
  "js"
  "jsx"
  "json"
)

# Construir o padrão de extensões para o grep
EXT_PATTERN=$(printf "*.%s " "${EXTENSIONS[@]}")

# Diretórios para ignorar
IGNORE_DIRS=(
  "node_modules"
  ".git"
  ".next"
  "dist"
  "build"
)

# Construir os parâmetros de exclusão para o find
EXCLUDE_PARAMS=""
for dir in "${IGNORE_DIRS[@]}"; do
  EXCLUDE_PARAMS="$EXCLUDE_PARAMS -not -path '*/$dir/*'"
done

# Encontrar referências para cada padrão
for pattern in "${PATTERNS[@]}"; do
  echo "Procurando por: '$pattern'"
  # Usamos eval para processar os parâmetros de exclusão
  eval find "$BASE_DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" \) $EXCLUDE_PARAMS -exec grep -l -i "$pattern" {} \; | while read file; do
    echo "  Encontrado em: $file"
    grep -n -i --color=always "$pattern" "$file" | head -3 # Mostrar as primeiras 3 ocorrências
    echo ""
  done
  echo "----------------------------------------------------------"
done

echo "Busca concluída. Verifique os resultados acima para referências ao jogo da memória."
echo "Se algum arquivo ainda contiver referências que precisam ser removidas, edite-os manualmente." 