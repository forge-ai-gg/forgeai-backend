#!/bin/bash

# Script to convert relative imports to path aliases
# Usage: ./convert-imports.sh

# Find all TypeScript files in the __tests__ directory
find ./__tests__ -name "*.ts" | while read -r file; do
  echo "Processing $file"
  
  # Replace relative imports with path aliases
  sed -i '' 's|from "\.\./\.\./\.\./src/|from "@/|g' "$file"
  sed -i '' 's|import "\.\./\.\./\.\./src/|import "@/|g' "$file"
  
  # Replace relative mocks with path aliases
  sed -i '' 's|vi\.mock("\.\./\.\./\.\./src/|vi.mock("@/|g' "$file"
done

echo "Conversion complete!" 