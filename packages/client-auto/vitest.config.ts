import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

// Load environment variables from .env.test
dotenv.config({ path: ".env" });

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["**/__tests__/**/*.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.ts"],
        },
    },
});
