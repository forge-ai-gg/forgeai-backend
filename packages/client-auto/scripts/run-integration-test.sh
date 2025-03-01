#!/bin/bash

# This script runs a specific integration test

if [ -z "$1" ]; then
  echo "Usage: $0 <test-file-path>"
  echo "Example: $0 trading/execute-flow.test.ts"
  exit 1
fi

TEST_PATH="$1"

# Ensure the path starts with __tests__/integration/ if not provided
if [[ ! "$TEST_PATH" == __tests__/integration/* ]]; then
  TEST_PATH="__tests__/integration/$TEST_PATH"
fi

# Ensure the path ends with .test.ts if not provided
if [[ ! "$TEST_PATH" == *.test.ts ]]; then
  TEST_PATH="$TEST_PATH.test.ts"
fi

# Check if the file exists
if [ ! -f "$TEST_PATH" ]; then
  echo "Error: Test file not found: $TEST_PATH"
  exit 1
fi

echo "Running integration test: $TEST_PATH"
pnpm vitest run --config vitest.integration.config.ts "$TEST_PATH" 