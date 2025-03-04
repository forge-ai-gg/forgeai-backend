#!/bin/bash

# Script to run SQL queries against the PostgreSQL database using the connection string from .env

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found at $ENV_FILE"
  exit 1
fi

# Extract POSTGRES_URL from .env file
POSTGRES_URL=$(grep -E "^POSTGRES_URL=" "$ENV_FILE" | cut -d '"' -f 2)

if [ -z "$POSTGRES_URL" ]; then
  echo "Error: POSTGRES_URL not found in .env file"
  exit 1
fi

# Default query if none provided
DEFAULT_QUERY="SELECT id, name, description, status, \"createdAt\", \"updatedAt\" FROM \"Agent\" LIMIT 10;"

# Function to display usage information
show_usage() {
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  -q, --query QUERY    SQL query to execute (enclose in quotes)"
  echo "  -f, --file FILE      File containing SQL query to execute"
  echo "  -t, --table TABLE    Table to query (shorthand for 'SELECT * FROM TABLE LIMIT 10')"
  echo "  -l, --limit N        Limit results (default: 10, use with -t)"
  echo "  -h, --help           Display this help message"
  echo ""
  echo "Examples:"
  echo "  $0                                  # Run default query (list 10 agents)"
  echo "  $0 -q \"SELECT * FROM \\\"Agent\\\" WHERE status = 'active'\"  # Run custom query"
  echo "  $0 -f query.sql                     # Run query from file"
  echo "  $0 -t Agent                         # List 10 rows from Agent table"
  echo "  $0 -t Agent -l 20                   # List 20 rows from Agent table"
}

# Parse command line arguments
QUERY="$DEFAULT_QUERY"
LIMIT=10

while [[ $# -gt 0 ]]; do
  case "$1" in
    -q|--query)
      QUERY="$2"
      shift 2
      ;;
    -f|--file)
      if [ ! -f "$2" ]; then
        echo "Error: Query file not found: $2"
        exit 1
      fi
      QUERY=$(cat "$2")
      shift 2
      ;;
    -t|--table)
      TABLE="$2"
      QUERY="SELECT * FROM \"$TABLE\" LIMIT $LIMIT;"
      shift 2
      ;;
    -l|--limit)
      LIMIT="$2"
      # If table was already set, update the query with the new limit
      if [ ! -z "$TABLE" ]; then
        QUERY="SELECT * FROM \"$TABLE\" LIMIT $LIMIT;"
      fi
      shift 2
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_usage
      exit 1
      ;;
  esac
done

# Execute the query
echo "Connecting to PostgreSQL database..."
echo "Executing query: $QUERY"
echo ""

# Use PSQL to execute the query
PGPASSWORD=$(echo "$POSTGRES_URL" | sed -E 's/.*:([^:@]+)@.*/\1/') \
psql "$POSTGRES_URL" -c "$QUERY" -P pager=off

# Check if the command was successful
if [ $? -ne 0 ]; then
  echo "Error executing query. Please check your query syntax and database connection."
  exit 1
fi

echo ""
echo "Query executed successfully." 