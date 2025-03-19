#!/bin/bash

# Definir o diretório base do projeto
BASE_DIR="$(pwd)"
echo "Diretório base: $BASE_DIR"

# 1. Limpar arquivos na pasta components
echo "Removendo arquivos de memory-game em components..."
rm -f "$BASE_DIR/components/memory-game.tsx"

# 2. Remover a pasta memory em components/online-game
echo "Removendo pasta memory em components/online-game..."
rm -rf "$BASE_DIR/components/online-game/memory"

# 3. Remover arquivo memory-supabase.ts em lib
echo "Removendo arquivo memory-supabase.ts em lib..."
rm -f "$BASE_DIR/lib/memory-supabase.ts"

# 4. Limpar pasta games/memory, mantendo apenas o README
echo "Limpando pasta games/memory..."
# Listar todos os arquivos e diretórios exceto README.md
find "$BASE_DIR/src/app/games/memory" -not -name "README.md" | while read file; do
  if [ -d "$file" ]; then
    echo "Removendo diretório: $file"
    rm -rf "$file"
  elif [ -f "$file" ]; then
    echo "Removendo arquivo: $file"
    rm -f "$file"
  fi
done

# 5. Verificar e remover referências em lib/types.d.ts
echo "Verificando referências em lib/types.d.ts..."
if grep -q "memory" "$BASE_DIR/lib/types.d.ts"; then
  echo "Encontradas referências ao jogo da memória em types.d.ts"
  echo "Por favor, edite manualmente o arquivo lib/types.d.ts para remover essas referências"
fi

# 6. Verificar hooks relacionados ao memory
echo "Verificando hooks relacionados ao jogo da memória..."
find "$BASE_DIR/lib/hooks" -type f -name "*memory*.ts" -o -name "*memory*.tsx" | while read hook; do
  echo "Removendo hook: $hook"
  rm -f "$hook"
done

echo "Limpeza concluída! O jogo da memória foi removido, mantendo apenas o card na página inicial."
echo "Certifique-se de verificar manualmente qualquer outro arquivo que possa conter referências ao jogo da memória." 