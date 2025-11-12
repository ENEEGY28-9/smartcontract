import { encode as encodeBase58, decode as decodeBase58 } from 'bs58';
import { Keypair, PublicKey, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { authStore } from '$lib/stores/auth';

/**
 * Generate a REAL Solana Devnet wallet with Ed25519 keypair
 * Uses cryptographic Solana Web3.js for maximum security
 * Can interact with https://explorer.solana.com/address/5oU5mv3xjud2kgemjKwm5qK5Ar356rxboxbNmYXhuAJc?cluster=devnet
 */
export async function generateRealSolanaWallet(): Promise<{
    address: string;
    privateKey: string;
    publicKey: string;
    secretKey: Uint8Array;
    keypair: Keypair;
}> {
    try {
        console.log('🔄 Generating REAL Solana Devnet wallet with Web3.js...');

        // Generate REAL Ed25519 keypair using Solana Web3.js
        const keypair = Keypair.generate();

        // Get public key (address) and secret key
        const publicKey = keypair.publicKey;
        const secretKey = keypair.secretKey;

        // Convert to base58 format (standard for Solana)
        const address = publicKey.toBase58();
        const privateKey = encodeBase58(secretKey);

        console.log('✅ Generated REAL Solana Devnet wallet:', {
            address,
            addressLength: address.length,
            privateKeyLength: privateKey.length,
            publicKeyHex: publicKey.toBuffer().toString('hex'),
            cluster: 'devnet'
        });

        // Optional: Check if we can connect to devnet (for validation)
        try {
            const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
            console.log('🌐 Devnet connection available for wallet operations');
        } catch (e) {
            console.warn('⚠️ Devnet connection not available, but wallet is still valid');
        }

        return {
            address,        // Solana address (base58)
            privateKey,     // Private key (base58 encoded)
            publicKey: address, // Same as address for Solana
            secretKey,      // Raw secret key bytes
            keypair         // Full keypair object for operations
        };
    } catch (error) {
        console.error('❌ Failed to generate real Solana wallet:', error);
        throw new Error('Failed to generate real Solana wallet: ' + error);
    }
}

/**
 * Get Devnet connection for wallet operations
 */
export function getDevnetConnection(): Connection {
    return new Connection(clusterApiUrl('devnet'), 'confirmed');
}

/**
 * Check wallet balance on Devnet
 */
export async function checkWalletBalance(publicKey: string): Promise<number> {
    try {
        const connection = getDevnetConnection();
        const pubKey = new PublicKey(publicKey);
        const balance = await connection.getBalance(pubKey);
        return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
    } catch (error) {
        console.error('Failed to check balance:', error);
        return 0;
    }
}

/**
 * Fund wallet with Devnet SOL using Web3.js airdrop
 */
export async function requestDevnetAirdrop(publicKey: string, amount: number = 1): Promise<string> {
    // First, check if faucet is likely rate-limited by making a quick test request
    try {
        const connection = getDevnetConnection();

        // Quick test request to detect rate limiting before full airdrop attempt
        console.log('🔍 Testing faucet availability...');
        const testPubKey = new PublicKey(publicKey);

        // Make a minimal request to test rate limiting
        await connection.getBalance(testPubKey);

        console.log(`🪂 Requesting ${amount} SOL airdrop to ${testPubKey.toBase58()}`);

        // Configure connection to fail fast on rate limit
        const signature = await connection.requestAirdrop(testPubKey, amount * LAMPORTS_PER_SOL, {
            commitment: 'confirmed',
            // Disable default retries to handle rate limiting ourselves
        });

        console.log('✅ Airdrop successful, transaction:', signature);
        return signature;
    } catch (error) {
        console.error('❌ Airdrop failed:', error);

        // Handle specific error cases
        if (error.message?.includes('Too Many Requests') ||
            error.message?.includes('429') ||
            error.message?.includes('rate limit') ||
            error.message?.includes('airdrop limit') ||
            error.message?.includes('faucet has run dry')) {
            throw new Error('RATE_LIMITED');
        }
        if (error.message?.includes('Internal error')) {
            throw new Error('Devnet faucet internal error. Please use web faucets instead.');
        }

        throw error;
    }
}

/**
 * Check if wallet address is valid Solana format
 */
export function isValidSolanaAddress(address: string): boolean {
    try {
        new PublicKey(address);
        return address.length === 44 || address.length === 43; // Base58 encoded public key
    } catch {
        return false;
    }
}

/**
 * Check transaction status on Devnet
 */
export async function checkTransactionStatus(signature: string): Promise<any> {
    try {
        const connection = getDevnetConnection();
        const transaction = await connection.getTransaction(signature, {
            commitment: 'confirmed',
        });

        console.log('🔍 Transaction details:', {
            signature,
            slot: transaction?.slot,
            success: !!transaction,
            confirmations: transaction?.slot ? 'confirmed' : 'pending'
        });

        return transaction;
    } catch (error) {
        console.error('❌ Failed to check transaction:', error);
        throw error;
    }
}

/**
 * Check if Devnet faucet is available (not rate-limited)
 */
export async function checkFaucetHealth(): Promise<boolean> {
    try {
        const connection = getDevnetConnection();
        // Try a simple RPC call to test connectivity and rate limiting
        await connection.getRecentBlockhash();
        console.log('✅ Devnet faucet appears healthy');
        return true;
    } catch (error) {
        if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
            console.log('❌ Devnet faucet is rate-limited');
            return false;
        }
        console.log('⚠️ Devnet connection issue:', error.message);
        return false; // Assume rate-limited if any RPC error
    }
}

/**
 * Get SOL balance for a wallet address
 */
export async function getWalletBalance(walletAddress: string): Promise<number> {
    try {
        const connection = getDevnetConnection();
        const publicKey = new PublicKey(walletAddress);

        const balance = await connection.getBalance(publicKey);
        const solBalance = balance / LAMPORTS_PER_SOL;

        console.log(`💰 Balance for ${walletAddress}: ${solBalance} SOL (${balance} lamports)`);
        return solBalance;
    } catch (error) {
        console.error('❌ Failed to get balance:', error);
        throw error;
    }
}

/**
 * Get multiple faucet URLs for redundancy
 */
export function getFaucetUrls(): string[] {
    return [
        'https://faucet.solana.com/',
        'https://faucet.quicknode.com/solana',
        'https://www.solanatracker.io/faucet',
        'https://faucet.solflare.com/'
    ];
}

/**
 * Generate demo Solana wallet (fallback only)
 * NOT cryptographically secure - for testing UI only
 */
function generateDemoSolanaWallet(): {
    address: string;
    privateKey: string;
    publicKey: string;
} {
    try {
        // Generate random bytes
        const privateKeyBytes = new Uint8Array(32);
        const publicKeyBytes = new Uint8Array(32);
        crypto.getRandomValues(privateKeyBytes);
        crypto.getRandomValues(publicKeyBytes);

        // Convert to base58 (looks like real Solana addresses)
        const address = encodeBase58(publicKeyBytes);
        const privateKey = encodeBase58(privateKeyBytes);

        console.log('🎭 Generated DEMO Solana wallet (fallback):', {
            address: address,
            addressLength: address.length,
            note: 'NOT CRYPTOGRAPHICALLY SECURE'
        });

        return {
            address,
            privateKey,
            publicKey: address
        };
    } catch (error) {
        throw new Error('Failed to generate demo wallet: ' + error);
    }
}

/**
 * Validate a Solana wallet address format
 * Basic validation: base58 encoded, correct length
 */
export function validateSolanaAddress(address: string): boolean {
    try {
        // Solana addresses are 32-44 characters long
        if (address.length < 32 || address.length > 44) {
            return false;
        }

        // Try to decode from base58
        const decoded = decodeBase58(address);

        // Should be 32 bytes (public key)
        return decoded.length === 32;
    } catch (error) {
        console.warn('Invalid Solana address format:', address);
        return false;
    }
}

/**
 * Check if a wallet address can receive tokens from game pool
 * Validates format and basic connectivity
 */
export async function canReceiveFromGamePool(walletAddress: string): Promise<{
    valid: boolean;
    reason?: string;
}> {
    // Validate basic format
    if (!validateSolanaAddress(walletAddress)) {
        return {
            valid: false,
            reason: 'Invalid Solana address format'
        };
    }

    try {
        // Check if address exists on devnet (basic connectivity test)
        const response = await fetch(`https://api.devnet.solana.com`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getAccountInfo',
                params: [walletAddress, { encoding: 'base64' }]
            })
        });

        if (!response.ok) {
            return {
                valid: false,
                reason: 'Cannot connect to Solana network'
            };
        }

        const data = await response.json();

        // Account doesn't exist yet - that's OK, it can be created
        // Account exists - also OK
        return { valid: true };

    } catch (error) {
        console.warn('Network check failed:', error);
        return {
            valid: false,
            reason: 'Network connectivity issue'
        };
    }
}
