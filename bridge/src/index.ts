import { Connection, PublicKey } from '@solana/web3.js';
import { BridgeService, BridgeConfig } from './services/BridgeService';
import { VAAVerificationService } from './services/VAAVerificationService';
import { BRIDGE_CONSTANTS, calculateBridgeFee, getChainName, getChainNativeToken } from './utils/bridgeUtils';

// Bridge system configuration
const BRIDGE_CONFIG: BridgeConfig = {
  bridgeProgramId: BRIDGE_CONSTANTS.BRIDGE_PROGRAM_ID,
  wormholeProgramId: BRIDGE_CONSTANTS.WORMHOLE_PROGRAM_ID,
  gameTokenMint: new PublicKey('2ecFSNGSMokwyZKr1bDWHBjdNRcH2KERVtwX6MPTxpkN'), // From Devnet deployment
  bridgeState: new PublicKey('BridgeState11111111111111111111111111111111'), // Will be derived
  bridgeEscrow: new PublicKey('BridgeEscrow111111111111111111111111111111'), // Will be derived
};

export class BridgeSystem {
  private connection: Connection;
  private bridgeService: BridgeService;
  private vaaService: VAAVerificationService;

  constructor(network: 'devnet' | 'mainnet' = 'devnet') {
    const rpcUrl = network === 'devnet'
      ? 'https://api.devnet.solana.com'
      : 'https://api.mainnet-beta.solana.com';

    this.connection = new Connection(rpcUrl, 'confirmed');
    this.bridgeService = new BridgeService(this.connection, BRIDGE_CONFIG);
    this.vaaService = new VAAVerificationService(this.connection);
  }

  /**
   * Bridge tokens to another chain
   */
  async bridgeTokensOut(
    userWallet: any,
    amount: number,
    targetChain: number,
    targetAddress: string
  ) {
    try {
      console.log(`🌉 Starting bridge to ${getChainName(targetChain)}...`);

      const fee = calculateBridgeFee(amount);
      console.log(`💰 Bridge fee: ${fee} SOL`);

      const transaction = await this.bridgeService.bridgeTokensOut(
        userWallet,
        amount,
        targetChain,
        targetAddress
      );

      console.log(`✅ Bridge transaction completed: ${transaction.signature}`);
      return transaction;

    } catch (error) {
      console.error('❌ Bridge out failed:', error);
      throw error;
    }
  }

  /**
   * Complete bridge in from another chain
   */
  async bridgeTokensIn(userWallet: any, vaaHex: string) {
    try {
      console.log(`🌉 Starting bridge in with VAA...`);

      // Verify VAA first
      const vaaMessage = await this.vaaService.verifyVAA(vaaHex);
      console.log(`✅ VAA verified from chain ${vaaMessage.emitterChain}`);

      const transaction = await this.bridgeService.bridgeTokensIn(userWallet, vaaHex);

      console.log(`✅ Bridge in transaction completed: ${transaction.signature}`);
      return transaction;

    } catch (error) {
      console.error('❌ Bridge in failed:', error);
      throw error;
    }
  }

  /**
   * Get bridge statistics
   */
  async getBridgeStats() {
    return await this.bridgeService.getBridgeStats();
  }

  /**
   * Get supported chains
   */
  getSupportedChains() {
    return this.bridgeService.getSupportedChains();
  }

  /**
   * Calculate bridge fee
   */
  calculateFee(amount: number, targetChain: number) {
    return this.bridgeService.calculateBridgeFee(amount, targetChain);
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(signature: string) {
    return await this.bridgeService.getTransactionStatus(signature);
  }

  /**
   * Utility functions
   */
  getChainName(chainId: number) {
    return getChainName(chainId);
  }

  getChainNativeToken(chainId: number) {
    return getChainNativeToken(chainId);
  }
}

// Export for use in game
export { BRIDGE_CONSTANTS };
export default BridgeSystem;
