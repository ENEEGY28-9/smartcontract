import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// Use devnet for testing to avoid rate limiting
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';
const connection = new Connection(SOLANA_RPC_URL);

// Wallet info interface:
// address: string
// balance: number
// balanceLamports: number
// isValid: boolean
// network: string

export const WalletService = {
    async getWalletInfo(address: string) {
        try {
            const publicKey = new PublicKey(address);
            const balanceLamports = await connection.getBalance(publicKey);
            const balance = balanceLamports / LAMPORTS_PER_SOL;

            return {
                address,
                balance,
                balanceLamports,
                isValid: true,
                network: 'Solana Devnet'
            };
        } catch (error) {
            console.error('Error fetching wallet info:', error);
            // Return mock data for testing when API is not available
            return {
                address,
                balance: 0.0000,
                balanceLamports: 0,
                isValid: true,
                network: 'Solana Devnet (API unavailable)',
                note: 'Using mock data - connect to Solana network for real balance'
            };
        }
    },

    async getBalance(address: string) {
        try {
            const publicKey = new PublicKey(address);
            const balanceLamports = await connection.getBalance(publicKey);
            return balanceLamports / LAMPORTS_PER_SOL;
        } catch (error) {
            console.error('Error fetching balance:', error);
            // Return mock balance for testing
            return 0.0000;
        }
    },

    async getTransactionHistory(address: string, limit = 10) {
        try {
            const publicKey = new PublicKey(address);
            const transactions = await connection.getSignaturesForAddress(publicKey, { limit });
            return transactions;
        } catch (error) {
            console.error('Error fetching transaction history:', error);
            return [];
        }
    },

    validateAddress(address: string) {
        try {
            new PublicKey(address);
            return true;
        } catch {
            return false;
        }
    },

    formatAddress(address: string, chars = 4) {
        if (address.length <= chars * 2) return address;
        return `${address.slice(0, chars)}...${address.slice(-chars)}`;
    },

    formatBalance(balance: number, decimals = 4) {
        return balance.toFixed(decimals);
    },

    async testConnection() {
        try {
            await connection.getVersion();
            return true;
        } catch {
            return false;
        }
    }
}

// Test your wallet
export async function testWallet() {
    const WALLET_ADDRESS = '57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB';
    return await WalletService.getWalletInfo(WALLET_ADDRESS);
}
