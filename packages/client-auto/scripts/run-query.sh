#!/bin/bash

# Simple script to run arbitrary SQL queries using psql

# Change to the project root directory
cd "$(dirname "$0")/../../../" || exit 1

# Display help if requested
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
  echo "Usage: ./packages/client-auto/scripts/run-query.sh 'SQL_QUERY'"
  echo "Example: ./packages/client-auto/scripts/run-query.sh 'SELECT * FROM \"Agent\" LIMIT 5'"
  exit 0
fi

# Get POSTGRES_URL from .env file
if [ -f .env ]; then
  source .env
elif [ -f packages/client-auto/.env ]; then
  source packages/client-auto/.env
else
  echo "Error: .env file not found. Please create one with POSTGRES_URL."
  exit 1
fi

# Check if POSTGRES_URL is set
if [ -z "$POSTGRES_URL" ]; then
  echo "Error: POSTGRES_URL not found in .env file."
  exit 1
fi

# Remove query parameters from URL for psql compatibility
CLEAN_URL=$(echo "$POSTGRES_URL" | cut -d'?' -f1)

# Set query from first argument or use default
QUERY=${1:-'SELECT * FROM "Agent" LIMIT 10'}

# Execute the query directly using POSTGRES_URL
echo "Executing: $QUERY"
PAGER=cat psql "$CLEAN_URL" -c "$QUERY" --no-psqlrc 