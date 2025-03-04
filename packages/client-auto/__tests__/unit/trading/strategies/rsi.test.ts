import * as constants from "@/lib/constants";
import {
    evaluateRsiStrategy,
    generateRsiTradeReason,
} from "@/trading/strategies/rsi";
import { rsi } from "technicalindicators";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createBaseTradingContext,
    createMockPosition,
    createTokenPairs,
} from "../../../test-utils";

// Mock the technicalindicators library
vi.mock("technicalindicators", () => {
    return {
        rsi: vi.fn().mockReturnValue([30]),
    };
});

// Import after mocking

// Cast the mocked function to the correct type
const mockRsi = rsi as unknown as ReturnType<typeof vi.fn>;

describe("RSI Strategy", () => {
    // Define token pair using the test utilities
    const mockTokenPair = createTokenPairs().pair1;

    // Base trading context for tests
    const baseTradingContext = createBaseTradingContext();

    // Reset mocks before each test
    beforeEach(() => {
        vi.clearAllMocks();
        // Set default RSI value
        mockRsi.mockReturnValue([30]);
        // Reset the force constants
        vi.spyOn(constants, "FORCE_OPEN_POSITION", "get").mockReturnValue(
            false
        );
        vi.spyOn(constants, "FORCE_CLOSE_POSITION", "get").mockReturnValue(
            false
        );
    });

    describe("evaluateRsiStrategy", () => {
        it("should recommend opening a position when RSI is below overSold threshold", () => {
            // Mock RSI value below overSold threshold
            mockRsi.mockReturnValue([25]);

            const result = evaluateRsiStrategy({
                ctx: baseTradingContext,
                pair: mockTokenPair,
                amount: 100,
            });

            expect(result.shouldOpen).toBe(true);
            expect(result.shouldClose).toBe(false);
            expect(result.hasOpenPosition).toBe(false);
            expect(result.openProximity).toBeGreaterThan(0);
            expect(result.closeProximity).toBe(0);
        });

        it("should not recommend opening a position when RSI is above overSold threshold", () => {
            // Mock RSI value above overSold threshold
            mockRsi.mockReturnValue([40]);

            const result = evaluateRsiStrategy({
                ctx: baseTradingContext,
                pair: mockTokenPair,
                amount: 100,
            });

            expect(result.shouldOpen).toBe(false);
            expect(result.shouldClose).toBe(false);
            expect(result.hasOpenPosition).toBe(false);
            expect(result.openProximity).toBe(0);
            expect(result.closeProximity).toBe(0);
        });

        it("should recommend closing a position when RSI is above overBought threshold", () => {
            // Mock RSI value above overBought threshold
            mockRsi.mockReturnValue([75]);

            // Create context with an open position
            const mockPosition = createMockPosition();
            const contextWithOpenPosition = createBaseTradingContext(
                undefined,
                [mockPosition]
            );

            const result = evaluateRsiStrategy({
                ctx: contextWithOpenPosition,
                pair: mockTokenPair,
                amount: 100,
            });

            expect(result.shouldOpen).toBe(false);
            expect(result.shouldClose).toBe(true);
            expect(result.hasOpenPosition).toBe(true);
            expect(result.openProximity).toBe(0);
            expect(result.closeProximity).toBeGreaterThan(0);
        });

        it("should not recommend closing a position when RSI is below overBought threshold", () => {
            // Mock RSI value below overBought threshold
            mockRsi.mockReturnValue([60]);

            // Create context with an open position
            const mockPosition = createMockPosition();
            const contextWithOpenPosition = createBaseTradingContext(
                undefined,
                [mockPosition]
            );

            const result = evaluateRsiStrategy({
                ctx: contextWithOpenPosition,
                pair: mockTokenPair,
                amount: 100,
            });

            expect(result.shouldOpen).toBe(false);
            expect(result.shouldClose).toBe(false);
            expect(result.hasOpenPosition).toBe(true);
            expect(result.openProximity).toBe(0);
            expect(result.closeProximity).toBe(0);
        });

        it("should force open a position when FORCE_OPEN_POSITION is true", () => {
            // Mock RSI value above overSold threshold (would normally not open)
            mockRsi.mockReturnValue([40]);

            // Set FORCE_OPEN_POSITION to true
            const forceSpy = vi.spyOn(constants, "FORCE_OPEN_POSITION", "get");
            // @ts-ignore - Intentionally mocking with a different value for testing
            forceSpy.mockReturnValue(true);

            const result = evaluateRsiStrategy({
                ctx: baseTradingContext,
                pair: mockTokenPair,
                amount: 100,
            });

            expect(result.shouldOpen).toBe(true);
            expect(result.shouldClose).toBe(false);
        });

        it("should force close a position when FORCE_CLOSE_POSITION is true", () => {
            // Mock RSI value below overBought threshold (would normally not close)
            mockRsi.mockReturnValue([60]);

            // Set FORCE_CLOSE_POSITION to true
            const forceSpy = vi.spyOn(constants, "FORCE_CLOSE_POSITION", "get");
            // @ts-ignore - Intentionally mocking with a different value for testing
            forceSpy.mockReturnValue(true);

            // Create context with an open position
            const mockPosition = createMockPosition();
            const contextWithOpenPosition = createBaseTradingContext(
                undefined,
                [mockPosition]
            );

            const result = evaluateRsiStrategy({
                ctx: contextWithOpenPosition,
                pair: mockTokenPair,
                amount: 100,
            });

            expect(result.shouldOpen).toBe(false);
            expect(result.shouldClose).toBe(true);
        });

        it("should calculate openProximity correctly", () => {
            // Test with different RSI values to check proximity calculation
            const testCases = [
                { rsi: 10, expectedProximity: 0.67 }, // (30 - 10) / 30 = 0.67
                { rsi: 20, expectedProximity: 0.33 }, // (30 - 20) / 30 = 0.33
                { rsi: 25, expectedProximity: 0.17 }, // (30 - 25) / 30 = 0.17
                { rsi: 30, expectedProximity: 0 }, // At threshold, no proximity
                { rsi: 35, expectedProximity: 0 }, // Above threshold, no proximity
            ];

            for (const testCase of testCases) {
                mockRsi.mockReturnValue([testCase.rsi]);

                const result = evaluateRsiStrategy({
                    ctx: baseTradingContext,
                    pair: mockTokenPair,
                    amount: 100,
                });

                expect(result.openProximity).toBeCloseTo(
                    testCase.expectedProximity,
                    1
                );
            }
        });

        it("should calculate closeProximity correctly", () => {
            // Create context with an open position
            const mockPosition = createMockPosition();
            const contextWithOpenPosition = createBaseTradingContext(
                undefined,
                [mockPosition]
            );

            // Test with different RSI values to check proximity calculation
            const testCases = [
                { rsi: 70, expectedProximity: 0 }, // At threshold, no proximity
                { rsi: 75, expectedProximity: 0.17 }, // (75 - 70) / (100 - 70) = 0.17
                { rsi: 80, expectedProximity: 0.33 }, // (80 - 70) / (100 - 70) = 0.33
                { rsi: 90, expectedProximity: 0.67 }, // (90 - 70) / (100 - 70) = 0.67
                { rsi: 65, expectedProximity: 0 }, // Below threshold, no proximity
            ];

            for (const testCase of testCases) {
                mockRsi.mockReturnValue([testCase.rsi]);

                const result = evaluateRsiStrategy({
                    ctx: contextWithOpenPosition,
                    pair: mockTokenPair,
                    amount: 100,
                });

                expect(result.closeProximity).toBeCloseTo(
                    testCase.expectedProximity,
                    1
                );
            }
        });
    });

    describe("generateRsiTradeReason", () => {
        it("should generate a reason with RSI value and position status", () => {
            // Mock RSI value
            mockRsi.mockReturnValue([42]);

            const reason = generateRsiTradeReason(
                baseTradingContext,
                mockTokenPair
            );
            expect(reason).toBe("RSI at 42 with no position");
        });

        it("should indicate open position in the reason", () => {
            // Mock RSI value
            mockRsi.mockReturnValue([42]);

            // Create context with an open position
            const mockPosition = createMockPosition();
            const contextWithOpenPosition = createBaseTradingContext(
                undefined,
                [mockPosition]
            );

            const reason = generateRsiTradeReason(
                contextWithOpenPosition,
                mockTokenPair
            );
            expect(reason).toBe("RSI at 42 with open position");
        });

        it("should return 'Insufficient data' when price history or portfolio is missing", () => {
            const incompleteContext = {
                ...baseTradingContext,
                priceHistory: undefined,
            };

            const reason = generateRsiTradeReason(
                incompleteContext,
                mockTokenPair
            );
            expect(reason).toBe("Insufficient data");
        });
    });
});
