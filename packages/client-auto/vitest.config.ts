import dotenv from "dotenv";
import { resolve } from "path";
import { defineConfig } from "vitest/config";

// Load environment variables from .env.test
dotenv.config({ path: ".env" });

export default defineConfig({
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
        },
    },
    test: {
        globals: true,
        environment: "node",
        include: ["**/__tests__/unit/**/*.test.ts"],
        exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/__tests__/integration/**/*.test.ts",
        ],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.ts"],
        },
    },
});
