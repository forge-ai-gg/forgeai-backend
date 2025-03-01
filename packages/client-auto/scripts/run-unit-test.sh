#!/bin/bash

# This script runs a specific unit test

if [ -z "$1" ]; then
  echo "Usage: $0 <test-file-path>"
  echo "Example: $0 trading/context.test.ts"
  exit 1
fi

TEST_PATH="$1"

# Ensure the path starts with __tests__/ if not provided
if [[ ! "$TEST_PATH" == __tests__/* ]]; then
  # Check if it should go in trading or lib
  if [[ "$TEST_PATH" == trading/* ]]; then
    TEST_PATH="__tests__/trading/$TEST_PATH"
  elif [[ "$TEST_PATH" == lib/* ]]; then
    TEST_PATH="__tests__/lib/$TEST_PATH"
  else
    TEST_PATH="__tests__/$TEST_PATH"
  fi
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

echo "Running unit test: $TEST_PATH"
pnpm vitest run --config vitest.config.ts "$TEST_PATH" 