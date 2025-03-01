#!/bin/bash

# Script to convert relative imports to path aliases in source files
# Usage: ./convert-src-imports.sh

# Find all TypeScript files in the src directory
find ./src -name "*.ts" | while read -r file; do
  echo "Processing $file"
  
  # Replace relative imports with path aliases
  # This handles imports like "../../something" or "../something"
  sed -i '' 's|from "\.\./\.\./|from "@/|g' "$file"
  sed -i '' 's|from "\.\./|from "@/|g' "$file"
  
  # Handle import statements without 'from'
  sed -i '' 's|import "\.\./\.\./|import "@/|g' "$file"
  sed -i '' 's|import "\.\./|import "@/|g' "$file"
done

echo "Conversion complete!" 