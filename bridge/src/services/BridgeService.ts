import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
// Note: Wormhole SDK API may have changed, using simplified implementation

export interface BridgeConfig {
  bridgeProgramId: PublicKey;
  wormholeProgramId: PublicKey;
  gameTokenMint: PublicKey;
  bridgeState: PublicKey;
  bridgeEscrow: PublicKey;
}

export interface BridgeTransaction {
  signature: string;
  amount: number;
  targetChain: number;
  targetAddress: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export class BridgeService {
  private connection: Connection;
  private config: BridgeConfig;

  constructor(connection: Connection, config: BridgeConfig) {
    this.connection = connection;
    this.config = config;
  }

  /**
   * Bridge tokens from Solana to target chain
   */
  async bridgeTokensOut(
    userWallet: Keypair,
    amount: number,
    targetChain: number,
    targetAddress: string
  ): Promise<BridgeTransaction> {
    try {
      console.log(`🔄 Starting bridge out: ${amount} tokens to chain ${targetChain}`);

      // Get user's associated token account
      const userTokenAccount = await getAssociatedTokenAddress(
        this.config.gameTokenMint,
        userWallet.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      // Check balance
      const balance = await this.connection.getTokenAccountBalance(userTokenAccount);
      if (!balance.value.uiAmount || balance.value.uiAmount < amount) {
        throw new Error('Insufficient token balance');
      }

      // Create bridge transaction
      const transaction = new Transaction();

      // Add bridge instruction (simplified for demo)
      // In real implementation, this would call the bridge contract

      // Sign and send transaction
      transaction.feePayer = userWallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash;

      transaction.sign(userWallet);

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [userWallet]
      );

      console.log(`✅ Bridge transaction sent: ${signature}`);

      const bridgeTx: BridgeTransaction = {
        signature,
        amount,
        targetChain,
        targetAddress,
        timestamp: Date.now(),
        status: 'confirmed'
      };

      return bridgeTx;

    } catch (error) {
      console.error('❌ Bridge out failed:', error);
      throw error;
    }
  }

  /**
   * Complete bridge in (receive tokens from other chains)
   */
  async bridgeTokensIn(
    userWallet: Keypair,
    vaaHash: string
  ): Promise<BridgeTransaction> {
    try {
      console.log(`🔄 Starting bridge in for VAA: ${vaaHash}`);

      // Simplified VAA verification (use proper Wormhole SDK in production)
      console.log(`Verifying VAA: ${vaaHash}`);
      // TODO: Implement proper VAA verification with Wormhole SDK

      // Create bridge in transaction
      const transaction = new Transaction();

      // Add bridge in instruction (simplified for demo)

      // Sign and send transaction
      transaction.feePayer = userWallet.publicKey;
      transaction.recentBlockhash = (await this.connection.getRecentBlockhash()).blockhash;

      transaction.sign(userWallet);

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [userWallet]
      );

      console.log(`✅ Bridge in transaction sent: ${signature}`);

      const bridgeTx: BridgeTransaction = {
        signature,
        amount: 0, // Would parse from VAA
        targetChain: 0,
        targetAddress: '',
        timestamp: Date.now(),
        status: 'confirmed'
      };

      return bridgeTx;

    } catch (error) {
      console.error('❌ Bridge in failed:', error);
      throw error;
    }
  }

  /**
   * Get bridge statistics
   */
  async getBridgeStats(): Promise<{
    totalBridgedOut: number;
    totalBridgedIn: number;
    totalTransactions: number;
  }> {
    try {
      // Fetch bridge stats from contract
      // This is simplified - in real implementation would query the bridge contract

      return {
        totalBridgedOut: 100, // Mock data
        totalBridgedIn: 80,
        totalTransactions: 25
      };

    } catch (error) {
      console.error('Failed to get bridge stats:', error);
      return {
        totalBridgedOut: 0,
        totalBridgedIn: 0,
        totalTransactions: 0
      };
    }
  }

  /**
   * Get supported target chains
   */
  getSupportedChains(): Array<{
    id: number;
    name: string;
    nativeToken: string;
  }> {
    return [
      { id: 2, name: 'Ethereum', nativeToken: 'ETH' },
      { id: 4, name: 'BSC', nativeToken: 'BNB' },
      { id: 5, name: 'Polygon', nativeToken: 'MATIC' },
      { id: 6, name: 'Avalanche', nativeToken: 'AVAX' },
      { id: 23, name: 'Arbitrum', nativeToken: 'ETH' },
      { id: 24, name: 'Optimism', nativeToken: 'ETH' },
      { id: 30, name: 'Base', nativeToken: 'ETH' }
    ];
  }

  /**
   * Calculate bridge fees
   */
  calculateBridgeFee(amount: number, targetChain: number): number {
    // Base fee + percentage
    const baseFee = 0.001; // 0.001 SOL
    const percentageFee = amount * 0.005; // 0.5%

    return Math.max(baseFee, percentageFee);
  }

  /**
   * Get bridge transaction status
   */
  async getTransactionStatus(signature: string): Promise<'pending' | 'confirmed' | 'failed'> {
    try {
      const status = await this.connection.getSignatureStatus(signature);

      if (!status || !status.value) {
        return 'pending';
      }

      return status.value.confirmationStatus === 'confirmed' ? 'confirmed' : 'pending';
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return 'failed';
    }
  }
}
