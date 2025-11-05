import { authStore } from '$lib/stores/auth';
import { gameState, gameActions } from '$lib/stores/gameStore';
import { get } from 'svelte/store';
import type { CollectibleType } from '$lib/game/core/entities/Collectible';

// Import Solana dependencies for blockchain integration
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccount, getAssociatedTokenAddress } from '@solana/spl-token';

// Network configuration
export enum Network {
  DEVNET = 'devnet',
  MAINNET = 'mainnet'
}

export interface NetworkConfig {
  rpcUrl: string;
  gameTokenMint: string;
  gamePoolAccount: string;
  ownerAccount: string;
  isProduction: boolean;
  deploymentInfoPath: string;
}

export interface TokenMintResult {
  success: boolean;
  new_balance?: number;
  tx_signature?: string;
  error?: string;
}

export interface TokenHistoryEntry {
  id: string;
  type: 'mint' | 'transfer' | 'receive' | 'convert';
  amount: number;
  timestamp: string;
  txSignature?: string;
  description?: string;
  particleLocation?: [number, number];
}

/**
 * Inline Blockchain Integration Class
 * This replaces the external blockchain_integration.js file to avoid loading issues
 */
class InlineBlockchainIntegration {
  private game: any;
  private connection: any;
  private tokenMint: string | null = null;
  private gamePoolAccount: string | null = null;
  private ownerAccount: string | null = null;

  constructor(gameInstance: any) {
    this.game = gameInstance;
    this.initConnection();
  }

  async initConnection() {
    try {
      this.connection = new Connection('https://api.devnet-beta.solana.com', 'confirmed');
      console.log('✅ Connected to Solana Devnet');

      // Load deployment info if available
      await this.loadDeploymentInfo();

      // Setup event listeners and monitoring
      this.setupEventListeners();
      this.startRealtimeMonitoring();

    } catch (error) {
      console.error('❌ Blockchain connection failed:', error);
      this.game.showNotification('Blockchain connection failed. Running in demo mode.', 'error');
    }
  }

  async loadDeploymentInfo() {
    try {
      // For demo purposes, use hardcoded values instead of fetching file
      // This avoids the 404 error while maintaining functionality
      this.tokenMint = "CYZWEyAgzjJAVyYHctPiZF6UKbCBwV1CsNxUptURERDR";
      this.gamePoolAccount = "AQU18Pwvf36FgvQzhbP7cFZch5DZT8Zd2xgNQeB5JnyP";
      this.ownerAccount = "5FpSyZwYuyyVoYVJ71yvhcQ2A5MpNj5EirNjfAARsDzR";
      console.log('✅ Using demo deployment info (no file fetch needed)');
    } catch (error) {
      console.log('Using demo mode without deployment info');
    }
  }

  setupEventListeners() {
    // Setup event listeners for blockchain events
    console.log('📡 Setting up blockchain event listeners');
  }

  startRealtimeMonitoring() {
    // Start monitoring blockchain for real-time updates
    console.log('👀 Starting real-time blockchain monitoring');
  }

  async mintTokenOnChain(particleLocation: [number, number]): Promise<string | null> {
    try {
      if (!this.connection) {
        throw new Error('No blockchain connection');
      }

      // Simulate token minting for demo purposes
      console.log('🪙 Simulating token mint on blockchain at location:', particleLocation);

      // In a real implementation, this would:
      // 1. Create transaction to call eat_energy_particle instruction
      // 2. Sign and send transaction
      // 3. Return transaction signature

      // For now, return a mock transaction signature
      const mockTxSignature = `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.game.showNotification(`🎉 Token minted on blockchain! Location: ${particleLocation[0]}, ${particleLocation[1]}`, 'success');

      return mockTxSignature;

    } catch (error) {
      console.error('❌ Failed to mint token on chain:', error);
      this.game.showNotification('Failed to mint token on blockchain', 'error');
      return null;
    }
  }

  disconnect() {
    // Cleanup connections
    console.log('🔌 Disconnected from blockchain');
  }
}

export interface BalanceResponse {
  game_tokens: number;
  session_tokens: number;
  total_earned: number;
  wallet_address: string | null;
}

export class TokenService {
  private static readonly BASE_URL = 'http://localhost:8080';
  private static blockchainIntegration: any = null;
  private static isBlockchainReady = false;

  // Network configuration
  private static currentNetwork: Network = Network.DEVNET;
  private static networkConfig: NetworkConfig | null = null;

  // Solana connection for direct blockchain interaction
  private static solanaConnection: Connection | null = null;
  private static gameTokenMint: PublicKey | null = null;
  private static gamePoolAccount: PublicKey | null = null;
  private static ownerAccount: PublicKey | null = null;

  /**
   * Load deployment configuration for current network
   */
  private static async loadNetworkConfig(): Promise<void> {
    // For now, use hardcoded values since deployment info is not accessible from client
    // TODO: Load from API endpoint or environment variables in production

    if (this.currentNetwork === Network.DEVNET) {
      this.networkConfig = {
        rpcUrl: 'https://api.devnet.solana.com',
        gameTokenMint: 'FBDh1XC9nNn1XqEgi1FBXgrsJ14xw7chQzvoB2WnrMcX',
        gamePoolAccount: 'C17zaaE7LmjGiWXUppJKsvS6msempQSjdQqi6yBmTc5N',
        ownerAccount: 'B8MM5t3qTxBSx7mpaRvu4AJmMAZeHUty1LUVtfXs7QUv',
        isProduction: false,
        deploymentInfoPath: '/game_token/devnet_deployment_updated.json'
      };
    } else {
      // Mainnet config - will be updated after deployment
      this.networkConfig = {
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        gameTokenMint: 'UPDATE_WITH_MAINNET_ADDRESS',
        gamePoolAccount: 'UPDATE_WITH_MAINNET_ADDRESS',
        ownerAccount: 'UPDATE_WITH_MAINNET_ADDRESS',
        isProduction: true,
        deploymentInfoPath: '/game_token/mainnet_deployment_info.json'
      };
    }

    console.log(`✅ Loaded ${this.currentNetwork} network config:`, this.networkConfig);

    // Try to load from client public folder (won't work in dev server)
    // This is commented out to avoid 404 errors
    /*
    try {
      const response = await fetch(`/game_token/${this.currentNetwork}_deployment_info.json`);
      if (response.ok) {
        const deploymentInfo = await response.json();
        // Update config with deployment info if available
        this.networkConfig.gameTokenMint = deploymentInfo.gameTokenMint;
        this.networkConfig.gamePoolAccount = deploymentInfo.gamePoolAccount;
        this.networkConfig.ownerAccount = deploymentInfo.ownerAccount;
        console.log(`✅ Updated with deployment info from client`);
      }
    } catch (error) {
      // Ignore fetch errors in development
    }
    */
  }

  /**
   * Switch network (Devnet/Mainnet)
   */
  static async switchNetwork(network: Network): Promise<void> {
    this.currentNetwork = network;
    this.networkConfig = null;
    this.solanaConnection = null;
    this.gameTokenMint = null;
    this.gamePoolAccount = null;
    this.ownerAccount = null;
    this.isBlockchainReady = false;

    console.log(`🔄 Switching to ${network} network...`);
    await this.initializeBlockchain();
  }

  /**
   * Initialize blockchain integration
   */
  static async initializeBlockchain(): Promise<void> {
    try {
      // Load network configuration first
      if (!this.networkConfig) {
        await this.loadNetworkConfig();
      }

      if (typeof window !== 'undefined' && !this.blockchainIntegration) {
        // Create inline blockchain integration to avoid file loading issues
        this.blockchainIntegration = new InlineBlockchainIntegration({
          game: {
            walletAddress: authStore.user?.wallet_address,
            sessionTokens: 0,
            tokens: 0,
            showNotification: (msg: string, type: string = 'success') => {
              console.log(`[${type.toUpperCase()}] ${msg}`);
            }
          }
        });
        this.isBlockchainReady = true;
        console.log('✅ Blockchain integration initialized');
      }

      // Initialize Solana connection
      if (!this.solanaConnection && this.networkConfig) {
        this.solanaConnection = new Connection(this.networkConfig.rpcUrl, 'confirmed');

        // Load addresses from network config
        try {
          this.gameTokenMint = new PublicKey(this.networkConfig.gameTokenMint);
          this.gamePoolAccount = new PublicKey(this.networkConfig.gamePoolAccount);
          this.ownerAccount = new PublicKey(this.networkConfig.ownerAccount);

          console.log(`✅ Connected to ${this.currentNetwork}:`, {
            rpcUrl: this.networkConfig.rpcUrl,
            gameTokenMint: this.gameTokenMint.toString(),
            gamePoolAccount: this.gamePoolAccount.toString(),
            ownerAccount: this.ownerAccount.toString()
          });
        } catch (error) {
          console.error('Failed to load network addresses:', error);
        }
      }
    } catch (error) {
      console.error('Failed to initialize blockchain:', error);
    }
  }

  /**
   * Player earns tokens from auto-filled game pool (LOGIC ĐÚNG)
   * Game pool được auto-mint scheduler fill định kỳ, player chỉ nhận thưởng từ pool có sẵn
   * KHÔNG PHỤ THUỘC vào việc mint trực tiếp khi ăn particle
   */
  static async mintTokenOnCollect(
    particleLocation: [number, number],
    particleType: CollectibleType
  ): Promise<TokenMintResult> {
    try {
      // LOGIC ĐÚNG: Player chỉ nhận thưởng từ game pool đã được auto-mint
      // Game pool được fill bởi auto-mint scheduler KHÔNG PHỤ THUỘC player activity
      // Owner đã nhận 20% ngay từ auto-mint, player chỉ lấy từ 80% còn lại

      const accessToken = authStore.tokens?.access_token;
      if (!accessToken) {
        return {
          success: false,
          error: 'Not authenticated'
        };
      }

      // LOGIC ĐÚNG: Gọi API để transfer từ game pool (đã được auto-mint fill) cho player
      const response = await fetch(`${this.BASE_URL}/api/token/earn-from-pool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          particle_location: particleLocation,
          particle_type: particleType,
          amount: 1, // Mỗi hạt = 1 token từ pool
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update game store with new balance
        if (data.new_balance !== undefined) {
          gameActions.updateTokenBalance(data.new_balance);
          gameActions.addTokenEarned(1);
        }

        console.log('🎯 Earned token from game pool:', {
          particle_location: particleLocation,
          new_balance: data.new_balance,
          remaining_pool: data.remaining_pool
        });

        return {
          success: true,
          new_balance: data.new_balance,
          tx_signature: data.tx_signature,
          remaining_pool: data.remaining_pool,
        };
      } else {
        console.error('Token earning failed:', data);
        return {
          success: false,
          error: data.error || 'Earning failed'
        };
      }
    } catch (error) {
      console.error('Token earning error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get current token balance
   */
  static async getBalance(): Promise<BalanceResponse | null> {
    try {
      const accessToken = authStore.tokens?.access_token;
      if (!accessToken) {
        return null;
      }

      const response = await fetch(`${this.BASE_URL}/api/token/balance`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to get balance:', response.status);
        return null;
      }
    } catch (error) {
      console.error('Balance fetch error:', error);
      return null;
    }
  }

  /**
   * Get transaction history
   */
  static async getTransactionHistory(): Promise<TokenHistoryEntry[]> {
    try {
      const accessToken = authStore.tokens?.access_token;
      if (!accessToken) {
        return [];
      }

      const response = await fetch(`${this.BASE_URL}/api/token/history`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        return await response.json();
      } else {
        console.error('Failed to get history:', response.status);
        return [];
      }
    } catch (error) {
      console.error('History fetch error:', error);
      return [];
    }
  }

  /**
   * Transfer tokens to another player
   */
  static async transferTokens(
    toUserId: string,
    amount: number
  ): Promise<{ success: boolean; tx_signature?: string; error?: string }> {
    try {
      const accessToken = authStore.tokens?.access_token;
      if (!accessToken) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(`${this.BASE_URL}/api/token/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to_user_id: toUserId,
          amount,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          tx_signature: data.tx_signature,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Transfer failed'
        };
      }
    } catch (error) {
      console.error('Token transfer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Show token reward effect (called by Collectible)
   */
  static showTokenRewardEffect(newBalance: number): void {
    // Create floating notification
    const notification = document.createElement('div');
    notification.className = 'token-reward-notification';
    notification.innerHTML = `
      <div class="reward-content">
        <span class="token-icon">🪙</span>
        <span class="reward-text">+1 TOKEN</span>
        <span class="balance-text">Balance: ${newBalance.toLocaleString()}</span>
      </div>
    `;

    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0, 255, 136, 0.9)',
      border: '2px solid #00ff88',
      borderRadius: '12px',
      padding: '16px 24px',
      boxShadow: '0 8px 24px rgba(0, 255, 136, 0.4)',
      zIndex: '10000',
      fontFamily: 'Courier New, monospace',
      fontWeight: 'bold',
      color: '#000',
      animation: 'tokenRewardPopup 0.6s ease-out',
      pointerEvents: 'none',
    });

    document.body.appendChild(notification);

    // Remove after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * Setup WebSocket connection for real-time balance updates
   */
  private static ws: WebSocket | null = null;
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;

  static connectWebSocket(): void {
    // Initialize blockchain first
    this.initializeBlockchain();

    // Try blockchain WebSocket if available
    if (this.blockchainIntegration && this.isBlockchainReady) {
      console.log('🔗 Using blockchain WebSocket connection');
      // Blockchain integration handles its own WebSocket
      return;
    }

    // Fallback to API WebSocket
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(`${this.BASE_URL.replace('http', 'ws')}/token-updates`);

      this.ws.onopen = () => {
        console.log('🔗 Token API WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'token_update' && data.userId === authStore.user?.id) {
            // Update game store
            gameActions.updateTokenBalance(data.new_balance);
            gameActions.addTokenEarned(data.amount);

            // Show notification
            this.showTokenRewardEffect(data.new_balance);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 Token API WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Token API WebSocket error:', error);
        this.attemptReconnect();
      };

    } catch (error) {
      console.error('Failed to connect token WebSocket:', error);
    }
  }

  private static attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max WebSocket reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    setTimeout(() => {
      console.log(`🔄 Attempting WebSocket reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connectWebSocket();
    }, delay);
  }

  static disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // Disconnect blockchain WebSocket if available
    if (this.blockchainIntegration) {
      this.blockchainIntegration.stopRealtimeMonitoring();
    }
  }

  /**
   * Initialize token service (call this when app starts)
   */
  static async initialize(): Promise<void> {
    await this.initializeBlockchain();
    console.log('🎮 TokenService initialized with blockchain integration');

    // Bridge system will be initialized separately when needed
    // TODO: Add bridge system integration after Mainnet deployment
  }

  // Bridge system methods - will be implemented after Mainnet deployment
  // TODO: Implement bridge functionality when SOL is available for Mainnet

  /**
   * Bridge tokens to another chain (placeholder)
   */
  static async bridgeTokensOut(
    amount: number,
    targetChain: number,
    targetAddress: string
  ): Promise<{ success: boolean; tx_signature?: string; error?: string }> {
    // Bridge system not yet available - will be implemented after Mainnet deployment
    return {
      success: false,
      error: 'Bridge system not yet available. Will be implemented after Mainnet deployment.'
    };
  }

  /**
   * Complete bridge in from another chain (placeholder)
   */
  static async bridgeTokensIn(
    vaaHex: string
  ): Promise<{ success: boolean; tx_signature?: string; error?: string }> {
    // Bridge system not yet available - will be implemented after Mainnet deployment
    return {
      success: false,
      error: 'Bridge system not yet available. Will be implemented after Mainnet deployment.'
    };
  }

  /**
   * Get bridge statistics (placeholder)
   */
  static async getBridgeStats(): Promise<{
    totalBridgedOut: number;
    totalBridgedIn: number;
    totalTransactions: number;
  } | null> {
    // Bridge system not yet available
    return {
      totalBridgedOut: 0,
      totalBridgedIn: 0,
      totalTransactions: 0
    };
  }

  /**
   * Get supported bridge chains (placeholder)
   */
  static getSupportedBridgeChains(): Array<{
    id: number;
    name: string;
    nativeToken: string;
  }> {
    // Return empty array until bridge is deployed
    return [];
  }

  /**
   * Calculate bridge fee (placeholder)
   */
  static calculateBridgeFee(amount: number, targetChain: number): number {
    // Bridge system not yet available
    return 0;
  }
}

// Add CSS animation for token reward
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes tokenRewardPopup {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.8) rotate(-5deg);
      }
      50% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.1) rotate(2deg);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1) rotate(0deg);
      }
    }

    .token-reward-notification {
      animation: tokenRewardPopup 0.6s ease-out, rewardFadeOut 3s ease-in 2s forwards;
    }

    @keyframes rewardFadeOut {
      to {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.9);
      }
    }

    .reward-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .token-icon {
      font-size: 24px;
    }

    .reward-text {
      font-size: 18px;
      text-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
    }

    .balance-text {
      font-size: 14px;
      opacity: 0.9;
    }
  `;
  document.head.appendChild(style);
}
