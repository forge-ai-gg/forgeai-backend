import { afterAll, beforeAll } from "vitest";

// This file contains setup and teardown code that runs before and after all integration tests

beforeAll(async () => {
    // Global setup for integration tests
    console.log("Setting up integration test environment...");

    // You can add any global setup here, such as:
    // - Setting up test databases
    // - Initializing shared test resources
    // - Setting up global mocks
});

afterAll(async () => {
    // Global teardown for integration tests
    console.log("Tearing down integration test environment...");

    // You can add any global teardown here, such as:
    // - Cleaning up test databases
    // - Releasing shared resources
    // - Resetting global mocks
});
