import { fetchWalletPortfolio } from "../lib/birdeye";

export class PortfolioService {
    async getTokenBalance(publicKey: string, tokenAddress: string) {
        const portfolio = await fetchWalletPortfolio(publicKey);
        return portfolio.data.items.find(
            (item) => item.address === tokenAddress
        )?.uiAmount ?? 0;
    }
} 