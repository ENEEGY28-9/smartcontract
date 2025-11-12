import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

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

    validateAddress(address: string, network: string = 'solana') {
        if (network === 'solana') {
            // Reject old demo addresses starting with 'So'
            if (address.startsWith('So') && address.length < 44) {
                return false;
            }
            // Accept valid base58 Solana addresses or our generated base58-like addresses
            if (address.length >= 32 && address.length <= 44) {
                // Check if it contains only base58 characters
                const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
                if (base58Regex.test(address)) {
                    return true;
                }
            }
            // Try real Solana validation as fallback
            try {
                new PublicKey(address);
                return true;
            } catch {
                return false;
            }
        }
        // For other networks, basic validation
        return address && address.length > 10;
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
    },

    async transferTokensToGamePool(fromWalletAddress: string, fromSecretKey: Uint8Array, amount: number) {
        try {
            const gamePoolAddress = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';
            const gameTokenMint = '2AxM2y84vg5rwP7QK7mwmBBZrDnZpXZxKTwU5vvX1FWK';

            // Create keypair from secret key
            const fromKeypair = Keypair.fromSecretKey(fromSecretKey);

            // Get associated token accounts
            const { getAssociatedTokenAddress, createTransferInstruction, getAccount, createAssociatedTokenAccountInstruction } = await import('@solana/spl-token');

            const fromTokenAccount = await getAssociatedTokenAddress(new PublicKey(gameTokenMint), fromKeypair.publicKey);
            const toTokenAccount = new PublicKey(gamePoolAddress); // Game pool is already a token account

            // Check if sender has enough balance
            const fromBalance = await getAccount(connection, fromTokenAccount);
            if (Number(fromBalance.amount) < amount * 1_000_000) {
                throw new Error('Insufficient balance');
            }

            // Create transfer instruction
            const transferIx = createTransferInstruction(
                fromTokenAccount,
                toTokenAccount,
                fromKeypair.publicKey,
                amount * 1_000_000, // Convert to smallest unit
                [],
                TOKEN_PROGRAM_ID
            );

            // Create and send transaction
            const transaction = new Transaction().add(transferIx);
            const signature = await connection.sendTransaction(transaction, [fromKeypair]);

            // Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');

            return {
                success: true,
                signature,
                amount,
                from: fromWalletAddress,
                to: gamePoolAddress
            };

        } catch (error) {
            console.error('Transfer failed:', error);
            return {
                success: false,
                error: error.message,
                from: fromWalletAddress,
                to: gamePoolAddress
            };
        }
    },

    async getGamePoolBalance() {
        try {
            const gamePoolAddress = '5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc';
            const { getAccount } = await import('@solana/spl-token');

            const gamePoolAccount = await getAccount(connection, new PublicKey(gamePoolAddress));
            return Number(gamePoolAccount.amount) / 1_000_000; // Convert from smallest unit
        } catch (error) {
            console.error('Failed to get game pool balance:', error);
            return 0;
        }
    }
}

// Test your wallet
export async function testWallet() {
    const WALLET_ADDRESS = '57arM3rLe8LHfzn7coyUu6KGhxLQ6nfP87mHTHpM2SGB';
    return await WalletService.getWalletInfo(WALLET_ADDRESS);
}
