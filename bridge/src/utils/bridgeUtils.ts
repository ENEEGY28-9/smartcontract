import { PublicKey } from '@solana/web3.js';

export const BRIDGE_CONSTANTS = {
  // Bridge program IDs
  BRIDGE_PROGRAM_ID: new PublicKey('BridgeContract1111111111111111111111111111'),
  WORMHOLE_PROGRAM_ID: new PublicKey('worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth'),

  // Chain IDs (Wormhole standard)
  CHAINS: {
    SOLANA: 1,
    ETHEREUM: 2,
    BSC: 4,
    POLYGON: 5,
    AVALANCHE: 6,
    ARBITRUM: 23,
    OPTIMISM: 24,
    BASE: 30
  },

  // Minimum bridge amounts
  MIN_BRIDGE_AMOUNT: 1_000_000, // 1 token (6 decimals)

  // Bridge fees
  BASE_BRIDGE_FEE: 0.001, // 0.001 SOL
  PERCENTAGE_FEE: 0.005, // 0.5%
};

export function calculateBridgeFee(amount: number): number {
  const baseFee = BRIDGE_CONSTANTS.BASE_BRIDGE_FEE;
  const percentageFee = amount * BRIDGE_CONSTANTS.PERCENTAGE_FEE;

  return Math.max(baseFee, percentageFee);
}

export function getChainName(chainId: number): string {
  const chainMap: { [key: number]: string } = {
    1: 'Solana',
    2: 'Ethereum',
    4: 'BSC',
    5: 'Polygon',
    6: 'Avalanche',
    23: 'Arbitrum',
    24: 'Optimism',
    30: 'Base'
  };

  return chainMap[chainId] || 'Unknown';
}

export function getChainNativeToken(chainId: number): string {
  const tokenMap: { [key: number]: string } = {
    1: 'SOL',
    2: 'ETH',
    4: 'BNB',
    5: 'MATIC',
    6: 'AVAX',
    23: 'ETH',
    24: 'ETH',
    30: 'ETH'
  };

  return tokenMap[chainId] || 'UNKNOWN';
}

export function validateBridgeAmount(amount: number): boolean {
  return amount >= BRIDGE_CONSTANTS.MIN_BRIDGE_AMOUNT;
}

export function formatBridgeAmount(amount: number): string {
  return (amount / 1_000_000).toFixed(2);
}

export function parseBridgeAmount(amount: string): number {
  return Math.floor(parseFloat(amount) * 1_000_000);
}

export function generateBridgeId(): string {
  return `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function isValidTargetAddress(address: string, chainId: number): boolean {
  try {
    // Validate based on chain
    switch (chainId) {
      case BRIDGE_CONSTANTS.CHAINS.ETHEREUM:
      case BRIDGE_CONSTANTS.CHAINS.ARBITRUM:
      case BRIDGE_CONSTANTS.CHAINS.OPTIMISM:
      case BRIDGE_CONSTANTS.CHAINS.BASE:
        // Ethereum-style address (0x...)
        return /^0x[a-fA-F0-9]{40}$/.test(address);

      case BRIDGE_CONSTANTS.CHAINS.BSC:
        // BSC uses Ethereum addresses
        return /^0x[a-fA-F0-9]{40}$/.test(address);

      case BRIDGE_CONSTANTS.CHAINS.POLYGON:
        // Polygon uses Ethereum addresses
        return /^0x[a-fA-F0-9]{40}$/.test(address);

      case BRIDGE_CONSTANTS.CHAINS.AVALANCHE:
        // Avalanche uses Ethereum addresses
        return /^0x[a-fA-F0-9]{40}$/.test(address);

      default:
        return false;
    }
  } catch (error) {
    return false;
  }
}

export function getEstimatedBridgeTime(chainId: number): number {
  // Estimated time in minutes
  const timeMap: { [key: number]: number } = {
    1: 0, // Solana (instant)
    2: 20, // Ethereum (~15-20 min)
    4: 5, // BSC (~3-5 min)
    5: 5, // Polygon (~2-5 min)
    6: 3, // Avalanche (~2-3 min)
    23: 15, // Arbitrum (~10-15 min)
    24: 15, // Optimism (~10-15 min)
    30: 10 // Base (~5-10 min)
  };

  return timeMap[chainId] || 30; // Default 30 minutes
}

