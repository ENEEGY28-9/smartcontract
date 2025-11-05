// PocketBase configuration
const USE_PROXY = import.meta.env.VITE_USE_POCKETBASE_PROXY !== 'false';
export const POCKETBASE_URL = USE_PROXY
    ? 'http://localhost:5173/pb-api'
    : (import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090');

// Collection names
export const COLLECTIONS = {
  WALLETS: 'wallets',
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  ENERGY: 'energies',
  ITEMS: 'items',
  SHOP_ITEMS: 'shop_items'
} as const;

// Wallet types
export const WALLET_TYPES = {
  METAMASK: 'metamask',
  PHANTOM: 'phantom',
  GENERATED: 'generated',
  SUI: 'sui'
} as const;

// Network types
export const NETWORK_TYPES = {
  ETHEREUM: 'ethereum',
  SOLANA: 'solana',
  SUI: 'sui'
} as const;
